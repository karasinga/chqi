from datetime import timedelta
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Task, TaskComment, ActivityLog
from .serializers import TaskSerializer, TaskCommentSerializer, ActivityLogSerializer
from .services.scheduling import auto_schedule_tasks, calculate_cpm
from .mixins import ActivityLoggingMixin
from projects.models import Project

class TaskViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    logging_target_type = 'task'

    def get_queryset(self):
        from django.db.models import Count
        return Task.objects.annotate(comment_count=Count('comments'))

    def perform_create(self, serializer):
        task = serializer.save()
        self.log_activity(task, 'create')
        self._run_auto_schedule(task.project_id)

    def perform_update(self, serializer):
        instance = Task.objects.get(pk=self.get_object().pk)
        old_assignee = instance.assignee
        old_status = instance.status
        
        task = serializer.save()
        
        # Log assignment change
        if old_assignee != task.assignee:
            target_name = f"{task.name} to {task.assignee.username if task.assignee else 'Unassigned'}"
            self.log_activity(task, 'assigned', target_name=target_name)
        
        # Log status change
        if old_status != task.status:
            target_name = f"{task.name} to {task.get_status_display()}"
            self.log_activity(task, 'status_change', target_name=target_name)
        
        # Log general update if no specific change was logged
        if old_assignee == task.assignee and old_status == task.status:
            self.log_activity(task, 'update')
        
        self._run_auto_schedule(task.project_id)

    def _run_auto_schedule(self, project_id):
        tasks = Task.objects.filter(project_id=project_id)
        auto_schedule_tasks(tasks)
        
        # Run CPM to identify critical tasks
        cpm_results = calculate_cpm(tasks)
        
        # Update is_critical flag and sync priority
        updates = []
        for t in tasks:
            if t.id in cpm_results:
                is_crit = cpm_results[t.id]['is_critical']
                needs_update = False
                
                if t.is_critical != is_crit:
                    t.is_critical = is_crit
                    needs_update = True
                
                # Sync priority: if CPM says critical, set priority to critical
                # If CPM says not critical and priority was critical, reset to high
                if is_crit and t.priority != 'critical':
                    t.priority = 'critical'
                    needs_update = True
                elif not is_crit and t.priority == 'critical':
                    # Only reset if it was auto-set (we assume it was if is_critical was True before)
                    t.priority = 'high'
                    needs_update = True
                
                if needs_update:
                    updates.append(t)
        
        if updates:
            Task.objects.bulk_update(updates, ['is_critical', 'priority'])

    @action(detail=False, methods=['get'])
    def critical_path(self, request):
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response({"error": "project_id is required"}, status=400)
            
        tasks = Task.objects.filter(project_id=project_id)
        cpm_results = calculate_cpm(tasks)
        
        # Update is_critical flag in DB
        updates = []
        for t in tasks:
            if t.id in cpm_results:
                is_crit = cpm_results[t.id]['is_critical']
                if t.is_critical != is_crit:
                    t.is_critical = is_crit
                    updates.append(t)
        
        if updates:
            Task.objects.bulk_update(updates, ['is_critical'])

        # Build response with CPM data using serializer
        serializer = TaskSerializer(tasks, many=True)
        response_data = []
        for i, t in enumerate(tasks):
            data = serializer.data[i]
            metrics = cpm_results.get(t.id, {})
            data.update({
                "es": metrics.get('es'),
                "ef": metrics.get('ef'),
                "ls": metrics.get('ls'),
                "lf": metrics.get('lf'),
                "slack": metrics.get('slack'),
                "is_critical": metrics.get('is_critical', False)
            })
            response_data.append(data)
            
        return Response(response_data)

    @action(detail=False, methods=['get'])
    def global_stats(self, request):
        from django.utils import timezone
        from datetime import date
        
        today = date.today()
        
        critical_count = Task.objects.filter(is_critical=True).exclude(status='completed').count()
        overdue_count = Task.objects.filter(
            start_date__lt=today, # Simplified overdue logic: started before today and not completed
            status__in=['todo', 'in_progress', 'review']
        ).count()
        
        return Response({
            'critical_path_tasks': critical_count,
            'overdue_tasks': overdue_count
        })

    @action(detail=False, methods=['get'])
    def portfolio_summary(self, request):
        from collections import defaultdict
        projects = Project.objects.all()
        portfolio_data = []
        
        # Calculate project-level dependencies
        # A project depends on another if any of its tasks depend on a task in the other project
        project_deps = defaultdict(set)
        all_tasks_with_deps = Task.objects.all().prefetch_related('dependencies')
        for task in all_tasks_with_deps:
            for dep in task.dependencies.all():
                if task.project_id != dep.project_id:
                    project_deps[task.project_id].add(dep.project_id)
        
        for project in projects:
            tasks = Task.objects.filter(project_id=project.id)
            if not tasks.exists():
                portfolio_data.append({
                    "id": project.id,
                    "name": project.name,
                    "health_score": 100,
                    "status": project.status,
                    "start_date": project.start_date.isoformat() if project.start_date else None,
                    "end_date": project.end_date.isoformat() if project.end_date else None,
                    "critical_path": [],
                    "task_count": 0,
                    "duration": 0
                })
                continue
                
            cpm_results = calculate_cpm(tasks)
            
            critical_tasks = [t for t in tasks if cpm_results.get(t.id, {}).get('is_critical', False)]
            total_duration = max([cpm_results.get(t.id, {}).get('ef', 0) for t in tasks]) if tasks else 0
            
            health_score = max(40, 100 - (len(critical_tasks) * 5))
            
            portfolio_data.append({
                "id": project.id,
                "name": project.name,
                "health_score": health_score,
                "status": project.status,
                "start_date": project.start_date.isoformat() if project.start_date else None,
                "end_date": project.end_date.isoformat() if project.end_date else None,
                "critical_path": [
                    {
                        "id": t.id,
                        "name": t.name,
                        "es": cpm_results.get(t.id, {}).get('es'),
                        "ef": cpm_results.get(t.id, {}).get('ef'),
                    } for t in sorted(critical_tasks, key=lambda x: cpm_results.get(x.id, {}).get('es', 0))
                ],
                "task_count": tasks.count(),
                "duration": total_duration,
                "status_counts": {
                    "todo": tasks.filter(status='todo').count(),
                    "in_progress": tasks.filter(status='in_progress').count(),
                    "review": tasks.filter(status='review').count(),
                    "completed": tasks.filter(status='completed').count(),
                },
                "priority_counts": {
                    "low": tasks.filter(priority='low').count(),
                    "medium": tasks.filter(priority='medium').count(),
                    "high": tasks.filter(priority='high').count(),
                    "critical": tasks.filter(priority='critical').count(),
                },
                "critical_status_counts": {
                    "todo": tasks.filter(priority='critical', status='todo').count(),
                    "in_progress": tasks.filter(priority='critical', status='in_progress').count(),
                    "review": tasks.filter(priority='critical', status='review').count(),
                    "completed": tasks.filter(priority='critical', status='completed').count(),
                },
                "dependencies": list(project_deps.get(project.id, []))
            })
            
        return Response(portfolio_data)

class TaskCommentViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    queryset = TaskComment.objects.all()
    serializer_class = TaskCommentSerializer
    logging_target_type = 'task'
    
    def get_queryset(self):
        queryset = TaskComment.objects.all()
        task_id = self.request.query_params.get('task', None)
        if task_id is not None:
            queryset = queryset.filter(task_id=task_id)
        return queryset

    def perform_create(self, serializer):
        user = self.get_logging_user()
        if not user:
            from rest_framework.exceptions import NotAuthenticated
            raise NotAuthenticated("Authentication credentials were not provided.")
            
        comment = serializer.save(user=user)
        self.log_activity(comment.task, 'comment')

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer

class FrontendLogViewSet(viewsets.ViewSet):
    """
    A simple ViewSet for accepting frontend logs.
    """
    def create(self, request):
        logger = logging.getLogger('frontend')
        data = request.data
        level = data.get('level', 'error').upper()
        message = data.get('message', 'No message provided')
        stack = data.get('stack', '')
        component_stack = data.get('componentStack', '')
        
        log_message = f"FRONTEND ERROR: {message}\nStack: {stack}\nComponent Stack: {component_stack}"
        
        if level == 'INFO':
            logger.info(log_message)
        elif level == 'WARNING':
            logger.warning(log_message)
        else:
            logger.error(log_message)
            
        return Response({'status': 'logged'}, status=status.HTTP_201_CREATED)

from datetime import timedelta
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Task, TaskComment, ActivityLog, Dependency
from .serializers import TaskSerializer, TaskCommentSerializer, ActivityLogSerializer, DependencySerializer
from .services.scheduling import schedule_project, calculate_cpm
from .services.scheduleValidator import validate_schedule
from .mixins import ActivityLoggingMixin
from projects.models import Project


class TaskViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    logging_target_type = 'task'

    def get_queryset(self):
        from django.db.models import Count
        qs = Task.objects.annotate(comment_count=Count('comments'))
        project_id = self.request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        task = serializer.save()
        self.log_activity(task, 'create')
        self._run_schedule(task.project_id)

    def perform_update(self, serializer):
        instance = Task.objects.get(pk=self.get_object().pk)
        old_assignee = instance.assignee
        old_status = instance.status

        task = serializer.save()

        if old_assignee != task.assignee:
            target_name = f"{task.name} to {task.assignee.username if task.assignee else 'Unassigned'}"
            self.log_activity(task, 'assigned', target_name=target_name)

        if old_status != task.status:
            target_name = f"{task.name} to {task.get_status_display()}"
            self.log_activity(task, 'status_change', target_name=target_name)

        if old_assignee == task.assignee and old_status == task.status:
            self.log_activity(task, 'update')

        self._run_schedule(task.project_id)

    def _run_schedule(self, project_id):
        """Run full CPM scheduling for a project after any task change."""
        try:
            schedule_project(project_id)
        except Exception as exc:
            logging.getLogger(__name__).error(
                f"CPM scheduling error for project {project_id}: {exc}", exc_info=True)

    def create(self, request, *args, **kwargs):
        """Validate schedule before confirming creation."""
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            project_id = response.data.get('project')
            if project_id:
                validation = validate_schedule(project_id)
                response.data['_validation'] = validation
        return response

    def update(self, request, *args, **kwargs):
        """Validate schedule after update."""
        response = super().update(request, *args, **kwargs)
        if response.status_code in (200, 204):
            project_id = response.data.get('project')
            if project_id:
                validation = validate_schedule(project_id)
                response.data['_validation'] = validation
        return response

    @action(detail=False, methods=['get'])
    def critical_path(self, request):
        """
        Returns tasks with CPM metrics for a project.
        Mirrors old endpoint shape so existing frontend code works unchanged.
        """
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response({"error": "project_id is required"}, status=400)

        tasks = Task.objects.filter(project_id=project_id)
        
        # Run fresh calculation (updates DB + returns metrics)
        cpm_results = schedule_project(project_id)

        # Re-fetch after bulk_update so serializer sees updated fields
        tasks = Task.objects.filter(project_id=project_id).annotate(
            __import__('django.db.models', fromlist=['Count']).Count('comments')
        ) if False else Task.objects.filter(project_id=project_id)

        from django.db.models import Count
        tasks = Task.objects.filter(project_id=project_id).annotate(comment_count=Count('comments'))

        serializer = TaskSerializer(tasks, many=True)
        response_data = []

        for i, t in enumerate(tasks):
            data = dict(serializer.data[i])
            metrics = cpm_results.get(t.id, {})
            # Overlay metrics (backward-compat keys)
            data.update({
                "es": metrics.get('es'),
                "ef": metrics.get('ef'),
                "ls": metrics.get('ls'),
                "lf": metrics.get('lf'),
                "slack": metrics.get('total_float', metrics.get('slack', 0)),
                "total_float": metrics.get('total_float', 0),
                "free_float": metrics.get('free_float', 0),
                "is_critical": metrics.get('is_critical', False),
            })
            response_data.append(data)

        return Response(response_data)

    @action(detail=False, methods=['get'])
    def global_stats(self, request):
        from datetime import date
        today = date.today()
        critical_count = Task.objects.filter(
            is_critical=True).exclude(status='completed').count()
        overdue_count = Task.objects.filter(
            early_finish__lt=today,
            status__in=['todo', 'in_progress', 'review']
        ).count()
        return Response({
            'critical_path_tasks': critical_count,
            'overdue_tasks': overdue_count,
        })

    @action(detail=False, methods=['get'])
    def portfolio_summary(self, request):
        from collections import defaultdict
        projects = Project.objects.all()
        portfolio_data = []

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

            cpm_results = schedule_project(project.id)
            critical_tasks = [t for t in tasks if cpm_results.get(t.id, {}).get('is_critical', False)]
            ef_values = [cpm_results.get(t.id, {}).get('ef') for t in tasks if cpm_results.get(t.id, {}).get('ef')]
            total_duration = len(ef_values)  # count of tasks with EF
            health_score = max(40, 100 - (len(critical_tasks) * 5))

            portfolio_data.append({
                "id": project.id,
                "name": project.name,
                "health_score": health_score,
                "status": project.status,
                "start_date": project.start_date.isoformat() if project.start_date else None,
                "end_date": project.end_date.isoformat() if project.end_date else None,
                "critical_path": [{
                    "id": t.id,
                    "name": t.name,
                    "es": cpm_results.get(t.id, {}).get('es'),
                    "ef": cpm_results.get(t.id, {}).get('ef'),
                } for t in sorted(critical_tasks,
                    key=lambda x: cpm_results.get(x.id, {}).get('es', ''))],
                "task_count": tasks.count(),
                "duration": total_duration,
                "status_counts": {
                    s: tasks.filter(status=s).count()
                    for s in ['todo', 'in_progress', 'review', 'completed']
                },
                "priority_counts": {
                    p: tasks.filter(priority=p).count()
                    for p in ['low', 'medium', 'high', 'critical']
                },
                "critical_status_counts": {
                    s: tasks.filter(priority='critical', status=s).count()
                    for s in ['todo', 'in_progress', 'review', 'completed']
                },
                "dependencies": list(project_deps.get(project.id, [])),
            })

        return Response(portfolio_data)

    @action(detail=False, methods=['get'])
    def validate(self, request):
        """Return validation errors and warnings for a project."""
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response({"error": "project_id is required"}, status=400)
        result = validate_schedule(project_id)
        return Response(result)


class DependencyViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoint for Dependency objects.
    Automatically triggers schedule_project after create/update/delete.
    """
    queryset = Dependency.objects.all()
    serializer_class = DependencySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def _reschedule(self, project_id):
        try:
            schedule_project(project_id)
        except Exception as exc:
            logging.getLogger(__name__).error(
                f"CPM scheduling error after dep change: {exc}", exc_info=True)

    def perform_create(self, serializer):
        dep = serializer.save()
        self._reschedule(dep.project_id)

    def perform_update(self, serializer):
        dep = serializer.save()
        self._reschedule(dep.project_id)

    def perform_destroy(self, instance):
        project_id = instance.project_id
        instance.delete()
        self._reschedule(project_id)


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
    """Accepts frontend error logs."""
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

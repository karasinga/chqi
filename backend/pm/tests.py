from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from .models import Task, ActivityLog
from .views import TaskViewSet
from projects.models import Project

User = get_user_model()

class TaskLoggingTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.project = Project.objects.create(name='Test Project', start_date='2026-01-01')
        self.factory = APIRequestFactory()

    def test_task_creation_logging(self):
        view = TaskViewSet.as_view({'post': 'create'})
        data = {
            'name': 'New Task',
            'project': self.project.id,
            'duration': 5,
            'status': 'todo',
            'priority': 'medium',
            'start_date': '2026-01-01',
            'assignee': self.user.id
        }
        request = self.factory.post('/api/pm/tasks/', data)
        force_authenticate(request, user=self.user)
        response = view(request)
        
        self.assertEqual(response.status_code, 201)
        self.assertTrue(ActivityLog.objects.filter(action='create', target_type='task', target_id=response.data['id']).exists())

    def test_task_status_change_logging(self):
        task = Task.objects.create(
            name='Task 1', 
            project=self.project, 
            duration=5, 
            status='todo',
            start_date='2026-01-01',
            assignee=self.user
        )
        view = TaskViewSet.as_view({'patch': 'partial_update'})
        
        request = self.factory.patch(f'/api/pm/tasks/{task.id}/', {'status': 'in_progress'})
        force_authenticate(request, user=self.user)
        response = view(request, pk=task.id)
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(ActivityLog.objects.filter(action='status_change', target_type='task', target_id=task.id).exists())
        
        # Verify specific status_change target_name
        log = ActivityLog.objects.get(action='status_change', target_id=task.id)
        self.assertIn('in progress', log.target_name.lower())

    def test_critical_path_endpoint_has_project(self):
        Task.objects.create(
            name='Task 1', 
            project=self.project, 
            duration=5, 
            status='todo',
            start_date='2026-01-01'
        )
        view = TaskViewSet.as_view({'get': 'critical_path'})
        request = self.factory.get(f'/api/pm/tasks/critical_path/?project_id={self.project.id}')
        force_authenticate(request, user=self.user)
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) > 0)
        self.assertEqual(response.data[0]['project'], self.project.id)

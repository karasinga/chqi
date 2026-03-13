import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from projects.models import Project
from pm.models import Task
from pm.services.scheduling import calculate_cpm

projects = Project.objects.all()
for p in projects:
    tasks = Task.objects.filter(project=p)
    cpm_results = calculate_cpm(tasks)
    critical_count = sum(1 for t in tasks if cpm_results.get(t.id, {}).get('is_critical', False))
    priority_critical_count = tasks.filter(priority='critical').count()
    health_score = max(40, 100 - (critical_count * 5))
    
    print(f"Project: {p.name}")
    print(f"  Health Score: {health_score}")
    print(f"  CPM Critical: {critical_count}")
    print(f"  Priority Critical: {priority_critical_count}")
    print(f"  Tasks Status Breakdown (Critical Priority):")
    for status in ['todo', 'in_progress', 'review', 'completed']:
        count = tasks.filter(priority='critical', status=status).count()
        print(f"    {status}: {count}")
    print("-" * 20)

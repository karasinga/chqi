from django.core.management.base import BaseCommand
from pm.models import ActivityLog, Task
from projects.models import Project

class Command(BaseCommand):
    help = 'Backfills target_id for ActivityLog entries'

    def handle(self, *args, **options):
        logs = ActivityLog.objects.filter(target_id__isnull=True)
        self.stdout.write(f"Found {logs.count()} logs to backfill.")
        
        all_tasks = list(Task.objects.all())
        all_projects = list(Project.objects.all())
        updated_count = 0
        
        for log in logs:
            target_type = log.target_type.lower()
            target_name = log.target_name
            
            if target_type == 'task':
                # 1. Try Exact Match
                matched_task = next((t for t in all_tasks if t.name == target_name), None)
                
                # 2. Try "Starts With" Match
                if not matched_task:
                    sorted_tasks = sorted(all_tasks, key=lambda t: len(t.name), reverse=True)
                    for task in sorted_tasks:
                        if target_name.startswith(task.name):
                            remaining = target_name[len(task.name):]
                            if not remaining or remaining.startswith(' '):
                                matched_task = task
                                break
                
                if matched_task:
                    log.target_id = matched_task.id
                    log.target_type = 'task' # Normalize
                    log.save()
                    updated_count += 1
                    self.stdout.write(self.style.SUCCESS(f"Updated log {log.id}: '{target_name}' -> Task '{matched_task.name}'"))
                else:
                    self.stdout.write(self.style.WARNING(f"Failed to match log {log.id}: '{target_name}'"))
                    
            elif target_type == 'project':
                matched_project = next((p for p in all_projects if p.name == target_name), None)
                if matched_project:
                    log.target_id = matched_project.id
                    log.target_type = 'project' # Normalize
                    log.save()
                    updated_count += 1
                    self.stdout.write(self.style.SUCCESS(f"Updated log {log.id}: '{target_name}' -> Project '{matched_project.name}'"))
                else:
                    self.stdout.write(self.style.WARNING(f"Failed to match log {log.id}: '{target_name}'"))
                    
        self.stdout.write(self.style.SUCCESS(f"Backfill complete. Updated {updated_count} logs."))

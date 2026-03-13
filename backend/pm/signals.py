from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Task, TaskComment, ActivityLog
from projects.models import Project

@receiver(post_save, sender=Project)
def log_project_save(sender, instance, created, **kwargs):
    action = 'create' if created else 'update'
    # Note: We need a way to get the user. Signals don't have access to request.
    # For now, we'll skip logging if user is not available or handle it in views.
    # Alternatively, we can use a middleware to store the current user in a thread-local variable.
    pass

@receiver(post_save, sender=Task)
def log_task_save(sender, instance, created, **kwargs):
    action = 'create' if created else 'update'
    pass

@receiver(post_save, sender=TaskComment)
def log_comment_save(sender, instance, created, **kwargs):
    if created:
        ActivityLog.objects.create(
            user=instance.user,
            action='comment',
            target_type='task',
            target_id=instance.task.id,
            target_name=instance.task.name
        )

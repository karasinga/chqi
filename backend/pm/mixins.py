from .models import ActivityLog

class ActivityLoggingMixin:
    """
    Mixin to automatically log activity for ViewSets.
    Requires the ViewSet to define logging_target_type.
    """
    logging_target_type = None

    def get_logging_user(self):
        """
        Returns the user to be used for logging.
        """
        if self.request.user.is_authenticated:
            return self.request.user
        return None

    def log_activity(self, instance, action, target_name=None):
        """
        Creates an ActivityLog entry.
        """
        user = self.get_logging_user()
        if user and self.logging_target_type:
            ActivityLog.objects.create(
                user=user,
                action=action,
                target_type=self.logging_target_type,
                target_id=instance.id,
                target_name=target_name or str(instance)
            )

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_activity(instance, 'create')

    def perform_update(self, serializer):
        instance = serializer.save()
        self.log_activity(instance, 'update')

    def perform_destroy(self, instance):
        self.log_activity(instance, 'delete')
        instance.delete()

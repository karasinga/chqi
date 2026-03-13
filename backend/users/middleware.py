from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

class UserPresenceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Update last_active every 1 minute to avoid excessive DB writes
            now = timezone.now()
            last_active = request.user.last_active
            if not last_active or (now - last_active).total_seconds() > 60:
                User.objects.filter(pk=request.user.pk).update(last_active=now)
        
        response = self.get_response(request)
        return response

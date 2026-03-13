from rest_framework import viewsets
from .models import User
from .serializers import UserSerializer

from django.utils import timezone
from datetime import timedelta
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import action
from rest_framework.response import Response

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @method_decorator(ensure_csrf_cookie)
    @action(detail=False, methods=['get'])
    def online_count(self, request):
        fifteen_minutes_ago = timezone.now() - timedelta(minutes=15)
        count = User.objects.filter(last_active__gte=fifteen_minutes_ago).count()
        return Response({
            'count': count,
            'csrfToken': get_token(request)
        })

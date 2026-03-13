from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskCommentViewSet, ActivityLogViewSet, FrontendLogViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet)
router.register(r'comments', TaskCommentViewSet)
router.register(r'activity', ActivityLogViewSet)
router.register(r'logs', FrontendLogViewSet, basename='frontend-logs')

urlpatterns = [
    path('', include(router.urls)),
]

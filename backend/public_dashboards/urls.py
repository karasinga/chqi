from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import public_dashboards, PowerBIDashboardViewSet

router = DefaultRouter()
router.register(r'admin', PowerBIDashboardViewSet, basename='public-dashboard-admin')

urlpatterns = [
    path('', public_dashboards, name='public-dashboards'),
    path('', include(router.urls)),
]

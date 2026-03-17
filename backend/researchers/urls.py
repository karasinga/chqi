from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import public_researchers, ResearcherAdminViewSet

router = DefaultRouter()
router.register(r'admin', ResearcherAdminViewSet, basename='researcher-admin')

urlpatterns = [
    path('', public_researchers, name='public-researchers'),
    path('', include(router.urls)),
]

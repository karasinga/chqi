from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import UserViewSet
from django.shortcuts import redirect
from django.conf import settings

router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Redirect password-reset URLs to the React frontend.
    # FRONTEND_URL is set via env var (see settings.py / .env).
    re_path(r'^password-reset-confirm/(?P<uidb64>[^/]+)/(?P<token>[^/]+)/?$', 
         lambda r, uidb64, token: redirect(f"{settings.FRONTEND_URL}/reset-password/{uidb64}/{token}"), 
         name='password_reset_confirm'),
    path('password-reset-done/', lambda r: redirect(f"{settings.FRONTEND_URL}/login?reset=done"), name='password_reset_done'),
    path('password-reset-complete/', lambda r: redirect(f"{settings.FRONTEND_URL}/login?reset=complete"), name='password_reset_complete'),
]

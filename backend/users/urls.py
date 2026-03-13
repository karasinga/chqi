from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import UserViewSet
from django.shortcuts import redirect

router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Redirect dummy URLs to the React frontend
    # Passing raw params to see what's reaching the frontend, using re_path to allow `=` characters
    re_path(r'^password-reset-confirm/(?P<uidb64>[^/]+)/(?P<token>[^/]+)/?$', 
         lambda r, uidb64, token: redirect(f"http://localhost:5173/reset-password/{uidb64}/{token}"), 
         name='password_reset_confirm'),
    path('password-reset-done/', lambda r: redirect('http://localhost:5173/login?reset=done'), name='password_reset_done'),
    path('password-reset-complete/', lambda r: redirect('http://localhost:5173/login?reset=complete'), name='password_reset_complete'),
]

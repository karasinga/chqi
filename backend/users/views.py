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
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
import logging
import re

logger = logging.getLogger(__name__)

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

    @action(detail=False, methods=['post'], permission_classes=[])
    def login(self, request):
        from django.contrib.auth import authenticate, login as auth_login
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            auth_login(request, user)
            return Response({'detail': 'Successfully logged in.', 'user': UserSerializer(user).data})
        else:
            return Response({'detail': 'Invalid credentials'}, status=401)

    @action(detail=False, methods=['post'])
    def logout(self, request):
        from django.contrib.auth import logout as auth_logout
        auth_logout(request)
        return Response({'detail': 'Successfully logged out.'})

    @action(detail=False, methods=['get'])
    def me(self, request):
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user).data)
        return Response({'detail': 'Not authenticated'}, status=401)

    @action(detail=False, methods=['post'], permission_classes=[])
    def password_reset(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'Email is required.'}, status=400)
        
        form = PasswordResetForm({'email': email})
        if form.is_valid():
            try:
                # We need to see what token is being generated to compare with what's received
                # PasswordResetForm.save doesn't return the tokens, but it uses default_token_generator
                # We'll just log a fresh one for the user for debugging purposes
                for user in form.get_users(email):
                    temp_token = default_token_generator.make_token(user)
                    temp_uid = urlsafe_base64_encode(force_bytes(user.pk))
                    logger.info(f"GENERATED DEBUG TOKEN: user={user.username}, uid={temp_uid}, token={temp_token}")

                form.save(
                    use_https=request.is_secure(),
                    email_template_name='registration/password_reset_email.html',
                    request=request,
                )
                return Response({'detail': 'Password reset email sent.'})
            except Exception as e:
                import traceback
                print(f"PASSWORD RESET ERROR: {str(e)}")
                traceback.print_exc()
                return Response({'detail': f'Backend error: {str(e)}'}, status=500)
        return Response({'detail': 'Invalid email.'}, status=400)

    @action(detail=False, methods=['post'], permission_classes=[], url_path='password_reset_confirm')
    def password_reset_confirm(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password1 = request.data.get('new_password1')
        new_password2 = request.data.get('new_password2')

        logger.info(f"PASSWORD_RESET_CONFIRM: uidb64='{uidb64}', token='{token}'")

        if not all([uidb64, token, new_password1, new_password2]):
            logger.warning("PASSWORD_RESET_CONFIRM: Missing fields in request data")
            return Response({'detail': 'All fields are required.'}, status=400)

        logger.info(f"RAW RECEIVED: uidb64='{uidb64}', token='{token}'")
        
        # Strip ONLY trailing slashes which often come from React params
        if uidb64 and uidb64.endswith('/'): uidb64 = uidb64[:-1]
        if token and token.endswith('/'): token = token[:-1]

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            logger.info(f"PASSWORD_RESET_CONFIRM: Found user {user.username} (ID: {uid})")
        except (TypeError, ValueError, OverflowError, User.DoesNotExist) as e:
            logger.error(f"PASSWORD_RESET_CONFIRM: User lookup failed for uidb64={uidb64}: {str(e)}")
            user = None

        if user is not None:
            token_valid = default_token_generator.check_token(user, token)
            logger.info(f"PASSWORD_RESET_CONFIRM: Token validation result: {token_valid}")
            
            if token_valid:
                form = SetPasswordForm(user, request.data)
                if form.is_valid():
                    form.save()
                    logger.info(f"PASSWORD_RESET_CONFIRM: Password reset successful for user {user.username}")
                    return Response({'detail': 'Password has been reset successfully.'})
                
                logger.warning(f"PASSWORD_RESET_CONFIRM: SetPasswordForm invalid for user {user.username}: {form.errors}")
                return Response({'detail': form.errors}, status=400)
            else:
                logger.warning(f"PASSWORD_RESET_CONFIRM: Token invalid for user {user.username}")
                return Response({'detail': 'The reset link is invalid or has expired.'}, status=400)
        else:
            return Response({'detail': 'The reset link is invalid or has expired.'}, status=400)

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
import logging

from .models import User

logger = logging.getLogger(__name__)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('role',)}),
    )

    def save_model(self, request, obj, form, change):
        # New users created in the admin are invited by email and must set their
        # own password — so we never store a usable password for them.
        is_new = not change
        super().save_model(request, obj, form, change)

        if is_new and obj.email:
            obj.set_unusable_password()
            obj.save(update_fields=['password'])
            self.send_invite_email(obj)

    def send_invite_email(self, user):
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uidb64}/{token}"

        context = {
            'user': user,
            'login': user.email or user.username,
            'reset_url': reset_url,
            'site_name': 'CHQI Dashboard',
        }

        subject = 'Welcome to CHQI Dashboard — set your password'
        try:
            text_body = render_to_string('users/invite_email.txt', context)
            html_body = render_to_string('users/invite_email.html', context)
        except Exception:
            logger.exception('Failed to render invite email templates for %s', user.email)
            return

        email = EmailMultiAlternatives(
            subject,
            text_body,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
        )
        email.attach_alternative(html_body, 'text/html')

        try:
            email.send()
            logger.info('Invite email sent to %s', user.email)
        except Exception:
            # Don't break user creation if mail delivery fails; just log it.
            logger.exception('Failed to send invite email to %s', user.email)

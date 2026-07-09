from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.conf import settings

from common.email import send_templated_email

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role',)}),
    )
    # Include `email` so admins can invite users by email (the invite is only
    # sent when an email address is provided). `role` is also collected here.
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role'),
        }),
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
        }

        subject = 'Welcome to CHQI Dashboard — set your password'
        # Don't break user creation if mail rendering/delivery fails; the
        # helper logs and returns False on error.
        send_templated_email(
            subject,
            user.email,
            text_template='users/invite_email.txt',
            html_template='users/invite_email.html',
            context=context,
        )

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model


class EmailOrUsernameBackend(ModelBackend):
    """Authenticate users by username OR email address.

    Keeps Django's default username behavior and additionally allows logging
    in with the email associated with the account. This makes the admin
    "invite by email" flow truthful: the invited login is the user's email.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        # Preserve the default username lookup first (also handles the
        # timing-attack dummy password check for unknown usernames).
        user = super().authenticate(
            request, username=username, password=password, **kwargs
        )
        if user is not None:
            return user

        if username is None:
            return None

        UserModel = get_user_model()
        try:
            email_user = UserModel.objects.get(email__iexact=username)
        except UserModel.DoesNotExist:
            return None
        except UserModel.MultipleObjectsReturned:
            # Ambiguous emails: prefer an exact username match, else the first.
            email_user = (
                UserModel.objects.filter(username__iexact=username).first()
                or UserModel.objects.filter(email__iexact=username).first()
            )
            if email_user is None:
                return None

        if email_user.check_password(password) and self.user_can_authenticate(
            email_user
        ):
            return email_user
        return None

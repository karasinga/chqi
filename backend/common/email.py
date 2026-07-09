import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def base_email_context() -> dict:
    """Shared branding context used by every email layout.

    Mirrors the values the original invite template relied on
    (`site_url`, `logo_url` derived from FRONTEND_URL; `support_email`
    from DEFAULT_FROM_EMAIL).
    """
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    return {
        'site_name': 'CHQI Dashboard',
        'site_url': settings.FRONTEND_URL,
        'logo_url': f'{frontend_url}/assets/logo.png',
        'support_email': settings.DEFAULT_FROM_EMAIL,
    }


def send_templated_email(
    subject,
    to,
    *,
    text_template=None,
    html_template=None,
    context=None,
    from_email=None,
):
    """Render a branded email (shared layout) and send it.

    At least one of ``text_template`` / ``html_template`` is required. ``to`` may
    be a single address or a list. Returns ``True`` if the message was sent,
    ``False`` if rendering or delivery failed (errors are logged, not raised, so
    callers such as user creation and pipeline alerts can continue).
    """
    if not (text_template or html_template):
        raise ValueError('send_templated_email requires text_template or html_template')

    context = {**(context or {}), **base_email_context()}
    from_email = from_email or settings.DEFAULT_FROM_EMAIL
    recipients = [to] if isinstance(to, str) else list(to)

    try:
        text_body = render_to_string(text_template, context) if text_template else None
        html_body = render_to_string(html_template, context) if html_template else None
    except Exception:
        logger.exception('Failed to render email templates for "%s"', subject)
        return False

    email = EmailMultiAlternatives(subject, text_body or '', from_email, recipients)
    if html_body:
        email.attach_alternative(html_body, 'text/html')

    try:
        email.send()
        logger.info('Email "%s" sent to %s', subject, recipients)
        return True
    except Exception:
        logger.exception('Failed to send email "%s" to %s', subject, recipients)
        return False


def send_admin_email(subject, *, text_template=None, html_template=None, context=None):
    """Send a branded email to the configured ADMINS (SERVER_EMAIL as sender)."""
    recipients = [email for _, email in settings.ADMINS]
    return send_templated_email(
        subject,
        recipients,
        text_template=text_template,
        html_template=html_template,
        context=context,
        from_email=settings.SERVER_EMAIL,
    )

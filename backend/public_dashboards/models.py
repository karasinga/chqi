"""
Public PowerBI dashboards surfaced on the landing page (no login required).

Admins manage these via Django admin — paste the PowerBI "Publish to web"
embed URL and toggle visibility. The landing page embeds each one in an
iframe, grouped by `division` (e.g. "Division of Mental Health, Kenya").
"""
from urllib.parse import urlparse

from django.core.exceptions import ValidationError
from django.db import models

# Only PowerBI publish-to-web embed URLs are allowed — anything else would be
# an arbitrary iframe injection vector controlled by an admin, but we still
# restrict the host so a typo can't embed an unexpected third-party page.
_ALLOWED_EMBED_HOSTS = {'app.powerbi.com'}


class PowerBIDashboard(models.Model):
    title = models.CharField(
        max_length=200,
        help_text="Display name shown above the embedded report",
    )
    division = models.CharField(
        max_length=200,
        blank=True,
        help_text="Grouping label, e.g. 'Division of Mental Health, Kenya'. "
                  "Dashboards with the same division are grouped together.",
    )
    description = models.TextField(
        blank=True,
        help_text="Optional blurb shown under the title",
    )
    embed_url = models.URLField(
        max_length=2000,
        help_text="PowerBI 'Publish to web' embed URL "
                  "(https://app.powerbi.com/view?r=...)",
    )
    is_visible = models.BooleanField(
        default=True,
        help_text="Toggle to show/hide this dashboard on the public site",
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Lower numbers appear first within a division",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['division', 'display_order', 'title']
        verbose_name = 'Public Dashboard'
        verbose_name_plural = 'Public Dashboards'

    def __str__(self):
        return f"{self.title}" + (f" — {self.division}" if self.division else "")

    def clean(self):
        super().clean()
        host = urlparse(self.embed_url).hostname or ''
        if host.lower() not in _ALLOWED_EMBED_HOSTS:
            raise ValidationError(
                {'embed_url': "Embed URL must be a PowerBI link "
                              "(https://app.powerbi.com/...)."}
            )

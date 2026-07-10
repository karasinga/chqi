from rest_framework import serializers
from urllib.parse import urlparse

from .models import PowerBIDashboard, _ALLOWED_EMBED_HOSTS


class PowerBIDashboardSerializer(serializers.ModelSerializer):
    """Public-facing serializer — read-only subset embedded on the landing page."""

    class Meta:
        model = PowerBIDashboard
        fields = ['id', 'title', 'division', 'description', 'embed_url', 'display_order']


class PowerBIDashboardAdminSerializer(serializers.ModelSerializer):
    """Full serializer for admin CRUD operations."""

    class Meta:
        model = PowerBIDashboard
        fields = [
            'id', 'title', 'division', 'description', 'embed_url',
            'is_visible', 'display_order', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_embed_url(self, value):
        # DRF ModelSerializer does not run model.clean(), so enforce the host
        # allowlist here too — otherwise the API accepts arbitrary iframe hosts.
        host = urlparse(value).hostname or ''
        if host.lower() not in _ALLOWED_EMBED_HOSTS:
            raise serializers.ValidationError(
                "Embed URL must be a PowerBI link (https://app.powerbi.com/...)."
            )
        return value

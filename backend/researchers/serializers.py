from rest_framework import serializers
from .models import Researcher


class ResearcherSerializer(serializers.ModelSerializer):
    """Serializer for public-facing researcher display (read-only)."""
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Researcher
        fields = [
            'id', 'name', 'title', 'specialty', 'bio',
            'email', 'phone', 'photo_url', 'display_order',
        ]

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class ResearcherAdminSerializer(serializers.ModelSerializer):
    """Full serializer for admin CRUD operations."""
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Researcher
        fields = [
            'id', 'name', 'title', 'specialty', 'bio',
            'email', 'phone', 'photo', 'photo_url',
            'is_visible', 'display_order',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

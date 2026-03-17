from django.contrib import admin
from .models import Researcher


@admin.register(Researcher)
class ResearcherAdmin(admin.ModelAdmin):
    list_display = ['name', 'title', 'specialty', 'is_visible', 'display_order', 'updated_at']
    list_editable = ['is_visible', 'display_order']
    list_filter = ['is_visible']
    search_fields = ['name', 'title', 'specialty', 'email']
    ordering = ['display_order', 'name']
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'title', 'specialty', 'photo')
        }),
        ('Contact', {
            'fields': ('email', 'phone')
        }),
        ('Biography', {
            'fields': ('bio',)
        }),
        ('Display Settings', {
            'fields': ('is_visible', 'display_order')
        }),
    )

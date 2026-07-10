from django.contrib import admin

from .models import PowerBIDashboard


@admin.register(PowerBIDashboard)
class PowerBIDashboardAdmin(admin.ModelAdmin):
    list_display = ['title', 'division', 'is_visible', 'display_order', 'updated_at']
    list_editable = ['is_visible', 'display_order']
    list_filter = ['division', 'is_visible']
    search_fields = ['title', 'division', 'description']
    ordering = ['division', 'display_order', 'title']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Dashboard', {
            'fields': ('title', 'division', 'description', 'embed_url'),
        }),
        ('Display', {
            'fields': ('is_visible', 'display_order'),
        }),
        ('Metadata', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at'),
        }),
    )

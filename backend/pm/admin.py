from django.contrib import admin
from django.contrib import admin
from .models import Task, TaskComment, ActivityLog

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'start_date', 'duration', 'is_critical')
    list_filter = ('project', 'is_critical')
    search_fields = ('name', 'description')

@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'user', 'created_at')
    list_filter = ('task', 'user')
    search_fields = ('content',)

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'target_type', 'target_name', 'timestamp')
    list_filter = ('action', 'target_type', 'user')
    search_fields = ('target_name', 'user__username')

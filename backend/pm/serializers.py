from rest_framework import serializers
from .models import Task, TaskComment, ActivityLog

class TaskCommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'user', 'username', 'content', 'created_at']
        read_only_fields = ['user']

class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'username', 'action', 'target_type', 'target_id', 'target_name', 'timestamp']

class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.ReadOnlyField(source='assignee.username')
    project_name = serializers.ReadOnlyField(source='project.name')
    comments = TaskCommentSerializer(many=True, read_only=True)
    comment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = '__all__'
# Trigger reload

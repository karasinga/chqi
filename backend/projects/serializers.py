from rest_framework import serializers
from .models import Project, ProjectFile, FileFolder, Milestone
import os

class ProjectFileSerializer(serializers.ModelSerializer):
    file_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    uploader_name = serializers.SerializerMethodField()

    
    class Meta:
        model = ProjectFile
        fields = ['id', 'project', 'folder', 'file', 'file_name', 'file_url', 'file_type', 'file_size', 'uploaded_at', 'uploaded_by', 'uploader_name']

        read_only_fields = ['file_type', 'file_size']
    
    def get_file_name(self, obj):
        return os.path.basename(obj.file.name) if obj.file else ''
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None

    def get_uploader_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return "Unknown"


class FileFolderSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    files = ProjectFileSerializer(many=True, read_only=True)
    path = serializers.SerializerMethodField()
    
    class Meta:
        model = FileFolder
        fields = ['id', 'project', 'name', 'parent', 'path', 'children', 'files', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_children(self, obj):
        children = obj.children.all()
        return FileFolderSerializer(children, many=True, context=self.context).data
    
    def get_path(self, obj):
        return obj.get_path()

class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ['id', 'project', 'name', 'description', 'due_date', 'status', 'progress', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class ProjectSerializer(serializers.ModelSerializer):
    files = ProjectFileSerializer(many=True, read_only=True)
    folders = FileFolderSerializer(many=True, read_only=True)
    milestones = MilestoneSerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'start_date', 'end_date', 'status', 'powerbi_embed_url', 'total_budget', 'created_at', 'updated_at', 'files', 'folders', 'milestones']

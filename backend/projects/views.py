from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Project, ProjectFile, FileFolder, Milestone
from .serializers import ProjectSerializer, ProjectFileSerializer, FileFolderSerializer, MilestoneSerializer
from pm.mixins import ActivityLoggingMixin

class ProjectViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    logging_target_type = 'project'

    def perform_create(self, serializer):
        project = serializer.save()
        self.log_activity(project, 'create')

    def perform_update(self, serializer):
        project = serializer.save()
        self.log_activity(project, 'update')

class FileFolderViewSet(viewsets.ModelViewSet):
    queryset = FileFolder.objects.all()
    serializer_class = FileFolderSerializer
    
    def get_queryset(self):
        queryset = FileFolder.objects.all()
        project_id = self.request.query_params.get('project', None)
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get the complete folder tree for a project"""
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project parameter is required'}, status=400)
        
        # Get root folders (folders with no parent)
        root_folders = FileFolder.objects.filter(project_id=project_id, parent=None)
        serializer = FileFolderSerializer(root_folders, many=True, context={'request': request})
        
        # Also get files with no folder (root files)
        root_files = ProjectFile.objects.filter(project_id=project_id, folder=None)
        file_serializer = ProjectFileSerializer(root_files, many=True, context={'request': request})
        
        return Response({
            'folders': serializer.data,
            'files': file_serializer.data
        })

class ProjectFileViewSet(viewsets.ModelViewSet):
    queryset = ProjectFile.objects.all()
    serializer_class = ProjectFileSerializer
    
    def get_queryset(self):
        queryset = ProjectFile.objects.all()
        project_id = self.request.query_params.get('project', None)
        folder_id = self.request.query_params.get('folder', None)
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)
        
        return queryset

class MilestoneViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    queryset = Milestone.objects.all()
    serializer_class = MilestoneSerializer
    logging_target_type = 'milestone'

    def get_queryset(self):
        queryset = Milestone.objects.all()
        project_id = self.request.query_params.get('project', None)
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

    def perform_create(self, serializer):
        milestone = serializer.save()
        self.log_activity(milestone, 'create')

    def perform_update(self, serializer):
        milestone = serializer.save()
        self.log_activity(milestone, 'update')

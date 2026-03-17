from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Researcher
from .serializers import ResearcherSerializer, ResearcherAdminSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def public_researchers(request):
    """
    Public endpoint — returns only visible researchers, ordered by display_order.
    No authentication required.
    """
    researchers = Researcher.objects.filter(is_visible=True).order_by('display_order', 'name')
    serializer = ResearcherSerializer(researchers, many=True, context={'request': request})
    return Response(serializer.data)


class ResearcherAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for researchers.
    Supports photo upload via multipart form data.
    """
    queryset = Researcher.objects.all().order_by('display_order', 'name')
    serializer_class = ResearcherAdminSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """PATCH — used for toggling is_visible without sending all fields."""
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

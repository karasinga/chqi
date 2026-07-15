from django.views.decorators.cache import cache_page
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.viewsets import ModelViewSet

from .models import PowerBIDashboard
from .serializers import PowerBIDashboardSerializer, PowerBIDashboardAdminSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def public_dashboards(request):
    """
    Public endpoint — returns only visible dashboards, ordered by division
    then display_order. No authentication required (embedded on landing page).

    Cached 60s (hot landing-page path) and throttled via the
    `public_dashboards` scope (see REST_FRAMEWORK in settings).
    """
    dashboards = PowerBIDashboard.objects.filter(is_visible=True).order_by(
        'division', 'display_order', 'title'
    )
    serializer = PowerBIDashboardSerializer(dashboards, many=True)
    return Response(serializer.data)


# ScopedRateThrottle reads `view.throttle_scope`; set it on the FBV itself.
public_dashboards.throttle_scope = 'public_dashboards'

# cache_page needs a Django-style view; wrap the DRF function-based view so
# the cache middleware sees the response. The scope attr set above is read
# before the throttle checks, so it survives the wrap.
public_dashboards = cache_page(60)(public_dashboards)


class PowerBIDashboardViewSet(ModelViewSet):
    """
    Admin-only CRUD for public PowerBI dashboards.
    Used by the in-app Settings panel (IsAuthenticated session).
    """
    queryset = PowerBIDashboard.objects.all().order_by('division', 'display_order', 'title')
    serializer_class = PowerBIDashboardAdminSerializer

    def get_permissions(self):
        return [IsAdminUser()]

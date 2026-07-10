from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import PowerBIDashboard

User = get_user_model()

VALID_URL = 'https://app.powerbi.com/view?r=eyJabcd1234'
OTHER_URL = 'https://evil.example.com/report'


def _make_dash(**kwargs):
    """Create a PowerBIDashboard with sane defaults (skips full_clean on
    fields the tests don't care about)."""
    defaults = {
        'title': 'Untitled',
        'embed_url': VALID_URL,
        'is_visible': True,
        'display_order': 0,
    }
    defaults.update(kwargs)
    return PowerBIDashboard.objects.create(**defaults)


class PublicDashboardsEndpointTest(TestCase):
    """GET /api/public-dashboards/ — AllowAny, visibility filter, ordering."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def test_anonymous_get_returns_200(self):
        url = reverse('public-dashboards')
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

    def test_hidden_dashboards_excluded(self):
        _make_dash(title='Visible', is_visible=True)
        _make_dash(title='Secret', is_visible=False)
        url = reverse('public-dashboards')
        res = self.client.get(url)
        titles = [d['title'] for d in res.json()]
        self.assertIn('Visible', titles)
        self.assertNotIn('Secret', titles)

    def test_ordering_division_display_order_title(self):
        _make_dash(title='B Mid', division='Zeta', display_order=10)
        _make_dash(title='A Mid', division='Zeta', display_order=10)
        _make_dash(title='C Low', division='Alpha', display_order=5)
        url = reverse('public-dashboards')
        res = self.client.get(url)
        titles = [d['title'] for d in res.json()]
        # Alpha division first, then Zeta ordered by display_order then title.
        self.assertEqual(titles, ['C Low', 'A Mid', 'B Mid'])

    def test_serializer_omits_internal_fields(self):
        _make_dash(is_visible=False, display_order=99)
        _make_dash(title='Shown', is_visible=True)
        url = reverse('public-dashboards')
        res = self.client.get(url)
        item = next(d for d in res.json() if d['title'] == 'Shown')
        self.assertEqual(
            set(item.keys()),
            {'id', 'title', 'division', 'description', 'embed_url', 'display_order'},
        )


class PowerBIDashboardAdminAuthTest(TestCase):
    """Admin ViewSet requires auth; CRUD works once authenticated."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username='admin', password='pw')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def tearDown(self):
        cache.clear()

    def test_unauthenticated_list_rejected(self):
        anon = APIClient()
        res = anon.get(reverse('public-dashboard-admin-list'))
        self.assertIn(res.status_code, (401, 403))

    def test_authenticated_list_returns_all(self):
        _make_dash(title='Visible', is_visible=True)
        _make_dash(title='Hidden', is_visible=False)
        res = self.client.get(reverse('public-dashboard-admin-list'))
        self.assertEqual(res.status_code, 200)
        titles = [d['title'] for d in res.json()]
        # Admin sees both visible AND hidden.
        self.assertEqual(set(titles), {'Visible', 'Hidden'})

    def test_create_and_patch_visibility(self):
        create = self.client.post(
            reverse('public-dashboard-admin-list'),
            {'title': 'New Report', 'embed_url': VALID_URL, 'display_order': 0},
        )
        self.assertEqual(create.status_code, 201)
        pk = create.json()['id']
        self.assertTrue(PowerBIDashboard.objects.filter(pk=pk).exists())

        patch = self.client.patch(
            reverse('public-dashboard-admin-detail', args=[pk]),
            {'is_visible': False},
        )
        self.assertEqual(patch.status_code, 200)
        self.assertFalse(PowerBIDashboard.objects.get(pk=pk).is_visible)

    def test_put_requires_all_required_fields(self):
        # PUT is a full update — missing `title` (required) must 400, NOT
        # silently patch (regression guard for the old partial=True override).
        d = _make_dash(title='Original', embed_url=VALID_URL)
        res = self.client.put(
            reverse('public-dashboard-admin-detail', args=[d.id]),
            {'embed_url': VALID_URL, 'display_order': 0},  # no title
        )
        self.assertEqual(res.status_code, 400)
        # Unchanged.
        self.assertEqual(PowerBIDashboard.objects.get(pk=d.id).title, 'Original')

    def test_create_rejects_non_powerbi_host(self):
        res = self.client.post(
            reverse('public-dashboard-admin-list'),
            {'title': 'Bad', 'embed_url': OTHER_URL, 'display_order': 0},
        )
        self.assertEqual(res.status_code, 400)


class PowerBIDashboardModelValidationTest(TestCase):
    """PowerBIDashboard.clean() enforces the embed-host allowlist."""

    def test_clean_accepts_powerbi_host(self):
        d = _make_dash(embed_url=VALID_URL)
        d.clean()  # must not raise

    def test_clean_rejects_non_powerbi_host(self):
        d = _make_dash(embed_url=OTHER_URL)
        with self.assertRaises(Exception) as ctx:
            d.full_clean()
        self.assertIn('embed_url', str(ctx.exception).lower())

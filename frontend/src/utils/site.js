// Domain-aware routing for the dual-domain setup:
//   chqi.org            -> public landing front door (links out to the app)
//   dashboards.chqi.org -> the actual application
// One build is served to both domains via Coolify; behavior switches on the host.
// See App.jsx + PublicSite.jsx for usage.

// Override the dashboard origin per-deployment with VITE_DASHBOARD_URL if needed
// (e.g. VITE_DASHBOARD_URL=https://dashboards.chqi.org).
export const DASHBOARD_BASE_URL =
    import.meta.env.VITE_DASHBOARD_URL || 'https://dashboards.chqi.org';

export const DASHBOARD_LOGIN_URL = `${DASHBOARD_BASE_URL}/login`;

// Hosts that should behave as the public landing page rather than the app itself.
const LANDING_HOSTS = ['chqi.org', 'www.chqi.org'];

export const isLandingDomain = () => {
    if (typeof window === 'undefined') return false;
    return LANDING_HOSTS.includes(window.location.hostname);
};

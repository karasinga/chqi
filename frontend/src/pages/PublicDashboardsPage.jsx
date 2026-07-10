import React from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme/colors';
import PublicDashboardsGrid from '../components/PublicDashboards';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import { isLandingDomain, DASHBOARD_LOGIN_URL } from '../utils/site';

// Dedicated, no-login public page for PowerBI dashboards.
// Linked from the landing page teaser so the marketing site stays fast.
const PublicDashboardsPage = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
        if (isLandingDomain()) {
            window.location.href = DASHBOARD_LOGIN_URL;
        } else {
            navigate('/login');
        }
    };

    const handleNavLink = (href) => {
        if (href.startsWith('/')) {
            navigate(href);
        } else if (href.startsWith('#')) {
            document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <PublicHeader />

            <main style={{ flex: 1 }}>
        {/* Branded header */}
        <section style={{
            background: `linear-gradient(135deg, ${colors.navy} 0%, #0d1f3c 40%, ${colors.navyLight} 100%)`,
            padding: '96px 5% 56px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Decorative orbs */}
            <div style={{
                position: 'absolute', top: '-10%', right: '-5%',
                width: 500, height: 500, borderRadius: '50%',
                background: `radial-gradient(circle, ${colors.teal}30 0%, transparent 70%)`,
                filter: 'blur(60px)',
            }} />
            <div style={{
                position: 'absolute', bottom: '-10%', left: '-8%',
                width: 400, height: 400, borderRadius: '50%',
                background: `radial-gradient(circle, ${colors.navyLight}50 0%, transparent 70%)`,
                filter: 'blur(80px)',
            }} />
            <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'rgba(27,172,167,0.15)',
                    border: `1px solid ${colors.teal}40`,
                    borderRadius: 100, padding: '8px 20px',
                    color: colors.tealLight, fontSize: '0.82rem', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 24,
                }}>
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: colors.teal, display: 'inline-block',
                    }} />
                    Data &amp; Insights
                </span>
                <h1 style={{
                    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                    fontWeight: 900, color: '#fff', letterSpacing: '-0.03em',
                    lineHeight: 1.1, marginBottom: 16,
                }}>
                    Public Dashboards
                </h1>
                <p style={{
                    color: colors.grayLight,
                    fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                    lineHeight: 1.7, maxWidth: 640,
                }}>
                    Explore our interactive PowerBI reports — open to all, no login required.
                </p>
            </div>
        </section>

        {/* Dashboard grid */}
        <PublicDashboardsGrid />
            </main>

            <PublicFooter onLoginClick={handleLogin} onNavLink={handleNavLink} />
        </div>
    );
};

export default PublicDashboardsPage;

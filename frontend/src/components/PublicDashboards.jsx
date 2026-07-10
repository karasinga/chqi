import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { colors } from '../theme/colors';
import LazyPowerBI from './LazyPowerBI';
import ChqiLogoSpinner from './ChqiLogoSpinner';

// Inline icons
const ChartIcon = ({ size = 22, color = colors.teal }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="20" x2="6" y2="13" />
        <line x1="12" y1="20" x2="12" y2="7" />
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="3" y1="22" x2="21" y2="22" />
    </svg>
);

const EmptyIcon = ({ size = 48, color = colors.gray }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
);

// Single embedded PowerBI report card
const DashboardCard = ({ dashboard }) => (
    <div style={{
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(24,47,91,0.08)',
        border: '1px solid rgba(24,47,91,0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    }}
        onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = '0 18px 48px rgba(24,47,91,0.16)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(24,47,91,0.08)';
        }}
    >
        {(dashboard.title || dashboard.description) && (
            <div style={{ padding: '24px 28px 0' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: `${colors.teal}14`, color: colors.teal,
                    borderRadius: 100, padding: '4px 12px',
                    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', marginBottom: 14,
                }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.teal, display: 'inline-block' }} />
                    Power BI
                </span>
                {dashboard.title && (
                    <h3 style={{
                        color: colors.navy, fontWeight: 800,
                        fontSize: '1.15rem', margin: '0 0 8px',
                        lineHeight: 1.3,
                    }}>
                        {dashboard.title}
                    </h3>
                )}
                {dashboard.description && (
                    <p style={{
                        color: '#666', fontSize: '0.92rem', lineHeight: 1.7,
                        margin: '0 0 4px',
                    }}>
                        {dashboard.description}
                    </p>
                )}
            </div>
        )}
        <div style={{ marginTop: 18, padding: '0 16px 16px' }}>
            <div style={{
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid rgba(24,47,91,0.08)',
                background: '#F5F5F5',
            }}>
                <LazyPowerBI
                    src={dashboard.embed_url}
                    title={dashboard.title || 'Public Dashboard'}
                />
            </div>
        </div>
    </div>
);

// Public dashboards grid (fetched, grouped by division).
// Reusable block rendered inside the dedicated /dashboards page.
const PublicDashboardsGrid = () => {
    const [dashboards, setDashboards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [active, setActive] = useState('All');

    useEffect(() => {
        let cancelled = false;
        const fetchDashboards = async () => {
            try {
                const res = await api.get('/public-dashboards/');
                if (!cancelled) setDashboards(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error('Failed to fetch public dashboards:', err);
                if (!cancelled) setError(
                    err?.status === 404
                        ? 'Public dashboards not found.'
                        : 'Unable to load dashboards. Please try again later.'
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchDashboards();
        return () => { cancelled = true; };
    }, []);

    // Group visible dashboards by division (blank division -> "General").
    const groups = useMemo(() => {
        const map = new Map();
        dashboards.forEach(d => {
            const key = d.division?.trim() || 'General';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(d);
        });
        return Array.from(map.entries());
    }, [dashboards]);

    // Division filter options (only meaningful when more than one division).
    const divisions = useMemo(() => ['All', ...groups.map(([d]) => d)], [groups]);
    const visible = active === 'All' ? groups : groups.filter(([d]) => d === active);

    const shell = (children) => (
        <section style={{ background: '#F6F8FB', padding: '64px 0 100px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
                {children}
            </div>
        </section>
    );

    if (loading) {
        return shell(
            <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <ChqiLogoSpinner size={72} />
                <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>Loading dashboards...</p>
            </div>
        );
    }

    if (error) {
        return shell(
            <div style={{ textAlign: 'center', color: '#999', fontSize: '0.95rem', padding: '60px 0' }}>
                {error}
            </div>
        );
    }

    if (dashboards.length === 0) {
        return shell(
            <div style={{
                textAlign: 'center', color: '#999', padding: '60px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
                <EmptyIcon />
                <p style={{ margin: 0, fontSize: '0.95rem' }}>No public dashboards available yet.</p>
            </div>
        );
    }

    return shell(
        <div>
            {groups.length > 1 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
                    {divisions.map(div => {
                        const isActive = div === active;
                        return (
                            <button
                                key={div}
                                onClick={() => setActive(div)}
                                style={{
                                    cursor: 'pointer',
                                    border: `1px solid ${isActive ? colors.teal : colors.navyLighter}`,
                                    background: isActive ? colors.teal : '#fff',
                                    color: isActive ? '#fff' : colors.navy,
                                    borderRadius: 100,
                                    padding: '9px 20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? `0 4px 14px ${colors.teal}40` : 'none',
                                }}
                            >
                                {div}
                            </button>
                        );
                    })}
                </div>
            )}

            {visible.map(([division, items]) => (
                <div key={division} style={{ marginBottom: 56 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 22, gap: 16, flexWrap: 'wrap',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: `${colors.teal}14`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: colors.teal,
                            }}>
                                <ChartIcon />
                            </span>
                            <h3 style={{
                                color: colors.navy, fontWeight: 800, fontSize: '1.25rem',
                                margin: 0, letterSpacing: '-0.01em',
                            }}>
                                {division}
                            </h3>
                        </div>
                        <span style={{
                            background: '#fff', color: colors.gray,
                            border: `1px solid ${colors.navyLighter}`,
                            borderRadius: 100, padding: '5px 14px',
                            fontSize: '0.78rem', fontWeight: 600,
                        }}>
                            {items.length} {items.length === 1 ? 'report' : 'reports'}
                        </span>
                    </div>
                    <div className="pub-dash-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                        gap: 28,
                    }}>
                        {items.map(d => (
                            <DashboardCard key={d.id} dashboard={d} />
                        ))}
                    </div>
                </div>
            ))}
            <style>{`
                @media (max-width: 520px) {
                    .pub-dash-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default PublicDashboardsGrid;

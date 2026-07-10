import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

const SearchIcon = ({ size = 18, color = colors.gray }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const ExternalLinkIcon = ({ size = 18, color = colors.navy }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

const ExpandIcon = ({ size = 18, color = colors.navy }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
);

const CloseIcon = ({ size = 22, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// Single embedded PowerBI report card, with open-in-new-tab + expand controls.
const DashboardCard = ({ dashboard, onExpand }) => (
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
            <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
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
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <a
                        href={dashboard.embed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${dashboard.title || 'dashboard'} in a new tab`}
                        title="Open in new tab"
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 36, borderRadius: 10,
                            color: colors.navy, textDecoration: 'none',
                            border: `1px solid ${colors.navyLighter}`,
                            background: '#fff', transition: 'all 0.2s ease',
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = colors.navyLighter; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                    >
                        <ExternalLinkIcon />
                    </a>
                    <button
                        type="button"
                        onClick={() => onExpand(dashboard)}
                        aria-label={`Expand ${dashboard.title || 'dashboard'}`}
                        title="Expand"
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 36, borderRadius: 10,
                            color: colors.navy, cursor: 'pointer',
                            border: `1px solid ${colors.navyLighter}`,
                            background: '#fff', transition: 'all 0.2s ease',
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = colors.navyLighter; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                    >
                        <ExpandIcon />
                    </button>
                </div>
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

// Fullscreen overlay for a single report.
const FullscreenOverlay = ({ dashboard, onClose }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={dashboard.title || 'Dashboard'}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(10,22,40,0.92)', backdropFilter: 'blur(6px)',
                display: 'flex', flexDirection: 'column',
                padding: 'clamp(16px, 4vw, 48px)',
            }}
        >
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, marginBottom: 16, color: '#fff',
            }}>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', fontWeight: 800 }}>
                    {dashboard.title || 'Public Dashboard'}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    title="Close (Esc)"
                    style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 44, height: 44, borderRadius: 12,
                        background: 'rgba(255,255,255,0.12)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                    }}
                >
                    <CloseIcon />
                </button>
            </div>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    flex: 1, minHeight: 0, borderRadius: 16, overflow: 'hidden',
                    background: '#fff', border: '1px solid rgba(255,255,255,0.15)',
                }}
            >
                <LazyPowerBI
                    src={dashboard.embed_url}
                    title={dashboard.title || 'Public Dashboard'}
                    height="100%"
                />
            </div>
        </div>
    );
};

// Public dashboards grid (fetched, grouped by division, searchable).
// Reusable block rendered inside the dedicated /dashboards page.
const PublicDashboardsGrid = () => {
    const [dashboards, setDashboards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [active, setActive] = useState('All');
    const [query, setQuery] = useState('');
    const [fullscreen, setFullscreen] = useState(null);

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

    const onExpand = useCallback((d) => setFullscreen(d), []);
    const onCloseFullscreen = useCallback(() => setFullscreen(null), []);

    // Apply the text query, then group by division (blank division -> "General").
    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? dashboards.filter(d =>
                (d.title || '').toLowerCase().includes(q) ||
                (d.description || '').toLowerCase().includes(q) ||
                (d.division || '').toLowerCase().includes(q))
            : dashboards;

        const map = new Map();
        filtered.forEach(d => {
            const key = d.division?.trim() || 'General';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(d);
        });
        return Array.from(map.entries());
    }, [dashboards, query]);

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
            {/* Search */}
            {dashboards.length > 0 && (
                <div style={{
                    position: 'relative', maxWidth: 420, marginBottom: groups.length > 0 ? 28 : 0,
                }}>
                    <span style={{
                        position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                        display: 'inline-flex', pointerEvents: 'none',
                    }}>
                        <SearchIcon />
                    </span>
                    <input
                        type="search"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setActive('All'); }}
                        placeholder="Search dashboards…"
                        aria-label="Search dashboards"
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '13px 16px 13px 44px',
                            borderRadius: 100, border: `1px solid ${colors.navyLighter}`,
                            background: '#fff', fontSize: '0.92rem', color: colors.navy,
                            outline: 'none',
                        }}
                    />
                </div>
            )}

            {visible.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px 0', fontSize: '0.95rem' }}>
                    No dashboards match “{query}”.
                </div>
            ) : (
                <>
                    {groups.length > 1 && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36, marginTop: 8 }}>
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
                                    <DashboardCard key={d.id} dashboard={d} onExpand={onExpand} />
                                ))}
                            </div>
                        </div>
                    ))}
                </>
            )}
            <style>{`
                @media (max-width: 520px) {
                    .pub-dash-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>

            {fullscreen && (
                <FullscreenOverlay dashboard={fullscreen} onClose={onCloseFullscreen} />
            )}
        </div>
    );
};

export default PublicDashboardsGrid;

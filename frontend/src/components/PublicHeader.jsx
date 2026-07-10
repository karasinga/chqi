import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme/colors';
import { institution } from '../data/siteContent';
import { isLandingDomain, DASHBOARD_LOGIN_URL } from '../utils/site';
import { PUBLIC_CSS } from './publicStyles';

// Public top bar that mimics the landing-page navbar (fixed, transparent →
// solid on scroll, blurred, hover-underline links, pill login button) WITHOUT
// repeating the CHQI wordmark. Keeps /dashboards from being a dead-end.
// Self-contained: ships its own copy of the .pub-nav-link / .pub-btn-primary
// styles so it works without PublicSite's global stylesheet.
const PublicHeader = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogin = () => {
        if (isLandingDomain()) window.location.href = DASHBOARD_LOGIN_URL;
        else navigate('/login');
    };

    const goHome = (e) => {
        e.preventDefault();
        navigate('/');
    };

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
            background: scrolled ? 'rgba(24,47,91,0.97)' : 'transparent',
            backdropFilter: scrolled ? 'blur(16px)' : 'none',
            borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
            transition: 'all 0.3s ease',
            padding: '0 5%',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
                <a href='/' onClick={goHome} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    {!logoError ? (
                        <img src={institution.logoPath} alt={institution.shortName}
                            style={{ height: 40, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                            onError={() => setLogoError(true)} />
                    ) : (
                        <div style={{ width: 40, height: 40, background: colors.teal, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.9rem' }}>
                            {institution.shortName.slice(0, 2)}
                        </div>
                    )}
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className='desktop-nav'>
                    <a href='/' className='pub-nav-link' onClick={goHome}>Home</a>
                    <button className='pub-btn-primary' onClick={handleLogin} style={{ padding: '10px 22px', fontSize: '0.88rem' }}>Staff Login</button>
                </div>

                <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
                    style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4 }} className='mobile-menu-btn'>
                    {menuOpen ? (
                        <svg width='24' height='24' viewBox='0 0 24 24' fill='currentColor'><path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' /></svg>
                    ) : (
                        <svg width='24' height='24' viewBox='0 0 24 24' fill='currentColor'><path d='M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z' /></svg>
                    )}
                </button>
            </div>

            {menuOpen && (
                <div style={{ background: 'rgba(24,47,91,0.98)', backdropFilter: 'blur(20px)', padding: '16px 5% 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <a href='/' className='pub-nav-link' onClick={(e) => { e.preventDefault(); goHome(e); setMenuOpen(false); }} style={{ fontSize: '1rem' }}>Home</a>
                    </div>
                    <div style={{ paddingTop: 16 }}>
                        <button className='pub-btn-primary' onClick={() => { handleLogin(); setMenuOpen(false); }} style={{ width: '100%', justifyContent: 'center', padding: '10px 20px', fontSize: '0.85rem' }}>Staff Login</button>
                    </div>
                </div>
            )}

            <style>{PUBLIC_CSS}{`
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .mobile-menu-btn { display: flex !important; }
                }
            `}</style>
        </nav>
    );
};

export default PublicHeader;

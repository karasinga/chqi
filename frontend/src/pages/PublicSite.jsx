import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme/colors';
import { institution, stats, mission, values, contact, navLinks } from '../data/siteContent';
import api from '../utils/api';

// ─── Keyframes ────────────────────────────────────────────────────────────────
const cssAnimations = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: 'Inter', sans-serif; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-32px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(32px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-18px); }
}
@keyframes pulse-ring {
  0%   { transform: scale(0.85); opacity: 0.6; }
  70%  { transform: scale(1.1); opacity: 0; }
  100% { transform: scale(0.85); opacity: 0; }
}
@keyframes countUp {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.pub-fade-up   { animation: fadeInUp   0.7s ease both; }
.pub-fade-left { animation: fadeInLeft 0.7s ease both; }
.pub-fade-right{ animation: fadeInRight 0.7s ease both; }
.pub-float     { animation: float 6s ease-in-out infinite; }

.pub-stat-card { animation: countUp 0.6s ease both; }

.pub-nav-link {
  position: relative;
  color: rgba(255,255,255,0.75);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: color 0.2s;
  padding: 4px 0;
}
.pub-nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px; left: 0;
  width: 0; height: 2px;
  background: ${colors.teal};
  transition: width 0.3s ease;
}
.pub-nav-link:hover { color: #fff; }
.pub-nav-link:hover::after { width: 100%; }

.pub-researcher-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(24,47,91,0.08);
  border: 1px solid rgba(24,47,91,0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.pub-researcher-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(24,47,91,0.16);
}

.pub-value-card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 28px 24px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}
.pub-value-card:hover {
  background: rgba(255,255,255,0.1);
  border-color: ${colors.teal}60;
  transform: translateY(-4px);
}

.pub-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${colors.teal};
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px 28px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.25s ease;
  box-shadow: 0 4px 20px ${colors.teal}55;
  font-family: 'Inter', sans-serif;
}
.pub-btn-primary:hover {
  background: ${colors.tealDark};
  transform: translateY(-2px);
  box-shadow: 0 8px 28px ${colors.teal}70;
}
.pub-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: #fff;
  border: 2px solid rgba(255,255,255,0.35);
  border-radius: 12px;
  padding: 13px 28px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.25s ease;
  font-family: 'Inter', sans-serif;
}
.pub-btn-outline:hover {
  border-color: #fff;
  background: rgba(255,255,255,0.1);
  transform: translateY(-2px);
}

.section-label {
  display: inline-block;
  background: ${colors.teal}18;
  color: ${colors.teal};
  border: 1px solid ${colors.teal}30;
  border-radius: 100px;
  padding: 6px 18px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// ─── Icon map (inline SVGs) ────────────────────────────────────────────────────
const IconMap = {
    science: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 2v2h1v5.5L4.5 14a3 3 0 0 0-.5 1.7V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.3a3 3 0 0 0-.5-1.7L16 9.5V4h1V2H7zm2 2h6v4.17l3.29 5.09A1 1 0 0 1 18.3 14H5.7l-.29-.5L8.7 9.5A1 1 0 0 0 9 8.83V4zm-1 15a2 2 0 0 0 4 0H8z" />
        </svg>
    ),
    trending_up: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
        </svg>
    ),
    groups: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12.75c1.63 0 3.07.39 4.24.9L17.5 15H6.5l1.26-1.35C8.93 13.14 10.37 12.75 12 12.75m0-1.75c-2.21 0-4 1.79-4 4 0 .55.45 1 1 1h6c.55 0 1-.45 1-1 0-2.21-1.79-4-4-4zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1C4.76 14.04 4.39 14 4 14c-.93 0-1.81.18-2.63.5A2 2 0 0 0 0 16.43V17h4.5v-1.43c0-.45.13-.87.34-1.24L5.13 14.1zm14.74 0 .39.23c.21.37.34.79.34 1.24V17H25v-.57c0-.9-.53-1.69-1.37-2.02A6.73 6.73 0 0 0 21 14c-.39 0-.76.04-1.13.1zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
        </svg>
    ),
    verified: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="m23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82 1.89 3.2L12 21.04l3.4 1.47 1.89-3.2 3.61-.82-.34-3.69L23 12zm-12.91 4.72-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z" />
        </svg>
    ),
    lightbulb: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z" />
        </svg>
    ),
    balance: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="m17 3-5 5-5-5H2v2l8 8v6H8v2h8v-2h-2v-6l8-8V3h-5zm-5 8.17L4.83 5h2.34L12 9.83 16.83 5h2.34L17 11.17z" />
        </svg>
    ),
    email: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
    ),
    person: () => (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
    ),
    menu: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
    ),
    close: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
    ),
    arrow_right: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
        </svg>
    ),
    arrow_down: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
    ),
};

const Icon = ({ name, size = 24, color = 'currentColor', style = {} }) => {
    const Component = IconMap[name];
    if (!Component) return null;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color, ...style }}>
            <Component />
        </span>
    );
};

// ─── Navbar ────────────────────────────────────────────────────────────────────
const Navbar = ({ onLoginClick }) => {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavClick = (href) => {
        setMenuOpen(false);
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
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
            <div style={{
                maxWidth: 1200, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                height: 72,
            }}>
                {/* Logo — uses state-based fallback instead of DOM manipulation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {!logoError ? (
                        <img
                            src={institution.logoPath}
                            alt={institution.shortName}
                            style={{ height: 44, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                            onError={() => setLogoError(true)}
                        />
                    ) : (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 44, height: 44, background: colors.teal,
                            borderRadius: 10, fontWeight: 900, color: '#fff', fontSize: '1.1rem',
                        }}>
                            {institution.shortName}
                        </div>
                    )}
                    <div style={{ display: 'none' }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.1 }}>
                            {institution.shortName}
                        </div>
                    </div>
                </div>

                {/* Desktop Nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
                    {navLinks.map(link => (
                        <a key={link.label} href={link.href}
                            className="pub-nav-link"
                            onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}>
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Login Button + Mobile Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="pub-btn-primary" onClick={onLoginClick} style={{ padding: '10px 22px', fontSize: '0.88rem' }}>
                        Login to Dashboard
                    </button>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        style={{
                            display: 'none', background: 'none', border: 'none', cursor: 'pointer',
                            color: '#fff', padding: 4,
                        }}
                        className="mobile-menu-btn"
                    >
                        {menuOpen ? <Icon name="close" aria-hidden /> : <Icon name="menu" aria-hidden />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div style={{
                    background: 'rgba(24,47,91,0.98)', backdropFilter: 'blur(20px)',
                    padding: '16px 5% 24px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                }}>
                    {navLinks.map(link => (
                        <div key={link.label} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <a href={link.href}
                                className="pub-nav-link"
                                onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                                style={{ fontSize: '1rem' }}>
                                {link.label}
                            </a>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .mobile-menu-btn { display: flex !important; }
                }
            `}</style>
        </nav>
    );
};

// ─── Hero Section ──────────────────────────────────────────────────────────────
const HeroSection = ({ onLoginClick }) => {
    const scrollToAbout = () => {
        document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section id="home" style={{
            minHeight: '100vh',
            background: `linear-gradient(135deg, ${colors.navy} 0%, #0d1f3c 40%, ${colors.navyLight} 100%)`,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            position: 'relative', overflow: 'hidden',
            padding: '120px 5% 80px',
        }}>
            {/* Animated background orbs */}
            <div style={{
                position: 'absolute', top: '-10%', right: '-5%',
                width: 600, height: 600, borderRadius: '50%',
                background: `radial-gradient(circle, ${colors.teal}30 0%, transparent 70%)`,
                filter: 'blur(60px)',
            }} className="pub-float" />
            <div style={{
                position: 'absolute', bottom: '-5%', left: '-10%',
                width: 500, height: 500, borderRadius: '50%',
                background: `radial-gradient(circle, ${colors.navyLight}50 0%, transparent 70%)`,
                filter: 'blur(80px)',
            }} />
            {/* Decorative ring */}
            <div style={{
                position: 'absolute', top: '15%', right: '8%',
                width: 120, height: 120, borderRadius: '50%',
                border: `2px solid ${colors.teal}25`,
            }} className="pub-spin-slow" />
            <div style={{
                position: 'absolute', bottom: '20%', left: '6%',
                width: 80, height: 80, borderRadius: '50%',
                border: `2px solid ${colors.tealLight}20`,
            }} className="pub-spin-slow" />
            {/* Grid dots */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `radial-gradient(${colors.teal}20 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                opacity: 0.4,
            }} />

            <div style={{ maxWidth: 860, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                {/* Badge */}
                <div className="pub-fade-up" style={{ animationDelay: '0.1s' }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: `rgba(27,172,167,0.15)`,
                        border: `1px solid ${colors.teal}40`,
                        borderRadius: 100, padding: '8px 20px',
                        color: colors.tealLight, fontSize: '0.82rem', fontWeight: 600,
                        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 28,
                    }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: colors.teal, display: 'inline-block',
                        }} />
                        Research · Quality · Innovation
                    </span>
                </div>

                {/* Main heading */}
                <h1 className="pub-fade-up" style={{
                    animationDelay: '0.2s',
                    fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
                    fontWeight: 900, lineHeight: 1.08,
                    color: '#fff', letterSpacing: '-0.03em',
                    marginBottom: 24,
                }}>
                    {institution.name}
                </h1>

                <p className="pub-fade-up" style={{
                    animationDelay: '0.3s',
                    fontSize: 'clamp(1.05rem, 2.5vw, 1.3rem)',
                    color: colors.grayLight, lineHeight: 1.65,
                    maxWidth: 640, margin: '0 auto 48px',
                }}>
                    {institution.tagline}
                </p>

                {/* CTAs */}
                <div className="pub-fade-up" style={{
                    animationDelay: '0.4s',
                    display: 'flex', gap: 16, justifyContent: 'center',
                    flexWrap: 'wrap',
                }}>
                    <button className="pub-btn-primary" onClick={scrollToAbout} style={{ fontSize: '1rem', padding: '15px 32px' }}>
                        Discover Our Work <Icon name="arrow_right" />
                    </button>
                    <button className="pub-btn-outline" onClick={onLoginClick} style={{ fontSize: '1rem', padding: '15px 32px' }}>
                        Dashboard Login
                    </button>
                </div>

                {/* Scroll indicator */}
                <div className="pub-fade-up" style={{
                    animationDelay: '0.9s', marginTop: 72,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    opacity: 0.5, cursor: 'pointer',
                }} onClick={scrollToAbout}>
                    <span style={{ color: colors.grayLight, fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Scroll to explore
                    </span>
                    <div style={{ animation: 'float 2s ease-in-out infinite' }}>
                        <Icon name="arrow_down" color={colors.tealLight} />
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Stats Section ─────────────────────────────────────────────────────────────
const StatsSection = () => (
    <section style={{
        background: `linear-gradient(135deg, ${colors.teal} 0%, ${colors.tealDark} 100%)`,
        padding: '64px 5%',
    }}>
        <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 24,
        }}>
            {stats.map((stat, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <div style={{
                        fontSize: 'clamp(2rem, 4vw, 3rem)',
                        fontWeight: 900, color: '#fff',
                        letterSpacing: '-0.02em', lineHeight: 1,
                        marginBottom: 8,
                    }}>
                        {stat.value}
                    </div>
                    <div style={{
                        fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)',
                        fontWeight: 500,
                    }}>
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
        <style>{`
            @media (max-width: 640px) {
                section > div > div { grid-template-columns: repeat(2, 1fr) !important; }
            }
        `}</style>
    </section>
);

// ─── About Section ─────────────────────────────────────────────────────────────
const AboutSection = () => (
    <section id="about" style={{
        padding: '100px 5%',
        background: '#fff',
    }}>
        <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72,
            alignItems: 'center',
        }}>
            {/* Text */}
            <div className="pub-fade-left">
                <span className="section-label">About Us</span>
                <h2 style={{
                    fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                    fontWeight: 800, color: colors.navy,
                    letterSpacing: '-0.02em', marginBottom: 20, lineHeight: 1.15,
                }}>
                    Advancing healthcare through <span style={{ color: colors.teal }}>evidence & innovation</span>
                </h2>
                <p style={{ color: '#555', lineHeight: 1.8, fontSize: '1.05rem', marginBottom: 20 }}>
                    {institution.description}
                </p>
                <p style={{ color: '#666', lineHeight: 1.8, fontSize: '0.98rem', marginBottom: 36 }}>
                    {institution.aboutDetail}
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                    <button className="pub-btn-primary"
                        onClick={() => document.querySelector('#team')?.scrollIntoView({ behavior: 'smooth' })}>
                        Meet Our Team <Icon name="arrow_right" />
                    </button>
                </div>
            </div>

            {/* Visual */}
            <div className="pub-fade-right" style={{ position: 'relative' }}>
                {/* Main card */}
                <div style={{
                    background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                    borderRadius: 24, padding: '48px 40px',
                    color: '#fff', position: 'relative', overflow: 'hidden',
                    minHeight: 360,
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                }}>
                    {/* Orb decoration */}
                    <div style={{
                        position: 'absolute', top: -60, right: -60,
                        width: 200, height: 200,
                        background: `radial-gradient(circle, ${colors.teal}40 0%, transparent 70%)`,
                        borderRadius: '50%',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: -40, left: -40,
                        width: 150, height: 150,
                        background: `radial-gradient(circle, ${colors.tealLight}30 0%, transparent 70%)`,
                        borderRadius: '50%',
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            background: `${colors.teal}25`, border: `1px solid ${colors.teal}40`,
                            borderRadius: 12, padding: '10px 16px', display: 'inline-block',
                            marginBottom: 24,
                        }}>
                            <span style={{ color: colors.tealLight, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Our Mission
                            </span>
                        </div>
                        <p style={{ fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.9)' }}>
                            "{mission.statement}"
                        </p>
                    </div>
                </div>

                {/* Floating stats card */}
                <div style={{
                    position: 'absolute', bottom: -24, left: -24,
                    background: '#fff',
                    borderRadius: 16, padding: '20px 24px',
                    boxShadow: '0 8px 40px rgba(24,47,91,0.15)',
                    border: `1px solid rgba(24,47,91,0.06)`,
                    zIndex: 2,
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: colors.teal, lineHeight: 1 }}>
                        {stats[0].value}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 500, marginTop: 4 }}>
                        {stats[0].label}
                    </div>
                </div>
            </div>
        </div>
        <style>{`
            @media (max-width: 768px) {
                #about > div { grid-template-columns: 1fr !important; gap: 40px !important; }
            }
        `}</style>
    </section>
);

// ─── Mission & Values Section ──────────────────────────────────────────────────
const ValuesSection = () => (
    <section id="research" style={{
        padding: '100px 5%',
        background: `linear-gradient(135deg, ${colors.navy} 0%, #0d1f3c 100%)`,
    }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
                <span className="section-label" style={{
                    background: `${colors.teal}20`,
                    color: colors.tealLight,
                    border: `1px solid ${colors.teal}35`,
                }}>
                    Our Values
                </span>
                <h2 style={{
                    fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                    fontWeight: 800, color: '#fff',
                    letterSpacing: '-0.02em', marginTop: 8,
                }}>
                    Principles that guide our work
                </h2>
                <p style={{ color: colors.grayLight, fontSize: '1.05rem', marginTop: 16, maxWidth: 560, margin: '16px auto 0' }}>
                    {mission.vision}
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 20,
            }}>
                {values.map((val, i) => (
                    <div key={i} className="pub-value-card">
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: `${colors.teal}25`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: colors.teal, marginBottom: 20,
                        }}>
                            <Icon name={val.icon} />
                        </div>
                        <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: 10 }}>
                            {val.title}
                        </h3>
                        <p style={{ color: colors.grayLight, fontSize: '0.9rem', lineHeight: 1.7 }}>
                            {val.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
        <style>{`
            @media (max-width: 900px) {
                #research > div > div:last-child { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 560px) {
                #research > div > div:last-child { grid-template-columns: 1fr !important; }
            }
        `}</style>
    </section>
);

// ─── Researcher Card ───────────────────────────────────────────────────────────
const ResearcherCard = ({ researcher }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div className="pub-researcher-card">
            {/* Photo Header */}
            <div style={{
                background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                padding: '28px 28px 0',
                display: 'flex', justifyContent: 'center',
            }}>
                <div style={{
                    width: 100, height: 100, borderRadius: '50%',
                    border: `3px solid ${colors.teal}`,
                    overflow: 'hidden',
                    background: `${colors.teal}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    marginBottom: -50, position: 'relative', zIndex: 1,
                    boxShadow: `0 4px 20px rgba(27,172,167,0.3)`,
                }}>
                    {researcher.photo_url && !imgError ? (
                        <img
                            src={researcher.photo_url}
                            alt={researcher.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <Icon name="person" color={colors.teal} />
                    )}
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '60px 24px 28px', textAlign: 'center' }}>
                <h3 style={{
                    color: colors.navy, fontWeight: 800,
                    fontSize: '1.05rem', marginBottom: 4,
                }}>
                    {researcher.name}
                </h3>
                <p style={{ color: colors.teal, fontWeight: 600, fontSize: '0.85rem', marginBottom: 10 }}>
                    {researcher.title}
                </p>

                {researcher.specialty && (
                    <span style={{
                        display: 'inline-block',
                        background: `${colors.navy}0D`,
                        color: colors.navyLight,
                        border: `1px solid ${colors.navyLighter}`,
                        borderRadius: 100,
                        padding: '3px 12px',
                        fontSize: '0.75rem', fontWeight: 600,
                        marginBottom: 16,
                    }}>
                        {researcher.specialty}
                    </span>
                )}

                {researcher.bio && (
                    <p style={{
                        color: '#666', fontSize: '0.875rem', lineHeight: 1.7,
                        marginBottom: 20,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}>
                        {researcher.bio}
                    </p>
                )}

                {researcher.email && (
                    <a href={`mailto:${researcher.email}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        color: colors.teal, textDecoration: 'none',
                        fontSize: '0.82rem', fontWeight: 500,
                        transition: 'opacity 0.2s',
                    }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = 0.7}
                        onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                    >
                        <Icon name="email" color={colors.teal} />
                        {researcher.email}
                    </a>
                )}
            </div>
        </div>
    );
};

// ─── Team Section ──────────────────────────────────────────────────────────────
const TeamSection = () => {
    const [researchers, setResearchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const fetchResearchers = async () => {
            try {
                const res = await api.get('/researchers/');
                if (!cancelled) setResearchers(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error('Failed to fetch researchers:', err);
                if (!cancelled) setError(
                    err?.status === 404
                        ? 'Team information not found.'
                        : 'Unable to load team information. Please try again later.'
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchResearchers();
        return () => { cancelled = true; };
    }, []);

    return (
        <section id="team" style={{
            padding: '100px 5%',
            background: colors.grayLighter,
        }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 64 }}>
                    <span className="section-label">Research Team</span>
                    <h2 style={{
                        fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                        fontWeight: 800, color: colors.navy,
                        letterSpacing: '-0.02em', marginTop: 8,
                    }}>
                        The experts behind our research
                    </h2>
                    <p style={{ color: '#666', fontSize: '1.05rem', marginTop: 16, maxWidth: 520, margin: '16px auto 0' }}>
                        Our multidisciplinary team brings together expertise from across health systems, clinical research, and policy.
                    </p>
                </div>

                {loading && (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            border: `3px solid ${colors.navyLighter}`,
                            borderTopColor: colors.teal,
                            animation: 'spin-slow 0.8s linear infinite',
                            margin: '0 auto 16px',
                        }} />
                        <p style={{ color: '#999', fontSize: '0.9rem' }}>Loading team members...</p>
                    </div>
                )}

                {error && (
                    <div style={{
                        textAlign: 'center', padding: '60px 0',
                        color: '#999', fontSize: '0.95rem',
                    }}>
                        {error}
                    </div>
                )}

                {!loading && !error && researchers.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '60px 0',
                        color: '#999', fontSize: '0.95rem',
                    }}>
                        Team profiles coming soon.
                    </div>
                )}

                {!loading && researchers.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 28,
                    }}>
                        {researchers.map((r) => (
                            <ResearcherCard key={r.id} researcher={r} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

// ─── CTA / Contact Section ─────────────────────────────────────────────────────
const ContactSection = ({ onLoginClick }) => (
    <section id="contact" style={{
        padding: '100px 5%',
        background: '#fff',
    }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{
                background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                borderRadius: 28, padding: '64px 56px',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48,
                alignItems: 'center', position: 'relative', overflow: 'hidden',
            }}>
                {/* Bg decoration */}
                <div style={{
                    position: 'absolute', top: -80, right: -80,
                    width: 280, height: 280,
                    background: `radial-gradient(circle, ${colors.teal}30 0%, transparent 70%)`,
                    borderRadius: '50%',
                }} />
                <div style={{
                    position: 'absolute', bottom: -60, left: -60,
                    width: 200, height: 200,
                    background: `radial-gradient(circle, ${colors.tealLight}20 0%, transparent 70%)`,
                    borderRadius: '50%',
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <span style={{
                        display: 'inline-block',
                        background: `${colors.teal}25`,
                        color: colors.tealLight,
                        border: `1px solid ${colors.teal}40`,
                        borderRadius: 100, padding: '6px 18px',
                        fontSize: '0.78rem', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        marginBottom: 20,
                    }}>
                        Get In Touch
                    </span>
                    <h2 style={{
                        fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                        fontWeight: 800, color: '#fff',
                        letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.2,
                    }}>
                        Ready to collaborate or learn more?
                    </h2>
                    <p style={{ color: colors.grayLight, lineHeight: 1.7, fontSize: '1rem', marginBottom: 8 }}>
                        Whether you're a researcher, healthcare professional, or policy partner, we'd love to hear from you.
                    </p>
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Contact details */}
                    {[
                        { label: 'General Inquiries', value: contact.email, href: `mailto:${contact.email}` },
                        { label: 'Dashboard Support', value: contact.supportEmail, href: `mailto:${contact.supportEmail}` },
                        { label: 'Phone', value: contact.phone, href: `tel:${contact.phone}` },
                        { label: 'Location', value: contact.address, href: contact.mapLink, target: '_blank' },
                    ].map((item, i) => (
                        <div key={i} style={{
                            marginBottom: 20,
                            padding: '16px 20px',
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12,
                        }}>
                            <div style={{ color: colors.tealLight, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                {item.label}
                            </div>
                            {item.href ? (
                                <a href={item.href} target={item.target || '_self'} rel={item.target === '_blank' ? 'noopener noreferrer' : undefined} style={{
                                    color: '#fff', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500,
                                    transition: 'opacity 0.2s', display: 'block',
                                }}
                                    onMouseOver={(e) => e.currentTarget.style.opacity = 0.75}
                                    onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                                >
                                    {item.value}
                                </a>
                            ) : (
                                <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 500 }}>{item.value}</span>
                            )}
                        </div>
                    ))}

                    {/* Google Map Embed */}
                    <div style={{
                        height: 200, width: '100%', borderRadius: 12, overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24,
                        background: 'rgba(255,255,255,0.05)',
                    }}>
                        <iframe
                            src={contact.mapEmbedUrl}
                            width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade" title="CHQI Location Map"
                        />
                    </div>

                    <button className="pub-btn-primary" onClick={onLoginClick} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        Access the Dashboard <Icon name="arrow_right" />
                    </button>
                </div>
            </div>
        </div>
        <style>{`
            @media (max-width: 768px) {
                #contact > div > div { grid-template-columns: 1fr !important; padding: 40px 28px !important; }
            }
        `}</style>
    </section>
);

// ─── Footer ────────────────────────────────────────────────────────────────────
const Footer = ({ onLoginClick }) => (
    <footer style={{
        background: '#0a1628',
        padding: '48px 5% 28px',
        borderTop: `3px solid ${colors.teal}40`,
    }}>
        <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            gap: 32, flexWrap: 'wrap', marginBottom: 40,
        }}>
            <div style={{ maxWidth: 320 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                }}>
                    <div style={{
                        width: 36, height: 36, background: colors.teal,
                        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, color: '#fff', fontSize: '0.85rem',
                    }}>
                        {institution.shortName.slice(0, 2)}
                    </div>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>
                        {institution.shortName}
                    </span>
                </div>
                <p style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.7 }}>
                    {institution.tagline}
                </p>
            </div>

            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
                <div>
                    <h4 style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Navigate
                    </h4>
                    {navLinks.map(link => (
                        <div key={link.label} style={{ marginBottom: 10 }}>
                            <a href={link.href}
                                className="pub-nav-link"
                                onClick={(e) => { e.preventDefault(); document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' }); }}
                                style={{ fontSize: '0.875rem' }}>
                                {link.label}
                            </a>
                        </div>
                    ))}
                </div>
                <div>
                    <h4 style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Contact
                    </h4>
                    <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: 8 }}>{contact.email}</p>
                    <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: 8 }}>{contact.phone}</p>
                    <p style={{ color: '#666', fontSize: '0.875rem' }}>{contact.address}</p>
                    <button className="pub-btn-primary" onClick={onLoginClick}
                        style={{ marginTop: 20, padding: '10px 20px', fontSize: '0.85rem' }}>
                        Staff Login
                    </button>
                </div>
            </div>
        </div>

        <div style={{
            borderTop: '1px solid #1a2a42',
            paddingTop: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
            <p style={{ color: '#555', fontSize: '0.8rem' }}>
                © {new Date().getFullYear()} {institution.name}. All rights reserved.
            </p>
            <p style={{ color: '#444', fontSize: '0.8rem' }}>
                Designed for research excellence.
            </p>
        </div>
    </footer>
);

// ─── Main PublicSite Component ─────────────────────────────────────────────────
const PublicSite = () => {
    const navigate = useNavigate();
    const handleLogin = () => navigate('/login');

    return (
        <>
            <style>{cssAnimations}</style>
            <div style={{ fontFamily: "'Inter', sans-serif" }}>
                <Navbar onLoginClick={handleLogin} />
                <HeroSection onLoginClick={handleLogin} />
                <StatsSection />
                <AboutSection />
                <ValuesSection />
                <TeamSection />
                <ContactSection onLoginClick={handleLogin} />
                <Footer onLoginClick={handleLogin} />
            </div>
        </>
    );
};

export default PublicSite;

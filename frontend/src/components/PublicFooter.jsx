import React from 'react';
import { colors } from '../theme/colors';
import { institution, navLinks, contact } from '../data/siteContent';
import { PUBLIC_CSS } from './publicStyles';

// Shared public footer, extracted from PublicSite so standalone public pages
// (e.g. /dashboards) share the same brand chrome. Carries its own copy of the
// .pub-nav-link styles so it works without PublicSite's global stylesheet.
const PublicFooter = ({ onLoginClick, onNavLink }) => (
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
                                onClick={(e) => { e.preventDefault(); onNavLink(link.href); }}
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

        <style>{PUBLIC_CSS}</style>
    </footer>
);

export default PublicFooter;

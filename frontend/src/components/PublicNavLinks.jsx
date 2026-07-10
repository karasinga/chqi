import React from 'react';
import { navLinks } from '../data/siteContent';

/**
 * Shared public-nav link list + login button. Used by both the landing
 * Navbar (PublicSite) and the /dashboards PublicHeader so the two public
 * surfaces expose the same navigation instead of diverging.
 *
 * Styles (.pub-nav-link / .pub-btn-primary) are injected by the host page
 * via publicStyles.js — this component only supplies structure + behavior.
 */
const PublicNavLinks = ({ onLoginClick, onNavLink, loginLabel = 'Login to Dashboard' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
        {navLinks.map(link => (
            <a
                key={link.label}
                href={link.href}
                className="pub-nav-link"
                onClick={(e) => { e.preventDefault(); onNavLink(link.href); }}
            >
                {link.label}
            </a>
        ))}
        <button
            className="pub-btn-primary"
            onClick={onLoginClick}
            style={{ padding: '10px 22px', fontSize: '0.88rem' }}
        >
            {loginLabel}
        </button>
    </div>
);

export default PublicNavLinks;

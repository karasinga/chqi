import React from 'react';

// Pulsing CHQI logo — the app-wide loading indicator.
// Falls back to "CHQI" wordmark if the logo asset is missing.
const ChqiLogoSpinner = React.forwardRef(({ size = 80 }, ref) => (
    <div ref={ref} style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'chqi-pulse 2s ease-in-out infinite',
    }}>
        <img
            src="/assets/logo.png"
            alt="CHQI Logo"
            style={{
                height: size,
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
            }}
            onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML =
                    `<span style="font-weight:900;color:#182F5B;font-size:${Math.round(size * 0.6)}px;letter-spacing:-1px;">CHQI</span>`;
            }}
        />
        <style>{`
            @keyframes chqi-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }
        `}</style>
    </div>
));

ChqiLogoSpinner.displayName = 'ChqiLogoSpinner';

export default ChqiLogoSpinner;

import React, { useRef, useState, useEffect } from 'react';

/**
 * Lazy PowerBI embed — the iframe (and its full PowerBI runtime) only mounts
 * once the placeholder scrolls into view. Keeps the landing page / data page
 * fast when several dashboards are present.
 *
 * `height` accepts any CSS height value (e.g. 'min(70vh, 560px)') so reports
 * scale with the viewport instead of being locked to a fixed pixel height.
 */
const LazyPowerBI = ({ src, title, height = 'min(70vh, 560px)' }) => {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return;
        }
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisible(true);
                        obs.disconnect();
                    }
                });
            },
            { rootMargin: '200px' }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return (
        <div ref={ref} style={{
            position: 'relative',
            width: '100%',
            height,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#F5F5F5',
            border: '1px solid rgba(24,47,91,0.06)',
        }}>
            {visible ? (
                <iframe
                    title={title}
                    src={src}
                    style={{ border: 0, display: 'block', width: '100%', height: '100%' }}
                    allowFullScreen
                    loading="lazy"
                />
            ) : (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: '100%', color: '#B1AFB2', fontSize: '0.9rem',
                }}>
                    Loading dashboard…
                </div>
            )}
        </div>
    );
};

export default LazyPowerBI;

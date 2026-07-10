// Shared public-site CSS — single source for nav links, buttons, and the
// spin-slow keyframes referenced by PublicSite's decorative rings and the
// TeamSection loader. Inject into a component via <style>{PUBLIC_CSS}</style>.
// Avoids carrying duplicate copies of these styles in PublicSite/PublicHeader/
// PublicFooter.
import { colors } from '../theme/colors';

export const PUBLIC_CSS = `
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

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.pub-spin-slow { animation: spin-slow 18s linear infinite; }
`;

/**
 * Format an ISO timestamp as a compact relative string ("5m ago", "2h ago", "3d ago").
 * Falls back to an absolute date for anything older than ~5 weeks.
 */
export const timeAgo = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;

    return date.toLocaleDateString();
};

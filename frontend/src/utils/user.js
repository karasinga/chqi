/**
 * Friendly display name for a user: "First Last" when available,
 * otherwise the username. Avoids the old " (username)" bracket style.
 */
export const userLabel = (u) => {
    if (!u) return '';
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return name || u.username || '';
};

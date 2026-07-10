import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Switch, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    CircularProgress, Alert, Chip, Tooltip, FormControlLabel,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Dashboard as DashboardIcon,
    ArrowUpward as UpIcon,
    ArrowDownward as DownIcon,
} from '@mui/icons-material';
import { colors } from '../theme/colors';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import api from '../utils/api';

// ─── Add / Edit Dialog ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
    title: '', division: '', description: '', embed_url: '',
    display_order: 0, is_visible: true,
};

const POWERBI_HOST = 'app.powerbi.com';

const PowerBIDashboardFormDialog = ({ open, onClose, dashboard, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const isEdit = Boolean(dashboard);

    useEffect(() => {
        if (dashboard) {
            setForm({
                title: dashboard.title || '',
                division: dashboard.division || '',
                description: dashboard.description || '',
                embed_url: dashboard.embed_url || '',
                display_order: dashboard.display_order ?? 0,
                is_visible: dashboard.is_visible ?? true,
            });
        } else {
            setForm(EMPTY_FORM);
        }
        setError('');
    }, [dashboard, open]);

    const handleSubmit = async () => {
        if (!form.title.trim()) {
            setError('Title is required.');
            return;
        }
        const url = form.embed_url.trim();
        if (!url) {
            setError('PowerBI embed URL is required.');
            return;
        }
        try {
            new URL(url);
        } catch {
            setError('Embed URL must be a valid URL.');
            return;
        }
        if (!url.startsWith(`https://${POWERBI_HOST}/`)) {
            setError('Embed URL must be a PowerBI link (https://app.powerbi.com/...).');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = {
                title: form.title.trim(),
                division: form.division.trim(),
                description: form.description.trim(),
                embed_url: url,
                display_order: parseInt(form.display_order, 10) || 0,
                is_visible: form.is_visible,
            };
            if (isEdit) {
                await api.patch(`/public-dashboards/admin/${dashboard.id}/`, payload);
            } else {
                await api.post('/public-dashboards/admin/', payload);
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(
                err.response?.data?.embed_url?.[0] ||
                err.response?.data?.detail ||
                JSON.stringify(err.response?.data) ||
                'Failed to save. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700, color: colors.navy, pb: 1 }}>
                {isEdit ? 'Edit Dashboard' : 'Add Dashboard'}
            </DialogTitle>
            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

                <TextField label="Title *" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    size="small" placeholder="e.g. Mental Health Service Coverage" />

                <TextField label="Division" value={form.division}
                    onChange={e => setForm(f => ({ ...f, division: e.target.value }))}
                    size="small" placeholder="e.g. Division of Mental Health, Kenya" sx={{ gridColumn: '1 / -1' }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="Display Order" value={form.display_order}
                        onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))}
                        size="small" type="number" inputProps={{ min: 0 }} />
                </Box>

                <TextField label="PowerBI Embed URL *" value={form.embed_url}
                    onChange={e => setForm(f => ({ ...f, embed_url: e.target.value }))}
                    size="small"
                    placeholder="https://app.powerbi.com/view?r=..." />

                <TextField label="Description" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    multiline rows={3}
                    placeholder="Short blurb shown under the title on the public site..." />

                <FormControlLabel
                    control={
                        <Switch checked={form.is_visible}
                            onChange={e => setForm(f => ({ ...f, is_visible: e.target.checked }))}
                            sx={{ '& .MuiSwitch-thumb': { bgcolor: form.is_visible ? colors.teal : '#ccc' } }} />
                    }
                    label={
                        <Typography variant="body2" sx={{ color: colors.navy, fontWeight: 500 }}>
                            {form.is_visible ? 'Visible on public website' : 'Hidden from public website'}
                        </Typography>
                    }
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', color: colors.gray }}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving}
                    sx={{
                        textTransform: 'none', bgcolor: colors.teal, borderRadius: 2, fontWeight: 600,
                        '&:hover': { bgcolor: colors.tealDark }, boxShadow: 'none'
                    }}>
                    {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : (isEdit ? 'Save Changes' : 'Add Dashboard')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Management Panel ───────────────────────────────────────────────────────────
const PowerBIDashboardManagementPanel = () => {
    const [dashboards, setDashboards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    const fetchDashboards = async () => {
        setLoading(true);
        try {
            const res = await api.get('/public-dashboards/admin/');
            setDashboards(Array.isArray(res) ? res : []);
        } catch {
            setError('Failed to load dashboards.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboards(); }, []);

    const handleToggleVisibility = async (dashboard) => {
        setTogglingId(dashboard.id);
        try {
            await api.patch(`/public-dashboards/admin/${dashboard.id}/`, { is_visible: !dashboard.is_visible });
            setDashboards(prev => prev.map(d =>
                d.id === dashboard.id ? { ...d, is_visible: !d.is_visible } : d
            ));
        } catch {
            setError('Failed to update visibility.');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/public-dashboards/admin/${deleteConfirm.id}/`);
            setDashboards(prev => prev.filter(d => d.id !== deleteConfirm.id));
            setDeleteConfirm(null);
        } catch {
            setError('Failed to delete dashboard.');
        } finally {
            setDeleting(false);
        }
    };

    const handleMoveOrder = async (dashboard, direction) => {
        const newOrder = dashboard.display_order + (direction === 'up' ? -1 : 1);
        try {
            await api.patch(`/public-dashboards/admin/${dashboard.id}/`, { display_order: newOrder < 0 ? 0 : newOrder });
            fetchDashboards();
        } catch {
            setError('Failed to reorder.');
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: colors.navy }}>Public Dashboards</Typography>
                    <Typography variant="body2" sx={{ color: colors.gray, mt: 0.5 }}>
                        Manage PowerBI reports embedded on the public landing page. Toggle visibility without deleting records.
                    </Typography>
                </Box>
                <Button
                    variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setEditTarget(null); setDialogOpen(true); }}
                    sx={{
                        textTransform: 'none', bgcolor: colors.teal, borderRadius: 2, fontWeight: 600,
                        '&:hover': { bgcolor: colors.tealDark }, boxShadow: '0 4px 14px rgba(27,172,167,0.3)'
                    }}>
                    Add Dashboard
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Dashboards', value: dashboards.length, color: colors.navy },
                    { label: 'Visible on Site', value: dashboards.filter(d => d.is_visible).length, color: colors.teal },
                    { label: 'Hidden', value: dashboards.filter(d => !d.is_visible).length, color: colors.gray },
                ].map((s, i) => (
                    <Paper key={i} elevation={0} sx={{
                        px: 3, py: 2, borderRadius: 2.5, flex: 1, minWidth: 120,
                        border: `1px solid ${colors.navyLighter}`,
                        display: 'flex', flexDirection: 'column', gap: 0.5,
                    }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                        <Typography variant="caption" sx={{ color: colors.gray, fontWeight: 500 }}>{s.label}</Typography>
                    </Paper>
                ))}
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress sx={{ color: colors.teal }} />
                </Box>
            ) : dashboards.length === 0 ? (
                <Paper elevation={0} sx={{
                    p: 6, textAlign: 'center', borderRadius: 3,
                    border: `2px dashed ${colors.navyLighter}`,
                }}>
                    <DashboardIcon sx={{ fontSize: 48, color: colors.gray, mb: 2 }} />
                    <Typography sx={{ color: colors.gray, fontWeight: 500 }}>
                        No dashboards yet. Click "Add Dashboard" to get started.
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{
                    borderRadius: 3, border: `1px solid ${colors.navyLighter}`, overflow: 'hidden',
                }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: colors.grayLighter }}>
                                <TableCell sx={{ fontWeight: 700, color: colors.navy, fontSize: '0.8rem', py: 1.5 }}>ORDER</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: colors.navy, fontSize: '0.8rem' }}>DASHBOARD</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: colors.navy, fontSize: '0.8rem' }}>DIVISION</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: colors.navy, fontSize: '0.8rem' }}>VISIBILITY</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: colors.navy, fontSize: '0.8rem' }} align="right">ACTIONS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dashboards.map((d, idx) => (
                                <TableRow key={d.id} sx={{
                                    '&:hover': { bgcolor: `${colors.teal}05` },
                                    opacity: d.is_visible ? 1 : 0.55,
                                    transition: 'opacity 0.2s',
                                }}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                                            <Tooltip title="Move up">
                                                <span>
                                                    <IconButton size="small" disabled={idx === 0}
                                                        onClick={() => handleMoveOrder(d, 'up')}
                                                        sx={{ p: 0.25, color: colors.gray }}>
                                                        <UpIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Typography variant="caption" sx={{ color: colors.gray, fontWeight: 600, lineHeight: 1 }}>
                                                {d.display_order}
                                            </Typography>
                                            <Tooltip title="Move down">
                                                <span>
                                                    <IconButton size="small" disabled={idx === dashboards.length - 1}
                                                        onClick={() => handleMoveOrder(d, 'down')}
                                                        sx={{ p: 0.25, color: colors.gray }}>
                                                        <DownIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        <Box>
                                            <Typography sx={{ fontWeight: 600, color: colors.navy, fontSize: '0.9rem' }}>
                                                {d.title}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: colors.gray, display: 'block', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {d.embed_url}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        {d.division ? (
                                            <Chip label={d.division} size="small"
                                                sx={{ bgcolor: colors.navyLighter, color: colors.navyLight, fontWeight: 600, fontSize: '0.75rem' }} />
                                        ) : (
                                            <Typography variant="caption" sx={{ color: colors.gray }}>—</Typography>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {togglingId === d.id ? (
                                                <CircularProgress size={20} sx={{ color: colors.teal }} />
                                            ) : (
                                                <Switch
                                                    checked={d.is_visible}
                                                    onChange={() => handleToggleVisibility(d)}
                                                    size="small"
                                                    sx={{
                                                        '& .MuiSwitch-switchBase.Mui-checked': { color: colors.teal },
                                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: colors.teal },
                                                    }}
                                                />
                                            )}
                                            <Typography variant="caption" sx={{
                                                color: d.is_visible ? colors.teal : colors.gray,
                                                fontWeight: 600,
                                            }}>
                                                {d.is_visible ? 'Visible' : 'Hidden'}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => { setEditTarget(d); setDialogOpen(true); }}
                                                    sx={{ color: colors.navyLight, '&:hover': { bgcolor: colors.navyLighter } }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" onClick={() => setDeleteConfirm(d)}
                                                    sx={{ color: colors.error, '&:hover': { bgcolor: '#FEF2F2' } }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <PowerBIDashboardFormDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                dashboard={editTarget}
                onSaved={fetchDashboards}
            />

            <DeleteConfirmationModal
                open={Boolean(deleteConfirm)}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                itemName={deleteConfirm?.title || ''}
                itemType="Dashboard"
                requireNameConfirmation={true}
                isDeleting={deleting}
            />
        </Box>
    );
};

export default PowerBIDashboardManagementPanel;

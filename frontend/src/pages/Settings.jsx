import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Button, Tab, Tabs, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Switch, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    CircularProgress, Alert, Chip, Avatar, Tooltip, FormControlLabel,
    Checkbox,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
    VisibilityOff as HideIcon,
    Visibility as ShowIcon,
    Person as PersonIcon,
    ArrowUpward as UpIcon,
    ArrowDownward as DownIcon,
} from '@mui/icons-material';
import { colors } from '../theme/colors';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ─── Researcher Management Panel ──────────────────────────────────────────────

const EMPTY_FORM = {
    name: '', title: '', specialty: '', bio: '',
    email: '', phone: '', display_order: 0, is_visible: true,
};

const ResearcherFormDialog = ({ open, onClose, researcher, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef();
    const isEdit = Boolean(researcher);

    useEffect(() => {
        if (researcher) {
            setForm({
                name: researcher.name || '',
                title: researcher.title || '',
                specialty: researcher.specialty || '',
                bio: researcher.bio || '',
                email: researcher.email || '',
                phone: researcher.phone || '',
                display_order: researcher.display_order ?? 0,
                is_visible: researcher.is_visible ?? true,
            });
            setPhotoPreview(researcher.photo_url || null);
        } else {
            setForm(EMPTY_FORM);
            setPhotoPreview(null);
        }
        setPhoto(null);
        setError('');
    }, [researcher, open]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.title.trim()) {
            setError('Name and title are required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => data.append(k, v));
            if (photo) data.append('photo', photo);

            if (isEdit) {
                await api.patchMultipart(`/researchers/admin/${researcher.id}/`, data);
            } else {
                await api.postMultipart('/researchers/admin/', data);
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700, color: colors.navy, pb: 1 }}>
                {isEdit ? 'Edit Researcher' : 'Add Researcher'}
            </DialogTitle>
            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

                {/* Photo upload */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Avatar
                        src={photoPreview || undefined}
                        sx={{ width: 80, height: 80, bgcolor: colors.navyLighter, border: `2px solid ${colors.navyLighter}` }}
                    >
                        <PersonIcon sx={{ color: colors.navyLight, fontSize: 36 }} />
                    </Avatar>
                    <Box>
                        <Button variant="outlined" size="small" onClick={() => fileInputRef.current?.click()}
                            sx={{ borderColor: colors.navyLighter, color: colors.navyLight, textTransform: 'none', borderRadius: 2 }}>
                            {photoPreview ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }}
                            accept="image/*" onChange={handlePhotoChange} />
                        <Typography variant="caption" sx={{ display: 'block', color: colors.gray, mt: 0.5 }}>
                            Recommended: square, min 400×400px
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="Full Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        size="small" sx={{ gridColumn: '1 / -1' }} />
                    <TextField label="Title / Role *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        size="small" placeholder="e.g. Principal Investigator" />
                    <TextField label="Specialty" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                        size="small" placeholder="e.g. Health Systems" />
                    <TextField label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        size="small" type="email" />
                    <TextField label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        size="small" />
                    <TextField label="Display Order" value={form.display_order}
                        onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                        size="small" type="number" inputProps={{ min: 0 }} />
                </Box>

                <TextField label="Biography" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    multiline rows={4} placeholder="Short professional biography displayed on the public website..." />

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
                    {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : (isEdit ? 'Save Changes' : 'Add Researcher')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const ResearcherManagementPanel = () => {
    const [researchers, setResearchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    const fetchResearchers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/researchers/admin/');
            setResearchers(Array.isArray(res) ? res : []);
        } catch {
            setError('Failed to load researchers.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchResearchers(); }, []);

    const handleToggleVisibility = async (researcher) => {
        setTogglingId(researcher.id);
        try {
            await api.patch(`/researchers/admin/${researcher.id}/`, { is_visible: !researcher.is_visible });
            setResearchers(prev => prev.map(r =>
                r.id === researcher.id ? { ...r, is_visible: !r.is_visible } : r
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
            await api.delete(`/researchers/admin/${deleteConfirm.id}/`);
            setResearchers(prev => prev.filter(r => r.id !== deleteConfirm.id));
            setDeleteConfirm(null);
        } catch {
            setError('Failed to delete researcher.');
        } finally {
            setDeleting(false);
        }
    };

    const handleMoveOrder = async (researcher, direction) => {
        const newOrder = researcher.display_order + (direction === 'up' ? -1 : 1);
        try {
            await api.patch(`/researchers/admin/${researcher.id}/`, { display_order: newOrder < 0 ? 0 : newOrder });
            fetchResearchers();
        } catch {
            setError('Failed to reorder.');
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: colors.navy }}>Research Team</Typography>
                    <Typography variant="body2" sx={{ color: colors.gray, mt: 0.5 }}>
                        Manage profiles displayed on the public website. Toggle visibility without deleting records.
                    </Typography>
                </Box>
                <Button
                    variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setEditTarget(null); setDialogOpen(true); }}
                    sx={{
                        textTransform: 'none', bgcolor: colors.teal, borderRadius: 2, fontWeight: 600,
                        '&:hover': { bgcolor: colors.tealDark }, boxShadow: '0 4px 14px rgba(27,172,167,0.3)'
                    }}>
                    Add Researcher
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>
            )}

            {/* Stats row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Profiles', value: researchers.length, color: colors.navy },
                    { label: 'Visible on Site', value: researchers.filter(r => r.is_visible).length, color: colors.teal },
                    { label: 'Hidden', value: researchers.filter(r => !r.is_visible).length, color: colors.gray },
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

            {/* Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress sx={{ color: colors.teal }} />
                </Box>
            ) : researchers.length === 0 ? (
                <Paper elevation={0} sx={{
                    p: 6, textAlign: 'center', borderRadius: 3,
                    border: `2px dashed ${colors.navyLighter}`,
                }}>
                    <PersonIcon sx={{ fontSize: 48, color: colors.gray, mb: 2 }} />
                    <Typography sx={{ color: colors.gray, fontWeight: 500 }}>
                        No researcher profiles yet. Click "Add Researcher" to get started.
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
                                <TableCell sx={{ fontWeight: 700, color: colors.navy, fontSize: '0.8rem' }}>RESEARCHER</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: colors.navy, fontSize: '0.8rem' }}>SPECIALTY</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: colors.navy, fontSize: '0.8rem' }}>VISIBILITY</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: colors.navy, fontSize: '0.8rem' }} align="right">ACTIONS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {researchers.map((r, idx) => (
                                <TableRow key={r.id} sx={{
                                    '&:hover': { bgcolor: `${colors.teal}05` },
                                    opacity: r.is_visible ? 1 : 0.55,
                                    transition: 'opacity 0.2s',
                                }}>
                                    {/* Order controls */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                                            <Tooltip title="Move up">
                                                <span>
                                                    <IconButton size="small" disabled={idx === 0}
                                                        onClick={() => handleMoveOrder(r, 'up')}
                                                        sx={{ p: 0.25, color: colors.gray }}>
                                                        <UpIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Typography variant="caption" sx={{ color: colors.gray, fontWeight: 600, lineHeight: 1 }}>
                                                {r.display_order}
                                            </Typography>
                                            <Tooltip title="Move down">
                                                <span>
                                                    <IconButton size="small" disabled={idx === researchers.length - 1}
                                                        onClick={() => handleMoveOrder(r, 'down')}
                                                        sx={{ p: 0.25, color: colors.gray }}>
                                                        <DownIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>

                                    {/* Profile */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar
                                                src={r.photo_url || undefined}
                                                sx={{ width: 44, height: 44, bgcolor: colors.navyLighter }}
                                            >
                                                <PersonIcon sx={{ color: colors.navyLight }} />
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{ fontWeight: 600, color: colors.navy, fontSize: '0.9rem' }}>
                                                    {r.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: colors.teal, fontWeight: 500 }}>
                                                    {r.title}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        {r.specialty ? (
                                            <Chip label={r.specialty} size="small"
                                                sx={{ bgcolor: colors.navyLighter, color: colors.navyLight, fontWeight: 600, fontSize: '0.75rem' }} />
                                        ) : (
                                            <Typography variant="caption" sx={{ color: colors.gray }}>—</Typography>
                                        )}
                                    </TableCell>

                                    {/* Visibility toggle */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {togglingId === r.id ? (
                                                <CircularProgress size={20} sx={{ color: colors.teal }} />
                                            ) : (
                                                <Switch
                                                    checked={r.is_visible}
                                                    onChange={() => handleToggleVisibility(r)}
                                                    size="small"
                                                    sx={{
                                                        '& .MuiSwitch-switchBase.Mui-checked': { color: colors.teal },
                                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: colors.teal },
                                                    }}
                                                />
                                            )}
                                            <Typography variant="caption" sx={{
                                                color: r.is_visible ? colors.teal : colors.gray,
                                                fontWeight: 600,
                                            }}>
                                                {r.is_visible ? 'Visible' : 'Hidden'}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => { setEditTarget(r); setDialogOpen(true); }}
                                                    sx={{ color: colors.navyLight, '&:hover': { bgcolor: colors.navyLighter } }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" onClick={() => setDeleteConfirm(r)}
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

            {/* Add/Edit Dialog */}
            <ResearcherFormDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                researcher={editTarget}
                onSaved={fetchResearchers}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                open={Boolean(deleteConfirm)}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                itemName={deleteConfirm?.name || ''}
                itemType="Researcher"
                requireNameConfirmation={true}
                isDeleting={deleting}
            />
        </Box>
    );
};

// ─── Settings Page ─────────────────────────────────────────────────────────────
const Settings = () => {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 1100 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: colors.navy, letterSpacing: '-0.02em' }}>
                    Settings
                </Typography>
                <Typography sx={{ color: colors.gray, mt: 0.5 }}>
                    Manage your institution's public presence and system configuration.
                </Typography>
            </Box>

            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                    mb: 4,
                    '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem', minWidth: 'auto', mr: 2 },
                    '& .Mui-selected': { color: colors.teal },
                    '& .MuiTabs-indicator': { bgcolor: colors.teal, height: 3, borderRadius: 2 },
                }}
            >
                <Tab label="Research Team" />
                <Tab label="General" />
            </Tabs>

            {tab === 0 && <ResearcherManagementPanel />}

            {tab === 1 && (
                <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: `1px solid ${colors.navyLighter}` }}>
                    <Typography sx={{ color: colors.gray }}>
                        General settings coming soon.
                    </Typography>
                </Paper>
            )}
        </Box>
    );
};

export default Settings;

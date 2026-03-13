import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    Box, Card, CardContent, Typography, Grid, Button, IconButton,
    LinearProgress, Chip, Stack, Paper, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Divider, Avatar,
    List, ListItem, ListItemText, Tooltip, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    Flag as FlagIcon, CheckCircle as CompletedIcon,
    Schedule as ScheduleIcon, Warning as WarningIcon,
    Assignment as TaskIcon, CalendarMonth as CalendarIcon,
    RateReview as ReviewIcon
} from '@mui/icons-material';

const MilestonesTab = ({ projectId }) => {
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMilestones();
    }, [projectId]);

    const fetchMilestones = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/milestones/?project=${projectId}`);
            setMilestones(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching milestones:', err);
            setError('Failed to load milestones. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const [openDialog, setOpenDialog] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        dueDate: '',
        status: 'upcoming'
    });

    const statusConfig = {
        completed: { label: 'Completed', color: '#2e7d32', icon: CompletedIcon },
        review: { label: 'In Review', color: '#ed6c02', icon: ReviewIcon },
        in_progress: { label: 'In Progress', color: '#1976d2', icon: ScheduleIcon },
        upcoming: { label: 'Upcoming', color: '#757575', icon: FlagIcon },
        overdue: { label: 'Overdue', color: '#d32f2f', icon: WarningIcon }
    };

    const getMilestoneStatus = (milestone) => {
        // Use the explicit status from the backend
        return milestone.status || 'upcoming';
    };

    const handleOpenDialog = (milestone = null) => {
        if (milestone) {
            setEditingMilestone(milestone);
            setFormData({
                name: milestone.name,
                description: milestone.description,
                dueDate: milestone.due_date,
                status: milestone.status,
                progress: milestone.progress || 0
            });
        } else {
            setEditingMilestone(null);
            setFormData({
                name: '',
                description: '',
                dueDate: '',
                status: 'upcoming'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingMilestone(null);
    };

    const handleSave = async () => {
        try {
            const data = {
                project: projectId,
                name: formData.name,
                description: formData.description,
                due_date: formData.dueDate,
                status: formData.status,
                progress: formData.progress || 0
            };

            if (editingMilestone) {
                await api.put(`/milestones/${editingMilestone.id}/`, data);
            } else {
                await api.post('/milestones/', data);
            }
            fetchMilestones();
            handleCloseDialog();
        } catch (err) {
            console.error('Error saving milestone:', err);
            alert('Failed to save milestone. Please check your input and try again.');
        }
    };

    const handleDelete = async (milestoneId) => {
        if (window.confirm('Are you sure you want to delete this milestone?')) {
            try {
                await api.delete(`/milestones/${milestoneId}/`);
                fetchMilestones();
            } catch (err) {
                console.error('Error deleting milestone:', err);
                alert('Failed to delete milestone.');
            }
        }
    };

    const handleToggleComplete = async (milestone) => {
        let newStatus;
        let newProgress = milestone.progress;

        if (milestone.status === 'completed') {
            newStatus = 'in_progress';
        } else if (milestone.status === 'in_progress' && milestone.progress === 100) {
            newStatus = 'review';
        } else if (milestone.status === 'review') {
            newStatus = 'completed';
        } else {
            newStatus = 'completed';
            newProgress = 100;
        }

        try {
            await api.put(`/milestones/${milestone.id}/`, {
                ...milestone,
                status: newStatus,
                progress: newProgress
            });
            fetchMilestones();
        } catch (err) {
            console.error('Error toggling milestone completion:', err);
            alert('Failed to update milestone status.');
        }
    };

    const stats = {
        total: milestones.length,
        completed: milestones.filter(m => m.status === 'completed').length,
        inProgress: milestones.filter(m => getMilestoneStatus(m) === 'in_progress').length,
        upcoming: milestones.filter(m => getMilestoneStatus(m) === 'upcoming').length,
        overdue: milestones.filter(m => getMilestoneStatus(m) === 'overdue').length
    };

    return (
        <Box>
            {loading ? (
                <Box sx={{ width: '100%', mt: 4 }}>
                    <LinearProgress />
                    <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>
                        Loading milestones...
                    </Typography>
                </Box>
            ) : error ? (
                <Paper sx={{ p: 3, bgcolor: '#ffebee', border: '1px solid #ef5350', borderRadius: 2 }}>
                    <Typography color="error" align="center">
                        {error}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Button variant="outlined" color="error" onClick={fetchMilestones}>
                            Retry
                        </Button>
                    </Box>
                </Paper>
            ) : (
                <>
                    {/* Statistics */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                    Total Milestones
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a237e' }}>{stats.total}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#e8f5e9', border: '1px solid #81c784' }}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                    Completed
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 900, color: '#2e7d32' }}>{stats.completed}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                    In Progress
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 900, color: '#1976d2' }}>{stats.inProgress}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2, borderRadius: 3, bgcolor: stats.overdue > 0 ? '#ffebee' : '#f5f5f5', border: `1px solid ${stats.overdue > 0 ? '#ef5350' : '#e0e0e0'}` }}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                    Overdue
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 900, color: stats.overdue > 0 ? '#d32f2f' : '#757575' }}>{stats.overdue}</Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Add Milestone Button */}
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            Project Milestones
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                            sx={{ borderRadius: 3, fontWeight: 700 }}
                        >
                            Add Milestone
                        </Button>
                    </Box>

                    {/* Milestones List */}
                    {milestones.length > 0 ? (
                        <Grid container spacing={3}>
                            {milestones.map((milestone, index) => {
                                const currentStatus = getMilestoneStatus(milestone);
                                const config = statusConfig[currentStatus];
                                const StatusIcon = config.icon;

                                return (
                                    <Grid item xs={12} key={milestone.id}>
                                        <Card
                                            elevation={3}
                                            sx={{
                                                borderRadius: 4,
                                                border: currentStatus === 'overdue' ? '2px solid #ef5350' : '1px solid #e0e0e0',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: 6,
                                                    borderColor: currentStatus === 'overdue' ? '#d32f2f' : 'primary.main'
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <Grid container spacing={3}>
                                                    {/* Milestone Number */}
                                                    <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Avatar
                                                            sx={{
                                                                width: 56,
                                                                height: 56,
                                                                bgcolor: config.color,
                                                                fontSize: '1.5rem',
                                                                fontWeight: 900
                                                            }}
                                                        >
                                                            {index + 1}
                                                        </Avatar>
                                                    </Grid>

                                                    {/* Milestone Details */}
                                                    <Grid item xs={12} md={8}>
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                                            <Typography variant="h6" sx={{ fontWeight: 800, flex: 1 }}>
                                                                {milestone.name}
                                                            </Typography>
                                                            <Chip
                                                                icon={<StatusIcon sx={{ fontSize: 16 }} />}
                                                                label={config.label}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                    bgcolor: config.color,
                                                                    color: 'white'
                                                                }}
                                                            />
                                                        </Box>

                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                                                            {milestone.description}
                                                        </Typography>

                                                        <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                                                                </Typography>
                                                            </Box>
                                                            {milestone.associated_tasks !== undefined && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <TaskIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                        {milestone.associated_tasks} Associated Tasks
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Stack>

                                                        <Box>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                                                    Progress
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ fontWeight: 900, color: config.color }}>
                                                                    {milestone.progress}%
                                                                </Typography>
                                                            </Box>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={milestone.progress}
                                                                sx={{
                                                                    height: 8,
                                                                    borderRadius: 4,
                                                                    bgcolor: '#e0e0e0',
                                                                    '& .MuiLinearProgress-bar': {
                                                                        bgcolor: config.color,
                                                                        borderRadius: 4
                                                                    }
                                                                }}
                                                            />
                                                        </Box>
                                                    </Grid>

                                                    {/* Actions */}
                                                    <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                        <Tooltip title={milestone.status === 'completed' ? "Mark as In Progress" : "Mark as Completed"}>
                                                            <IconButton
                                                                onClick={() => handleToggleComplete(milestone)}
                                                                sx={{ color: milestone.status === 'completed' ? 'success.main' : 'text.secondary' }}
                                                            >
                                                                {milestone.status === 'completed' ? <CompletedIcon /> : <FlagIcon />}
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Edit Milestone">
                                                            <IconButton
                                                                onClick={() => handleOpenDialog(milestone)}
                                                                sx={{ color: 'primary.main' }}
                                                            >
                                                                <EditIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete Milestone">
                                                            <IconButton
                                                                onClick={() => handleDelete(milestone.id)}
                                                                color="error"
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    ) : (
                        <Paper sx={{ p: 6, borderRadius: 4, textAlign: 'center' }}>
                            <FlagIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>
                                No Milestones Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                                Create milestones to track major project deliverables and checkpoints.
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenDialog()}
                                sx={{ borderRadius: 3, fontWeight: 700 }}
                            >
                                Add Your First Milestone
                            </Button>
                        </Paper>
                    )}

                    {/* Add/Edit Milestone Dialog */}
                    <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                        <DialogTitle sx={{ fontWeight: 900 }}>
                            {editingMilestone ? 'Edit Milestone' : 'Add New Milestone'}
                        </DialogTitle>
                        <Divider />
                        <DialogContent sx={{ mt: 2 }}>
                            <Stack spacing={3}>
                                <TextField
                                    autoFocus
                                    label="Milestone Name"
                                    fullWidth
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                />
                                <TextField
                                    label="Description"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                />
                                <TextField
                                    label="Due Date"
                                    type="date"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                />
                                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={formData.status}
                                        label="Status"
                                        onChange={(e) => {
                                            const newStatus = e.target.value;
                                            setFormData({
                                                ...formData,
                                                status: newStatus,
                                                // If moving to completed or review, suggest 100% progress
                                                // but allow user to change it below. 
                                                progress: (newStatus === 'completed' || newStatus === 'review') ? 100 : formData.progress
                                            });
                                        }}
                                    >
                                        <MenuItem value="upcoming">Upcoming</MenuItem>
                                        <MenuItem value="in_progress">In Progress</MenuItem>
                                        <MenuItem value="review">In Review</MenuItem>
                                        <MenuItem value="completed">Completed</MenuItem>
                                        <MenuItem value="overdue">Overdue</MenuItem>
                                    </Select>
                                </FormControl>
                                {editingMilestone && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
                                            Progress ({formData.progress}%)
                                        </Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={formData.progress}
                                            sx={{ height: 8, borderRadius: 4, mb: 2 }}
                                        />
                                        <TextField
                                            label="Progress %"
                                            type="number"
                                            fullWidth
                                            inputProps={{ min: 0, max: 100 }}
                                            value={formData.progress}
                                            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                        />
                                    </Box>
                                )}
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ p: 3, pt: 1 }}>
                            <Button onClick={handleCloseDialog} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                variant="contained"
                                disabled={!formData.name || !formData.dueDate}
                                sx={{ borderRadius: 3, px: 4, fontWeight: 800 }}
                            >
                                {editingMilestone ? 'Save Changes' : 'Add Milestone'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            )}
        </Box>
    );
};

export default MilestonesTab;

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, MenuItem, Alert, Typography
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const EDITABLE_FIELDS = [
    'name', 'description', 'start_date', 'end_date', 'status',
    'powerbi_embed_url', 'total_budget'
];

const ProjectForm = ({ open, onClose, onSave, project, error }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'active',
        powerbi_embed_url: '',
        total_budget: ''
    });
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (project) {
            const cleaned = {};
            EDITABLE_FIELDS.forEach((f) => { cleaned[f] = project[f] ?? ''; });
            setFormData(cleaned);
        } else {
            setFormData({
                name: '',
                description: '',
                start_date: '',
                end_date: '',
                status: 'active',
                powerbi_embed_url: '',
                total_budget: ''
            });
        }
        setLocalError('');
    }, [project]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.name.trim()) {
            setLocalError('Project name is required.');
            return;
        }
        if (formData.start_date && formData.end_date
            && formData.end_date < formData.start_date) {
            setLocalError('End date must be on or after the start date.');
            return;
        }
        setLocalError('');
        onSave(formData);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
            <DialogContent>
                <Typography variant="caption" color="text.secondary">
                    Owner: {project?.created_by_name || user?.username || '—'}
                </Typography>
                {(localError || error) && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {localError || error}
                    </Alert>
                )}
                <TextField
                    autoFocus
                    margin="dense"
                    name="name"
                    label="Project Name"
                    fullWidth
                    value={formData.name}
                    onChange={handleChange}
                    error={!!localError}
                />
                <TextField
                    margin="dense"
                    name="description"
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                />
                <TextField
                    margin="dense"
                    name="start_date"
                    label="Start Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={formData.start_date}
                    onChange={handleChange}
                />
                <TextField
                    margin="dense"
                    name="end_date"
                    label="End Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={formData.end_date || ''}
                    onChange={handleChange}
                />
                <TextField
                    select
                    margin="dense"
                    name="status"
                    label="Status"
                    fullWidth
                    value={formData.status}
                    onChange={handleChange}
                >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="on_hold">On Hold</MenuItem>
                </TextField>
                <TextField
                    margin="dense"
                    name="powerbi_embed_url"
                    label="Analytics Dashboard URL"
                    fullWidth
                    value={formData.powerbi_embed_url || ''}
                    onChange={handleChange}
                />
                <TextField
                    margin="dense"
                    name="total_budget"
                    label="Total Budget"
                    type="number"
                    fullWidth
                    InputProps={{ inputProps: { min: 0, step: '0.01' } }}
                    value={formData.total_budget ?? ''}
                    onChange={handleChange}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProjectForm;

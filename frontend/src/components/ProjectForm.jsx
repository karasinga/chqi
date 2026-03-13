import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, MenuItem
} from '@mui/material';

const ProjectForm = ({ open, onClose, onSave, project }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'active',
        powerbi_embed_url: ''
    });

    useEffect(() => {
        if (project) {
            setFormData(project);
        } else {
            setFormData({
                name: '',
                description: '',
                start_date: '',
                end_date: '',
                status: 'active',
                powerbi_embed_url: ''
            });
        }
    }, [project]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        onSave(formData);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    name="name"
                    label="Project Name"
                    fullWidth
                    value={formData.name}
                    onChange={handleChange}
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

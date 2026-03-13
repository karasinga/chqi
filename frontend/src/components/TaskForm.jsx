import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, MenuItem, FormControl, InputLabel, Select, OutlinedInput, Chip, Box,
    Typography, InputAdornment, Avatar, Divider, Stack, Grid, Tooltip
} from '@mui/material';
import {
    Assignment as TaskIcon,
    CalendarMonth as CalendarIcon,
    Timer as TimerIcon,
    AccountTree as DependencyIcon,
    Flag as PriorityIcon,
    Person as AssigneeIcon,
    Info as StatusIcon
} from '@mui/icons-material';
import api from '../utils/api';

const TaskForm = ({ open, onClose, onSave, task, allTasks, projects = [], defaultProjectId = null, viewMode = false }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        project: '',
        start_date: '',
        duration: 1,
        dependencies: [],
        status: 'todo',
        priority: 'medium',
        assignee: '',
        description: ''
    });
    const [newComment, setNewComment] = useState('');

    // Queries
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users/users/')
    });

    const { data: comments = [] } = useQuery({
        queryKey: ['comments', task?.id],
        queryFn: () => api.get(`/pm/comments/?task=${task.id}`),
        enabled: !!task?.id && open
    });

    // Mutations
    const addCommentMutation = useMutation({
        mutationFn: (content) => api.post('/pm/comments/', { task: task.id, content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', task?.id] });
            setNewComment('');
        },
        onError: (err) => console.error('Error adding comment:', err)
    });


    useEffect(() => {
        if (task) {
            setFormData({
                ...task,
                project: task.project || '',
                dependencies: task.dependencies || [],
                assignee: task.assignee || '',
                status: task.status || 'todo',
                priority: task.priority || 'medium',
                description: task.description || ''
            });
        } else {
            setFormData({
                name: '',
                project: defaultProjectId || '',
                start_date: new Date().toISOString().split('T')[0],
                duration: 1,
                dependencies: [],
                status: 'todo',
                priority: 'medium',
                assignee: '',
                description: ''
            });
        }
    }, [task, open, defaultProjectId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { [name]: value };
            // Clear dependencies if project changes
            if (name === 'project') {
                updates.dependencies = [];
            }
            return { ...prev, ...updates };
        });
    };

    const handleDependencyChange = (event) => {
        const {
            target: { value },
        } = event;

        const newDependencies = typeof value === 'string' ? value.split(',') : value;
        const numericDependencies = newDependencies.map(id => Number(id)).filter(id => !isNaN(id));

        let newStartDate = formData.start_date;

        if (numericDependencies.length > 0) {
            let maxEndDate = null;

            numericDependencies.forEach(depId => {
                const depTask = allTasks.find(t => Number(t.id) === depId);
                if (depTask) {
                    const depStart = new Date(depTask.start_date);
                    const depEnd = new Date(depStart);
                    depEnd.setDate(depStart.getDate() + (depTask.duration || 1));

                    if (!maxEndDate || depEnd > maxEndDate) {
                        maxEndDate = depEnd;
                    }
                }
            });

            if (maxEndDate) {
                newStartDate = maxEndDate.toISOString().split('T')[0];
            }
        }

        setFormData({
            ...formData,
            dependencies: numericDependencies,
            start_date: newStartDate
        });
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        addCommentMutation.mutate(newComment);
    };

    const handleSubmit = () => {
        // Only send writable fields to the backend with correct types
        const cleanData = {
            name: formData.name,
            project: Number(formData.project),
            start_date: formData.start_date,
            duration: Number(formData.duration),
            dependencies: formData.dependencies.map(id => Number(id)),
            status: formData.status,
            priority: formData.priority,
            assignee: formData.assignee ? Number(formData.assignee) : null,
            description: formData.description || ''
        };
        console.log('TaskForm Submitting Clean Data:', cleanData);
        onSave(cleanData);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                        <TaskIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>
                            {viewMode ? 'View Task Details' : (task ? 'Edit Task Details' : 'Create New Task')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {viewMode ? 'Viewing task details. Only comments can be added.' : 'Fill in the details to organize your research workflow.'}
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ mt: 2 }}>
                <Stack spacing={3}>
                    <TextField
                        autoFocus={!viewMode}
                        name="name"
                        label="Task Name"
                        fullWidth
                        variant="outlined"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={viewMode}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />

                    <TextField
                        name="description"
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        value={formData.description}
                        onChange={handleChange}
                        disabled={viewMode}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />

                    <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                        <InputLabel>Project</InputLabel>
                        <Select
                            name="project"
                            value={formData.project}
                            onChange={handleChange}
                            label="Project"
                            disabled={viewMode || !!defaultProjectId}
                            startAdornment={<DependencyIcon sx={{ mr: 1, color: 'action.active', fontSize: 20 }} />}
                        >
                            <MenuItem value=""><em>Select Project</em></MenuItem>
                            {projects.map(p => (
                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    label="Status"
                                    disabled={viewMode}
                                    startAdornment={<StatusIcon sx={{ mr: 1, color: 'action.active', fontSize: 20 }} />}
                                >
                                    <MenuItem value="todo">To Do</MenuItem>
                                    <MenuItem value="in_progress">In Progress</MenuItem>
                                    <MenuItem value="review">Review</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <Tooltip title={formData.priority === 'critical' ? "This task is on the Critical Path and its priority is managed automatically by the system." : ""}>
                                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}
                                        label="Priority"
                                        disabled={viewMode || formData.priority === 'critical'}
                                        startAdornment={<PriorityIcon sx={{ mr: 1, color: 'action.active', fontSize: 20 }} />}
                                    >
                                        <MenuItem value="low">Low</MenuItem>
                                        <MenuItem value="medium">Medium</MenuItem>
                                        <MenuItem value="high">High</MenuItem>
                                        {formData.priority === 'critical' && <MenuItem value="critical">Critical (Auto-assigned)</MenuItem>}
                                    </Select>
                                </FormControl>
                            </Tooltip>
                        </Grid>
                    </Grid>

                    <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                        <InputLabel>Assignee</InputLabel>
                        <Select
                            name="assignee"
                            value={formData.assignee}
                            onChange={handleChange}
                            label="Assignee"
                            disabled={viewMode}
                            startAdornment={<AssigneeIcon sx={{ mr: 1, color: 'action.active', fontSize: 20 }} />}
                        >
                            <MenuItem value=""><em>Unassigned</em></MenuItem>
                            {users.map(user => (
                                <MenuItem key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name} ({user.username})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                        <InputLabel id="dependency-label">Dependencies</InputLabel>
                        <Select
                            labelId="dependency-label"
                            multiple
                            value={formData.dependencies}
                            onChange={handleDependencyChange}
                            disabled={viewMode || !formData.project}
                            input={<OutlinedInput label="Dependencies" startAdornment={
                                <InputAdornment position="start">
                                    <DependencyIcon color="action" fontSize="small" />
                                </InputAdornment>
                            } />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => {
                                        const t = allTasks.find(t => t.id === value);
                                        return <Chip key={value} label={t ? t.name : value} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />;
                                    })}
                                </Box>
                            )}
                        >
                            {allTasks
                                .filter(t => t.id !== (task?.id) && String(t.project) === String(formData.project))
                                .map((t) => (
                                    <MenuItem key={t.id} value={t.id} sx={{ fontWeight: 500 }}>
                                        {t.name}
                                    </MenuItem>
                                ))}
                        </Select>
                    </FormControl>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField
                                name="start_date"
                                label="Start Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.start_date}
                                onChange={handleChange}
                                disabled={viewMode || formData.dependencies.length > 0}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name="duration"
                                label="Duration (Days)"
                                type="number"
                                fullWidth
                                value={formData.duration}
                                onChange={handleChange}
                                disabled={viewMode}
                                InputProps={{ inputProps: { min: 1 } }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                        </Grid>
                    </Grid>

                    {task && (
                        <Box sx={{ mt: 2 }}>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DependencyIcon fontSize="small" color="primary" />
                                Team Collaboration
                            </Typography>
                            <Stack spacing={2} sx={{ mb: 2, maxHeight: 200, overflowY: 'auto', pr: 1 }}>
                                {comments.map((comment, i) => (
                                    <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.light' }}>
                                            {comment.username ? comment.username[0].toUpperCase() : 'U'}
                                        </Avatar>
                                        <Box sx={{ bgcolor: '#f8f9fa', p: 1.5, borderRadius: 3, flexGrow: 1, border: '1px solid #eee' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                    {comment.username}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(comment.created_at).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.4 }}>
                                                {comment.content}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                                {comments.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                        No comments yet. Start the conversation!
                                    </Typography>
                                )}
                            </Stack>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    sx={{ borderRadius: 3, fontWeight: 700 }}
                                >
                                    Post
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} sx={{ fontWeight: 700, color: 'text.secondary' }}>Close</Button>
                {!viewMode && (
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        color="primary"
                        sx={{ borderRadius: 3, px: 4, fontWeight: 800, boxShadow: '0 8px 16px rgba(25, 118, 210, 0.2)' }}
                    >
                        {task ? 'Save Changes' : 'Create Task'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default TaskForm;

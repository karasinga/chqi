import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Grid, Paper, Tabs, Tab, Button, IconButton,
    Chip, Avatar, Stack, TextField, InputAdornment, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Menu, MenuItem, Divider, LinearProgress, Checkbox, FormControlLabel, FormGroup, Autocomplete,
    FormControl, InputLabel, Select, Switch
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterListIcon,
    ViewKanban as KanbanIcon,
    ViewList as ListIcon,
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    Assignment as AssignmentIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    Flag as FlagIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    CalendarMonth as CalendarIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Comment as CommentIcon,
    History as HistoryIcon,
    Flag as PriorityIcon,
    Timer as TimerIcon
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

// ... (existing code)


import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskForm from '../components/TaskForm';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const getNormalizedStatus = (status) => {
    if (!status) return 'todo';
    const s = String(status).toLowerCase().replace(/[\s-]/g, '_');

    if (s.includes('progres')) return 'in_progress';
    if (s.includes('todo') || s.includes('to_do')) return 'todo';
    if (s.includes('review')) return 'review';
    if (s.includes('complete') || s.includes('done')) return 'completed';

    return s;
};

const getPriorityColor = (priority) => {
    switch (priority) {
        case 'critical': return '#ef5350'; // Red
        case 'high': return '#ff9800';     // Orange
        case 'medium': return '#2196f3';   // Blue
        case 'low': return '#9e9e9e';      // Gray
        default: return '#e0e0e0';
    }
};

const getOverdueInfo = (task) => {
    if (task.status === 'completed') return null;
    if (!task.start_date) return null;

    const endDate = new Date(task.start_date);
    const duration = parseInt(task.duration || 0, 10);
    endDate.setDate(endDate.getDate() + duration);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (endDate < today) {
        const diffTime = Math.abs(today - endDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            days: diffDays,
            label: `${diffDays}D DELAYED`,
            dueDate: endDate.toLocaleDateString()
        };
    }
    return null;
};

const TaskManagement = () => {
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();

    // UI State
    const [view, setView] = useState('kanban');
    const [searchQuery, setSearchQuery] = useState('');
    const [openForm, setOpenForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    // Filter State - using dropdown selects instead of checkboxes
    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterProject, setFilterProject] = useState('all');
    const [filterAssignee, setFilterAssignee] = useState('all');
    const [filterOverdue, setFilterOverdue] = useState(false);

    // Queries
    const { data: tasks = [], isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => api.get('/pm/tasks/'),
        refetchInterval: 30000
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.get('/projects/'),
        refetchInterval: 30000
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users/users/'),
        refetchInterval: 60000
    });

    // Mutations
    const saveTaskMutation = useMutation({
        mutationFn: (taskData) => editingTask
            ? api.put(`/pm/tasks/${editingTask.id}/`, taskData)
            : api.post('/pm/tasks/', taskData),
        onSuccess: (data) => {
            console.log('Task saved successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setOpenForm(false);
            setEditingTask(null);
        },
        onError: (err) => {
            console.error('Error saving task mutation:', err);
            alert(`Failed to save task: ${err.message}`);
        }
    });

    const deleteTaskMutation = useMutation({
        mutationFn: (taskId) => api.delete(`/pm/tasks/${taskId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setDeleteModalOpen(false);
            setTaskToDelete(null);
        },
        onError: (err) => console.error('Error deleting task:', err)
    });

    const updateTaskStatusMutation = useMutation({
        mutationFn: ({ taskId, status }) => api.patch(`/pm/tasks/${taskId}/`, { status }),
        onMutate: async ({ taskId, status }) => {
            const numericId = Number(taskId);
            await queryClient.cancelQueries({ queryKey: ['tasks'] });
            const previousTasks = queryClient.getQueryData(['tasks']);
            queryClient.setQueryData(['tasks'], old => {
                if (!Array.isArray(old)) return old;
                return old.map(t => Number(t.id) === numericId ? { ...t, status } : t);
            });
            return { previousTasks };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['tasks'], context.previousTasks);
            console.error('Error updating task status mutation:', err);
            // Re-throw or show alert? Let's just log for now
            alert(`Failed to move task: ${err.message}`);
        },
        onSettled: () => {
            console.log('Task status update mutation settled');
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    useEffect(() => {
        const taskId = searchParams.get('taskId');
        if (taskId && tasks.length > 0) {
            const task = tasks.find(t => t.id === parseInt(taskId));
            if (task) {
                setEditingTask(task);
                setViewMode(true); // Open in view mode when coming from URL
                setOpenForm(true);
            }
        }
    }, [tasks, searchParams]);

    const onDragEnd = (result) => {
        if (!result.destination) return;

        const { draggableId, destination } = result;
        const newStatus = destination.droppableId;
        const taskId = Number(draggableId);

        const task = tasks.find(t => Number(t.id) === taskId);
        if (task && task.status !== newStatus) {
            updateTaskStatusMutation.mutate({ taskId, status: newStatus });
        }
    };

    const handleSaveTask = (taskData) => {
        saveTaskMutation.mutate(taskData);
    };

    const handleDeleteTask = (task) => {
        setTaskToDelete(task);
        setDeleteModalOpen(true);
    };

    const handleConfirmDeleteTask = () => {
        if (taskToDelete) {
            deleteTaskMutation.mutate(taskToDelete.id);
        }
    };

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.project_name && task.project_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (task.assignee_name && task.assignee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());

            const normStatus = getNormalizedStatus(task.status);
            const matchesStatus = filterStatus === 'all' || normStatus === filterStatus;
            const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
            const matchesProject = filterProject === 'all' || task.project === Number(filterProject);
            const matchesAssignee = filterAssignee === 'all' || task.assignee === Number(filterAssignee);

            const isOverdue = (() => {
                if (normStatus === 'completed') return false;
                if (!task.start_date) return false;
                const endDate = new Date(task.start_date);
                endDate.setDate(endDate.getDate() + (task.duration || 0));
                return endDate < new Date();
            })();

            const matchesOverdue = !filterOverdue || isOverdue;

            return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesAssignee && matchesOverdue;
        });
    }, [tasks, searchQuery, filterStatus, filterPriority, filterProject, filterAssignee, filterOverdue]);

    // Calculate statistics
    const stats = useMemo(() => {
        const total = tasks.length;
        const byStatus = {
            todo: 0,
            in_progress: 0,
            review: 0,
            completed: 0,
            other: 0
        };

        tasks.forEach(t => {
            const status = t.status || 'todo';
            if (byStatus[status] !== undefined) {
                byStatus[status]++;
            } else {
                byStatus.other++;
            }
        });

        const overdue = tasks.filter(t => {
            if (t.status === 'completed') return false;
            if (!t.start_date) return false;

            const endDate = new Date(t.start_date);
            endDate.setDate(endDate.getDate() + (t.duration || 0));
            return endDate < new Date();
        }).length;

        const completionRate = total > 0 ? Math.round((byStatus.completed / total) * 100) : 0;

        return { total, byStatus, overdue, completionRate };
    }, [tasks]);

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return '#ff5252';
            case 'high': return '#ff9800';
            case 'medium': return '#00bcd4';
            case 'low': return '#4caf50';
            default: return '#9e9e9e';
        }
    };

    const getStatusChip = (status) => {
        const statusMap = {
            'todo': { label: 'To Do', color: 'default' },
            'in_progress': { label: 'In Progress', color: 'primary' },
            'review': { label: 'Review', color: 'warning' },
            'completed': { label: 'Completed', color: 'success' }
        };
        const s = statusMap[status] || { label: status, color: 'default' };
        return <Chip label={s.label} color={s.color} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />;
    };

    const KanbanColumn = ({ title, status, tasks }) => (
        <Grid item xs={12} md={3}>
            <Paper sx={{
                p: 2,
                bgcolor: '#f8f9fa',
                borderRadius: 4,
                minHeight: '70vh',
                border: '1px solid #eee'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        {title}
                        <Chip label={tasks.length} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                    </Typography>
                </Box>
                <Droppable droppableId={status}>
                    {(provided) => (
                        <Stack
                            spacing={2}
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            sx={{ minHeight: 100 }}
                        >
                            {tasks.map((task, index) => (
                                <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                                    {(provided) => (
                                        <Paper
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            elevation={1}
                                            sx={{
                                                p: 2,
                                                borderRadius: 4,
                                                borderLeft: `5px solid ${getPriorityColor(task.priority)}`,
                                                bgcolor: getOverdueInfo(task) ? '#fff8f8' : 'white',
                                                border: task.priority === 'critical' ? '2px solid #ff5252' : '1px solid #edf2f7',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 20px -10px rgba(0,0,0,0.15)', cursor: 'pointer', borderColor: 'primary.light' },
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            onClick={() => { setEditingTask(task); setOpenForm(true); }}
                                        >
                                            {task.priority === 'critical' && (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        right: 0,
                                                        p: 0.5,
                                                        bgcolor: '#ff5252',
                                                        color: 'white',
                                                        borderRadius: '0 3px 0 10px',
                                                        zIndex: 1
                                                    }}
                                                >
                                                    <PriorityIcon sx={{ fontSize: 14 }} />
                                                </Box>
                                            )}

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                                                        {task.project_name || 'NO PROJECT'}
                                                    </Typography>
                                                    {(() => {
                                                        const overdue = getOverdueInfo(task);
                                                        if (overdue) {
                                                            return (
                                                                <Box
                                                                    sx={{
                                                                        bgcolor: '#ef5350',
                                                                        color: 'white',
                                                                        px: 0.8,
                                                                        py: 0.2,
                                                                        borderRadius: 1,
                                                                        fontWeight: 900,
                                                                        fontSize: '0.6rem',
                                                                        letterSpacing: 0.5,
                                                                        textTransform: 'uppercase',
                                                                        boxShadow: '0 2px 4px rgba(239, 83, 80, 0.2)'
                                                                    }}
                                                                >
                                                                    {overdue.label}
                                                                </Box>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </Box>
                                                <Box>
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingTask(task); setOpenForm(true); }} sx={{ color: 'text.secondary', p: 0.5 }}>
                                                        <EditIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }} sx={{ color: 'text.secondary', p: 0.5, '&:hover': { color: 'error.main' } }}>
                                                        <DeleteIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Box>
                                            </Box>

                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', mb: 1, lineHeight: 1.3 }}>
                                                {task.name}
                                            </Typography>

                                            <Box sx={{ mb: 2 }}>
                                                <Chip
                                                    label={task.priority}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: task.priority === 'critical' ? '#fea2a2' : '#fff7ed', // Soft backgrounds
                                                        color: getPriorityColor(task.priority),
                                                        fontWeight: 800,
                                                        fontSize: '0.65rem',
                                                        textTransform: 'uppercase',
                                                        height: 22,
                                                        borderRadius: 1
                                                    }}
                                                />
                                            </Box>

                                            <Divider sx={{ mb: 2, opacity: 0.4 }} />

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Tooltip title="Start Date">
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                        <CalendarIcon sx={{ fontSize: 15, color: getOverdueInfo(task) ? '#ef5350' : '#94a3b8' }} />
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: getOverdueInfo(task) ? '#ef5350' : '#64748b' }}>
                                                            {task.start_date || 'No Date'}
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>

                                                <Tooltip title="Duration">
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                        <TimerIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                                                            {task.duration || 0}d {getOverdueInfo(task) && (
                                                                <span style={{ color: '#ef5350', marginLeft: '4px' }}>
                                                                    (+{getOverdueInfo(task).days}d)
                                                                </span>
                                                            )}
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>

                                                {task.assignee_name && (
                                                    <Avatar
                                                        sx={{
                                                            width: 24,
                                                            height: 24,
                                                            fontSize: '0.7rem',
                                                            bgcolor: '#3b82f6',
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {task.assignee_name[0]}
                                                    </Avatar>
                                                )}
                                            </Box>
                                        </Paper>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </Stack>
                    )}
                </Droppable>
            </Paper>
        </Grid>
    );

    return (
        <Box sx={{ p: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                        Task Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track and manage research tasks across all projects.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
                    onClick={() => { setEditingTask(null); setOpenForm(true); }}
                >
                    New Task
                </Button>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{ p: 2, borderRadius: 3, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}
                        onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterProject('all'); setFilterAssignee('all'); setFilterOverdue(false); }}
                    >
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Total Tasks
                        </Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a237e' }}>{stats.total}</Typography>
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{ p: 2, borderRadius: 3, bgcolor: '#e3f2fd', border: '1px solid #90caf9', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}
                        onClick={() => { setFilterStatus('in_progress'); setFilterOverdue(false); }}
                    >
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            In Progress
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#1976d2' }}>{stats.byStatus.in_progress}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{ p: 2, borderRadius: 3, bgcolor: '#e8f5e9', border: '1px solid #81c784', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}
                        onClick={() => { setFilterStatus('completed'); setFilterOverdue(false); }}
                    >
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Completed
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#2e7d32' }}>{stats.byStatus.completed}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: 2, borderRadius: 3,
                            bgcolor: stats.overdue > 0 ? (filterOverdue ? '#ffd7d7' : '#ffebee') : '#f5f5f5',
                            border: `1px solid ${stats.overdue > 0 ? '#ef5350' : '#e0e0e0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: filterOverdue ? 4 : 0,
                            '&:hover': { boxShadow: 2, transform: 'translateY(-2px)' }
                        }}
                        onClick={() => setFilterOverdue(!filterOverdue)}
                    >
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Overdue
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: stats.overdue > 0 ? '#d32f2f' : '#757575' }}>{stats.overdue}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Controls */}
            <Paper sx={{ p: 2, mb: 4, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search tasks, projects, people..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="status-filter-label">Status</InputLabel>
                            <Select
                                labelId="status-filter-label"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                label="Status"
                            >
                                <MenuItem value="all">All Statuses</MenuItem>
                                <MenuItem value="todo">To Do</MenuItem>
                                <MenuItem value="in_progress">In Progress</MenuItem>
                                <MenuItem value="review">Review</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="priority-filter-label">Priority</InputLabel>
                            <Select
                                labelId="priority-filter-label"
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                label="Priority"
                            >
                                <MenuItem value="all">All Priorities</MenuItem>
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="critical">Critical</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="project-filter-label">Project</InputLabel>
                            <Select
                                labelId="project-filter-label"
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                label="Project"
                            >
                                <MenuItem value="all">All Projects</MenuItem>
                                {projects.map(p => (
                                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} md={1.5}>
                        <FormControlLabel
                            control={<Switch size="small" checked={filterOverdue} onChange={(e) => setFilterOverdue(e.target.checked)} color="error" />}
                            label={<Typography variant="caption" sx={{ fontWeight: 800, color: filterOverdue ? 'error.main' : 'text.secondary' }}>Overdue Only</Typography>}
                        />
                    </Grid>
                    <Grid item xs={6} md={1}>
                        <Button
                            variant="text"
                            size="small"
                            fullWidth
                            onClick={() => {
                                setFilterStatus('all');
                                setFilterPriority('all');
                                setFilterProject('all');
                                setFilterAssignee('all');
                                setFilterOverdue(false);
                                setSearchQuery('');
                            }}
                            sx={{ fontWeight: 800, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                        >
                            Clear
                        </Button>
                    </Grid>
                    <Grid item xs={12} md={0.5}>
                        <Box sx={{ display: 'flex', bgcolor: '#f0f2f5', p: 0.5, borderRadius: 2, justifyContent: 'center' }}>
                            <Tooltip title="Kanban View">
                                <IconButton
                                    size="small"
                                    onClick={() => setView('kanban')}
                                    sx={{ bgcolor: view === 'kanban' ? 'white' : 'transparent', borderRadius: 1.5, boxShadow: view === 'kanban' ? 1 : 0 }}
                                >
                                    <KanbanIcon fontSize="small" color={view === 'kanban' ? 'primary' : 'inherit'} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="List View">
                                <IconButton
                                    size="small"
                                    onClick={() => setView('list')}
                                    sx={{ bgcolor: view === 'list' ? 'white' : 'transparent', borderRadius: 1.5, boxShadow: view === 'list' ? 1 : 0 }}
                                >
                                    <ListIcon fontSize="small" color={view === 'list' ? 'primary' : 'inherit'} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {tasksLoading ? (
                <LinearProgress sx={{ borderRadius: 2 }} />
            ) : (
                <>
                    {view === 'kanban' ? (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Grid container spacing={3}>
                                <KanbanColumn title="To Do" status="todo" tasks={filteredTasks.filter(t => getNormalizedStatus(t.status) === 'todo')} />
                                <KanbanColumn title="In Progress" status="in_progress" tasks={filteredTasks.filter(t => getNormalizedStatus(t.status) === 'in_progress')} />
                                <KanbanColumn title="Review" status="review" tasks={filteredTasks.filter(t => getNormalizedStatus(t.status) === 'review')} />
                                <KanbanColumn title="Done" status="completed" tasks={filteredTasks.filter(t => getNormalizedStatus(t.status) === 'completed')} />
                            </Grid>
                        </DragDropContext>
                    ) : (
                        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid #eee' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800 }}>Task Name</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Project</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Priority</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Assignee</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Duration</TableCell>
                                        <TableCell align="right"></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredTasks.map((task) => (
                                        <TableRow
                                            key={task.id}
                                            hover
                                            onClick={() => { setEditingTask(task); setOpenForm(true); }}
                                            sx={{
                                                cursor: 'pointer',
                                                bgcolor: getOverdueInfo(task) ? '#fff8f8' : 'inherit',
                                                borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                                                borderBottom: '1px solid #edf2f7',
                                                '&:hover': { bgcolor: getOverdueInfo(task) ? '#ffeded !important' : '#f8fafc' }
                                            }}
                                        >
                                            <TableCell sx={{ fontWeight: 700 }}>
                                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#2d3748' }}>
                                                        {task.name}
                                                    </Typography>
                                                    {(() => {
                                                        const overdue = getOverdueInfo(task);
                                                        return overdue ? (
                                                            <Box
                                                                sx={{
                                                                    bgcolor: '#ef5350',
                                                                    color: 'white',
                                                                    px: 1,
                                                                    py: 0.2,
                                                                    borderRadius: 1,
                                                                    fontWeight: 900,
                                                                    fontSize: '0.6rem',
                                                                    textTransform: 'uppercase'
                                                                }}
                                                            >
                                                                {overdue.label}
                                                            </Box>
                                                        ) : null;
                                                    })()}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <CalendarIcon sx={{ fontSize: 14, color: getOverdueInfo(task) ? '#ef5350' : '#94a3b8' }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 800, color: getOverdueInfo(task) ? '#ef5350' : '#64748b' }}>
                                                        {task.start_date}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <TimerIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>
                                                        {task.duration}d
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={task.priority}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${getPriorityColor(task.priority)}15`,
                                                        color: getPriorityColor(task.priority),
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        fontSize: '0.6rem'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                                                        {task.assignee_name ? task.assignee_name[0].toUpperCase() : '?'}
                                                    </Avatar>
                                                    <Typography variant="body2">{task.assignee_name || 'Unassigned'}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{task.duration} days</TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            )
            }

            <TaskForm
                open={openForm}
                onClose={() => { setOpenForm(false); setEditingTask(null); setViewMode(false); }}
                onSave={handleSaveTask}
                task={editingTask}
                allTasks={tasks}
                projects={projects}
                viewMode={viewMode}
            />

            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDeleteTask}
                itemName={taskToDelete?.name}
                itemType="Task"
                requireNameConfirmation={false}
            />
        </Box >
    );
};

export default TaskManagement;

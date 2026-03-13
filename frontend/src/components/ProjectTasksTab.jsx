import React, { useState, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, Chip, IconButton, Button,
    TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
    ToggleButton, ToggleButtonGroup, Stack, Avatar, Tooltip, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TableSortLabel, Switch, FormControlLabel, Checkbox, Divider
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    Search as SearchIcon, ViewKanban as KanbanIcon, ViewList as ListIcon,
    FilterList as FilterIcon, CalendarMonth as CalendarIcon,
    Timer as TimerIcon, Flag as PriorityIcon, Person as PersonIcon,
    CheckCircle as CheckCircleIcon, RadioButtonUnchecked as UncheckedIcon,
    Schedule as ScheduleIcon, Info as StatusIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const getPriorityColor = (priority) => {
    switch (priority) {
        case 'critical': return '#ef5350'; // Red
        case 'high': return '#ff9800';     // Orange
        case 'medium': return '#2196f3';   // Blue
        case 'low': return '#9e9e9e';      // Gray
        default: return '#e0e0e0';
    }
};

const getNormalizedStatus = (status) => {
    if (!status) return 'todo';
    const s = String(status).toLowerCase().replace(/[\s-]/g, '_');

    if (s.includes('progres')) return 'in_progress';
    if (s.includes('todo') || s.includes('to_do')) return 'todo';
    if (s.includes('review')) return 'review';
    if (s.includes('complete') || s.includes('done')) return 'completed';

    return s; // Return as is if no match
};

const getOverdueInfo = (task) => {
    if (task.status === 'completed' || task.status === 'done') return null;
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

const ProjectTasksTab = ({ tasks = [], onAddTask, onEditTask, onDeleteTask, onStatusChange, users = [] }) => {
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterAssignee, setFilterAssignee] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [filterOverdue, setFilterOverdue] = useState(false);

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
        let filtered = tasks.filter(task => {
            const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            const normStatus = getNormalizedStatus(task.status);
            const matchesStatus = filterStatus === 'all' || normStatus === filterStatus;
            const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
            const matchesAssignee = filterAssignee === 'all' || task.assignee === parseInt(filterAssignee);

            const isOverdue = (() => {
                if (normStatus === 'completed') return false;
                if (!task.start_date) return false; // Ensure start_date exists for calculation
                const endDate = new Date(task.start_date);
                endDate.setDate(endDate.getDate() + (task.duration || 0));
                return endDate < new Date();
            })();

            const matchesOverdue = !filterOverdue || isOverdue;

            return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesOverdue;
        });

        // Sort tasks
        filtered.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (sortBy === 'start_date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee, filterOverdue, sortBy, sortOrder]);


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
            const normalized = getNormalizedStatus(t.status);
            if (byStatus[normalized] !== undefined) {
                byStatus[normalized]++;
            } else {
                byStatus.other++;
            }
        });

        const overdue = tasks.filter(t => {
            const normalized = getNormalizedStatus(t.status);
            const endDate = new Date(t.start_date);
            endDate.setDate(endDate.getDate() + t.duration);
            return endDate < new Date() && normalized !== 'completed';
        }).length;
        const completionRate = total > 0 ? Math.round((byStatus.completed / total) * 100) : 0;

        return { total, byStatus, overdue, completionRate };
    }, [tasks]);

    // Group tasks by status for Kanban view
    const tasksByStatus = useMemo(() => {
        const grouped = {
            todo: [],
            in_progress: [],
            review: [],
            completed: [],
            other: []
        };

        filteredTasks.forEach(t => {
            const normalized = getNormalizedStatus(t.status);
            if (grouped[normalized]) {
                grouped[normalized].push(t);
            } else {
                grouped.other.push(t);
            }
        });
        return grouped;
    }, [filteredTasks]);

    const statusConfig = {
        todo: { label: 'To Do', color: '#757575', icon: UncheckedIcon },
        in_progress: { label: 'In Progress', color: '#1976d2', icon: ScheduleIcon },
        review: { label: 'Review', color: '#ed6c02', icon: ScheduleIcon },
        completed: { label: 'Completed', color: '#2e7d32', icon: CheckCircleIcon },
        other: { label: 'Uncategorized', color: '#9c27b0', icon: StatusIcon }
    };

    const priorityConfig = {
        low: { label: 'Low', color: 'default' },
        medium: { label: 'Medium', color: 'info' },
        high: { label: 'High', color: 'warning' },
        critical: { label: 'Critical', color: 'error' }
    };

    const getUserName = (userId) => {
        const user = users.find(u => u.id === userId);
        return user ? `${user.first_name} ${user.last_name}` : 'Unassigned';
    };

    const getUserInitials = (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user) return 'U';
        return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const handleDragEnd = (result) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId) return;

        const taskId = Number(draggableId);
        const newStatus = destination.droppableId;

        console.log('ProjectTasksTab: Dragging task', taskId, 'to status', newStatus);

        if (onStatusChange) {
            onStatusChange(taskId, newStatus);
        }
    };

    const TaskCard = ({ task }) => {
        const normalized = getNormalizedStatus(task.status);
        const config = statusConfig[normalized] || statusConfig.other;
        const StatusIcon = config.icon || UncheckedIcon;
        const overdueInfo = getOverdueInfo(task);

        return (
            <Card
                elevation={1}
                sx={{
                    mb: 2,
                    borderRadius: 4,
                    borderLeft: `5px solid ${getPriorityColor(task.priority)}`,
                    bgcolor: overdueInfo ? '#fff8f8' : 'white',
                    border: task.is_critical ? '2px solid #ff5252' : '1px solid #edf2f7',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 20px -10px rgba(0,0,0,0.15)',
                        borderColor: task.is_critical ? '#ff1744' : 'primary.light'
                    }
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>




                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                                PROJECT TASK
                            </Typography>
                            {(() => {
                                if (overdueInfo) {
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
                                            {overdueInfo.label}
                                        </Box>
                                    );
                                }
                                return null;
                            })()}
                        </Box>
                        <Box>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditTask(task); }} sx={{ color: 'text.secondary', p: 0.5 }}>
                                <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }} sx={{ color: 'text.secondary', p: 0.5, '&:hover': { color: 'error.main' } }}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Box>
                    </Box>

                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', mb: 1, lineHeight: 1.3 }}>
                        {task.name}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                        <Chip
                            label={priorityConfig[task.priority]?.label || task.priority}
                            size="small"
                            sx={{
                                bgcolor: task.priority === 'critical' ? '#fea2a2' : '#fff7ed',
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <CalendarIcon sx={{ fontSize: 15, color: overdueInfo ? '#ef5350' : '#94a3b8' }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: overdueInfo ? '#ef5350' : '#64748b' }}>
                                {task.start_date}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <TimerIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                                {task.duration || 0}d {overdueInfo && (
                                    <span style={{ color: '#ef5350', marginLeft: '4px' }}>
                                        (+{overdueInfo.days}d)
                                    </span>
                                )}
                            </Typography>
                        </Box>

                        {task.assignee && (
                            <Avatar
                                sx={{
                                    width: 24,
                                    height: 24,
                                    fontSize: '0.7rem',
                                    bgcolor: '#3b82f6',
                                    fontWeight: 700
                                }}
                            >
                                {getUserInitials(task.assignee)}
                            </Avatar>
                        )}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box>
            {/* Header row with Add Task */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Project Tasks
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddTask}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                >
                    Add Task
                </Button>
            </Box>

            {/* KPI Summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{ bgcolor: '#f5f5f5', border: '1px solid #e0e0e0', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}
                        onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterAssignee('all'); setFilterOverdue(false); setSearchQuery(''); }}
                    >
                        <CardContent sx={{ p: '16px !important' }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                Total Tasks
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a237e' }}>{stats.total}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{ bgcolor: '#e3f2fd', border: '1px solid #90caf9', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}
                        onClick={() => { setFilterStatus('in_progress'); setFilterOverdue(false); }}
                    >
                        <CardContent sx={{ p: '16px !important' }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                In Progress
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1976d2' }}>{stats.byStatus.in_progress}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{ bgcolor: '#e8f5e9', border: '1px solid #81c784', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}
                        onClick={() => { setFilterStatus('completed'); setFilterOverdue(false); }}
                    >
                        <CardContent sx={{ p: '16px !important' }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                Completed
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: '#2e7d32' }}>{stats.byStatus.completed}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            bgcolor: stats.overdue > 0 ? (filterOverdue ? '#ffd7d7' : '#ffebee') : '#f5f5f5',
                            border: `1px solid ${stats.overdue > 0 ? '#ef5350' : '#e0e0e0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: filterOverdue ? 'scale(1.02)' : 'none',
                            boxShadow: filterOverdue ? 4 : 0,
                            '&:hover': { boxShadow: 2, transform: 'translateY(-2px)' }
                        }}
                        onClick={() => setFilterOverdue(!filterOverdue)}
                    >
                        <CardContent sx={{ p: '16px !important' }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                Overdue
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: stats.overdue > 0 ? '#d32f2f' : '#757575' }}>{stats.overdue}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
            {/* Controls */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search tasks..."
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
                            <InputLabel>Status</InputLabel>
                            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Status">
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="todo">To Do</MenuItem>
                                <MenuItem value="in_progress">In Progress</MenuItem>
                                <MenuItem value="review">Review</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Priority</InputLabel>
                            <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} label="Priority">
                                <MenuItem value="all">All Priority</MenuItem>
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="critical">Critical</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} md={1.5}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Assignee</InputLabel>
                            <Select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} label="Assignee">
                                <MenuItem value="all">All Assignees</MenuItem>
                                {users.map(u => (
                                    <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</MenuItem>
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
                    <Grid item xs={6} md={0.5}>
                        <Button
                            variant="text"
                            size="small"
                            fullWidth
                            onClick={() => {
                                setFilterStatus('all');
                                setFilterPriority('all');
                                setFilterAssignee('all');
                                setFilterOverdue(false);
                                setSearchQuery('');
                            }}
                            sx={{ fontWeight: 800, color: 'text.disabled', '&:hover': { color: 'error.main' }, minWidth: 'auto', p: 0.5 }}
                        >
                            Clear
                        </Button>
                    </Grid>
                    <Grid item xs={12} md={1.5}>
                        <Box sx={{ display: 'flex', bgcolor: '#f0f2f5', p: 0.5, borderRadius: 2, justifyContent: 'center' }}>
                            <Tooltip title="Kanban View">
                                <IconButton
                                    size="small"
                                    onClick={() => setViewMode('kanban')}
                                    sx={{ bgcolor: viewMode === 'kanban' ? 'white' : 'transparent', borderRadius: 1.5, boxShadow: viewMode === 'kanban' ? 1 : 0 }}
                                >
                                    <KanbanIcon fontSize="small" color={viewMode === 'kanban' ? 'primary' : 'inherit'} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="List View">
                                <IconButton
                                    size="small"
                                    onClick={() => setViewMode('list')}
                                    sx={{ bgcolor: viewMode === 'list' ? 'white' : 'transparent', borderRadius: 1.5, boxShadow: viewMode === 'list' ? 1 : 0 }}
                                >
                                    <ListIcon fontSize="small" color={viewMode === 'list' ? 'primary' : 'inherit'} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {viewMode === 'kanban' && (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Grid container spacing={2}>
                        {Object.entries(statusConfig).map(([status, config]) => {
                            // Skip 'other' column if empty
                            if (status === 'other' && (!tasksByStatus.other || tasksByStatus.other.length === 0)) return null;

                            return (
                                <Grid item xs={12} sm={6} md={3} key={status}>
                                    <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#fafafa', minHeight: 400 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <config.icon sx={{ color: config.color, fontSize: 20 }} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
                                                {config.label}
                                            </Typography>
                                            <Chip
                                                label={tasksByStatus[status].length}
                                                size="small"
                                                sx={{ fontWeight: 700, bgcolor: config.color, color: 'white' }}
                                            />
                                        </Box>
                                        <Droppable droppableId={status}>
                                            {(provided, snapshot) => (
                                                <Box
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    sx={{
                                                        minHeight: 300,
                                                        bgcolor: snapshot.isDraggingOver ? '#e3f2fd' : 'transparent',
                                                        borderRadius: 2,
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                >
                                                    {tasksByStatus[status].map((task, index) => (
                                                        <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    style={{
                                                                        ...provided.draggableProps.style,
                                                                        opacity: snapshot.isDragging ? 0.8 : 1
                                                                    }}
                                                                >
                                                                    <TaskCard task={task} />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                    {tasksByStatus[status].length === 0 && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4, fontStyle: 'italic' }}>
                                                            No tasks
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Droppable>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                </DragDropContext>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                            <TableRow>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'name'}
                                        direction={sortBy === 'name' ? sortOrder : 'asc'}
                                        onClick={() => handleSort('name')}
                                        sx={{ fontWeight: 800 }}
                                    >
                                        Task Name
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'status'}
                                        direction={sortBy === 'status' ? sortOrder : 'asc'}
                                        onClick={() => handleSort('status')}
                                        sx={{ fontWeight: 800 }}
                                    >
                                        Status
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'priority'}
                                        direction={sortBy === 'priority' ? sortOrder : 'asc'}
                                        onClick={() => handleSort('priority')}
                                        sx={{ fontWeight: 800 }}
                                    >
                                        Priority
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Assignee</TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'start_date'}
                                        direction={sortBy === 'start_date' ? sortOrder : 'asc'}
                                        onClick={() => handleSort('start_date')}
                                        sx={{ fontWeight: 800 }}
                                    >
                                        Start Date
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'duration'}
                                        direction={sortBy === 'duration' ? sortOrder : 'asc'}
                                        onClick={() => handleSort('duration')}
                                        sx={{ fontWeight: 800 }}
                                    >
                                        Duration
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTasks.map(task => {
                                const normalized = getNormalizedStatus(task.status);
                                const config = statusConfig[normalized] || statusConfig.other;
                                const StatusIcon = config.icon || UncheckedIcon;

                                return (
                                    <TableRow
                                        key={task.id}
                                        sx={{
                                            bgcolor: getOverdueInfo(task) ? '#fff8f8' : 'inherit',
                                            borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                                            borderBottom: '1px solid #edf2f7',
                                            '&:hover': { bgcolor: getOverdueInfo(task) ? '#ffeded !important' : '#f8fafc' },
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => onEditTask(task)}
                                    >
                                        <TableCell sx={{ fontWeight: task.is_critical ? 700 : 500 }}>
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
                                            {task.priority === 'critical' && (
                                                <Chip label="CRITICAL" color="error" size="small" sx={{ mt: 0.5, fontWeight: 900, fontSize: '0.65rem' }} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={<StatusIcon sx={{ fontSize: 16 }} />}
                                                label={config.label}
                                                size="small"
                                                sx={{ fontWeight: 600, bgcolor: config.color, color: 'white' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={priorityConfig[task.priority]?.label || task.priority}
                                                color={priorityConfig[task.priority]?.color || 'default'}
                                                size="small"
                                                sx={{ fontWeight: 600 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {task.assignee ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                                                        {getUserInitials(task.assignee)}
                                                    </Avatar>
                                                    <Typography variant="body2">{getUserName(task.assignee)}</Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                    Unassigned
                                                </Typography>
                                            )}
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
                                        <TableCell align="center">
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => onEditTask(task)} sx={{ color: 'primary.main' }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" onClick={() => onDeleteTask(task)} color="error">
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredTasks.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            No tasks found matching your filters
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default ProjectTasksTab;

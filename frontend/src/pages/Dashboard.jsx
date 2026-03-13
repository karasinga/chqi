import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Typography, Grid, Card, CardContent, CardActions, Button,
    Box, IconButton, Chip, Stack, Paper, Divider, LinearProgress,
    Tabs, Tab, Avatar, Tooltip, useTheme
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Assessment as AssessmentIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    PauseCircle as PauseCircleIcon,
    PlayCircle as PlayCircleIcon,
    BarChart as BarChartIcon,
    Dashboard as DashboardIcon,
    TrendingUp as TrendingUpIcon,
    Group as GroupIcon,
    Notifications as NotificationsIcon,
    ArrowForward as ArrowForwardIcon,
    Schedule as ScheduleIcon,
    ChatBubbleOutline as CommentIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ProjectForm from '../components/ProjectForm';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const Dashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // UI State
    const [openForm, setOpenForm] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [filter, setFilter] = useState('all');
    const [activityFilter, setActivityFilter] = useState('all');
    const [activityLimit, setActivityLimit] = useState(8);
    const [myTasksFilter, setMyTasksFilter] = useState('mine');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [deadlinePeriod, setDeadlinePeriod] = useState('1m');
    const [activityPeriod, setActivityPeriod] = useState('7d');

    // Queries
    const { data: projects = [], isLoading: projectsLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.get('/projects/'),
        refetchInterval: 30000
    });

    const { data: tasks = [], isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => api.get('/pm/tasks/'),
        refetchInterval: 30000
    });

    const { data: activityLogs = [], isLoading: activityLoading } = useQuery({
        queryKey: ['activities'],
        queryFn: () => api.get('/pm/activity/'),
        refetchInterval: 30000
    });

    const { data: globalStats = { critical_path_tasks: 0, overdue_tasks: 0 } } = useQuery({
        queryKey: ['globalStats'],
        queryFn: () => api.get('/pm/tasks/global_stats/')
    });

    // Mutations
    const saveProjectMutation = useMutation({
        mutationFn: (projectData) => editingProject
            ? api.put(`/projects/${editingProject.id}/`, projectData)
            : api.post('/projects/', projectData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setOpenForm(false);
            setEditingProject(null);
        },
        onError: (err) => console.error(err)
    });

    const deleteProjectMutation = useMutation({
        mutationFn: (projectId) => api.delete(`/projects/${projectId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setDeleteModalOpen(false);
            setProjectToDelete(null);
        },
        onError: (err) => console.error(err)
    });

    const calculateProgress = (project) => {
        if (project.status === 'completed') return 100;
        if (!project.start_date || !project.end_date) return 0;
        const start = new Date(project.start_date);
        const end = new Date(project.end_date);
        const today = new Date();
        if (today < start) return 0;
        if (today > end) return 100;
        const total = end - start;
        const elapsed = today - start;
        return Math.round((elapsed / total) * 100);
    };

    const getRelativeTime = (timestamp) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return then.toLocaleDateString();
    };

    const getActivityCutoffDate = (period) => {
        const now = new Date();
        if (period === '24h') return new Date(now - 24 * 60 * 60 * 1000);
        if (period === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
        if (period === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
        if (period === '90d') return new Date(now - 90 * 24 * 60 * 60 * 1000);
        return null; // 'all'
    };

    const filteredProjects = projects.filter(p => {
        const matchesStatus = filter === 'all' || p.status === filter;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

        let matchesDateRange = true;
        if (startDateFilter || endDateFilter) {
            const pStart = p.start_date ? new Date(p.start_date) : null;
            const pEnd = p.end_date ? new Date(p.end_date) : null;
            const fStart = startDateFilter ? new Date(startDateFilter) : null;
            const fEnd = endDateFilter ? new Date(endDateFilter) : null;

            // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
            const startOk = !fEnd || !pStart || pStart <= fEnd;
            const endOk = !fStart || !pEnd || pEnd >= fStart;
            matchesDateRange = startOk && endOk;
        }

        return matchesStatus && matchesSearch && matchesDateRange;
    });

    const stats = {
        total: filteredProjects.length,
        active: filteredProjects.filter(p => p.status === 'active').length,
        completed: filteredProjects.filter(p => p.status === 'completed').length,
        tasksTodo: tasks.filter(t => filteredProjects.some(p => String(p.id) === String(t.project)) && t.status === 'todo').length,
        tasksInProgress: tasks.filter(t => filteredProjects.some(p => String(p.id) === String(t.project)) && t.status === 'in_progress').length,
        pendingReview: tasks.filter(t => filteredProjects.some(p => String(p.id) === String(t.project)) && t.status === 'review').length,
        tasksCompleted: tasks.filter(t => filteredProjects.some(p => String(p.id) === String(t.project)) && t.status === 'completed').length,
        criticalPathTasks: tasks.filter(t => filteredProjects.some(p => String(p.id) === String(t.project)) && t.is_critical).length,
    };

    const handleSave = (projectData) => {
        saveProjectMutation.mutate(projectData);
    };

    const handleDeleteClick = (project) => {
        setProjectToDelete(project);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (projectToDelete) {
            deleteProjectMutation.mutate(projectToDelete.id);
        }
    };

    return (
        <Box sx={{ p: 1, position: 'relative', zIndex: 0 }}>


            {/* Premium Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4,
                p: 3,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                color: 'white',
                boxShadow: '0 8px 32px rgba(26, 35, 126, 0.2)',
                position: 'relative',
                zIndex: 1,
                isolation: 'isolate'  // Creates new stacking context
            }}>
                <Box>
                    <Typography variant="h4" sx={{
                        fontWeight: 900,
                        mb: 0.5,
                        letterSpacing: -0.5,
                        color: 'white'
                    }}>
                        Research Portfolio Dashboard
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 500, color: 'white' }}>
                        Welcome back! Here's what's happening across your research portfolio.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ zIndex: 2 }}>  {/* Add zIndex */}
                    <Tooltip title="Notifications">
                        <IconButton sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
                            <NotificationsIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => { setEditingProject(null); setOpenForm(true); }}
                        sx={{
                            borderRadius: 3,
                            px: 3,
                            bgcolor: 'white',
                            color: 'primary.main',
                            fontWeight: 800,
                            '&:hover': { bgcolor: '#f5f5f5' }
                        }}
                    >
                        New Project
                    </Button>
                </Stack>
            </Box>

            {/* Premium Stats Widgets */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                    {
                        label: 'Active Projects',
                        value: stats.active,
                        icon: <AssignmentIcon />,
                        color: '#4caf50',
                        trend: `${stats.total} total`,
                        bg: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)'
                    },
                    {
                        label: 'Tasks in Progress',
                        value: stats.tasksInProgress,
                        icon: <TrendingUpIcon />,
                        color: '#2196f3',
                        trend: `${stats.tasksTodo} to do`,
                        bg: 'linear-gradient(135deg, #2196f3 0%, #1565c0 100%)'
                    },
                    {
                        label: 'Pending Review',
                        value: stats.pendingReview,
                        icon: <NotificationsIcon />,
                        color: '#ff9800',
                        trend: tasks.filter(t => filteredProjects.some(p => p.id === t.project) && t.status === 'review' && t.priority === 'critical').length > 0 ? `${tasks.filter(t => filteredProjects.some(p => p.id === t.project) && t.status === 'review' && t.priority === 'critical').length} critical` : 'None critical',
                        bg: 'linear-gradient(135deg, #ff9800 0%, #ef6c00 100%)'
                    },
                    {
                        label: 'Critical Path Tasks',
                        value: stats.criticalPathTasks,
                        icon: <GroupIcon />,
                        color: '#9c27b0',
                        trend: 'Impacts Timeline',
                        bg: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)'
                    },
                ].map((stat, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper sx={{
                            p: 3,
                            borderRadius: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                            border: '1px solid #eee',
                            background: 'white',
                            transition: 'all 0.3s',
                            '&:hover': {
                                transform: 'translateY(-5px)',
                                boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                                borderColor: stat.color
                            }
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box sx={{
                                    p: 1.5,
                                    borderRadius: 3,
                                    background: stat.bg,
                                    color: 'white',
                                    boxShadow: `0 4px 12px ${stat.color}40`
                                }}>
                                    {stat.icon}
                                </Box>
                                <Typography variant="caption" sx={{
                                    color: stat.color,
                                    fontWeight: 800,
                                    bgcolor: `${stat.color}10`,
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 2,
                                    border: `1px solid ${stat.color}20`
                                }}>
                                    {stat.trend}
                                </Typography>
                            </Box>
                            <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5, color: '#1a237e' }}>{stat.value}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1.2 }}>
                                {stat.label}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Main Content Area */}
            <Grid container spacing={3}>
                {/* Project List Section */}
                <Grid item xs={12} lg={8}>
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>Active Initiatives</Typography>
                            <Tabs
                                value={filter}
                                onChange={(e, v) => setFilter(v)}
                                textColor="primary"
                                indicatorColor="primary"
                                sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', fontWeight: 800, px: 1.5 } }}
                            >
                                <Tab label="ALL" value="all" />
                                <Tab label="ACTIVE" value="active" />
                                <Tab label="ON HOLD" value="on_hold" />
                                <Tab label="COMPLETED" value="completed" />
                            </Tabs>
                        </Box>

                        <Paper sx={{ p: 1, display: 'flex', gap: 2, borderRadius: 3, border: '1px solid #eee', bgcolor: 'white' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, flex: 1, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: '1.2rem' }} />
                                <input
                                    placeholder="Search projects by name or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        width: '100%',
                                        padding: '10px 0',
                                        outline: 'none',
                                        fontSize: '0.9rem',
                                        fontWeight: 500
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pr: 1 }}>
                                <FilterListIcon sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                                <input
                                    type="date"
                                    value={startDateFilter}
                                    onChange={(e) => setStartDateFilter(e.target.value)}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        outline: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>to</Typography>
                                <input
                                    type="date"
                                    value={endDateFilter}
                                    onChange={(e) => setEndDateFilter(e.target.value)}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        outline: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                {(startDateFilter || endDateFilter) && (
                                    <Chip
                                        label="Clear"
                                        size="small"
                                        onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                                        sx={{ fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer' }}
                                    />
                                )}
                            </Box>
                        </Paper>
                    </Box>
                    <Grid container spacing={2}>
                        {filteredProjects.map(project => {
                            const progress = calculateProgress(project);
                            return (
                                <Grid item xs={12} md={6} key={project.id}>
                                    <Card
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                        sx={{
                                            borderRadius: 4,
                                            border: '1px solid #eee',
                                            transition: 'all 0.3s',
                                            cursor: 'pointer',
                                            '&:hover': { boxShadow: 6, borderColor: 'primary.light' }
                                        }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{project.name}</Typography>
                                                <IconButton size="small" component={Link} to={`/projects/${project.id}`}>
                                                    <ArrowForwardIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, height: '3em', overflow: 'hidden' }}>
                                                {project.description || 'No description provided.'}
                                            </Typography>
                                            <Box sx={{ mb: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Progress</Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 800 }}>{progress}%</Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={progress}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        bgcolor: '#f0f2f5',
                                                        '& .MuiLinearProgress-bar': { borderRadius: 4 }
                                                    }}
                                                />
                                            </Box>
                                            <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
                                                {(() => {
                                                    const statusColors = {
                                                        active: '#4caf50',
                                                        on_hold: '#ff9800',
                                                        completed: '#3f51b5'
                                                    };
                                                    const statusLabels = {
                                                        active: 'ACTIVE',
                                                        on_hold: 'ON HOLD',
                                                        completed: 'COMPLETED'
                                                    };
                                                    return (
                                                        <Chip
                                                            label={statusLabels[project.status] || project.status.toUpperCase()}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 800,
                                                                fontSize: '0.6rem',
                                                                bgcolor: `${statusColors[project.status] || '#9e9e9e'}15`,
                                                                color: statusColors[project.status] || '#9e9e9e',
                                                                border: `1px solid ${statusColors[project.status] || '#9e9e9e'}30`
                                                            }}
                                                        />
                                                    );
                                                })()}
                                                <Chip icon={<ScheduleIcon sx={{ fontSize: '0.8rem !important' }} />} label={project.end_date || 'TBD'} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.6rem' }} />
                                                <Box sx={{ flexGrow: 1 }} />
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingProject(project); setOpenForm(true); }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteClick(project); }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Grid>

                {/* Right Sidebar: Widgets */}
                <Grid item xs={12} lg={4}>
                    <Box sx={{
                        position: { lg: 'sticky' },
                        top: { lg: 88 },
                        maxHeight: { lg: 'calc(100vh - 110px)' },
                        overflowY: { lg: 'auto' },
                        pr: { lg: 1 },
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: '#ddd', borderRadius: 3 },
                        '&:hover::-webkit-scrollbar-thumb': { bgcolor: '#ccc' }
                    }}>
                        <Stack spacing={3}>
                            {/* Team Workload Overview */}
                            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #eee' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Team Workload</Typography>
                                <Stack spacing={2}>
                                    {(() => {
                                        const filteredProjectIds = new Set(filteredProjects.map(p => String(p.id)));
                                        const filteredTasks = tasks.filter(t => filteredProjectIds.has(String(t.project)));

                                        const workload = filteredTasks.reduce((acc, task) => {
                                            if (task.status !== 'completed') {
                                                const name = task.assignee_name || 'Unassigned';
                                                acc[name] = (acc[name] || 0) + 1;
                                            }
                                            return acc;
                                        }, {});
                                        const totalActive = Object.values(workload).reduce((a, b) => a + b, 0);

                                        return Object.entries(workload)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([name, count]) => (
                                                <Box key={name}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Avatar sx={{ width: 20, height: 20, fontSize: '0.6rem', bgcolor: 'primary.main' }}>
                                                                {name[0].toUpperCase()}
                                                            </Avatar>
                                                            <Typography variant="caption" sx={{ fontWeight: 700 }}>{name}</Typography>
                                                        </Box>
                                                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                                            {count} tasks ({totalActive > 0 ? Math.round((count / totalActive) * 100) : 0}%)
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={totalActive > 0 ? (count / totalActive) * 100 : 0}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 3,
                                                            bgcolor: '#f0f2f5',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: count > 5 ? '#ff5252' : count > 3 ? '#ff9800' : '#4caf50',
                                                                borderRadius: 3
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                            ));
                                    })()}
                                    {(() => {
                                        const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
                                        return tasks.filter(t => filteredProjectIds.has(t.project) && t.status !== 'completed').length === 0;
                                    })() && (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
                                                No active tasks assigned
                                            </Typography>
                                        )}
                                </Stack>
                            </Paper>

                            {/* Task Distribution Widget */}
                            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #eee' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 3 }}>Task Distribution</Typography>
                                <Stack spacing={2}>
                                    {[
                                        { label: 'To Do', count: stats.tasksTodo, color: '#9e9e9e' },
                                        { label: 'In Progress', count: stats.tasksInProgress, color: '#2196f3' },
                                        { label: 'Review', count: stats.pendingReview, color: '#ff9800' },
                                        { label: 'Completed', count: stats.tasksCompleted, color: '#4caf50' },
                                    ].map((item, i) => (
                                        <Box key={i}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 700 }}>{item.label}</Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                                    {item.count} ({tasks.length > 0 ? Math.round((item.count / tasks.length) * 100) : 0}%)
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={tasks.length > 0 ? (item.count / tasks.length) * 100 : 0}
                                                sx={{
                                                    height: 6,
                                                    borderRadius: 3,
                                                    bgcolor: '#f0f2f5',
                                                    '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 3 }
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                                <Button
                                    fullWidth
                                    component={Link}
                                    to="/tasks"
                                    sx={{ mt: 3, borderRadius: 2, fontWeight: 700 }}
                                    endIcon={<ArrowForwardIcon />}
                                >
                                    View All Tasks
                                </Button>
                            </Paper>

                            {/* My Tasks Widget */}
                            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #eee' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>My Tasks</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
                                            {['mine', 'all'].map((f) => (
                                                <Chip
                                                    key={f}
                                                    label={f === 'mine' ? 'Mine' : 'All'}
                                                    onClick={() => setMyTasksFilter(f)}
                                                    size="small"
                                                    variant={myTasksFilter === f ? 'filled' : 'outlined'}
                                                    color={myTasksFilter === f ? 'primary' : 'default'}
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.6rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase'
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                        <Chip
                                            label={tasks.filter(t => {
                                                const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
                                                if (!filteredProjectIds.has(t.project)) return false;
                                                const isMine = t.assignee_name === 'petman';
                                                const isActive = t.status !== 'completed';
                                                return isActive && (myTasksFilter === 'all' || isMine);
                                            }).length}
                                            size="small"
                                            color="primary"
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </Box>
                                </Box>
                                <Stack spacing={1.5}>
                                    {tasks
                                        .filter(t => {
                                            const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
                                            if (!filteredProjectIds.has(t.project)) return false;
                                            const isMine = t.assignee_name === 'petman';
                                            const isActive = t.status !== 'completed';
                                            return isActive && (myTasksFilter === 'all' || isMine);
                                        })
                                        .slice(0, 5)
                                        .map((task) => (
                                            <Box
                                                key={task.id}
                                                onClick={() => navigate(`/tasks?taskId=${task.id}`)}
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    border: '1px solid #f0f0f0',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    '&:hover': { bgcolor: '#f8f9fa', borderColor: 'primary.main', transform: 'translateX(4px)' }
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, lineHeight: 1.3 }}>
                                                        {task.name}
                                                    </Typography>
                                                    <Chip
                                                        label={task.priority}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            bgcolor: task.priority === 'critical' ? '#ff5252' : task.priority === 'high' ? '#ff9800' : task.priority === 'medium' ? '#2196f3' : '#9e9e9e',
                                                            color: 'white'
                                                        }}
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                                    <Chip
                                                        label={task.status.replace('_', ' ')}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ height: 18, fontSize: '0.6rem', textTransform: 'capitalize' }}
                                                    />
                                                    {task.project_name && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                                                            • {task.project_name}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <ScheduleIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                                {task.start_date}
                                                            </Typography>
                                                        </Box>
                                                        {(() => {
                                                            const dueDate = new Date(task.start_date);
                                                            dueDate.setDate(dueDate.getDate() + (task.duration || 0));
                                                            const now = new Date();
                                                            now.setHours(0, 0, 0, 0);
                                                            const due = new Date(dueDate);
                                                            due.setHours(0, 0, 0, 0);
                                                            const diffTime = due - now;
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                            const isOverdue = diffDays < 0;

                                                            return (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: 700,
                                                                        color: isOverdue ? 'error.main' : diffDays <= 3 ? 'warning.main' : 'text.secondary'
                                                                    }}
                                                                >
                                                                    {isOverdue ? `Overdue (${Math.abs(diffDays)}d)` : diffDays === 0 ? 'Due today' : `${diffDays}d left`}
                                                                </Typography>
                                                            );
                                                        })()}
                                                    </Stack>
                                                    {task.comment_count > 0 && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <CommentIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 700 }}>
                                                                {task.comment_count}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    {tasks.filter(t => {
                                        const filteredProjectIds = new Set(filteredProjects.map(p => String(p.id)));
                                        if (!filteredProjectIds.has(String(t.project))) return false;
                                        const isMine = t.assignee_name === 'petman';
                                        const isActive = t.status !== 'completed';
                                        return isActive && (myTasksFilter === 'all' || isMine);
                                    }).length === 0 && (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                                {myTasksFilter === 'mine' ? 'No active tasks assigned to you' : 'No active tasks found'}
                                            </Typography>
                                        )}
                                    {tasks.filter(t => {
                                        const filteredProjectIds = new Set(filteredProjects.map(p => String(p.id)));
                                        if (!filteredProjectIds.has(String(t.project))) return false;
                                        const isMine = t.assignee_name === 'petman';
                                        const isActive = t.status !== 'completed';
                                        return isActive && (myTasksFilter === 'all' || isMine);
                                    }).length > 5 && (
                                            <Button
                                                fullWidth
                                                size="small"
                                                onClick={() => navigate('/tasks')}
                                                sx={{ mt: 1, fontWeight: 600 }}
                                            >
                                                View All ({tasks.filter(t => {
                                                    const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
                                                    if (!filteredProjectIds.has(t.project)) return false;
                                                    const isMine = t.assignee_name === 'petman';
                                                    const isActive = t.status !== 'completed';
                                                    return isActive && (myTasksFilter === 'all' || isMine);
                                                }).length} tasks)
                                            </Button>
                                        )}
                                </Stack>
                            </Paper>

                            {/* Upcoming Deadlines Widget */}
                            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #eee' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Upcoming Deadlines</Typography>

                                {/* Period Filters */}
                                <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                                    {[
                                        { label: '14 Days', value: '14d' },
                                        { label: '1 Month', value: '1m' },
                                        { label: '3 Months', value: '3m' },
                                        { label: '6 Months', value: '6m' },
                                        { label: '1 Year', value: '1y' }
                                    ].map((option) => (
                                        <Chip
                                            key={option.value}
                                            label={option.label}
                                            onClick={() => setDeadlinePeriod(option.value)}
                                            variant={deadlinePeriod === option.value ? 'filled' : 'outlined'}
                                            color={deadlinePeriod === option.value ? 'primary' : 'default'}
                                            size="small"
                                            sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                                        />
                                    ))}
                                </Box>

                                <Stack spacing={1.5}>
                                    {(() => {
                                        // Unified filter for consistent behavior
                                        const filterDeadlineTasks = (t) => {
                                            const filteredProjectIds = new Set(filteredProjects.map(p => String(p.id)));
                                            if (!filteredProjectIds.has(String(t.project))) return false;

                                            const dueDate = new Date(t.start_date);
                                            dueDate.setDate(dueDate.getDate() + (t.duration || 0));
                                            const now = new Date();
                                            const diffTime = dueDate - now;
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                            // Determine max days based on period
                                            let maxDays = 30;
                                            if (deadlinePeriod === '14d') maxDays = 14;
                                            else if (deadlinePeriod === '1m') maxDays = 30;
                                            else if (deadlinePeriod === '3m') maxDays = 90;
                                            else if (deadlinePeriod === '6m') maxDays = 180;
                                            else if (deadlinePeriod === '1y') maxDays = 365;

                                            return t.status !== 'completed' && diffDays <= maxDays;
                                        };

                                        const deadlineTasks = tasks.filter(filterDeadlineTasks)
                                            .sort((a, b) => {
                                                const dateA = new Date(a.start_date);
                                                dateA.setDate(dateA.getDate() + (a.duration || 0));
                                                const dateB = new Date(b.start_date);
                                                dateB.setDate(dateB.getDate() + (b.duration || 0));
                                                return dateA - dateB;
                                            })
                                            .slice(0, 5);

                                        return (
                                            <>
                                                {deadlineTasks.map((task) => {
                                                    const project = filteredProjects.find(p => String(p.id) === String(task.project));
                                                    const startDate = new Date(task.start_date);
                                                    const dueDate = new Date(task.start_date);
                                                    dueDate.setDate(dueDate.getDate() + (task.duration || 0));

                                                    const now = new Date();
                                                    const totalDuration = dueDate - startDate;
                                                    const elapsed = now - startDate;
                                                    // Clamp progress between 0 and 100
                                                    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

                                                    const diffTime = dueDate - now;
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                    const isOverdue = diffDays < 0;
                                                    const isDueSoon = diffDays <= 3 && diffDays >= 0;

                                                    return (
                                                        <Box
                                                            key={task.id}
                                                            onClick={() => navigate(`/tasks?taskId=${task.id}`)}
                                                            sx={{
                                                                p: 1.5,
                                                                borderRadius: 2,
                                                                border: '1px solid #f0f0f0',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                '&:hover': { bgcolor: '#f8f9fa', borderColor: isOverdue ? '#ff5252' : 'primary.main', transform: 'translateX(4px)' }
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                                <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, lineHeight: 1.3 }}>
                                                                    {task.name}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        fontWeight: 800,
                                                                        color: isOverdue ? '#ff5252' : isDueSoon ? '#ff9800' : 'text.secondary',
                                                                        whiteSpace: 'nowrap',
                                                                        ml: 1
                                                                    }}
                                                                >
                                                                    {isOverdue ? `Overdue ${Math.abs(diffDays)}d` : diffDays === 0 ? 'Due today' : `In ${diffDays} days`}
                                                                </Typography>
                                                            </Box>

                                                            {project && (
                                                                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block', mb: 1 }}>
                                                                    {project.name}
                                                                </Typography>
                                                            )}

                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={progress}
                                                                    sx={{
                                                                        flex: 1,
                                                                        height: 4,
                                                                        borderRadius: 2,
                                                                        bgcolor: '#eee',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            bgcolor: isOverdue ? '#ff5252' : isDueSoon ? '#ff9800' : '#4caf50',
                                                                            borderRadius: 2
                                                                        }
                                                                    }}
                                                                />
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                                                    {dueDate.toLocaleDateString()}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    );
                                                })}
                                                {deadlineTasks.length === 0 && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                                        No upcoming deadlines within this period
                                                    </Typography>
                                                )}
                                            </>
                                        );
                                    })()}
                                </Stack>
                            </Paper>

                            {/* Recent Activity Widget */}
                            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #eee' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Recent Activity</Typography>

                                {/* Action Filter Chips */}
                                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                    {['all', 'create', 'update', 'comment', 'assigned', 'status_change'].map((filterType) => (
                                        <Chip
                                            key={filterType}
                                            label={filterType === 'all' ? 'All' : filterType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            onClick={() => setActivityFilter(filterType)}
                                            variant={activityFilter === filterType ? 'filled' : 'outlined'}
                                            color={activityFilter === filterType ? 'primary' : 'default'}
                                            size="small"
                                            sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'capitalize' }}
                                        />
                                    ))}
                                </Box>

                                {/* Timeline Filter Chips */}
                                <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                                    {[
                                        { label: '24 Hours', value: '24h' },
                                        { label: '7 Days', value: '7d' },
                                        { label: '30 Days', value: '30d' },
                                        { label: '90 Days', value: '90d' },
                                        { label: 'All Time', value: 'all' }
                                    ].map((option) => (
                                        <Chip
                                            key={option.value}
                                            label={option.label}
                                            onClick={() => setActivityPeriod(option.value)}
                                            variant={activityPeriod === option.value ? 'filled' : 'outlined'}
                                            color={activityPeriod === option.value ? 'primary' : 'default'}
                                            size="small"
                                            sx={{ fontWeight: 700, fontSize: '0.6rem' }}
                                        />
                                    ))}
                                </Box>

                                <Stack spacing={2}>
                                    {(() => {
                                        // Single unified filter function to ensure consistency
                                        const filterActivityLog = (log) => {
                                            const logAction = (log.action || '').toLowerCase();
                                            const currentFilter = activityFilter.toLowerCase();
                                            const matchesAction = currentFilter === 'all' || logAction === currentFilter;

                                            if (!matchesAction) return false;

                                            // Timeline filtering
                                            const cutoffDate = getActivityCutoffDate(activityPeriod);
                                            if (cutoffDate) {
                                                const logDate = new Date(log.timestamp);
                                                if (logDate < cutoffDate) return false;
                                            }

                                            const filteredProjectIds = new Set(filteredProjects.map(p => String(p.id)));
                                            const targetType = (log.target_type || '').toLowerCase();

                                            if (targetType === 'project') {
                                                return filteredProjectIds.has(String(log.target_id));
                                            }

                                            if (targetType === 'task') {
                                                const task = tasks.find(t => String(t.id) === String(log.target_id));
                                                if (task) {
                                                    return filteredProjectIds.has(String(task.project));
                                                }
                                                // Show logs for tasks that might be deleted or not yet loaded
                                                return true;
                                            }

                                            return true;
                                        };

                                        const filteredLogs = activityLogs.filter(filterActivityLog);
                                        const displayedLogs = filteredLogs.slice(0, activityLimit);

                                        return (
                                            <>
                                                {displayedLogs.map((log, i) => {
                                                    const getActionDetails = (action) => {
                                                        switch (action) {
                                                            case 'create': return { icon: <AssignmentIcon sx={{ fontSize: 16 }} />, color: '#4caf50', label: 'created' };
                                                            case 'update': return { icon: <TrendingUpIcon sx={{ fontSize: 16 }} />, color: '#2196f3', label: 'updated' };
                                                            case 'delete': return { icon: <DeleteIcon sx={{ fontSize: 16 }} />, color: '#f44336', label: 'deleted' };
                                                            case 'comment': return { icon: <NotificationsIcon sx={{ fontSize: 16 }} />, color: '#ff9800', label: 'commented on' };
                                                            case 'assigned': return { icon: <GroupIcon sx={{ fontSize: 16 }} />, color: '#9c27b0', label: 'assigned' };
                                                            case 'status_change': return { icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: '#00bcd4', label: 'moved' };
                                                            default: return { icon: <AssignmentIcon sx={{ fontSize: 16 }} />, color: '#757575', label: 'updated' };
                                                        }
                                                    };

                                                    const details = getActionDetails(log.action);
                                                    const logDate = new Date(log.timestamp);
                                                    const relativeTime = getRelativeTime(log.timestamp);
                                                    const fullDateTime = logDate.toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });

                                                    // Get project context for task-related activities
                                                    let projectContext = null;
                                                    if (log.target_type?.toLowerCase() === 'task') {
                                                        const task = tasks.find(t => String(t.id) === String(log.target_id));
                                                        if (task) {
                                                            const project = filteredProjects.find(p => String(p.id) === String(task.project));
                                                            if (project) {
                                                                projectContext = project.name;
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <Box
                                                            key={i}
                                                            onClick={() => {
                                                                if (['create', 'update', 'comment', 'assigned', 'status_change'].includes(log.action) && log.target_type === 'task') {
                                                                    navigate(`/tasks?taskId=${log.target_id}`);
                                                                } else if (log.target_type === 'project' && log.target_id) {
                                                                    navigate(`/projects/${log.target_id}`);
                                                                }
                                                            }}
                                                            sx={{
                                                                display: 'flex',
                                                                gap: 2,
                                                                pb: 2,
                                                                borderBottom: i < displayedLogs.length - 1 ? '1px solid #f0f0f0' : 'none',
                                                                cursor: (log.target_type === 'task' || log.target_type === 'project') && log.target_id ? 'pointer' : 'default',
                                                                transition: 'all 0.2s',
                                                                '&:hover': {
                                                                    bgcolor: (log.target_type === 'task' || log.target_type === 'project') && log.target_id ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                                                                    borderRadius: 2,
                                                                    p: 1,
                                                                    mx: -1,
                                                                    mb: i < displayedLogs.length - 1 ? 1 : 0
                                                                }
                                                            }}
                                                        >
                                                            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.8rem' }}>
                                                                    {log.username ? log.username[0].toUpperCase() : 'U'}
                                                                </Avatar>
                                                                <Box sx={{
                                                                    position: 'absolute',
                                                                    bottom: -4,
                                                                    right: -4,
                                                                    bgcolor: details.color,
                                                                    color: 'white',
                                                                    borderRadius: '50%',
                                                                    width: 18,
                                                                    height: 18,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    border: '2px solid white'
                                                                }}>
                                                                    {details.icon}
                                                                </Box>
                                                            </Box>
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.5 }}>
                                                                    {log.username || 'Someone'} {details.label} <span style={{ color: '#1a237e' }}>{log.target_name}</span>
                                                                </Typography>
                                                                {projectContext && (
                                                                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block', mb: 0.5 }}>
                                                                        {projectContext}
                                                                    </Typography>
                                                                )}
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                                        {relativeTime}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                                                                        •
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                                                                        {fullDateTime}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                    );
                                                })}
                                                {filteredLogs.length === 0 && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                                        No activities found for this period.
                                                    </Typography>
                                                )}
                                                {filteredLogs.length > activityLimit && (
                                                    <Button
                                                        fullWidth
                                                        onClick={() => setActivityLimit(prev => prev + 10)}
                                                        sx={{ mt: 2, borderRadius: 2, fontWeight: 700 }}
                                                    >
                                                        Show More ({filteredLogs.length - activityLimit} more)
                                                    </Button>
                                                )}
                                                {activityLimit > 8 && filteredLogs.length <= activityLimit && (
                                                    <Button
                                                        fullWidth
                                                        onClick={() => setActivityLimit(8)}
                                                        sx={{ mt: 2, borderRadius: 2, fontWeight: 700 }}
                                                        variant="outlined"
                                                    >
                                                        Show Less
                                                    </Button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </Stack>
                            </Paper>
                        </Stack>
                    </Box>
                </Grid>
            </Grid>

            <ProjectForm
                open={openForm}
                onClose={() => setOpenForm(false)}
                onSave={handleSave}
                project={editingProject}
            />

            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setProjectToDelete(null); }}
                onConfirm={handleConfirmDelete}
                itemName={projectToDelete?.name || ''}
            />
        </Box >
    );
};

export default Dashboard;

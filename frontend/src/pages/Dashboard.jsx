import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Typography, Grid, Card, CardContent, CardActionArea, Button,
    Box, IconButton, Chip, Stack, Paper, LinearProgress,
    Tabs, Tab, Avatar, Tooltip, TextField
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Assignment as AssignmentIcon,
    TrendingUp as TrendingUpIcon,
    Group as GroupIcon,
    Notifications as NotificationsIcon,
    ArrowForward as ArrowForwardIcon,
    Schedule as ScheduleIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ProjectForm from '../components/ProjectForm';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { colors } from '../theme/colors';

const Dashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth(); // ✅ Fix #1: Get actual user

    // UI State
    const [openForm, setOpenForm] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
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
    const [activityPeriod, setActivityPeriod] = useState('7d'); // ✅ Fix #3: Now used in UI

    // Queries
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.get('/projects/'),
        refetchInterval: 30000
    });

    const { data: tasks = [] } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => api.get('/pm/tasks/'),
        refetchInterval: 30000
    });

    const { data: activityLogs = [] } = useQuery({
        queryKey: ['activities'],
        queryFn: () => api.get('/pm/activity/'),
        refetchInterval: 30000
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

    // ============ MEMOIZED CALCULATIONS ============

    // Filtered Projects (memoized)
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesStatus = filter === 'all' || p.status === filter;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

            let matchesDateRange = true;
            if (startDateFilter || endDateFilter) {
                const pStart = p.start_date ? new Date(p.start_date) : null;
                const pEnd = p.end_date ? new Date(p.end_date) : null;
                const fStart = startDateFilter ? new Date(startDateFilter) : null;
                const fEnd = endDateFilter ? new Date(endDateFilter) : null;
                const startOk = !fEnd || !pStart || pStart <= fEnd;
                const endOk = !fStart || !pEnd || pEnd >= fStart;
                matchesDateRange = startOk && endOk;
            }

            return matchesStatus && matchesSearch && matchesDateRange;
        });
    }, [projects, filter, searchQuery, startDateFilter, endDateFilter]);

    // Filtered Project IDs Set (memoized)
    const filteredProjectIds = useMemo(() => {
        return new Set(filteredProjects.map(p => String(p.id)));
    }, [filteredProjects]);

    // Stats (memoized)
    const stats = useMemo(() => {
        const projectTasks = tasks.filter(t => filteredProjectIds.has(String(t.project)));

        return {
            total: filteredProjects.length,
            active: filteredProjects.filter(p => p.status === 'active').length,
            completed: filteredProjects.filter(p => p.status === 'completed').length,
            tasksTodo: projectTasks.filter(t => t.status === 'todo').length,
            tasksInProgress: projectTasks.filter(t => t.status === 'in_progress').length,
            pendingReview: projectTasks.filter(t => t.status === 'review').length,
            tasksCompleted: projectTasks.filter(t => t.status === 'completed').length,
            criticalPathTasks: projectTasks.filter(t => t.is_critical).length,
        };
    }, [tasks, filteredProjects, filteredProjectIds]);

    // Team Workload (memoized) ✅ Fix #2
    const teamWorkload = useMemo(() => {
        const projectTasks = tasks.filter(t => filteredProjectIds.has(String(t.project)));

        const workload = projectTasks.reduce((acc, task) => {
            if (task.status !== 'completed') {
                const name = task.assignee_name || 'Unassigned';
                acc[name] = (acc[name] || 0) + 1;
            }
            return acc;
        }, {});

        const totalActive = Object.values(workload).reduce((a, b) => a + b, 0);

        return {
            entries: Object.entries(workload).sort((a, b) => b[1] - a[1]),
            totalActive
        };
    }, [tasks, filteredProjectIds]);

    // My Tasks (memoized) ✅ Fix #1: Uses actual user
    const myTasks = useMemo(() => {
        return tasks.filter(t => {
            if (!filteredProjectIds.has(String(t.project))) return false;
            const isMine = t.assignee_name === user?.username; // ✅ Dynamic user
            const isActive = t.status !== 'completed';
            return isActive && (myTasksFilter === 'all' || isMine);
        });
    }, [tasks, filteredProjectIds, myTasksFilter, user?.username]);

    // Upcoming Deadlines (memoized)
    const upcomingDeadlines = useMemo(() => {
        const now = new Date();

        const getMaxDays = () => {
            if (deadlinePeriod === '14d') return 14;
            if (deadlinePeriod === '1m') return 30;
            if (deadlinePeriod === '3m') return 90;
            if (deadlinePeriod === '6m') return 180;
            if (deadlinePeriod === '1y') return 365;
            return 30;
        };

        const maxDays = getMaxDays();

        return tasks
            .filter(t => {
                if (!filteredProjectIds.has(String(t.project))) return false;
                if (t.status === 'completed') return false;

                const dueDate = new Date(t.start_date);
                dueDate.setDate(dueDate.getDate() + (t.duration || 0));
                const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

                return diffDays <= maxDays;
            })
            .sort((a, b) => {
                const dateA = new Date(a.start_date);
                dateA.setDate(dateA.getDate() + (a.duration || 0));
                const dateB = new Date(b.start_date);
                dateB.setDate(dateB.getDate() + (b.duration || 0));
                return dateA - dateB;
            })
            .slice(0, 5);
    }, [tasks, filteredProjectIds, deadlinePeriod]);

    // Recent Activity (memoized) ✅ Fix #3: Uses activityPeriod
    const recentActivity = useMemo(() => {
        const getActivityCutoffDate = (period) => {
            const now = new Date();
            if (period === '24h') return new Date(now - 24 * 60 * 60 * 1000);
            if (period === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
            if (period === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
            if (period === '90d') return new Date(now - 90 * 24 * 60 * 60 * 1000);
            return null;
        };

        const cutoffDate = getActivityCutoffDate(activityPeriod);

        return activityLogs.filter(log => {
            const matchesAction = activityFilter === 'all' || log.action?.toLowerCase() === activityFilter;
            if (!matchesAction) return false;

            if (cutoffDate) {
                const logDate = new Date(log.timestamp);
                if (logDate < cutoffDate) return false;
            }

            return true;
        });
    }, [activityLogs, activityFilter, activityPeriod]);

    // ============ HELPER FUNCTIONS ============

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

    const handleSave = (projectData) => saveProjectMutation.mutate(projectData);
    const handleDeleteClick = (project) => { setProjectToDelete(project); setDeleteModalOpen(true); };
    const handleConfirmDelete = () => { if (projectToDelete) deleteProjectMutation.mutate(projectToDelete.id); };

    // Status colors using brand palette
    const statusColors = {
        active: colors.teal,
        on_hold: '#f59e0b',
        completed: colors.navy
    };

    const statusLabels = {
        active: 'ACTIVE',
        on_hold: 'ON HOLD',
        completed: 'COMPLETED'
    };

    const priorityColors = {
        critical: '#ef4444',
        high: '#f59e0b',
        medium: colors.tealLight,
        low: colors.gray
    };

    // ============ RENDER ============

    return (
        <Box sx={{ position: 'relative', zIndex: 0 }}>
            {/* Premium Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4,
                p: 3,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                color: 'white',
                boxShadow: `0 8px 32px ${colors.navy}30`,
                position: 'relative',
                zIndex: 1,
                isolation: 'isolate'
            }}>
                <Box>
                    <Typography variant="h4" sx={{
                        fontWeight: 800,
                        mb: 0.5,
                        letterSpacing: '-0.5px',
                        color: 'white'
                    }}>
                        Research Portfolio Dashboard
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 500, color: 'white' }}>
                        Welcome back, {user?.username || 'User'}! Here's what's happening across your research portfolio.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ zIndex: 2 }}>
                    <Tooltip title="Notifications">
                        <IconButton sx={{
                            color: 'white',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                        }}>
                            <NotificationsIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => { setEditingProject(null); setOpenForm(true); }}
                        sx={{
                            borderRadius: 2.5,
                            px: 3,
                            bgcolor: colors.teal,
                            color: 'white',
                            fontWeight: 700,
                            textTransform: 'none',
                            boxShadow: `0 4px 14px ${colors.teal}50`,
                            '&:hover': {
                                bgcolor: colors.tealDark,
                                boxShadow: `0 6px 20px ${colors.teal}60`
                            }
                        }}
                    >
                        New Project
                    </Button>
                </Stack>
            </Box>

            {/* Stats Widgets */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                    {
                        label: 'Active Projects',
                        value: stats.active,
                        icon: <AssignmentIcon />,
                        color: colors.teal,
                        trend: `${stats.total} total`,
                        bg: `linear-gradient(135deg, ${colors.teal} 0%, ${colors.tealDark} 100%)`
                    },
                    {
                        label: 'Tasks in Progress',
                        value: stats.tasksInProgress,
                        icon: <TrendingUpIcon />,
                        color: colors.navyLight,
                        trend: `${stats.tasksTodo} to do`,
                        bg: `linear-gradient(135deg, ${colors.navyLight} 0%, ${colors.navy} 100%)`
                    },
                    {
                        label: 'Pending Review',
                        value: stats.pendingReview,
                        icon: <NotificationsIcon />,
                        color: '#f59e0b',
                        trend: 'Needs attention',
                        bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    },
                    {
                        label: 'Critical Path Tasks',
                        value: stats.criticalPathTasks,
                        icon: <GroupIcon />,
                        color: '#ef4444',
                        trend: 'Impacts Timeline',
                        bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    },
                ].map((stat, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper sx={{
                            p: 3,
                            borderRadius: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                            border: `1px solid ${colors.navyLighter}`,
                            background: 'white',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: `0 12px 24px ${stat.color}15`,
                                borderColor: stat.color
                            }
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box sx={{
                                    p: 1.5,
                                    borderRadius: 2.5,
                                    background: stat.bg,
                                    color: 'white',
                                    boxShadow: `0 4px 12px ${stat.color}40`
                                }}>
                                    {stat.icon}
                                </Box>
                                <Chip
                                    label={stat.trend}
                                    size="small"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '0.65rem',
                                        bgcolor: `${stat.color}10`,
                                        color: stat.color,
                                        border: `1px solid ${stat.color}20`
                                    }}
                                />
                            </Box>
                            <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, color: colors.navy }}>
                                {stat.value}
                            </Typography>
                            <Typography variant="body2" sx={{
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                fontSize: '0.7rem',
                                letterSpacing: '0.5px',
                                color: colors.gray
                            }}>
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
                            <Typography variant="h6" sx={{ fontWeight: 700, color: colors.navy }}>
                                Active Initiatives
                            </Typography>
                            <Tabs
                                value={filter}
                                onChange={(e, v) => setFilter(v)}
                                sx={{
                                    minHeight: 36,
                                    '& .MuiTab-root': {
                                        minHeight: 36,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        px: 2,
                                        color: colors.gray,
                                        '&.Mui-selected': { color: colors.teal }
                                    },
                                    '& .MuiTabs-indicator': { bgcolor: colors.teal }
                                }}
                            >
                                <Tab label="ALL" value="all" />
                                <Tab label="ACTIVE" value="active" />
                                <Tab label="ON HOLD" value="on_hold" />
                                <Tab label="COMPLETED" value="completed" />
                            </Tabs>
                        </Box>

                        {/* Search Bar - ✅ Fix #4: MUI TextFields */}
                        <Paper sx={{
                            p: 1.5,
                            display: 'flex',
                            gap: 2,
                            borderRadius: 2.5,
                            border: `1px solid ${colors.navyLighter}`,
                            bgcolor: 'white',
                            alignItems: 'center',
                            flexWrap: 'wrap'
                        }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 2,
                                flex: 1,
                                minWidth: 200,
                                bgcolor: colors.grayLighter,
                                borderRadius: 2,
                                border: '2px solid transparent',
                                transition: 'all 0.2s ease',
                                '&:focus-within': {
                                    bgcolor: 'white',
                                    borderColor: colors.teal
                                }
                            }}>
                                <SearchIcon sx={{ color: colors.gray, mr: 1, fontSize: '1.2rem' }} />
                                <input
                                    placeholder="Search projects..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        width: '100%',
                                        padding: '10px 0',
                                        outline: 'none',
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        color: colors.navy
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <FilterListIcon sx={{ color: colors.gray, fontSize: '1.1rem' }} />
                                <TextField
                                    type="date"
                                    size="small"
                                    value={startDateFilter}
                                    onChange={(e) => setStartDateFilter(e.target.value)}
                                    sx={{
                                        width: 140,
                                        '& .MuiOutlinedInput-root': {
                                            height: 36,
                                            fontSize: '0.75rem',
                                            '& fieldset': { borderColor: colors.grayLight },
                                            '&:hover fieldset': { borderColor: colors.teal },
                                            '&.Mui-focused fieldset': { borderColor: colors.teal }
                                        }
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: colors.gray, fontWeight: 600 }}>
                                    to
                                </Typography>
                                <TextField
                                    type="date"
                                    size="small"
                                    value={endDateFilter}
                                    onChange={(e) => setEndDateFilter(e.target.value)}
                                    sx={{
                                        width: 140,
                                        '& .MuiOutlinedInput-root': {
                                            height: 36,
                                            fontSize: '0.75rem',
                                            '& fieldset': { borderColor: colors.grayLight },
                                            '&:hover fieldset': { borderColor: colors.teal },
                                            '&.Mui-focused fieldset': { borderColor: colors.teal }
                                        }
                                    }}
                                />
                                {(startDateFilter || endDateFilter) && (
                                    <Chip
                                        label="Clear"
                                        size="small"
                                        onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: '0.65rem',
                                            cursor: 'pointer',
                                            bgcolor: colors.tealLighter,
                                            color: colors.teal,
                                            '&:hover': { bgcolor: colors.tealLight, color: 'white' }
                                        }}
                                    />
                                )}
                            </Box>
                        </Paper>
                    </Box>

                    {/* Project Cards */}
                    <Grid container spacing={2}>
                        {filteredProjects.map(project => {
                            const progress = calculateProgress(project);
                            const statusColor = statusColors[project.status] || colors.gray;

                            return (
                                <Grid item xs={12} md={6} key={project.id}>
                                    <Card sx={{
                                        borderRadius: 3,
                                        border: `1px solid ${colors.navyLighter}`,
                                        transition: 'all 0.3s ease',
                                        overflow: 'hidden',
                                        '&:hover': {
                                            boxShadow: `0 8px 24px ${colors.navy}15`,
                                            borderColor: colors.teal,
                                            transform: 'translateY(-2px)'
                                        }
                                    }}>
                                        <CardActionArea onClick={() => navigate(`/projects/${project.id}`)}>
                                            <CardContent sx={{ p: 3, pb: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: colors.navy, flex: 1 }}>
                                                        {project.name}
                                                    </Typography>
                                                    <ArrowForwardIcon fontSize="small" sx={{ color: colors.teal, ml: 1 }} />
                                                </Box>
                                                <Typography variant="body2" sx={{
                                                    mb: 3,
                                                    height: '3em',
                                                    overflow: 'hidden',
                                                    color: colors.gray,
                                                    lineHeight: 1.5
                                                }}>
                                                    {project.description || 'No description provided.'}
                                                </Typography>

                                                <Box sx={{ mb: 2 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 600, color: colors.gray }}>
                                                            Progress
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: colors.navy }}>
                                                            {progress}%
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={progress}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 3,
                                                            bgcolor: colors.navyLighter,
                                                            '& .MuiLinearProgress-bar': {
                                                                borderRadius: 3,
                                                                bgcolor: progress === 100 ? colors.teal : colors.tealLight
                                                            }
                                                        }}
                                                    />
                                                </Box>

                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip
                                                        label={statusLabels[project.status] || project.status.toUpperCase()}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: '0.6rem',
                                                            bgcolor: `${statusColor}15`,
                                                            color: statusColor,
                                                            border: `1px solid ${statusColor}30`
                                                        }}
                                                    />
                                                    <Chip
                                                        icon={<ScheduleIcon sx={{ fontSize: '0.8rem !important' }} />}
                                                        label={project.end_date || 'TBD'}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{
                                                            fontWeight: 600,
                                                            fontSize: '0.6rem',
                                                            borderColor: colors.navyLighter,
                                                            color: colors.gray
                                                        }}
                                                    />
                                                </Stack>
                                            </CardContent>
                                        </CardActionArea>

                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            px: 2,
                                            py: 1,
                                            gap: 0.5,
                                            borderTop: `1px solid ${colors.navyLighter}`,
                                            bgcolor: colors.grayLighter
                                        }}>
                                            <Tooltip title="Edit Project">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingProject(project);
                                                        setOpenForm(true);
                                                    }}
                                                    sx={{
                                                        color: colors.gray,
                                                        '&:hover': { color: colors.teal, bgcolor: colors.tealLighter }
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Project">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(project);
                                                    }}
                                                    sx={{
                                                        color: colors.gray,
                                                        '&:hover': { color: '#ef4444', bgcolor: '#fef2f2' }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Card>
                                </Grid>
                            );
                        })}

                        {filteredProjects.length === 0 && (
                            <Grid item xs={12}>
                                <Paper sx={{
                                    p: 6,
                                    textAlign: 'center',
                                    borderRadius: 3,
                                    border: `1px solid ${colors.navyLighter}`
                                }}>
                                    <AssignmentIcon sx={{ fontSize: 48, color: colors.grayLight, mb: 2 }} />
                                    <Typography variant="h6" sx={{ color: colors.navy, fontWeight: 600, mb: 1 }}>
                                        No projects found
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: colors.gray, mb: 3 }}>
                                        Try adjusting your filters or create a new project.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={() => { setEditingProject(null); setOpenForm(true); }}
                                        sx={{
                                            bgcolor: colors.teal,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': { bgcolor: colors.tealDark }
                                        }}
                                    >
                                        Create Project
                                    </Button>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </Grid>

                {/* Right Sidebar */}
                <Grid item xs={12} lg={4}>
                    <Box sx={{
                        position: { lg: 'sticky' },
                        top: { lg: 88 },
                        maxHeight: { lg: 'calc(100vh - 110px)' },
                        overflowY: { lg: 'auto' },
                        pr: { lg: 1 },
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: colors.grayLight, borderRadius: 3 },
                        '&:hover::-webkit-scrollbar-thumb': { bgcolor: colors.gray }
                    }}>
                        <Stack spacing={3}>
                            {/* Team Workload - Now uses memoized data */}
                            <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${colors.navyLighter}` }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: colors.navy }}>
                                    Team Workload
                                </Typography>
                                <Stack spacing={2}>
                                    {teamWorkload.totalActive === 0 ? (
                                        <Typography variant="body2" sx={{ color: colors.gray, fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                            No active tasks assigned
                                        </Typography>
                                    ) : (
                                        teamWorkload.entries.map(([name, count]) => (
                                            <Box key={name}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: colors.navy, fontWeight: 700 }}>
                                                            {name[0].toUpperCase()}
                                                        </Avatar>
                                                        <Typography variant="caption" sx={{ fontWeight: 600, color: colors.navy }}>
                                                            {name}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: colors.teal }}>
                                                        {count} tasks
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={(count / teamWorkload.totalActive) * 100}
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 3,
                                                        bgcolor: colors.navyLighter,
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: count > 5 ? '#ef4444' : count > 3 ? '#f59e0b' : colors.teal,
                                                            borderRadius: 3
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        ))
                                    )}
                                </Stack>
                            </Paper>

                            {/* Task Distribution */}
                            <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${colors.navyLighter}` }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: colors.navy }}>
                                    Task Distribution
                                </Typography>
                                <Stack spacing={2}>
                                    {[
                                        { label: 'To Do', count: stats.tasksTodo, color: colors.gray },
                                        { label: 'In Progress', count: stats.tasksInProgress, color: colors.tealLight },
                                        { label: 'Review', count: stats.pendingReview, color: '#f59e0b' },
                                        { label: 'Completed', count: stats.tasksCompleted, color: colors.teal },
                                    ].map((item, i) => (
                                        <Box key={i}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: colors.navy }}>
                                                    {item.label}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: item.color }}>
                                                    {item.count}
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={tasks.length > 0 ? (item.count / tasks.length) * 100 : 0}
                                                sx={{
                                                    height: 6,
                                                    borderRadius: 3,
                                                    bgcolor: colors.navyLighter,
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
                                    endIcon={<ArrowForwardIcon />}
                                    sx={{ mt: 3, borderRadius: 2, fontWeight: 600, textTransform: 'none', color: colors.teal, '&:hover': { bgcolor: colors.tealLighter } }}
                                >
                                    View All Tasks
                                </Button>
                            </Paper>

                            {/* My Tasks - Now uses memoized data */}
                            <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${colors.navyLighter}` }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: colors.navy }}>
                                        My Tasks
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {['mine', 'all'].map((f) => (
                                            <Chip
                                                key={f}
                                                label={f === 'mine' ? 'Mine' : 'All'}
                                                onClick={() => setMyTasksFilter(f)}
                                                size="small"
                                                sx={{
                                                    height: 24,
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    bgcolor: myTasksFilter === f ? colors.teal : 'transparent',
                                                    color: myTasksFilter === f ? 'white' : colors.gray,
                                                    border: `1px solid ${myTasksFilter === f ? colors.teal : colors.grayLight}`,
                                                    '&:hover': { bgcolor: myTasksFilter === f ? colors.tealDark : colors.grayLighter }
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                                <Stack spacing={1.5}>
                                    {myTasks.slice(0, 5).map((task) => (
                                        <Box
                                            key={task.id}
                                            onClick={() => navigate(`/tasks?taskId=${task.id}`)}
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                border: `1px solid ${colors.navyLighter}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': { bgcolor: colors.grayLighter, borderColor: colors.teal, transform: 'translateX(4px)' }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, color: colors.navy }}>
                                                    {task.name}
                                                </Typography>
                                                <Chip
                                                    label={task.priority}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.6rem',
                                                        fontWeight: 700,
                                                        bgcolor: priorityColors[task.priority] || colors.gray,
                                                        color: 'white',
                                                        textTransform: 'capitalize'
                                                    }}
                                                />
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Chip
                                                    label={task.status.replace('_', ' ')}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ height: 18, fontSize: '0.6rem', textTransform: 'capitalize', borderColor: colors.grayLight, color: colors.gray }}
                                                />
                                                <ScheduleIcon sx={{ fontSize: '0.75rem', color: colors.gray }} />
                                                <Typography variant="caption" sx={{ color: colors.gray, fontSize: '0.65rem' }}>
                                                    {task.start_date}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}

                                    {myTasks.length === 0 && (
                                        <Typography variant="body2" sx={{ color: colors.gray, fontStyle: 'italic', textAlign: 'center', py: 3 }}>
                                            {myTasksFilter === 'mine' ? 'No active tasks assigned to you' : 'No active tasks found'}
                                        </Typography>
                                    )}

                                    {myTasks.length > 5 && (
                                        <Button
                                            fullWidth
                                            size="small"
                                            onClick={() => navigate('/tasks')}
                                            sx={{ mt: 1, fontWeight: 600, color: colors.teal }}
                                        >
                                            View All ({myTasks.length} tasks)
                                        </Button>
                                    )}
                                </Stack>
                            </Paper>

                            {/* ── CPM Schedule Health panel ─────────── */}
                            {(() => {
                                // Compute per-project CPM summary from existing tasks data
                                const cpmSummary = filteredProjects.map(p => {
                                    const projectTasks = tasks.filter(t => String(t.project) === String(p.id));
                                    const criticalTasks = projectTasks.filter(t => t.is_critical);
                                    // Best estimated project end from CPM early_finish
                                    const finishDates = projectTasks
                                        .map(t => t.early_finish || t.ef)
                                        .filter(Boolean)
                                        .map(d => new Date(d));
                                    const projectEnd = finishDates.length > 0
                                        ? new Date(Math.max(...finishDates))
                                        : null;
                                    // Sort critical tasks by early_start for critical chain order
                                    const chain = criticalTasks
                                        .slice()
                                        .sort((a, b) => new Date(a.early_start || a.es || 0) - new Date(b.early_start || b.es || 0));
                                    return { project: p, criticalCount: criticalTasks.length, projectEnd, chain, totalTasks: projectTasks.length };
                                }).filter(s => s.criticalCount > 0 || s.totalTasks > 0);

                                if (cpmSummary.length === 0) return null;

                                return (
                                    <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid #fecaca`, bgcolor: '#fff' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#c62828' }} />
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: colors.navy }}>
                                                CPM Schedule Health
                                            </Typography>
                                        </Box>
                                        <Stack spacing={2}>
                                            {cpmSummary.map(({ project: p, criticalCount, projectEnd, chain, totalTasks }) => (
                                                <Box
                                                    key={p.id}
                                                    sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${colors.navyLighter}`, cursor: 'pointer', '&:hover': { bgcolor: '#fafbfc', borderColor: '#c62828' } }}
                                                    onClick={() => navigate(`/projects/${p.id}`)}
                                                >
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 800, color: colors.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                            {p.name}
                                                        </Typography>
                                                        {criticalCount > 0 && (
                                                            <Chip
                                                                label={`${criticalCount} critical`}
                                                                size="small"
                                                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#fef2f2', color: '#c62828', border: '1px solid #fecaca', ml: 1 }}
                                                            />
                                                        )}
                                                    </Box>
                                                    {projectEnd && (
                                                        <Typography variant="caption" sx={{ color: colors.gray, display: 'block', mb: 0.5 }}>
                                                            📅 Calc. End: <strong>{projectEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</strong>
                                                        </Typography>
                                                    )}
                                                    {chain.length > 0 && (
                                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                                            {chain.slice(0, 3).map((t, i) => (
                                                                <Typography key={t.id} variant="caption" sx={{ fontSize: '0.62rem', color: '#c62828', fontWeight: 700 }}>
                                                                    {i > 0 ? '→ ' : '🔴 '}{t.name}
                                                                </Typography>
                                                            ))}
                                                            {chain.length > 3 && (
                                                                <Typography variant="caption" sx={{ fontSize: '0.62rem', color: colors.gray }}>
                                                                    +{chain.length - 3} more
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Paper>
                                );
                            })()}


                            <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${colors.navyLighter}` }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: colors.navy }}>
                                    Upcoming Deadlines
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                                    {[
                                        { label: '14d', value: '14d' },
                                        { label: '1m', value: '1m' },
                                        { label: '3m', value: '3m' },
                                        { label: '6m', value: '6m' },
                                        { label: '1y', value: '1y' }
                                    ].map((option) => (
                                        <Chip
                                            key={option.value}
                                            label={option.label}
                                            onClick={() => setDeadlinePeriod(option.value)}
                                            size="small"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '0.65rem',
                                                bgcolor: deadlinePeriod === option.value ? colors.teal : 'transparent',
                                                color: deadlinePeriod === option.value ? 'white' : colors.gray,
                                                border: `1px solid ${deadlinePeriod === option.value ? colors.teal : colors.grayLight}`,
                                                '&:hover': { bgcolor: deadlinePeriod === option.value ? colors.tealDark : colors.grayLighter }
                                            }}
                                        />
                                    ))}
                                </Box>
                                <Stack spacing={1.5}>
                                    {upcomingDeadlines.length === 0 ? (
                                        <Typography variant="body2" sx={{ color: colors.gray, fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                            No upcoming deadlines
                                        </Typography>
                                    ) : (
                                        upcomingDeadlines.map((task) => {
                                            const dueDate = new Date(task.start_date);
                                            dueDate.setDate(dueDate.getDate() + (task.duration || 0));
                                            const now = new Date();
                                            const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                                            const isOverdue = diffDays < 0;
                                            const isDueSoon = diffDays <= 3 && diffDays >= 0;

                                            return (
                                                <Box
                                                    key={task.id}
                                                    onClick={() => navigate(`/tasks?taskId=${task.id}`)}
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        border: `1px solid ${colors.navyLighter}`,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': { bgcolor: colors.grayLighter, borderColor: isOverdue ? '#ef4444' : colors.teal, transform: 'translateX(4px)' }
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, color: colors.navy }}>
                                                            {task.name}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : colors.gray,
                                                                whiteSpace: 'nowrap',
                                                                ml: 1
                                                            }}
                                                        >
                                                            {isOverdue ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? 'Due today' : `${diffDays}d left`}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ color: colors.gray }}>
                                                        {dueDate.toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            );
                                        })
                                    )}
                                </Stack>
                            </Paper>

                            {/* Recent Activity - Now uses memoized data ✅ Fix #3: Added period selector */}
                            <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${colors.navyLighter}` }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: colors.navy }}>
                                    Recent Activity
                                </Typography>

                                {/* Action Type Filter */}
                                <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
                                    {['all', 'create', 'update', 'comment'].map((filterType) => (
                                        <Chip
                                            key={filterType}
                                            label={filterType === 'all' ? 'All' : filterType}
                                            onClick={() => setActivityFilter(filterType)}
                                            size="small"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '0.65rem',
                                                textTransform: 'capitalize',
                                                bgcolor: activityFilter === filterType ? colors.teal : 'transparent',
                                                color: activityFilter === filterType ? 'white' : colors.gray,
                                                border: `1px solid ${activityFilter === filterType ? colors.teal : colors.grayLight}`,
                                                '&:hover': { bgcolor: activityFilter === filterType ? colors.tealDark : colors.grayLighter }
                                            }}
                                        />
                                    ))}
                                </Box>

                                {/* ✅ Fix #3: Time Period Filter */}
                                <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                                    {[
                                        { label: '24h', value: '24h' },
                                        { label: '7d', value: '7d' },
                                        { label: '30d', value: '30d' },
                                        { label: '90d', value: '90d' },
                                        { label: 'All', value: 'all' }
                                    ].map((option) => (
                                        <Chip
                                            key={option.value}
                                            label={option.label}
                                            onClick={() => setActivityPeriod(option.value)}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.6rem',
                                                borderColor: activityPeriod === option.value ? colors.navy : colors.grayLight,
                                                color: activityPeriod === option.value ? colors.navy : colors.gray,
                                                bgcolor: activityPeriod === option.value ? colors.navyLighter : 'transparent',
                                                '&:hover': { bgcolor: colors.navyLighter }
                                            }}
                                        />
                                    ))}
                                </Box>

                                <Stack spacing={2}>
                                    {recentActivity.length === 0 ? (
                                        <Typography variant="body2" sx={{ color: colors.gray, fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                            No recent activity
                                        </Typography>
                                    ) : (
                                        <>
                                            {recentActivity.slice(0, activityLimit).map((log, i) => (
                                                <Box
                                                    key={i}
                                                    sx={{
                                                        display: 'flex',
                                                        gap: 2,
                                                        pb: 2,
                                                        borderBottom: i < Math.min(recentActivity.length, activityLimit) - 1 ? `1px solid ${colors.navyLighter}` : 'none'
                                                    }}
                                                >
                                                    <Avatar sx={{ width: 32, height: 32, bgcolor: colors.navyLight, fontSize: '0.8rem' }}>
                                                        {log.username ? log.username[0].toUpperCase() : 'U'}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: colors.navy }}>
                                                            {log.username || 'Someone'} {log.action}{' '}
                                                            <span style={{ color: colors.teal }}>{log.target_name}</span>
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: colors.gray }}>
                                                            {getRelativeTime(log.timestamp)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            ))}

                                            {recentActivity.length > activityLimit && (
                                                <Button
                                                    fullWidth
                                                    onClick={() => setActivityLimit(prev => prev + 10)}
                                                    sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', color: colors.teal }}
                                                >
                                                    Show More ({recentActivity.length - activityLimit} more)
                                                </Button>
                                            )}

                                            {activityLimit > 8 && recentActivity.length <= activityLimit && (
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    onClick={() => setActivityLimit(8)}
                                                    sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', borderColor: colors.grayLight, color: colors.gray }}
                                                >
                                                    Show Less
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Paper>
                        </Stack>
                    </Box>
                </Grid>
            </Grid>

            {/* Modals */}
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
        </Box>
    );
};

export default Dashboard;
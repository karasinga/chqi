import React, { useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, Avatar, Paper,
    LinearProgress, Chip, Stack, Divider, List, ListItem, ListItemAvatar,
    ListItemText, Tooltip
} from '@mui/material';
import {
    Person as PersonIcon, Assignment as TaskIcon,
    CheckCircle as CompletedIcon, Schedule as InProgressIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

const TeamTab = ({ tasks = [], users = [] }) => {
    // Calculate team statistics
    const teamStats = useMemo(() => {
        const teamMembers = users.map(user => {
            const userTasks = tasks.filter(t => t.assignee === user.id);
            const completedTasks = userTasks.filter(t => t.status === 'completed').length;
            const inProgressTasks = userTasks.filter(t => t.status === 'in_progress').length;
            const todoTasks = userTasks.filter(t => t.status === 'todo').length;
            const reviewTasks = userTasks.filter(t => t.status === 'review').length;
            const totalTasks = userTasks.length;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const criticalTasks = userTasks.filter(t => t.is_critical).length;

            return {
                ...user,
                totalTasks,
                completedTasks,
                inProgressTasks,
                todoTasks,
                reviewTasks,
                completionRate,
                criticalTasks,
                tasks: userTasks
            };
        });

        // Filter out users with no tasks
        const activeMembers = teamMembers.filter(m => m.totalTasks > 0);

        // Sort by total tasks descending
        activeMembers.sort((a, b) => b.totalTasks - a.totalTasks);

        const totalAssignedTasks = tasks.filter(t => t.assignee).length;
        const unassignedTasks = tasks.filter(t => !t.assignee).length;

        return {
            activeMembers,
            totalAssignedTasks,
            unassignedTasks,
            totalMembers: activeMembers.length
        };
    }, [tasks, users]);

    const getInitials = (firstName, lastName) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
    };

    const getAvatarColor = (index) => {
        const colors = ['#1976d2', '#388e3c', '#d32f2f', '#f57c00', '#7b1fa2', '#0097a7', '#c2185b', '#5d4037'];
        return colors[index % colors.length];
    };

    return (
        <Box>
            {/* Overview Statistics */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Team Members
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#1976d2' }}>
                            {teamStats.totalMembers}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#e8f5e9', border: '1px solid #81c784' }}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Assigned Tasks
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#2e7d32' }}>
                            {teamStats.totalAssignedTasks}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, borderRadius: 3, bgcolor: teamStats.unassignedTasks > 0 ? '#fff3e0' : '#f5f5f5', border: `1px solid ${teamStats.unassignedTasks > 0 ? '#ffb74d' : '#e0e0e0'}` }}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Unassigned Tasks
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: teamStats.unassignedTasks > 0 ? '#f57c00' : '#757575' }}>
                            {teamStats.unassignedTasks}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Team Members */}
            {teamStats.activeMembers.length > 0 ? (
                <Grid container spacing={3}>
                    {teamStats.activeMembers.map((member, index) => (
                        <Grid item xs={12} md={6} lg={4} key={member.id}>
                            <Card
                                elevation={3}
                                sx={{
                                    borderRadius: 4,
                                    border: '1px solid #e0e0e0',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 6,
                                        borderColor: 'primary.main'
                                    }
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    {/* Member Header */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Avatar
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                bgcolor: getAvatarColor(index),
                                                fontSize: '1.25rem',
                                                fontWeight: 900
                                            }}
                                        >
                                            {getInitials(member.first_name, member.last_name)}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                                {member.first_name} {member.last_name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                @{member.username}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Task Statistics */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                                Completion Rate
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 900, color: member.completionRate >= 70 ? '#2e7d32' : member.completionRate >= 40 ? '#f57c00' : '#d32f2f' }}>
                                                {member.completionRate}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={member.completionRate}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: '#e0e0e0',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: member.completionRate >= 70 ? '#2e7d32' : member.completionRate >= 40 ? '#f57c00' : '#d32f2f',
                                                    borderRadius: 4
                                                }
                                            }}
                                        />
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    {/* Task Breakdown */}
                                    <Grid container spacing={1.5}>
                                        <Grid item xs={6}>
                                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1976d2' }}>
                                                    {member.totalTasks}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                                    Total Tasks
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="h5" sx={{ fontWeight: 900, color: '#2e7d32' }}>
                                                    {member.completedTasks}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                                    Completed
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1976d2' }}>
                                                    {member.inProgressTasks}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                                    In Progress
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="h5" sx={{ fontWeight: 900, color: '#757575' }}>
                                                    {member.todoTasks}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                                    To Do
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>

                                    {member.criticalTasks > 0 && (
                                        <Box sx={{ mt: 2 }}>
                                            <Chip
                                                label={`${member.criticalTasks} Critical Task${member.criticalTasks > 1 ? 's' : ''}`}
                                                color="error"
                                                size="small"
                                                sx={{ fontWeight: 900, fontSize: '0.7rem' }}
                                            />
                                        </Box>
                                    )}

                                    <Divider sx={{ my: 2 }} />

                                    {/* Recent Tasks */}
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                        Recent Tasks
                                    </Typography>
                                    <List dense sx={{ maxHeight: 150, overflowY: 'auto' }}>
                                        {member.tasks.slice(0, 5).map(task => (
                                            <ListItem
                                                key={task.id}
                                                sx={{
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 2,
                                                    '&:hover': { bgcolor: '#f5f5f5' }
                                                }}
                                            >
                                                <ListItemAvatar sx={{ minWidth: 36 }}>
                                                    {task.status === 'completed' ? (
                                                        <CompletedIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
                                                    ) : task.status === 'in_progress' ? (
                                                        <InProgressIcon sx={{ fontSize: 18, color: '#1976d2' }} />
                                                    ) : (
                                                        <TaskIcon sx={{ fontSize: 18, color: '#757575' }} />
                                                    )}
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                            {task.name}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                            {task.status === 'completed' ? 'Completed' :
                                                                task.status === 'in_progress' ? 'In Progress' :
                                                                    task.status === 'review' ? 'In Review' : 'To Do'}
                                                        </Typography>
                                                    }
                                                />
                                                {task.is_critical && (
                                                    <Chip label="!" color="error" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900 }} />
                                                )}
                                            </ListItem>
                                        ))}
                                        {member.tasks.length === 0 && (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', textAlign: 'center', py: 2 }}>
                                                No tasks assigned
                                            </Typography>
                                        )}
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Paper sx={{ p: 6, borderRadius: 4, textAlign: 'center' }}>
                    <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>
                        No Team Members Assigned
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Assign tasks to team members to see their workload and progress here.
                    </Typography>
                </Paper>
            )}
        </Box>
    );
};

export default TeamTab;

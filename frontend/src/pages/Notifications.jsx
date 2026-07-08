import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Paper, Button, Stack, CircularProgress,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { colors } from '../theme/colors';
import { timeAgo } from '../utils/time';
import { notifIcon } from '../utils/notification';

const Notifications = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.get('/pm/notifications/'),
    });

    const markReadMutation = useMutation({
        mutationFn: (ids) => api.post('/pm/notifications/mark_read/', ids ? { ids } : {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        },
    });

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const handleOpen = (notif) => {
        if (notif.link) navigate(notif.link);
        if (!notif.is_read) markReadMutation.mutate([notif.id]);
    };

    return (
        <Box sx={{ maxWidth: 760, mx: 'auto', py: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: colors.navy, mb: 0.5 }}>
                        Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
                    </Typography>
                </Box>
                {unreadCount > 0 && (
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => markReadMutation.mutate(null)}
                        sx={{
                            borderRadius: 2, textTransform: 'none', fontWeight: 700,
                            color: colors.teal, borderColor: colors.teal,
                            '&:hover': { bgcolor: colors.tealLighter },
                        }}
                    >
                        Mark all as read
                    </Button>
                )}
            </Box>

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 8 }}>
                    <CircularProgress sx={{ color: colors.teal }} />
                </Stack>
            ) : notifications.length === 0 ? (
                <Paper sx={{
                    p: 6, borderRadius: 4, textAlign: 'center',
                    border: `1px solid ${colors.navyLighter}`, bgcolor: '#fff',
                }}>
                    <CheckCircleIcon sx={{ fontSize: 56, color: colors.teal, mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: colors.navy }}>
                        You&rsquo;re all caught up
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        New assignments, comments, and status changes will show up here.
                    </Typography>
                </Paper>
            ) : (
                <Stack spacing={1.5}>
                    {notifications.map((notif) => (
                        <Paper
                            key={notif.id}
                            elevation={notif.is_read ? 0 : 2}
                            onClick={() => handleOpen(notif)}
                            sx={{
                                p: 2,
                                borderRadius: 3,
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-start',
                                cursor: 'pointer',
                                border: `1px solid ${notif.is_read ? colors.navyLighter : `${colors.teal}55`}`,
                                bgcolor: notif.is_read ? '#fff' : colors.tealLighter,
                                transition: 'all 0.2s ease',
                                '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                            }}
                        >
                            <Box sx={{
                                width: 40, height: 40, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                color: notif.is_read ? colors.gray : colors.teal,
                                bgcolor: notif.is_read ? colors.grayLighter : `${colors.teal}22`,
                            }}>
                                {notifIcon(notif.type)}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body1" sx={{
                                    color: colors.navy,
                                    fontWeight: notif.is_read ? 400 : 700,
                                    whiteSpace: 'normal',
                                    lineHeight: 1.4,
                                }}>
                                    {notif.message}
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.gray, display: 'block', mt: 0.5 }}>
                                    {timeAgo(notif.created_at)}
                                    {notif.is_read ? '' : '  •  Unread'}
                                </Typography>
                            </Box>
                            {!notif.is_read && (
                                <Box sx={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    bgcolor: colors.teal, mt: 1.5, flexShrink: 0,
                                }} />
                            )}
                        </Paper>
                    ))}
                </Stack>
            )}
        </Box>
    );
};

export default Notifications;

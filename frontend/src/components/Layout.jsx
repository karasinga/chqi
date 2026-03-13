import React, { useState, useEffect } from 'react';
import {
    AppBar, Toolbar, Typography, Box, Drawer, List, ListItem,
    ListItemIcon, ListItemText, IconButton, useTheme, useMediaQuery,
    Avatar, Divider, Tooltip, alpha
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Settings as SettingsIcon,
    TrendingUp as TrendingUpIcon,
    Assignment as AssignmentIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Logout as LogoutIcon
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';

const drawerWidth = 260;
const collapsedWidth = 72;

import { useQuery } from '@tanstack/react-query';

const Layout = ({ children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    const { data: onlineCountData } = useQuery({
        queryKey: ['onlineCount'],
        queryFn: () => api.get('/users/users/online_count/'),
        refetchInterval: 120000, // Heartbeat every 2 minutes
        staleTime: 0, // Always fetch fresh
        refetchOnMount: true, // Fetch immediately on mount
    });
    const onlineCount = onlineCountData?.count || 0;

    useEffect(() => {
        if (onlineCountData?.csrfToken) {
            api.setToken(onlineCountData.csrfToken);
        }
    }, [onlineCountData]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleCollapseToggle = () => {
        setCollapsed(!collapsed);
    };

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
        { text: 'Tasks', icon: <AssignmentIcon />, path: '/tasks' },
        { text: 'Portfolio Hub', icon: <TrendingUpIcon />, path: '/portfolio' },
        { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ];

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                minHeight: 64
            }}>
                {!collapsed && (
                    <img
                        src="/assets/logo.png"
                        alt="CHQI Logo"
                        style={{ maxHeight: 40, maxWidth: '100%' }}
                        onError={(e) => {
                            console.warn('[DEBUG] Logo image failed to load');
                            e.target.style.display = 'none';
                        }}
                    />
                )}
                {!isMobile && (
                    <IconButton onClick={handleCollapseToggle} size="small">
                        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                    </IconButton>
                )}
            </Box>

            <Divider sx={{ opacity: 0.1 }} />

            <List sx={{ px: 1, py: 2 }}>
                {menuItems.map((item) => (
                    <Tooltip key={item.text} title={collapsed ? item.text : ""} placement="right">
                        <ListItem
                            component={Link}
                            to={item.path}
                            selected={location.pathname === item.path}
                            sx={{
                                borderRadius: 3,
                                mb: 1,
                                mx: 1,
                                justifyContent: collapsed ? 'center' : 'initial',
                                px: 2.5,
                                py: 1.5,
                                transition: 'all 0.3s ease',
                                '&.Mui-selected': {
                                    background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                                    color: '#00e676', // Green text
                                    boxShadow: '0 4px 12px rgba(26, 35, 126, 0.2)',
                                    '& .MuiListItemIcon-root': {
                                        color: '#00e676' // Green icon
                                    },
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #1a237e 0%, #1565c0 100%)',
                                        boxShadow: '0 6px 16px rgba(26, 35, 126, 0.3)',
                                    }
                                },
                                '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.04)',
                                    transform: 'translateX(4px)'
                                }
                            }}
                        >
                            <ListItemIcon sx={{
                                minWidth: 0,
                                mr: collapsed ? 0 : 2,
                                justifyContent: 'center',
                                color: 'inherit',
                                transition: 'margin 0.2s'
                            }}>
                                {item.icon}
                            </ListItemIcon>
                            {!collapsed && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />}
                        </ListItem>
                    </Tooltip>
                ))}
            </List>

            <Box sx={{ mt: 'auto', p: 2 }}>
                {!collapsed && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                        px: 1,
                        py: 0.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(76, 175, 80, 0.05)',
                        border: '1px solid rgba(76, 175, 80, 0.1)'
                    }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', boxShadow: '0 0 8px #4caf50' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                            {onlineCount} {onlineCount === 1 ? 'User' : 'Users'} Online
                        </Typography>
                    </Box>
                )}
                <Divider sx={{ mb: 2, opacity: 0.1 }} />
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    justifyContent: collapsed ? 'center' : 'initial',
                    p: collapsed ? 0 : 1,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                }}>
                    <Avatar
                        src="/assets/avatar.png"
                        sx={{
                            width: 40,
                            height: 40,
                            border: '2px solid',
                            borderColor: 'primary.main'
                        }}
                    >
                        P
                    </Avatar>
                    {!collapsed && (
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800 }}>
                                petman
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                Admin
                            </Typography>
                        </Box>
                    )}
                    {!collapsed && (
                        <IconButton size="small">
                            <LogoutIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            </Box>
        </Box>
    );

    const currentWidth = collapsed ? collapsedWidth : drawerWidth;

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { md: `calc(100% - ${currentWidth}px)` },
                    ml: { md: `${currentWidth}px` },
                    bgcolor: 'background.default',
                    color: 'text.primary',
                    borderBottom: '1px solid #eee',
                    transition: theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    zIndex: (theme) => theme.zIndex.drawer + 1,  // This is causing the overlap
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
                        CHQI Dashboard
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{
                    width: { md: currentWidth },
                    flexShrink: { md: 0 },
                    transition: theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                }}
            >
                {/* Mobile Drawer */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>

                {/* Desktop Drawer */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: currentWidth,
                            transition: theme.transitions.create('width', {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                            overflowX: 'hidden',
                            borderRight: '1px solid #eee'
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { md: `calc(100% - ${currentWidth}px)` },
                    minHeight: '100vh',
                    bgcolor: '#f8f9fa'
                }}
            >
                <Toolbar /> {/* Spacer to prevent content from being hidden behind fixed AppBar */}
                {children}
            </Box>
        </Box>
    );
};

export default Layout;

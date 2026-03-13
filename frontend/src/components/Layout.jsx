import React, { useState, useEffect } from 'react';
import {
    AppBar, Toolbar, Typography, Box, Drawer, List, ListItem,
    ListItemIcon, ListItemText, IconButton, useTheme, useMediaQuery,
    Avatar, Divider, Tooltip, Badge, InputBase, Chip, Button,
    Fade, Snackbar, Alert
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Settings as SettingsIcon,
    TrendingUp as TrendingUpIcon,
    Assignment as AssignmentIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Logout as LogoutIcon,
    Search as SearchIcon,
    Notifications as NotificationsIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { keyframes } from '@mui/system';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../theme/colors';

// Animations
const pulse = keyframes`
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
`;

const drawerWidth = 280;
const collapsedWidth = 88;

const Layout = ({ children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuth();

    // Welcome toast state
    const [showWelcome, setShowWelcome] = useState(false);

    // Show welcome message on first mount
    useEffect(() => {
        const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome && user) {
            setShowWelcome(true);
            sessionStorage.setItem('hasSeenWelcome', 'true');
        }
    }, [user]);

    const handleCloseWelcome = () => {
        setShowWelcome(false);
    };

    const { data: onlineCountData } = useQuery({
        queryKey: ['onlineCount'],
        queryFn: () => api.get('/users/online_count/'),
        refetchInterval: 120000,
        staleTime: 0,
        refetchOnMount: true,
    });
    const onlineCount = onlineCountData?.count || 0;

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleCollapseToggle = () => setCollapsed(!collapsed);

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/', badge: null },
        { text: 'Tasks', icon: <AssignmentIcon />, path: '/tasks', badge: 5 },
        { text: 'Portfolio Hub', icon: <TrendingUpIcon />, path: '/portfolio', badge: null },
        { text: 'Settings', icon: <SettingsIcon />, path: '/settings', badge: null },
    ];

    const drawer = (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            color: colors.navy,
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Logo Section */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: collapsed ? 80 : 100,
                p: 2,
                borderBottom: `1px solid ${colors.navyLighter}`,
                position: 'relative',
                bgcolor: '#fff'
            }}>
                {!collapsed ? (
                    <Box sx={{
                        width: '100%',
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 2
                    }}>
                        <img
                            src="/assets/logo.png"
                            alt="CHQI Logo"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.08))'
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `
                                    <div style="display:flex;align-items:center;gap:12px">
                                        <span style="font-weight:900;color:${colors.navy};font-size:2rem">CHQI</span>
                                        <span style="color:${colors.gray};font-size:0.75rem;letter-spacing:1px">DASHBOARD</span>
                                    </div>
                                `;
                            }}
                        />
                    </Box>
                ) : (
                    <Box sx={{
                        width: 48,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img
                            src="/assets/logo.png"
                            alt="CHQI Logo"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `<span style="font-weight:900;color:${colors.navy};font-size:1.5rem">C</span>`;
                            }}
                        />
                    </Box>
                )}

                {/* Collapse Button */}
                {!isMobile && (
                    <IconButton
                        onClick={handleCollapseToggle}
                        size="small"
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: colors.gray,
                            bgcolor: colors.navyLighter,
                            width: 28,
                            height: 28,
                            '&:hover': {
                                bgcolor: colors.grayLight,
                                color: colors.navy
                            }
                        }}
                    >
                        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                    </IconButton>
                )}
            </Box>

            {/* Navigation */}
            <List sx={{ px: 2, py: 3, flex: 1 }}>
                {!collapsed && (
                    <Typography variant="overline" sx={{
                        color: colors.gray,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        letterSpacing: '1.5px',
                        px: 1.5,
                        mb: 1.5,
                        display: 'block'
                    }}>
                        MAIN MENU
                    </Typography>
                )}
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Tooltip key={item.text} title={collapsed ? item.text : ""} placement="right" arrow>
                            <ListItem
                                component={Link}
                                to={item.path}
                                sx={{
                                    borderRadius: 2.5,
                                    mb: 0.75,
                                    justifyContent: collapsed ? 'center' : 'initial',
                                    px: collapsed ? 2 : 2,
                                    py: 1.25,
                                    transition: 'all 0.2s ease',
                                    color: isActive ? '#fff' : colors.navy,
                                    background: isActive
                                        ? `linear-gradient(135deg, ${colors.teal} 0%, ${colors.tealDark} 100%)`
                                        : 'transparent',
                                    boxShadow: isActive
                                        ? `0 4px 16px ${colors.teal}50`
                                        : 'none',
                                    '&:hover': {
                                        bgcolor: isActive ? undefined : colors.grayLight,
                                        color: isActive ? '#fff' : colors.navy,
                                        transform: 'translateX(4px)',
                                    }
                                }}
                            >
                                <ListItemIcon sx={{
                                    minWidth: 0,
                                    mr: collapsed ? 0 : 1.5,
                                    justifyContent: 'center',
                                    color: 'inherit',
                                }}>
                                    {item.badge ? (
                                        <Badge
                                            badgeContent={item.badge}
                                            sx={{
                                                '& .MuiBadge-badge': {
                                                    fontSize: '0.65rem',
                                                    height: 18,
                                                    minWidth: 18,
                                                    background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                                                    color: '#fff'
                                                }
                                            }}
                                        >
                                            {item.icon}
                                        </Badge>
                                    ) : item.icon}
                                </ListItemIcon>
                                {!collapsed && (
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{
                                            fontWeight: isActive ? 600 : 500,
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                )}
                            </ListItem>
                        </Tooltip>
                    );
                })}
            </List>

            {/* Online Status & User Section */}
            <Box sx={{ p: 2 }}>
                {/* Online Users Indicator */}
                {!collapsed && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 2,
                        px: 2,
                        py: 1.25,
                        borderRadius: 2.5,
                        bgcolor: colors.tealLighter,
                        border: `1px solid ${colors.tealLight}30`
                    }}>
                        <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: colors.teal,
                            boxShadow: `0 0 8px ${colors.teal}`,
                            animation: `${pulse} 2s infinite`
                        }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: colors.tealDark }}>
                            {onlineCount} {onlineCount === 1 ? 'User' : 'Users'} Online
                        </Typography>
                    </Box>
                )}

                <Divider sx={{ mb: 2, borderColor: colors.navyLighter }} />

                {/* User Profile */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    p: collapsed ? 1 : 0
                }}>
                    {/* User Info */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        justifyContent: collapsed ? 'center' : 'initial',
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: colors.grayLighter,
                        border: `1px solid ${colors.navyLighter}`,
                    }}>
                        <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={
                                <Box sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: colors.teal,
                                    border: '2px solid #fff'
                                }} />
                            }
                        >
                            <Avatar
                                src="/assets/avatar.png"
                                sx={{
                                    width: 40,
                                    height: 40,
                                    background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                                    fontWeight: 700,
                                    fontSize: '1rem'
                                }}
                            >
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                        </Badge>
                        {!collapsed && (
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" noWrap sx={{
                                    fontWeight: 700,
                                    color: colors.navy
                                }}>
                                    {user?.username || 'User'}
                                </Typography>
                                <Typography variant="caption" noWrap sx={{
                                    display: 'block',
                                    color: colors.gray,
                                    textTransform: 'capitalize'
                                }}>
                                    {user?.role || 'Stakeholder'}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Logout Button */}
                    {!collapsed ? (
                        <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<LogoutIcon />}
                            onClick={logout}
                            sx={{
                                py: 1.25,
                                borderRadius: 2.5,
                                borderColor: colors.navyLighter,
                                color: colors.gray,
                                fontWeight: 600,
                                textTransform: 'none',
                                fontSize: '0.875rem',
                                justifyContent: 'flex-start',
                                px: 2,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    borderColor: '#ef4444',
                                    bgcolor: 'rgba(239, 68, 68, 0.05)',
                                    color: '#ef4444',
                                    '& .MuiSvgIcon-root': {
                                        color: '#ef4444'
                                    }
                                }
                            }}
                        >
                            Log Out
                        </Button>
                    ) : (
                        <Tooltip title="Log Out" placement="right" arrow>
                            <IconButton
                                onClick={logout}
                                sx={{
                                    color: colors.gray,
                                    border: `1px solid ${colors.navyLighter}`,
                                    borderRadius: 2.5,
                                    p: 1.25,
                                    mx: 'auto',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        borderColor: '#ef4444',
                                        bgcolor: 'rgba(239, 68, 68, 0.05)',
                                        color: '#ef4444'
                                    }
                                }}
                            >
                                <LogoutIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Box>
    );

    const currentWidth = collapsed ? collapsedWidth : drawerWidth;

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: colors.grayLighter }}>
            {/* Welcome Toast */}
            <Snackbar
                open={showWelcome}
                autoHideDuration={4000}
                onClose={handleCloseWelcome}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                sx={{ mt: 8 }}
            >
                <Alert
                    onClose={handleCloseWelcome}
                    severity="success"
                    variant="filled"
                    sx={{
                        bgcolor: colors.teal,
                        color: '#fff',
                        fontWeight: 600,
                        borderRadius: 2.5,
                        boxShadow: `0 8px 24px ${colors.teal}40`,
                        '& .MuiAlert-icon': {
                            color: '#fff',
                        },
                    }}
                >
                    Welcome back, {user?.username || 'User'}! 👋
                </Alert>
            </Snackbar>

            {/* Top Bar */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { md: `calc(100% - ${currentWidth}px)` },
                    ml: { md: `${currentWidth}px` },
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: `1px solid ${colors.navyLighter}`,
                    transition: theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{
                                display: { md: 'none' },
                                color: colors.navy
                            }}
                        >
                            <MenuIcon />
                        </IconButton>

                        {/* Search Bar */}
                        <Box sx={{
                            display: { xs: 'none', sm: 'flex' },
                            alignItems: 'center',
                            gap: 1.5,
                            bgcolor: colors.navyLighter,
                            borderRadius: 2.5,
                            px: 2,
                            py: 1,
                            minWidth: 300,
                            transition: 'all 0.2s ease',
                            border: '2px solid transparent',
                            '&:focus-within': {
                                bgcolor: '#fff',
                                borderColor: colors.teal,
                                boxShadow: `0 0 0 3px ${colors.teal}20`
                            }
                        }}>
                            <SearchIcon sx={{ color: colors.gray, fontSize: 20 }} />
                            <InputBase
                                placeholder="Search anything..."
                                sx={{
                                    flex: 1,
                                    fontSize: '0.875rem',
                                    color: colors.navy,
                                    '& input::placeholder': {
                                        color: colors.gray,
                                        opacity: 1
                                    }
                                }}
                            />
                            <Chip
                                label="⌘K"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    bgcolor: colors.grayLight,
                                    color: colors.navy
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Right Side Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="Toggle Theme" arrow>
                            <IconButton
                                onClick={() => setDarkMode(!darkMode)}
                                sx={{
                                    color: colors.gray,
                                    '&:hover': { bgcolor: colors.navyLighter }
                                }}
                            >
                                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Notifications" arrow>
                            <IconButton sx={{
                                color: colors.gray,
                                '&:hover': { bgcolor: colors.navyLighter }
                            }}>
                                <Badge
                                    badgeContent={3}
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.65rem'
                                        }
                                    }}
                                >
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>

                        <Divider orientation="vertical" flexItem sx={{ mx: 1.5, height: 24, alignSelf: 'center', borderColor: colors.navyLighter }} />

                        <Box sx={{
                            display: { xs: 'none', md: 'flex' },
                            alignItems: 'center',
                            gap: 1.5,
                            pl: 0.5,
                            pr: 1,
                            py: 0.5,
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: colors.navyLighter }
                        }}>
                            <Avatar
                                src="/assets/avatar.png"
                                sx={{
                                    width: 34,
                                    height: 34,
                                    background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                                    fontWeight: 700,
                                    fontSize: '0.85rem'
                                }}
                            >
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: colors.navy, lineHeight: 1.2 }}>
                                    {user?.username || 'User'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.gray, lineHeight: 1 }}>
                                    {user?.role || 'Stakeholder'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
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
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            border: 'none'
                        },
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
                            border: 'none',
                            borderRight: `1px solid ${colors.navyLighter}`
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { md: `calc(100% - ${currentWidth}px)` },
                    minHeight: '100vh',
                    bgcolor: colors.grayLighter,
                    transition: theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                }}
            >
                <Toolbar />
                <Fade key={location.pathname} in={true} timeout={400}>
                    <Box sx={{ p: { xs: 2, md: 3 } }}>
                        {children}
                    </Box>
                </Fade>
            </Box>
        </Box>
    );
};

export default Layout;
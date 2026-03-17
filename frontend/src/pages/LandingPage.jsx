import React, { useState } from 'react';
import {
    Box,
    Grid,
    Typography,
    TextField,
    Button,
    Paper,
    InputAdornment,
    IconButton,
    CircularProgress,
    Alert,
    Divider,
    Fade
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    LockOutlined as LockIcon,
    PersonOutline as PersonIcon,
    EmailOutlined as EmailIcon,
    ArrowBack as ArrowBackIcon,
    Security as SecurityIcon,
    Speed as SpeedIcon,
    Groups as GroupsIcon,
    CheckCircleOutline as CheckIcon
} from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

import { colors } from '../theme/colors';

// Animations
const float = keyframes`
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-30px) scale(1.05); }
`;

const spin = keyframes`
    from { transform: rotate(45deg); }
    to { transform: rotate(405deg); }
`;

const fadeInUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const LandingPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid username or password');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsLoading(true);

        try {
            await api.post('/users/password_reset/', { email: resetEmail });
            setSuccessMsg('Check your email for a password reset link.');
            setResetEmail('');
        } catch (err) {
            setError(err.response?.data?.email?.[0] || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const features = [
        { icon: <SpeedIcon />, title: 'Real-time Analytics', desc: 'Track project progress instantly' },
        { icon: <SecurityIcon />, title: 'Secure Platform', desc: 'Enterprise-grade data protection' },
        { icon: <GroupsIcon />, title: 'Team Collaboration', desc: 'Work together seamlessly' }
    ];

    // TextField styles
    const textFieldSx = {
        '& .MuiFilledInput-root': {
            borderRadius: 2.5,
            bgcolor: colors.navyLighter,
            border: '2px solid transparent',
            transition: 'all 0.2s ease',
            '&::before, &::after': {
                display: 'none',
            },
            '&:hover': {
                bgcolor: colors.grayLighter,
            },
            '&.Mui-focused': {
                bgcolor: '#fff',
                border: `2px solid ${colors.teal}`,
            },
        },
        '& .MuiInputLabel-filled': {
            color: colors.gray,
            '&.Mui-focused': {
                color: colors.teal,
            },
        },
    };

    // Button styles
    const primaryButtonSx = {
        py: 1.75,
        borderRadius: 2.5,
        fontSize: '1rem',
        fontWeight: 600,
        textTransform: 'none',
        bgcolor: colors.teal,
        color: '#fff',
        boxShadow: `0 4px 14px 0 ${colors.teal}66`,
        transition: 'all 0.2s ease',
        '&:hover': {
            bgcolor: colors.tealDark,
            boxShadow: `0 6px 20px ${colors.teal}80`,
            transform: 'translateY(-1px)',
        },
        '&:active': {
            transform: 'translateY(0)',
        },
        '&.Mui-disabled': {
            bgcolor: colors.tealLighter,
            color: colors.teal,
            boxShadow: 'none',
        },
    };

    return (
        <Grid
            container
            sx={{
                minHeight: { xs: '100dvh', md: '100vh' }
            }}
        >
            {/* Left Side - Branding */}
            <Grid
                item
                xs={12}
                md={6}
                lg={7}
                sx={{
                    background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 6,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Animated Background Elements */}
                <Box sx={{
                    position: 'absolute',
                    top: '5%',
                    left: '5%',
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.teal}25 0%, transparent 70%)`,
                    filter: 'blur(60px)',
                    animation: `${float} 8s ease-in-out infinite`,
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: '10%',
                    right: '0%',
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.tealLight}20 0%, transparent 70%)`,
                    filter: 'blur(50px)',
                    animation: `${float} 10s ease-in-out infinite reverse`,
                }} />
                <Box sx={{
                    position: 'absolute',
                    top: '20%',
                    right: '15%',
                    width: 60,
                    height: 60,
                    border: `2px solid ${colors.teal}40`,
                    borderRadius: 3,
                    animation: `${spin} 20s linear infinite`,
                }} />

                {/* Main Content with Entrance Animation */}
                <Box sx={{
                    zIndex: 1,
                    maxWidth: 520,
                    px: 4,
                    animation: `${fadeInUp} 0.6s ease-out`,
                }}>
                    {/* Logo */}
                    <Box sx={{
                        mb: 4,
                        ml: -0.5,
                        display: 'flex',
                        justifyContent: 'flex-start'
                    }}>
                        <img
                            src="/assets/logo-white.png"
                            alt="CHQI Logo"
                            style={{
                                height: 80,
                                width: 'auto',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0px 8px 20px rgba(0,0,0,0.25))',
                            }}
                            onError={(e) => {
                                if (!e.target.dataset.fallback) {
                                    e.target.dataset.fallback = 'true';
                                    e.target.src = '/assets/logo.png';
                                    e.target.style.filter = 'brightness(0) invert(1) drop-shadow(0px 8px 20px rgba(0,0,0,0.25))';
                                } else {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = `
                                        <span style="
                                            font-weight: 900;
                                            color: #fff;
                                            font-size: 3rem;
                                            letter-spacing: -1px;
                                            text-shadow: 0 4px 20px rgba(0,0,0,0.3);
                                        ">CHQI</span>
                                    `;
                                }
                            }}
                        />
                    </Box>

                    {/* Value Proposition */}
                    <Typography
                        variant="h2"
                        sx={{
                            fontWeight: 800,
                            mb: 2,
                            letterSpacing: '-0.03em',
                            fontSize: { md: '2.5rem', lg: '3.25rem' },
                            color: '#fff',
                            lineHeight: 1.1,
                        }}
                    >
                        Accelerate Your
                        <Box component="span" sx={{ color: colors.teal, display: 'block' }}>
                            Research Impact
                        </Box>
                    </Typography>

                    <Typography
                        sx={{
                            fontWeight: 400,
                            mb: 5,
                            color: colors.grayLight,
                            lineHeight: 1.7,
                            fontSize: '1.1rem',
                        }}
                    >
                        Empowering research teams with intelligent project tracking,
                        budget analysis, and secure collaborative workspaces.
                    </Typography>

                    {/* Feature Cards */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {features.map((feature, index) => (
                            <Box
                                key={index}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2.5,
                                    p: 2.5,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    backdropFilter: 'blur(10px)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                        borderColor: `${colors.teal}50`,
                                    },
                                }}
                            >
                                <Box sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2.5,
                                    bgcolor: `${colors.teal}25`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: colors.teal,
                                }}>
                                    {feature.icon}
                                </Box>
                                <Box>
                                    <Typography sx={{ color: '#fff', fontWeight: 600, mb: 0.25 }}>
                                        {feature.title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: colors.gray }}>
                                        {feature.desc}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Desktop Footer - Dynamic Year + White Opacity */}
                <Box sx={{
                    position: 'absolute',
                    bottom: 32,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        © {new Date().getFullYear()} Centre for Healthcare Quality and Innovation. All rights reserved.
                    </Typography>
                </Box>
            </Grid>

            {/* Right Side - Login Form */}
            <Grid
                item
                xs={12}
                md={6}
                lg={5}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: { xs: 3, sm: 6 },
                    bgcolor: '#FAFBFC',
                    minHeight: { xs: '100dvh', md: '100vh' },
                    position: 'relative',
                }}
            >
                {/* Back to site link */}
                <Box sx={{
                    position: 'absolute',
                    top: { xs: 16, md: 24 },
                    left: { xs: 16, md: 28 },
                }}>
                    <Button
                        startIcon={<ArrowBackIcon sx={{ fontSize: '1rem !important' }} />}
                        onClick={() => navigate('/')}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            color: colors.gray,
                            gap: 0.5,
                            px: 1.5, py: 0.75,
                            borderRadius: 2,
                            '&:hover': {
                                bgcolor: colors.navyLighter,
                                color: colors.navy,
                            },
                        }}
                    >
                        Back to site
                    </Button>
                </Box>

                {/* Mobile Logo */}
                <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4, textAlign: 'center' }}>
                    <Box sx={{ mb: 2 }}>
                        <img
                            src="/assets/logo.png"
                            alt="CHQI Logo"
                            style={{
                                height: 60,
                                width: 'auto',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.1))',
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `
                                    <span style="
                                        font-weight: 900;
                                        color: ${colors.navy};
                                        font-size: 2rem;
                                        letter-spacing: -0.5px;
                                    ">CHQI</span>
                                `;
                            }}
                        />
                    </Box>
                    <Typography variant="body2" sx={{ color: colors.gray, fontWeight: 500 }}>
                        Dashboard
                    </Typography>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 4, sm: 5 },
                        width: '100%',
                        maxWidth: 420,
                        borderRadius: 4,
                        bgcolor: '#fff',
                        border: `1px solid ${colors.grayLighter}`,
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                    }}
                >
                    <Fade in={true} timeout={300}>
                        <Box>
                            {/* Header */}
                            <Box sx={{ mb: 4 }}>
                                {isResetMode && (
                                    <Button
                                        startIcon={<ArrowBackIcon />}
                                        onClick={() => {
                                            setIsResetMode(false);
                                            setError('');
                                            setSuccessMsg('');
                                        }}
                                        sx={{
                                            mb: 2,
                                            ml: -1,
                                            color: colors.gray,
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            '&:hover': {
                                                bgcolor: colors.navyLighter,
                                                color: colors.navy,
                                            },
                                        }}
                                    >
                                        Back to login
                                    </Button>
                                )}
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 700,
                                        color: colors.navy,
                                        mb: 1,
                                        fontSize: { xs: '1.75rem', sm: '2rem' },
                                    }}
                                >
                                    {isResetMode ? 'Reset Password' : 'Welcome back'}
                                </Typography>
                                <Typography sx={{ color: colors.gray, fontSize: '0.95rem' }}>
                                    {isResetMode
                                        ? 'Enter your email and we\'ll send you a reset link.'
                                        : 'Sign in to continue to your dashboard'}
                                </Typography>
                            </Box>

                            {/* Alerts */}
                            {error && (
                                <Alert
                                    severity="error"
                                    sx={{
                                        mb: 3,
                                        borderRadius: 2.5,
                                        border: '1px solid #FECACA',
                                        bgcolor: '#FEF2F2',
                                    }}
                                >
                                    {error}
                                </Alert>
                            )}

                            {successMsg && (
                                <Alert
                                    severity="success"
                                    icon={<CheckIcon />}
                                    sx={{
                                        mb: 3,
                                        borderRadius: 2.5,
                                        border: `1px solid ${colors.tealLight}`,
                                        bgcolor: colors.tealLighter,
                                        '& .MuiAlert-icon': {
                                            color: colors.teal,
                                        },
                                    }}
                                >
                                    {successMsg}
                                </Alert>
                            )}

                            {/* Login Form */}
                            {!isResetMode ? (
                                <form onSubmit={handleLogin}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                        <TextField
                                            fullWidth
                                            label="Username"
                                            variant="filled"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            InputProps={{
                                                disableUnderline: true,
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PersonIcon sx={{ color: colors.navyLight }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={textFieldSx}
                                        />

                                        <TextField
                                            fullWidth
                                            label="Password"
                                            variant="filled"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            InputProps={{
                                                disableUnderline: true,
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LockIcon sx={{ color: colors.navyLight }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            edge="end"
                                                            sx={{ color: colors.navyLight }}
                                                        >
                                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={textFieldSx}
                                        />

                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                size="small"
                                                onClick={() => {
                                                    setIsResetMode(true);
                                                    setError('');
                                                    setSuccessMsg('');
                                                }}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    color: colors.teal,
                                                    '&:hover': {
                                                        bgcolor: colors.tealLighter,
                                                    },
                                                }}
                                            >
                                                Forgot password?
                                            </Button>
                                        </Box>

                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            disabled={isLoading || !username || !password}
                                            sx={primaryButtonSx}
                                        >
                                            {isLoading ? (
                                                <CircularProgress size={24} sx={{ color: colors.teal }} />
                                            ) : (
                                                'Sign In'
                                            )}
                                        </Button>
                                    </Box>
                                </form>
                            ) : (
                                <form onSubmit={handlePasswordReset}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                        <TextField
                                            fullWidth
                                            label="Email Address"
                                            variant="filled"
                                            type="email"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            InputProps={{
                                                disableUnderline: true,
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <EmailIcon sx={{ color: colors.navyLight }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={textFieldSx}
                                        />

                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            disabled={isLoading || !resetEmail}
                                            sx={primaryButtonSx}
                                        >
                                            {isLoading ? (
                                                <CircularProgress size={24} sx={{ color: colors.teal }} />
                                            ) : (
                                                'Send Reset Link'
                                            )}
                                        </Button>
                                    </Box>
                                </form>
                            )}

                            {/* Divider */}
                            <Divider sx={{ my: 4 }}>
                                <Typography variant="caption" sx={{ color: colors.gray, px: 2 }}>
                                    Secure Login
                                </Typography>
                            </Divider>

                            {/* Support Link */}
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" sx={{ color: colors.gray }}>
                                    Protected by enterprise-grade encryption.
                                    <br />
                                    Need help?{' '}
                                    <Box
                                        component="a"
                                        href="mailto:support@chqi.org"
                                        sx={{
                                            color: colors.teal,
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                            '&:hover': { textDecoration: 'underline' },
                                        }}
                                    >
                                        Contact Support
                                    </Box>
                                </Typography>
                            </Box>
                        </Box>
                    </Fade>
                </Paper>

                {/* Mobile Footer - Dynamic Year + Auto Margin */}
                <Typography
                    variant="caption"
                    sx={{
                        mt: 'auto',
                        pt: 4,
                        color: colors.gray,
                        display: { xs: 'block', md: 'none' },
                        textAlign: 'center',
                        width: '100%',
                    }}
                >
                    © {new Date().getFullYear()} Centre for Healthcare Quality and Innovation
                </Typography>
            </Grid>
        </Grid>
    );
};

export default LandingPage;
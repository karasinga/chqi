import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    Fade
} from '@mui/material';
import {
    LockOutlined as LockIcon,
    Visibility,
    VisibilityOff,
    CheckCircleOutline as CheckIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { keyframes } from '@mui/system';
import api from '../utils/api';

// Brand Colors
const colors = {
    teal: '#1BACA7',
    tealLight: '#4DC4C0',
    tealLighter: '#E6F7F6',
    tealDark: '#148F8A',
    navy: '#182F5B',
    navyLight: '#2A4A7F',
    navyLighter: '#E8EBF0',
    gray: '#B1AFB2',
    grayLight: '#D4D3D5',
    grayLighter: '#F5F5F5',
};

// Animations
const float = keyframes`
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-20px) scale(1.03); }
`;

const PasswordResetConfirmPage = () => {
    const params = useParams();
    const uidb64 = params.uidb64;
    const token = params['*']?.replace(/\/+$/, '').replace(/=+$/, '');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/users/password_reset_confirm/', {
                uid: uidb64,
                token: token,
                new_password1: password,
                new_password2: confirmPassword
            });

            setSuccessMsg('Your password has been successfully reset!');
            setPassword('');
            setConfirmPassword('');

            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            console.error('Reset error:', err);
            setError('Failed to reset password. The link may be invalid or expired.');
        } finally {
            setIsLoading(false);
        }
    };

    // TextField styles (matching Landing Page)
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
        <Box
            sx={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#FAFBFC',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Decorative Background Elements */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-5%',
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.teal}15 0%, transparent 70%)`,
                    filter: 'blur(60px)',
                    animation: `${float} 8s ease-in-out infinite`,
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: '-15%',
                    left: '-10%',
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.navy}10 0%, transparent 70%)`,
                    filter: 'blur(60px)',
                    animation: `${float} 10s ease-in-out infinite reverse`,
                }}
            />

            <Fade in={true} timeout={500}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 4, sm: 5 },
                        width: '100%',
                        maxWidth: 440,
                        borderRadius: 4,
                        bgcolor: '#fff',
                        border: `1px solid ${colors.grayLighter}`,
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {/* Back to Login Link */}
                    <Button
                        component={RouterLink}
                        to="/login"
                        startIcon={<ArrowBackIcon />}
                        sx={{
                            mb: 3,
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

                    {/* Logo */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Box sx={{ mb: 3 }}>
                            <img
                                src="/assets/logo.png"
                                alt="CHQI Logo"
                                style={{
                                    height: 56,
                                    width: 'auto',
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.08))',
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

                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                color: colors.navy,
                                mb: 1,
                                fontSize: { xs: '1.75rem', sm: '2rem' },
                            }}
                        >
                            {successMsg ? 'Password Reset!' : 'Create New Password'}
                        </Typography>
                        <Typography sx={{ color: colors.gray, fontSize: '0.95rem' }}>
                            {successMsg
                                ? 'Redirecting you to login...'
                                : 'Your new password must be at least 8 characters.'}
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

                    {/* Form */}
                    {!successMsg && (
                        <form onSubmit={handleSubmit}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <TextField
                                    fullWidth
                                    label="New Password"
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

                                <TextField
                                    fullWidth
                                    label="Confirm New Password"
                                    variant="filled"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    InputProps={{
                                        disableUnderline: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockIcon sx={{ color: colors.navyLight }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={textFieldSx}
                                />

                                {/* Password Strength Indicator */}
                                {password && (
                                    <Box sx={{ px: 1 }}>
                                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                                            {[1, 2, 3, 4].map((level) => (
                                                <Box
                                                    key={level}
                                                    sx={{
                                                        flex: 1,
                                                        height: 4,
                                                        borderRadius: 2,
                                                        bgcolor:
                                                            password.length >= level * 3
                                                                ? password.length >= 12
                                                                    ? colors.teal
                                                                    : password.length >= 8
                                                                        ? colors.tealLight
                                                                        : '#f59e0b'
                                                                : colors.grayLight,
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                        <Typography variant="caption" sx={{ color: colors.gray }}>
                                            {password.length < 8
                                                ? `${8 - password.length} more characters needed`
                                                : password.length >= 12
                                                    ? 'Strong password ✓'
                                                    : 'Good password'}
                                        </Typography>
                                    </Box>
                                )}

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={isLoading || !password || !confirmPassword}
                                    sx={{ ...primaryButtonSx, mt: 1 }}
                                >
                                    {isLoading ? (
                                        <CircularProgress size={24} sx={{ color: colors.teal }} />
                                    ) : (
                                        'Reset Password'
                                    )}
                                </Button>
                            </Box>
                        </form>
                    )}

                    {/* Footer */}
                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Typography variant="caption" sx={{ color: colors.gray }}>
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
                </Paper>
            </Fade>

            {/* Footer Copyright */}
            <Typography
                variant="caption"
                sx={{
                    position: 'absolute',
                    bottom: 24,
                    color: colors.gray,
                    textAlign: 'center',
                }}
            >
                © {new Date().getFullYear()} Centre for Healthcare Quality and Innovation
            </Typography>
        </Box>
    );
};

export default PasswordResetConfirmPage;
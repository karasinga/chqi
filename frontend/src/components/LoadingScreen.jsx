import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';
import { keyframes } from '@mui/system';

const colors = {
    teal: '#1BACA7',
    navy: '#182F5B',
    grayLighter: '#F5F5F5',
};

const pulse = keyframes`
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
`;

const LoadingScreen = () => {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: colors.grayLighter,
                gap: 3,
            }}
        >
            <Box sx={{
                height: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Fade in timeout={500}>
                    <Box sx={{ animation: `${pulse} 2s ease-in-out infinite` }}>
                        <img
                            src="/assets/logo.png"
                            alt="CHQI Logo"
                            style={{
                                height: 80,
                                width: 'auto',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `
                                    <span style="
                                        font-weight: 900;
                                        color: ${colors.navy};
                                        font-size: 3rem;
                                        letter-spacing: -1px;
                                    ">CHQI</span>
                                `;
                            }}
                        />
                    </Box>
                </Fade>
            </Box>

            <CircularProgress
                size={32}
                thickness={4}
                sx={{ color: colors.teal }}
            />

            <Typography
                variant="body2"
                sx={{
                    color: colors.navy,
                    fontWeight: 500,
                    opacity: 0.7,
                }}
            >
                Loading your dashboard...
            </Typography>
        </Box>
    );
};

export default LoadingScreen;

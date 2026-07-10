import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';
import ChqiLogoSpinner from './ChqiLogoSpinner';

const colors = {
    teal: '#1BACA7',
    navy: '#182F5B',
    grayLighter: '#F5F5F5',
};

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
                    <ChqiLogoSpinner size={80} />
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

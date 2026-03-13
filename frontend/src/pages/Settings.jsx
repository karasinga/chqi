import React from 'react';
import { Box, Typography } from '@mui/material';
import { colors } from '../theme/colors';

const Settings = () => {
    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" sx={{ color: colors.navy, fontWeight: 700, mb: 2 }}>
                Settings
            </Typography>
            <Typography sx={{ color: colors.gray }}>
                Settings interface is currently under construction.
            </Typography>
        </Box>
    );
};

export default Settings;

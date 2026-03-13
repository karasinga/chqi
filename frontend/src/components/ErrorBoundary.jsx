import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Refresh as RefreshIcon, ErrorOutline as ErrorIcon } from '@mui/icons-material';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        logger.error(
            error.message || 'An unexpected error occurred',
            error,
            errorInfo.componentStack
        );
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '100vh',
                        bgcolor: '#f5f5f5',
                        p: 3
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            maxWidth: 500,
                            textAlign: 'center',
                            borderRadius: 4
                        }}
                    >
                        <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
                        <Typography variant="h5" gutterBottom fontWeight="bold">
                            Something went wrong
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                            We've logged this issue and our team has been notified.
                            Please try refreshing the page.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<RefreshIcon />}
                            onClick={this.handleReset}
                            sx={{ borderRadius: 2, px: 4 }}
                        >
                            Refresh Page
                        </Button>
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

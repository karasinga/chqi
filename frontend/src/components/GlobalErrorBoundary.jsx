import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to the backend
        this.logErrorToBackend(error, errorInfo);
    }

    logErrorToBackend = async (error, errorInfo) => {
        try {
            const errorData = {
                message: error.message || 'Unknown Error',
                stack: error.stack,
                componentStack: errorInfo ? errorInfo.componentStack : '',
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };

            // Get CSRF token
            const getCookie = (name) => {
                let cookieValue = null;
                if (document.cookie && document.cookie !== '') {
                    const cookies = document.cookie.split(';');
                    for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i].trim();
                        if (cookie.substring(0, name.length + 1) === (name + '=')) {
                            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                            break;
                        }
                    }
                }
                return cookieValue;
            };

            const csrftoken = getCookie('csrftoken');
            const headers = { 'Content-Type': 'application/json' };
            if (csrftoken) {
                headers['X-CSRFToken'] = csrftoken;
            }

            await fetch('http://localhost:8000/api/pm/logs/', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(errorData),
                credentials: 'include'
            });
        } catch (loggingError) {
            console.error('Failed to log error to backend:', loggingError);
        }
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f5f5f5',
                    p: 3
                }}>
                    <Paper sx={{ p: 5, maxWidth: 500, textAlign: 'center', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                        <Typography variant="h4" sx={{ mb: 2, fontWeight: 900, color: '#d32f2f' }}>
                            Something went wrong
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                            We've logged this error and notified the engineering team. Please try refreshing the page.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<RefreshIcon />}
                            onClick={this.handleReset}
                            sx={{ fontWeight: 700, borderRadius: 2, px: 4, py: 1.5 }}
                        >
                            Reload Application
                        </Button>
                        {process.env.NODE_ENV === 'development' && (
                            <Box sx={{ mt: 4, textAlign: 'left', bgcolor: '#ffebee', p: 2, borderRadius: 2, overflow: 'auto', maxHeight: 200 }}>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#c62828' }}>
                                    {this.state.error && this.state.error.toString()}
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;

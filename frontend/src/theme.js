import { createTheme } from '@mui/material/styles';

// Colors derived from the CHQI logo
const theme = createTheme({
    palette: {
        primary: {
            main: '#1a237e', // Navy Blue
        },
        secondary: {
            main: '#00bcd4', // Teal/Cyan
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600,
            color: '#1a237e',
        },
        h5: {
            fontWeight: 500,
        },
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff',
                    color: '#1a237e',
                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 600,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
                },
            },
        },
    },
});

export default theme;

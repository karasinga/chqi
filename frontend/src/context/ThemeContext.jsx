import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { colors as defaultColors } from '../theme/colors';

const ThemeContext = createContext({
    toggleColorMode: () => { },
    mode: 'light',
    colors: defaultColors,
});

export const useAppTheme = () => useContext(ThemeContext);

export const AppThemeProvider = ({ children }) => {
    const [mode, setMode] = useState(() => {
        const saved = localStorage.getItem('themeMode');
        return saved || 'light';
    });

    useEffect(() => {
        localStorage.setItem('themeMode', mode);
        document.body.style.backgroundColor = mode === 'dark' ? '#121212' : '#f5f5f5';
        document.body.style.color = mode === 'dark' ? '#fff' : '#000';
    }, [mode]);

    const toggleColorMode = () => {
        setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const isDark = mode === 'dark';

    const colors = useMemo(() => {
        if (!isDark) return defaultColors;
        return {
            ...defaultColors,
            tealLighter: '#103e3d',
            tealDark: '#6be8e4',
            navy: '#E8EBF0', // Light text
            navyLight: '#4A6A9F',
            navyLighter: '#2c333f', // dark borders
            gray: '#B1AFB2',
            grayLight: '#444',
            grayLighter: '#121212', // Background
        };
    }, [isDark]);

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: {
                        main: colors.navy,
                    },
                    secondary: {
                        main: colors.teal,
                    },
                    background: {
                        default: colors.grayLighter,
                        paper: isDark ? '#1e1e1e' : '#ffffff',
                    },
                    text: {
                        primary: colors.navy,
                        secondary: colors.gray,
                    }
                },
                typography: {
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                },
                components: {
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                color: colors.navy,
                                backgroundImage: 'none',
                            },
                        },
                    },
                },
            }),
        [mode, colors, isDark]
    );

    return (
        <ThemeContext.Provider value={{ toggleColorMode, mode, colors }}>
            <MuiThemeProvider theme={theme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

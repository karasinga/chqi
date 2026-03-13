import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.jsx'
import theme from './theme'
import GlobalErrorBoundary from './components/GlobalErrorBoundary'
import './index.css'

// CSRF token helper
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

// Global Error Listener for non-React errors (async, event handlers)
window.onerror = (message, source, lineno, colno, error) => {
    const csrftoken = getCookie('csrftoken');
    const headers = { 'Content-Type': 'application/json' };
    if (csrftoken) {
        headers['X-CSRFToken'] = csrftoken;
    }

    fetch('http://localhost:8000/api/pm/logs/', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            message: message,
            stack: error ? error.stack : `${source}:${lineno}:${colno}`,
            type: 'UNCAUGHT_RUNTIME_ERROR',
            url: window.location.href,
            timestamp: new Date().toISOString()
        }),
        credentials: 'include'
    }).catch(e => console.error("Failed to log global error:", e));
};

window.onunhandledrejection = (event) => {
    const csrftoken = getCookie('csrftoken');
    const headers = { 'Content-Type': 'application/json' };
    if (csrftoken) {
        headers['X-CSRFToken'] = csrftoken;
    }

    fetch('http://localhost:8000/api/pm/logs/', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            message: `Unhandled Promise Rejection: ${event.reason}`,
            stack: event.reason ? event.reason.stack : '',
            type: 'UNHANDLED_PROMISE',
            url: window.location.href,
            timestamp: new Date().toISOString()
        }),
        credentials: 'include'
    }).catch(e => console.error("Failed to log promise error:", e));
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GlobalErrorBoundary>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App />
            </ThemeProvider>
        </GlobalErrorBoundary>
    </React.StrictMode>,
)

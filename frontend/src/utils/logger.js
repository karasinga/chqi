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

const LOG_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/pm/logs/';

const logger = {
    log: (level, message, stack = '', componentStack = '') => {
        // Always log to console for local debugging
        if (level === 'error') {
            console.error(message, stack);
        } else if (level === 'warning') {
            console.warn(message);
        } else {
            console.log(message);
        }

        // Get CSRF token
        const csrftoken = getCookie('csrftoken');
        const headers = { 'Content-Type': 'application/json' };
        if (csrftoken) {
            headers['X-CSRFToken'] = csrftoken;
        }

        // Send to backend
        fetch(LOG_API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                level,
                message,
                stack,
                componentStack
            }),
            credentials: 'include'
        }).catch(err => {
            console.error('Failed to send log to backend:', err);
        });
    },

    error: (message, error, componentStack) => {
        logger.log('error', message, error?.stack || error, componentStack);
    },

    info: (message) => {
        logger.log('info', message);
    },

    warn: (message) => {
        logger.log('warning', message);
    }
};

// Global error listener
window.onerror = (message, source, lineno, colno, error) => {
    logger.error(`Unhandled Error: ${message}`, error);
    return false; // Let default handler run
};

// Global unhandled promise rejection listener
window.onunhandledrejection = (event) => {
    logger.error(`Unhandled Promise Rejection: ${event.reason}`, event.reason);
};

export default logger;

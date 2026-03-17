const API_BASE_URL = 'http://localhost:8000/api';
let manualCsrfToken = null;

const handleResponse = async (response) => {
    if (!response.ok) {
        let errorData = {};
        try {
            errorData = await response.json();
        } catch (e) {
            // No JSON body
        }

        if (response.status === 403) {
            console.error('[API 403] Forbidden. Check CSRF token or session.', {
                url: response.url,
                hasCsrfToken: !!getCookie('csrftoken'),
                error: errorData.message || response.statusText
            });
        }

        // Attach response data to the error so mutations can access field errors
        const error = new Error(errorData.message || errorData.detail || `API error: ${response.status}`);
        error.response = {
            data: errorData,
            status: response.status,
            statusText: response.statusText
        };
        throw error;
    }
    if (response.status === 204) return null;
    return response.json();
};

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

const getHeaders = (contentType = 'application/json') => {
    const headers = { 'Content-Type': contentType };
    const csrftoken = manualCsrfToken || getCookie('csrftoken');
    if (csrftoken) {
        headers['X-CSRFToken'] = csrftoken;
    }
    return headers;
};

const getMultipartHeaders = () => {
    // Do NOT set Content-Type — browser must set it with the multipart boundary
    const headers = {};
    const csrftoken = manualCsrfToken || getCookie('csrftoken');
    if (csrftoken) headers['X-CSRFToken'] = csrftoken;
    return headers;
};

const api = {
    setToken: (token) => {
        manualCsrfToken = token;
    },
    get: (endpoint) => fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include'
    }).then(handleResponse),
    post: (endpoint, data) => fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
        credentials: 'include'
    }).then(handleResponse),
    // Multipart POST (for FormData / file upload)
    postMultipart: (endpoint, formData) => fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getMultipartHeaders(),
        body: formData,
        credentials: 'include'
    }).then(handleResponse),
    put: (endpoint, data) => fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
        credentials: 'include'
    }).then(handleResponse),
    patch: (endpoint, data) => fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
        credentials: 'include'
    }).then(handleResponse),
    // Multipart PATCH (for FormData / file upload)
    patchMultipart: (endpoint, formData) => fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: getMultipartHeaders(),
        body: formData,
        credentials: 'include'
    }).then(handleResponse),
    delete: (endpoint) => fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include'
    }).then(handleResponse),
};

export default api;

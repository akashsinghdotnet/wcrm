import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('wcrm_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses — redirect to appropriate login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('wcrm_token');
            localStorage.removeItem('wcrm_user');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/army' && !window.location.pathname.startsWith('/checkout')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL
    || (import.meta.env.PROD ? 'https://web-production-1a8896.up.railway.app/api' : '/api');
const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(config => {
    const token = localStorage.getItem('rc_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    r => r,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('rc_token');
            localStorage.removeItem('rc_user');
            window.dispatchEvent(new Event('auth:logout'));
            window.location.href = '/';
        }
        return Promise.reject(err);
    }
);

export default api;

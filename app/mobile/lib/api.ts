
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Replace with your production URL or your local machine's IP for dev
// const API_URL = 'https://rcm-backend.onrender.com';
const API_URL = 'https://bug-free-tribble-x54g7r7qv9q92xjv-3001.app.github.dev'; // Codespaces Dev URL

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Handle 401/Refresh Token logic here later
        return Promise.reject(error);
    }
);

// Resource Fetchers
export const fetchRecipes = async (params: any = {}) => api.get('/api/recipes', { params });
export const fetchCombos = async (params: any = {}) => api.get('/api/combos', { params });
export const fetchMenu = async (params: any = {}) => api.get('/api/menu', { params });
export const fetchInvoices = async (params: any = {}) => api.get('/api/invoices', { params });
export const uploadInvoice = async (formData: FormData) => api.post('/api/invoices/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
});

export default api;

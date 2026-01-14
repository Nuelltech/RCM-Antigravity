
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Cross-platform storage
const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
        return localStorage.getItem('accessToken');
    }
    return await SecureStore.getItemAsync('accessToken');
};

// Get API URL from environment or use default
// For Codespaces, set EXPO_PUBLIC_API_URL in .env
const API_URL = Constants.expoConfig?.extra?.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:3001';

console.log('[API] Using API URL:', API_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const token = await getToken();
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
export const fetchRecipeById = async (id: number) => api.get(`/api/recipes/${id}`);
export const fetchComboById = async (id: number) => api.get(`/api/combos/${id}`);
export const fetchMenuById = async (id: number) => api.get(`/api/menu/${id}`);
export const fetchMenuStats = async () => api.get('/api/menu/stats');
export const fetchProductById = async (id: number) => api.get(`/api/products/${id}`);
export const uploadInvoice = async (formData: FormData) => api.post('/api/invoices/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
});

export default api;

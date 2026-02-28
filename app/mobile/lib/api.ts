
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


// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const api = axios.create({
    baseURL: API_URL,
    timeout: 120000, // 2 minutes timeout for Render Cold Starts
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
        const originalRequest = error.config;

        // RETRY LOGIC for Network Errors or 503 (Service Unavailable/Starting)
        // We only retry if we haven't already retried 3 times
        if (error.message === 'Network Error' || (error.response && error.response.status === 503)) {
            originalRequest._retryCount = originalRequest._retryCount || 0;

            if (originalRequest._retryCount < 3) {
                originalRequest._retryCount += 1;
                console.log(`[API] Retrying request... (${originalRequest._retryCount}/3)`);

                // Exponential backoff: 1s, 2s, 4s
                await delay(1000 * Math.pow(2, originalRequest._retryCount - 1));
                return api(originalRequest);
            }
        }

        // GLOBAL 401 HANDLING
        if (error.response?.status === 401) {
            console.log('[API] 401 Unauthorized - Logging out...');
            // Import store dynamically to avoid circular dependencies if possible, 
            // or use a custom event. For Zustand, we can access existing store.
            // checking if we can import useAuth here might cause cycles if auth imports api.
            // A safer way is to emit an event or rely on auth checking validity on startup.
            // For now, let's reject and let components handle, OR import the store directly if safe.

            // Dynamic import attempt (or robust fallback)
            try {
                const { useAuth } = require('./auth');
                useAuth.getState().logout();
            } catch (e) {
                console.error('[API] Failed to trigger auto-logout', e);
            }
        }

        return Promise.reject(error);
    }
);

// Wakeup function specifically for Cold Starts
export const wakeup = async () => {
    console.log('[API] Waking up backend...');
    try {
        // Shorter timeout for wakeup check, but with retries handled above or manually
        await api.get('/health', { timeout: 10000 });
        console.log('[API] Backend is awake!');
        return true;
    } catch (e) {
        console.log('[API] Wakeup failed check:', e);
        return false;
    }
};

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

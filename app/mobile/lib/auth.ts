
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

interface AuthState {
    user: any | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, userData: any) => Promise<void>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start in loading state to check storage

    login: async (token, userData) => {
        console.log('[AuthStore] Login called with token:', typeof token, token?.substring(0, 10) + '...');
        if (typeof token !== 'string') {
            console.error('[AuthStore] Token is not a string:', token);
            token = String(token);
        }
        await SecureStore.setItemAsync('accessToken', token);
        // In a real app, you might also store refresh tokens
        set({ user: userData, isAuthenticated: true });
        router.replace('/(tabs)/dashboard');
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('accessToken');
        set({ user: null, isAuthenticated: false });
        router.replace('/(auth)/login');
    },

    checkSession: async () => {
        try {
            set({ isLoading: true });
            const token = await SecureStore.getItemAsync('accessToken');
            if (token) {
                // Validate token with backend or just assume valid for offline-first
                // For now, assume valid if exists
                set({ isAuthenticated: true });
                // Optionally fetch user profile again
            } else {
                set({ isAuthenticated: false });
            }
        } catch (e) {
            console.error('Session check failed', e);
            set({ isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },
}));

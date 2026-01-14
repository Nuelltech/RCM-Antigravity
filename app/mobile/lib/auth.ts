
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Platform } from 'react-native';

// Cross-platform storage wrapper
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return await SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    },
    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    }
};

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
    isLoading: true,

    login: async (token, userData) => {
        await storage.setItem('accessToken', token);
        set({ user: userData, isAuthenticated: true });
        // Navigation should be handled manually in the login screen
    },

    logout: async () => {
        await storage.removeItem('accessToken');
        set({ user: null, isAuthenticated: false });
        // Navigation should be handled manually
    },

    checkSession: async () => {
        try {
            set({ isLoading: true });
            const token = await storage.getItem('accessToken');

            if (token) {
                // Decode JWT to get user data and check expiration
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));

                    // Check if token is expired
                    const now = Math.floor(Date.now() / 1000);
                    if (payload.exp && payload.exp < now) {
                        console.log('[Auth] Token expired, clearing session');
                        await storage.removeItem('accessToken');
                        set({ user: null, isAuthenticated: false });
                        return;
                    }

                    const userData = {
                        id: payload.userId || payload.sub,
                        name: payload.name,
                        email: payload.email,
                        tenantName: payload.tenantName || payload.tenant_name,
                    };

                    console.log('[Auth] Session valid, user:', userData);
                    set({ user: userData, isAuthenticated: true });
                } catch (decodeError) {
                    console.error('[Auth] Failed to decode token, clearing session', decodeError);
                    await storage.removeItem('accessToken');
                    set({ user: null, isAuthenticated: false });
                }
            } else {
                console.log('[Auth] No token found');
                set({ user: null, isAuthenticated: false });
            }
        } catch (e) {
            console.error('[Auth] Session check failed', e);
            set({ user: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },
}));

import fetchClient, { fetchWithAuth } from '@/lib/api';

export interface InternalLoginData {
    email: string;
    password: string;
}

import { UserRole } from '@/lib/roles';

export interface InternalUser {
    id: number;
    uuid: string;
    email: string;
    name: string;
    role: UserRole;
    permissions?: string[];
    active: boolean;
    email_verified: boolean;
    last_login_at: string | null;
    createdAt: string;
}

const INTERNAL_TOKEN_KEY = 'internal_token';
const INTERNAL_USER_KEY = 'internal_user';

export const internalAuthService = {
    async login(data: InternalLoginData) {
        const response = await fetchClient('/api/internal/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        if (response.token) {
            localStorage.setItem(INTERNAL_TOKEN_KEY, response.token);
            if (response.user) {
                localStorage.setItem(INTERNAL_USER_KEY, JSON.stringify(response.user));
            }
        }

        return response;
    },

    async getMe(): Promise<InternalUser> {
        // Use fetchWithAuth which handles the token automatically
        const response = await fetchWithAuth('/api/internal/auth/me', {
            method: 'GET',
        });

        if (response.user) {
            localStorage.setItem(INTERNAL_USER_KEY, JSON.stringify(response.user));
            return response.user;
        }

        throw new Error('Failed to get user');
    },

    logout() {
        localStorage.removeItem(INTERNAL_TOKEN_KEY);
        localStorage.removeItem(INTERNAL_USER_KEY);
        window.location.href = '/login';
    },

    getToken(): string | null {
        return localStorage.getItem(INTERNAL_TOKEN_KEY);
    },

    getStoredUser(): InternalUser | null {
        const user = localStorage.getItem(INTERNAL_USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated(): boolean {
        return !!this.getToken();
    },
};

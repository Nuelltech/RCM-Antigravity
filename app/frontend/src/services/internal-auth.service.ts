import { fetchClient } from '@/lib/api';

export interface InternalLoginData {
    email: string;
    password: string;
}

export interface InternalUser {
    id: number;
    uuid: string;
    email: string;
    name: string;
    role: string;
    active: boolean;
    email_verified: boolean;
    last_login_at: string | null;
    createdAt: string;
}

const INTERNAL_TOKEN_KEY = 'internal_token';
const INTERNAL_USER_KEY = 'internal_user';

export const internalAuthService = {
    async login(data: InternalLoginData) {
        const response = await fetchClient('/internal/auth/login', {
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
        const token = this.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetchClient('/internal/auth/me', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
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
        window.location.href = '/internal/login';
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

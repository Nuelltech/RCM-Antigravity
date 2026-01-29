
import { fetchWithAuth } from '@/lib/api';

export interface InternalUser {
    id: number;
    uuid: string;
    email: string;
    name: string;
    role: string;
    internalRole?: {
        id: number;
        name: string;
        description: string;
        permissions: {
            permission: {
                slug: string;
                description: string;
            }
        }[];
    };
    permissions?: string[]; // Simplified list of slugs
    active: boolean;
    last_login_at?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UserFilters {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    active?: string;
}

export interface CreateUserInput {
    email: string;
    name: string;
    role: string;
    password: string;
    active?: boolean;
}

export interface UpdateUserInput {
    name?: string;
    role?: string;
    active?: boolean;
    email?: string;
}

export const internalUsersService = {
    async getUsers(filters: UserFilters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, String(value));
            }
        });
        const response = await fetchWithAuth(`/api/internal/users?${params.toString()}`);
        return response; // { data: User[], meta: ... }
    },

    async getUserById(id: number) {
        return fetchWithAuth(`/api/internal/users/${id}`);
    },

    async createUser(data: CreateUserInput) {
        return fetchWithAuth(`/api/internal/users`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async updateUser(id: number, data: UpdateUserInput) {
        return fetchWithAuth(`/api/internal/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async deleteUser(id: number) {
        return fetchWithAuth(`/api/internal/users/${id}`, {
            method: 'DELETE',
        });
    },

    async resetPassword(id: number, password: string) {
        return fetchWithAuth(`/api/internal/users/${id}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    }
};

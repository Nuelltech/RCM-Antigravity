
import { fetchWithAuth } from '@/lib/api';

export interface InternalPermission {
    id: number;
    slug: string;
    description: string;
    module: string;
}

export interface InternalRole {
    id: number;
    name: string;
    description: string;
    permissions: {
        permission: InternalPermission
    }[];
    _count?: {
        users: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface RoleFilters {
    page?: number;
    limit?: number;
    search?: string;
}

export interface CreateRoleInput {
    name: string;
    description?: string;
    permissions?: number[]; // IDs
}

export interface UpdateRoleInput {
    description?: string;
    permissions?: number[]; // IDs
}

export const internalRolesService = {
    async getRoles(filters: RoleFilters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, String(value));
            }
        });
        const response = await fetchWithAuth(`/api/internal/roles?${params.toString()}`);
        return response; // { data: Role[], meta: ... }
    },

    async getRoleById(id: number) {
        return fetchWithAuth(`/api/internal/roles/${id}`);
    },

    async listPermissions() {
        return fetchWithAuth(`/api/internal/roles/permissions`);
    },

    async createRole(data: CreateRoleInput) {
        return fetchWithAuth(`/api/internal/roles`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async updateRole(id: number, data: UpdateRoleInput) {
        return fetchWithAuth(`/api/internal/roles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async deleteRole(id: number) {
        return fetchWithAuth(`/api/internal/roles/${id}`, {
            method: 'DELETE',
        });
    }
};

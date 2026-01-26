import { fetchWithAuth } from '../lib/api';

export interface TenantOverview {
    id: number;
    nome_restaurante: string;
    email_contacto: string | null;
    telefone: string | null;
    plan: string;
    status: string | null;
    ativo: boolean;
    created_at: string;
    last_access: string | null;
    payment_status: 'ok' | 'overdue' | 'trial';
}

export interface TenantHealth {
    products_count: number;
    recipes_count: number;
    users_count: number;
    invoices: {
        total: number;
        success: number;
        error: number;
        pending: number;
    };
    sales: {
        total: number;
        success: number;
        error: number;
        pending: number;
    };
    storage_used_mb: number;
    storage_limit_mb: number;
    last_activity: string | null;
}

export interface TenantError {
    id: bigint;
    timestamp: string;
    level: string;
    source: string;
    message: string;
    endpoint: string | null;
    metadata: any;
}

export const internalTenantsService = {
    // List all tenants
    getAllTenants: async () => {
        return fetchWithAuth(`/api/internal/tenants`);
    },

    // Overview & Health
    getTenantOverview: async (tenantId: string): Promise<{ success: boolean; data: TenantOverview }> => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/overview`);
    },

    getTenantHealth: async (tenantId: string): Promise<{ success: boolean; data: TenantHealth }> => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/health`);
    },

    getRecentErrors: async (tenantId: string): Promise<{ success: boolean; data: TenantError[] }> => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/recent-errors`);
    },

    // Invoices
    getInvoices: async (tenantId: string, filters: any) => {
        const params = new URLSearchParams(filters).toString();
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/invoices?${params}`);
    },

    getInvoiceDetails: async (tenantId: string, invoiceId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/invoices/${invoiceId}`);
    },

    reprocessInvoice: async (tenantId: string, invoiceId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/invoices/${invoiceId}/reprocess`, {
            method: 'POST',
        });
    },

    // Sales
    getSales: async (tenantId: string, filters: any) => {
        const params = new URLSearchParams(filters).toString();
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/sales?${params}`);
    },

    getSalesDetails: async (tenantId: string, salesId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/sales/${salesId}`);
    },

    reprocessSales: async (tenantId: string, salesId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/sales/${salesId}/reprocess`, {
            method: 'POST',
        });
    },

    // Products, Recipes, Users
    getProducts: async (tenantId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/products`);
    },

    getRecipes: async (tenantId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/recipes`);
    },

    getUsers: async (tenantId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/users`);
    },

    // Timeline
    getTimeline: async (tenantId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/timeline`);
    },

    // Actions
    clearCache: async (tenantId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/actions/clear-cache`, {
            method: 'POST',
        });
    },

    sendEmail: async (tenantId: string, data: { subject: string; message: string }) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/actions/send-email`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    addNote: async (tenantId: string, content: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/notes`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },

    suspend: async (tenantId: string, reason: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/suspend`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    activate: async (tenantId: string) => {
        return fetchWithAuth(`/api/internal/tenants/${tenantId}/activate`, {
            method: 'POST',
        });
    },
};

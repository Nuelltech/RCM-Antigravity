
import { fetchWithAuth } from '@/lib/api';

export interface Lead {
    id: number;
    name: string;
    email: string;
    business_type: string;
    status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'demo_scheduled' | 'won' | 'lost' | 'rejected';
    source_page?: string;
    assigned_to?: number;
    assignedUser?: {
        id: number;
        name: string;
        email: string;
    };
    demoRequests?: any[]; // Simplified for list view
    createdAt: string;
    updatedAt: string;
    last_contacted_at?: string;
    conversion_probability?: number;
}

export interface LeadFilters {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    assignedTo?: number;
    dateFrom?: string;
    dateTo?: string;
    [key: string]: any;
}

export interface LeadStats {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    won: number;
    lost: number;
    conversionRate: number;
}

export const internalLeadsService = {
    async getLeads(filters: LeadFilters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, String(value));
            }
        });
        return fetchWithAuth(`/api/internal/leads?${params.toString()}`);
    },

    async getLeadStats(dateFrom?: string, dateTo?: string) {
        const params = new URLSearchParams();
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);

        const response = await fetchWithAuth(`/api/internal/leads/stats?${params.toString()}`);
        return response.stats as LeadStats;
    },

    async getLeadById(id: number) {
        const response = await fetchWithAuth(`/api/internal/leads/${id}`);
        return response.lead as Lead;
    },

    async updateLeadStatus(id: number, status: string, notes?: string) {
        const response = await fetchWithAuth(`/api/internal/leads/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, notes }),
        });
        return response.lead;
    },

    async assignLead(id: number, userId: number) {
        const response = await fetchWithAuth(`/api/internal/leads/${id}/assign`, {
            method: 'PATCH',
            body: JSON.stringify({ userId }),
        });
        return response.lead;
    },
};

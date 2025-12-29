/**
 * Internal Leads Service
 * API client for internal team lead management
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';

export interface Lead {
    id: number;
    uuid: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message?: string;
    business_type: string;
    status: LeadStatus;
    source_page: string;
    source?: string;
    assigned_to?: number;
    assignedUser?: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    demoRequests?: any[];
    created_at: Date;
    createdAt: string;
    updatedAt: string;
    last_contacted_at: Date | null | undefined;
    qualified_at: Date | null | undefined;
    proposal_sent_at: Date | null | undefined;
    won_at: Date | null | undefined;
    lost_at: Date | null | undefined;
    lost_reason?: string;
    internal_notes?: string;
    status_history?: any[];
}

export interface LeadFilters {
    status?: LeadStatus;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    assignedTo?: number;
    page?: number;
    pageSize?: number;
}

export interface LeadsResponse {
    success: boolean;
    leads: Lead[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
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

export const leadsInternalService = {
    async getLeads(filters: LeadFilters = {}): Promise<LeadsResponse> {
        const token = localStorage.getItem('internal_token');

        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, String(value));
            }
        });

        const response = await fetch(`${API_URL}/internal/leads?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leads');
        }

        return response.json();
    },

    async getLeadById(id: number): Promise<{ success: boolean; lead: Lead }> {
        const token = localStorage.getItem('internal_token');

        const response = await fetch(`${API_URL}/internal/leads/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch lead details');
        }

        return response.json();
    },

    async updateStatus(id: number, status: LeadStatus, notes?: string): Promise<{ success: boolean; lead: Lead }> {
        const token = localStorage.getItem('internal_token');

        const response = await fetch(`${API_URL}/internal/leads/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status, notes }),
        });

        if (!response.ok) {
            throw new Error('Failed to update lead status');
        }

        return response.json();
    },

    async assignLead(id: number, userId: number): Promise<{ success: boolean; lead: Lead }> {
        const token = localStorage.getItem('internal_token');

        const response = await fetch(`${API_URL}/internal/leads/${id}/assign`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
            throw new Error('Failed to assign lead');
        }

        return response.json();
    },

    async getStats(dateFrom?: string, dateTo?: string): Promise<{ success: boolean; stats: LeadStats }> {
        const token = localStorage.getItem('internal_token');

        const queryParams = new URLSearchParams();
        if (dateFrom) queryParams.append('dateFrom', dateFrom);
        if (dateTo) queryParams.append('dateTo', dateTo);

        const response = await fetch(`${API_URL}/internal/leads/stats?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch lead statistics');
        }

        return response.json();
    },
};

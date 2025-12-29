import { fetchClient } from "@/lib/api";

export interface CreateLeadData {
    name: string;
    email: string;
    business_type: string;
    source_page?: string;
    source_cta?: string;
}

export interface CreateDemoRequestData {
    name: string;
    email: string;
    restaurant: string;
    locations: string;
    challenge: string;
    lead_id?: number;
}

export const leadsService = {
    createLead: async (data: CreateLeadData) => {
        return fetchClient('/public/leads', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    createDemoRequest: async (data: CreateDemoRequestData) => {
        return fetchClient('/public/demo-requests', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    trackVideoWatched: async (leadId: number) => {
        return fetchClient(`/public/leads/${leadId}/video-watched`, {
            method: 'POST',
        });
    }
};

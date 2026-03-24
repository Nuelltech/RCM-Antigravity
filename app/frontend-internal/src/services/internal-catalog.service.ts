import { fetchWithAuth } from '../lib/api';

export interface GlobalProduct {
    id: number;
    uuid: string;
    nome: string;
    familia_codigo: string | null;
    subfamilia_codigo: string | null;
    unidade_medida: string;
    preco_mercado: number;
    numero_contribuicoes: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    origem: string;
    ultima_atualizacao: string;
    createdAt: string;
}

export const internalCatalogService = {
    // Obter lista de produtos do catálogo global
    getCatalog: async (filters: { status?: string, page?: number, limit?: number }) => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());

        return fetchWithAuth(`/api/internal/catalog?${params.toString()}`);
    },

    // Aprovar / Rejeitar produto
    updateStatus: async (id: number, status: 'APPROVED' | 'REJECTED') => {
        return fetchWithAuth(`/api/internal/catalog/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    // Disparar o Cron Scan manualmente (sem esperar pelas 03:00 AM)
    triggerScan: async () => {
        return fetchWithAuth(`/api/internal/catalog/trigger-scan`, {
            method: 'POST',
            body: '{}' // Fastify requires non-empty body when Content-Type: application/json
        });
    }
};

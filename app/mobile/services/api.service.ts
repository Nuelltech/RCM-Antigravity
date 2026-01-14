/**
 * API Service
 * Centralizes API calls for invoices and inventory
 * 
 * Usage:
 *   const sessions = await ApiService.getInventorySessions();
 *   await ApiService.updateInventoryItem(itemId, { quantidade: 10 });
 */

import api from '../lib/api';

export class ApiService {
    /**
     * INVENTORY API
     */

    // Get all inventory sessions
    static async get(url: string, config?: any) {
        return api.get(url, config);
    }

    static async getInventorySessions(status?: 'Aberto' | 'Fechado') {
        const params = status ? { status } : {};
        const response = await api.get('/api/inventory/sessions', { params });
        return response.data;
    }

    // Get inventory session by ID
    static async getInventorySession(sessionId: number) {
        const response = await api.get(`/api/inventory/sessions/${sessionId}`);
        return response.data;
    }

    // Update inventory item quantity
    static async updateInventoryItem(itemId: number, data: {
        quantidade: number;
        localizacao_id?: number;
        variacao_id?: number;
        observacoes?: string;
    }) {
        const response = await api.put(`/api/inventory/items/${itemId}`, data);
        return response.data;
    }

    // Close inventory session
    static async closeInventorySession(sessionId: number) {
        const response = await api.post(`/api/inventory/sessions/${sessionId}/close`);
        return response.data;
    }

    // Get inventory locations
    static async getInventoryLocations() {
        const response = await api.get('/api/inventory/locations');
        return response.data;
    }

    /**
     * INVOICE API
     */

    // Get all invoices
    static async getInvoices(params?: {
        status?: string;
        page?: number;
        limit?: number;
    }) {
        const response = await api.get('/api/invoices', { params });
        return response.data;
    }

    // Get invoice by ID
    static async getInvoice(invoiceId: number) {
        const response = await api.get(`/api/invoices/${invoiceId}`);
        return response.data;
    }

    // Create invoice (upload will be handled by FileService)
    static async createInvoice(data: {
        fornecedor_id?: number;
        data_fatura?: string;
        numero_fatura?: string;
    }) {
        const response = await api.post('/api/invoices', data);
        return response.data;
    }

    // Approve invoice
    static async approveInvoice(invoiceId: number) {
        const response = await api.post(`/api/invoices/${invoiceId}/approve`);
        return response.data;
    }

    /**
     * DASHBOARD API
     */

    // Get dashboard stats
    static async getDashboardStats(startDate: string, endDate: string) {
        const response = await api.get('/api/dashboard/stats', {
            params: { startDate, endDate },
        });
        return response.data;
    }

    // Get sales chart data
    static async getSalesChart(startDate: string, endDate: string) {
        const response = await api.get('/api/dashboard/sales-chart', {
            params: { startDate, endDate },
        });
        return response.data;
    }

    // Get active alerts
    static async getActiveAlerts(limit: number = 5) {
        const response = await api.get('/api/alerts', {
            params: { lido: false, limit },
        });
        return response.data;
    }

    /**
     * PRODUCTS API
     */

    // Get product variations
    static async getProductVariations(productId: number) {
        const response = await api.get(`/api/products/${productId}/variations`);
        return response.data;
    }
}

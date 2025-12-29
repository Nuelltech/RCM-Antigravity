/**
 * Internal Leads Dashboard Page
 * Main page for internal team to manage leads
 */

"use client";

import { useState, useEffect } from 'react';
import { useInternalAuth } from '@/contexts/InternalAuthContext';
import InternalProtectedRoute from '@/components/InternalProtectedRoute';
import InternalLayout from '@/components/InternalLayout';
import { leadsInternalService, LeadFilters as LeadFiltersType, LeadsResponse, LeadStats } from '@/services/leads-internal.service';
import { StatsCards } from '@/components/internal/StatsCards';
import { LeadFilters } from '@/components/internal/LeadFilters';
import { LeadsTable } from '@/components/internal/LeadsTable';

export default function InternalLeadsPage() {
    const { user } = useInternalAuth();

    const [leadsData, setLeadsData] = useState<LeadsResponse | null>(null);
    const [stats, setStats] = useState<LeadStats | null>(null);
    const [filters, setFilters] = useState<LeadFiltersType>({ page: 1, pageSize: 20 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch leads
    const fetchLeads = async (newFilters: LeadFiltersType) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await leadsInternalService.getLeads(newFilters);
            setLeadsData(data);
        } catch (err: any) {
            console.error('Error fetching leads:', err);
            setError('Falha ao carregar leads');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch stats
    const fetchStats = async () => {
        try {
            const { stats: statsData } = await leadsInternalService.getStats();
            setStats(statsData);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    useEffect(() => {
        fetchLeads(filters);
        fetchStats();
    }, []);

    const handleFilter = (newFilters: LeadFiltersType) => {
        setFilters(newFilters);
        fetchLeads(newFilters);
    };

    const handlePageChange = (newPage: number) => {
        const newFilters = { ...filters, page: newPage };
        setFilters(newFilters);
        fetchLeads(newFilters);
    };

    return (
        <InternalProtectedRoute>
            <InternalLayout>
                <div>
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Gestão de Leads</h1>
                        <p className="text-gray-600 mt-2">
                            Bem-vindo, <span className="font-medium">{user?.name}</span> ({user?.role})
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <StatsCards stats={stats} isLoading={!stats} />

                    {/* Filters */}
                    <LeadFilters onFilter={handleFilter} />

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    {/* Leads Table */}
                    <LeadsTable leads={leadsData?.leads || []} isLoading={isLoading} />

                    {/* Pagination */}
                    {leadsData && leadsData.pagination.totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-600">
                                Mostrando {((leadsData.pagination.page - 1) * leadsData.pagination.pageSize) + 1} a{' '}
                                {Math.min(leadsData.pagination.page * leadsData.pagination.pageSize, leadsData.pagination.total)} de{' '}
                                {leadsData.pagination.total} leads
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange(leadsData.pagination.page - 1)}
                                    disabled={leadsData.pagination.page === 1}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    ← Anterior
                                </button>
                                <div className="flex items-center px-4 text-sm text-gray-700">
                                    Página {leadsData.pagination.page} de {leadsData.pagination.totalPages}
                                </div>
                                <button
                                    onClick={() => handlePageChange(leadsData.pagination.page + 1)}
                                    disabled={leadsData.pagination.page >= leadsData.pagination.totalPages}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Próxima →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </InternalLayout>
        </InternalProtectedRoute>
    );
}

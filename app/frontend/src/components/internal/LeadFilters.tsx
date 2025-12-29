/**
 * Lead Filters Component
 * Filter bar for leads dashboard
 */

import { useState } from 'react';
import { LeadFilters as LeadFiltersType } from '@/services/leads-internal.service';

interface LeadFiltersProps {
    onFilter: (filters: LeadFiltersType) => void;
}

export function LeadFilters({ onFilter }: LeadFiltersProps) {
    const [filters, setFilters] = useState<LeadFiltersType>({
        status: undefined,
        source: undefined,
        search: '',
        page: 1,
        pageSize: 20,
    });

    const handleFilterChange = (key: keyof LeadFiltersType, value: any) => {
        const newFilters = { ...filters, [key]: value, page: 1 }; // Reset to page 1 when filters change
        setFilters(newFilters);
        onFilter(newFilters);
    };

    const handleClearFilters = () => {
        const clearedFilters: LeadFiltersType = {
            status: undefined,
            source: undefined,
            search: '',
            page: 1,
            pageSize: 20,
        };
        setFilters(clearedFilters);
        onFilter(clearedFilters);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pesquisar
                    </label>
                    <input
                        type="text"
                        value={filters.search || ''}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="Nome ou email..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                    </label>
                    <select
                        value={filters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                        <option value="">Todos</option>
                        <option value="NEW">Novo</option>
                        <option value="CONTACTED">Contactado</option>
                        <option value="QUALIFIED">Qualificado</option>
                        <option value="PROPOSAL_SENT">Proposta Enviada</option>
                        <option value="WON">Ganho 🎉</option>
                        <option value="LOST">Perdido</option>
                    </select>
                </div>

                {/* Source */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fonte
                    </label>
                    <select
                        value={filters.source || ''}
                        onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                        <option value="">Todas</option>
                        <option value="landing">Landing Page</option>
                        <option value="demo">Demo Request</option>
                    </select>
                </div>

                {/* Clear Button */}
                <div className="flex items-end">
                    <button
                        onClick={handleClearFilters}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Limpar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
}

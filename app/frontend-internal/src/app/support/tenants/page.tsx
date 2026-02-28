'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import InternalLayout from '@/components/InternalLayout';
import { Search, Building2, ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';
import { internalTenantsService } from '@/services/internal-tenants.service';
import toast from 'react-hot-toast';

interface Tenant {
    id: number;
    nome: string;
    email: string | null;
    plano: string;
    status: string;
    users_count: number;
    ativo: boolean;
}

export default function TenantsListPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            setIsLoading(true);
            const response = await internalTenantsService.getAllTenants();
            if (response.success) {
                setTenants(response.data);
            }
        } catch (error) {
            console.error('Error fetching tenants:', error);
            toast.error('Erro ao carregar tenants');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTenants = tenants.filter((tenant) =>
        tenant.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700';
            case 'trial':
                return 'bg-blue-100 text-blue-700';
            case 'suspended':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getPlanColor = (plan: string) => {
        switch (plan) {
            case 'enterprise':
                return 'bg-orange-100 text-orange-700';
            case 'profissional':
                return 'bg-purple-100 text-purple-700';
            case 'basico':
                return 'bg-green-100 text-green-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Support - Tenants</h1>
                        <p className="text-slate-600">
                            Selecione um tenant para aceder ao dashboard de suporte
                        </p>
                    </div>

                    {/* Search */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Procurar por nome ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                                        <div className="flex-1">
                                            <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Tenants List */
                        <div className="grid grid-cols-1 gap-4">
                            {filteredTenants.length === 0 ? (
                                <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
                                    <p className="text-slate-500">Nenhum tenant encontrado</p>
                                </div>
                            ) : (
                                filteredTenants.map((tenant) => (
                                    <Link
                                        key={tenant.id}
                                        href={`/support/tenants/${tenant.id}`}
                                        className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-start gap-4 flex-1">
                                                {/* Icon */}
                                                <div className="p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                                                    <Building2 className="w-6 h-6 text-orange-600" />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                                                        {tenant.nome}
                                                    </h3>
                                                    <p className="text-sm text-slate-600 mb-3">{tenant.email || 'Sem email'}</p>

                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-bold ${getPlanColor(
                                                                tenant.plano
                                                            )}`}
                                                        >
                                                            {tenant.plano.toUpperCase()}
                                                        </span>
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                                                                tenant.status
                                                            )}`}
                                                        >
                                                            {tenant.status.toUpperCase()}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-sm text-slate-500">
                                                            <Users className="w-4 h-4" />
                                                            <span>{tenant.users_count} users</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="font-semibold text-blue-900 mb-2">💡 Como usar</h3>
                        <p className="text-blue-700 text-sm">
                            Clica num tenant para aceder ao dashboard de suporte com informações detalhadas,
                            métricas de saúde, erros recentes, e ações de resolução.
                        </p>
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

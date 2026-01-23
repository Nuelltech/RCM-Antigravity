'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import InternalLayout from '@/components/InternalLayout';
import { TenantInfoCard } from '@/components/support/TenantInfoCard';
import { TenantHealthMetrics } from '@/components/support/TenantHealthMetrics';
import { RecentErrorsList } from '@/components/support/RecentErrorsList';
import { Tabs } from '@/components/support/Tabs';
import {
    internalTenantsService,
    TenantOverview,
    TenantHealth,
    TenantError,
} from '@/services/internal-tenants.service';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, ShoppingCart, Zap } from 'lucide-react';
import Link from 'next/link';

export default function TenantSupportPage() {
    const params = useParams();
    const tenantId = params.id as string;

    const [activeTab, setActiveTab] = useState('overview');
    const [overview, setOverview] = useState<TenantOverview | null>(null);
    const [health, setHealth] = useState<TenantHealth | null>(null);
    const [errors, setErrors] = useState<TenantError[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'invoices', label: 'Faturas', icon: <FileText className="w-4 h-4" /> },
        { id: 'sales', label: 'Vendas', icon: <ShoppingCart className="w-4 h-4" /> },
        { id: 'actions', label: 'Ações', icon: <Zap className="w-4 h-4" /> },
    ];

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchAllData();
        }
    }, [tenantId, activeTab]);

    const fetchAllData = async () => {
        try {
            setIsLoading(true);

            const [overviewRes, healthRes, errorsRes] = await Promise.all([
                internalTenantsService.getTenantOverview(tenantId),
                internalTenantsService.getTenantHealth(tenantId),
                internalTenantsService.getRecentErrors(tenantId),
            ]);

            if (overviewRes.success) {
                setOverview(overviewRes.data);
            }

            if (healthRes.success) {
                setHealth(healthRes.data);
            }

            if (errorsRes.success) {
                setErrors(errorsRes.data);
            }
        } catch (error: any) {
            console.error('Error fetching tenant data:', error);
            toast.error('Erro ao carregar dados do tenant');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div className="space-y-6">
                    {/* Back Button */}
                    <Link
                        href="/support/tenants"
                        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar à lista de tenants
                    </Link>

                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Suporte</h1>
                        <p className="text-slate-600">
                            Ferramentas de diagnóstico e resolução para suporte ao cliente
                        </p>
                    </div>

                    {/* Tenant Info Card */}
                    <TenantInfoCard tenant={overview} isLoading={isLoading} />

                    {/* Tabs */}
                    <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

                    {/* Tab Content */}
                    <div className="mt-6">
                        {activeTab === 'overview' && (
                            <>
                                {/* Health Metrics */}
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">Saúde Operacional</h2>
                                    <TenantHealthMetrics health={health} isLoading={isLoading} />
                                </div>

                                {/* Recent Errors */}
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">Erros Recentes</h2>
                                    <RecentErrorsList errors={errors} isLoading={isLoading} />
                                </div>
                            </>
                        )}

                        {activeTab === 'invoices' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                                <h3 className="font-semibold text-blue-900 mb-2">🚧 Tab Faturas</h3>
                                <p className="text-blue-700 text-sm">
                                    Lista de faturas, filtros, e botão de reprocessar - Em desenvolvimento
                                </p>
                            </div>
                        )}

                        {activeTab === 'sales' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                                <h3 className="font-semibold text-blue-900 mb-2">🚧 Tab Vendas</h3>
                                <p className="text-blue-700 text-sm">
                                    Lista de vendas, filtros, e botão de reprocessar - Em desenvolvimento
                                </p>
                            </div>
                        )}

                        {activeTab === 'actions' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                                <h3 className="font-semibold text-blue-900 mb-2">🚧 Tab Ações</h3>
                                <p className="text-blue-700 text-sm">
                                    Limpar cache, Suspender tenant, Adicionar nota - Em desenvolvimento
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

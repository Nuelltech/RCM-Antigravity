"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import InternalLayout from "@/components/InternalLayout";
import { useInternalAuth } from "@/contexts/InternalAuthContext";
import { Users, TrendingUp, Calendar, CheckCircle2, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import toast from "react-hot-toast";
import { SystemHealthCards } from "@/components/dashboard/SystemHealthCards";
import { ProcessingStats } from "@/components/dashboard/ProcessingStats";

interface DashboardStats {
    tenants: {
        total: number;
        active: number;
        trial: number;
        paid: number;
        grace_period: number;
        expired: number;
        by_plan: { plan_name: string; plan_display_name: string; count: number }[];
    };
    revenue: {
        mrr: number;
        arr: number;
        currency: string;
    };
    leads: {
        new_today: number;
        new_this_week: number;
        conversion_rate: number;
    };
}

export default function DashboardPage() {
    const { user } = useInternalAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setIsLoading(true);
            const data = await fetchWithAuth('/api/internal/dashboard/stats');
            setStats(data.stats);
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            toast.error('Erro ao carregar estatísticas');
            setStats({
                tenants: { total: 0, active: 0, trial: 0, paid: 0, grace_period: 0, expired: 0, by_plan: [] },
                revenue: { mrr: 0, arr: 0, currency: 'EUR' },
                leads: { new_today: 0, new_this_week: 0, conversion_rate: 0 }
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div>
                    {/* Welcome Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Bem-vindo, {user?.name}! 👋
                        </h1>
                        <p className="text-slate-600">
                            Aqui está uma visão geral do sistema RCM.
                        </p>
                    </div>

                    {/* Row 1: Tenants overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <StatsCard
                            title="Total de Tenants"
                            value={stats?.tenants.total || 0}
                            subtitle="Restaurantes"
                            icon={Building2}
                            color="blue"
                            isLoading={isLoading}
                        />
                        <StatsCard
                            title="Ativos (30d)"
                            value={stats?.tenants.active || 0}
                            subtitle="Com login recente"
                            icon={CheckCircle2}
                            color="green"
                            isLoading={isLoading}
                        />
                        <StatsCard
                            title="Em Trial"
                            value={stats?.tenants.trial || 0}
                            subtitle="Plano de teste"
                            icon={Calendar}
                            color="orange"
                            isLoading={isLoading}
                        />
                        <StatsCard
                            title="Subscrições Pagas"
                            value={stats?.tenants.paid || 0}
                            subtitle="Plano pago activo"
                            icon={CheckCircle2}
                            color="green"
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Row 2: Payment health + MRR */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatsCard
                            title="Período de Graça"
                            value={stats?.tenants.grace_period || 0}
                            subtitle="Pagamento em atraso"
                            icon={Calendar}
                            color="orange"
                            isLoading={isLoading}
                        />
                        <StatsCard
                            title="Expirados"
                            value={stats?.tenants.expired || 0}
                            subtitle="Cancelados / Suspensos"
                            icon={TrendingUp}
                            color="red"
                            isLoading={isLoading}
                        />
                        <StatsCard
                            title="MRR"
                            value={`€${(stats?.revenue.mrr || 0).toFixed(2)}`}
                            subtitle="Receita Mensal Recorrente"
                            icon={TrendingUp}
                            color="purple"
                            isLoading={isLoading}
                        />
                        <StatsCard
                            title="Taxa de Conversão"
                            value={`${stats?.leads.conversion_rate || 0}%`}
                            subtitle="Leads → Clientes"
                            icon={TrendingUp}
                            color="purple"
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Plan Breakdown */}
                    {(stats?.tenants.by_plan?.length ?? 0) > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Distribuição por Plano</h2>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {stats!.tenants.by_plan.map(p => {
                                            const pct = stats!.tenants.total > 0
                                                ? Math.round((p.count / stats!.tenants.total) * 100)
                                                : 0;
                                            const planColors: Record<string, string> = {
                                                trial: 'bg-blue-500',
                                                basico: 'bg-green-500',
                                                standard: 'bg-indigo-500',
                                                plus: 'bg-purple-500',
                                                enterprise: 'bg-orange-500',
                                            };
                                            const barColor = planColors[p.plan_name] ?? 'bg-slate-400';
                                            return (
                                                <div key={p.plan_name}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-slate-700">{p.plan_display_name}</span>
                                                        <span className="text-sm text-slate-500">
                                                            <strong className="text-slate-900">{p.count}</strong> tenant{p.count !== 1 ? 's' : ''} ({pct}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                        <div
                                                            className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* System Health Cards */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">System Health</h2>
                        <SystemHealthCards />
                    </div>

                    {/* Info Section */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Métricas de Processamento</h2>
                        <ProcessingStats />
                    </div>

                    <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Portal Interno RCM
                        </h2>
                        <p className="text-slate-600 mb-6">
                            Este é o dashboard interno para gestão de tenants, leads e suporte.
                        </p>

                        <div className="bg-slate-50 rounded-lg p-6">
                            <h3 className="font-semibold text-gray-900 mb-2">Funcionalidades Disponíveis:</h3>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span><strong>Gestão de Leads</strong> - Visualização e gestão completa de leads</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span><strong>Gestão de Tenants</strong> - Em desenvolvimento</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span><strong>Sistema de Support</strong> - Em desenvolvimento</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span><strong>Analytics Avançadas</strong> - Em desenvolvimento</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute >
    );
}

interface StatsCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: any;
    color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
    isLoading?: boolean;
}

function StatsCard({ title, value, subtitle, icon: Icon, color, isLoading }: StatsCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600',
        red: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs text-slate-500">{subtitle}</span>
            </div>
            {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-1"></div>
            ) : (
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
            )}
            <p className="text-sm text-slate-600">{title}</p>
        </div>
    );
}

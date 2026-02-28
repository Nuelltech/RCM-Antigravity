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
            // Use mock data for now
            setStats({
                tenants: { total: 0, active: 0, trial: 0 },
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

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatsCard
                            title="Total de Tenants"
                            value={stats?.tenants.total || 0}
                            subtitle="Restaurantes"
                            icon={Building2}
                            color="blue"
                            isLoading={isLoading}
                        />

                        <StatsCard
                            title="Tenants Ativos"
                            value={stats?.tenants.active || 0}
                            subtitle="Em uso"
                            icon={CheckCircle2}
                            color="green"
                            isLoading={isLoading}
                        />

                        <StatsCard
                            title="Novos Leads"
                            value={stats?.leads.new_this_week || 0}
                            subtitle="Esta semana"
                            icon={Users}
                            color="orange"
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

                    {/* System Health Cards - NEW */}
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
        </ProtectedRoute>
    );
}

interface StatsCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: any;
    color: 'blue' | 'green' | 'orange' | 'purple';
    isLoading?: boolean;
}

function StatsCard({ title, value, subtitle, icon: Icon, color, isLoading }: StatsCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600',
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

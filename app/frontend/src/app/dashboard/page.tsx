"use client";

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { TopRecipesGrid } from '@/components/dashboard/TopRecipesGrid';
import { SystemAlerts } from '@/components/dashboard/SystemAlerts';
import { fetchClient } from '@/lib/api';
import { DollarSign, ShoppingBag, TrendingDown, AlertTriangle, Building2 } from 'lucide-react';

interface DashboardStats {
    vendasMes: number;
    custoMercadoria: number;
    cmvTeorico: number;
    allItems: any[];
    categories: string[];
    custoEstrutura: {
        valor: number;
        periodo: string;
    };
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        vendasMes: 0,
        custoMercadoria: 0,
        cmvTeorico: 0,
        allItems: [],
        categories: [],
        custoEstrutura: { valor: 0, periodo: 'Mês' }
    });
    const [loading, setLoading] = useState(true);

    const [activeAlerts, setActiveAlerts] = useState(0);

    useEffect(() => {
        loadStats();
        loadAlerts();
    }, []);

    async function loadStats() {
        try {
            const response = await fetchClient('/dashboard/stats');
            setStats(response);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadAlerts() {
        try {
            const alerts = await fetchClient('/alerts');
            setActiveAlerts(alerts.length);
        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
        }
    }

    return (
        <AppLayout>
            <div className="space-y-6 p-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Visão geral do desempenho do seu restaurante este mês.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <KPICard
                        title="Vendas do Mês"
                        value={`€ ${stats.vendasMes.toFixed(2)}`}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                        description="vs. mês anterior"
                    />
                    <KPICard
                        title="CMV Atual"
                        value={`€ ${stats.custoMercadoria.toFixed(2)}`}
                        icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                        description="Custo total de mercadorias"
                    />
                    <KPICard
                        title="CMV %"
                        value={`${stats.cmvTeorico.toFixed(1)}%`}
                        icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
                        description="da receita total"
                    />
                    <KPICard
                        title="Custo de Estrutura"
                        value={`€ ${stats.custoEstrutura.valor.toFixed(2)}`}
                        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                        description={`por ${stats.custoEstrutura.periodo}`}
                    />
                    <KPICard
                        title="Alertas Ativos"
                        value={activeAlerts.toString()}
                        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                        description="Requerem atenção"
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-4">
                        <SalesChart />
                    </div>
                    <div className="col-span-3">
                        <SystemAlerts />
                    </div>
                </div>

                <TopRecipesGrid items={stats.allItems} categories={stats.categories} />
            </div>
        </AppLayout>
    );
}

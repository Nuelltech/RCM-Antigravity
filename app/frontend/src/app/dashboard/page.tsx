"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { TopRecipesGrid } from '@/components/dashboard/TopRecipesGrid';
import { SystemAlerts } from '@/components/dashboard/SystemAlerts';
import { SkeletonKPICard } from '@/components/dashboard/SkeletonKPICard';
import { SkeletonChart } from '@/components/dashboard/SkeletonChart';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { fetchClient } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { DollarSign, ShoppingBag, TrendingDown, AlertTriangle, Building2, FileDown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { DashboardPDF } from '@/components/pdf/DashboardPDF';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportPDFModal } from '@/components/dashboard/ExportPDFModal';

interface DashboardStats {
    vendasMes: number;
    custoMercadoria: number;
    cmvTeorico: number;
    comprasMes: number;
    topItems: any[];
    categories: string[];
    custoEstrutura: {
        valor: number;
        periodo: string;
    };
    taxaOcupacao: number;
    lucroBruto: number;
}

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        vendasMes: 0,
        custoMercadoria: 0,
        cmvTeorico: 0,
        comprasMes: 0,
        topItems: [],
        categories: [],
        custoEstrutura: { valor: 0, periodo: 'Mês' },
        taxaOcupacao: 0,
        lucroBruto: 0
    });
    const [loading, setLoading] = useState(true);
    const [activeAlerts, setActiveAlerts] = useState(0);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // Date range for export
    const [dateRange, setDateRange] = useState({
        from: '',
        to: '',
    });

    // Restaurant info for PDF
    // ✅ FIX: Use useUser hook to reactively track tenant/user changes
    const { user, loading: userLoading } = useUser();

    // Derived state from user hook
    const tenantId = user?.tenantId;
    const restaurantName = user?.restaurantName || 'Meu Restaurante';
    const userName = user?.name || 'Sistema';

    const { status, daysRemaining } = useSubscription();

    useEffect(() => {
        // Set dates on client only to avoid hydration mismatch
        setDateRange({
            from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
            to: format(new Date(), 'yyyy-MM-dd'),
        });
    }, []);

    useEffect(() => {
        if (userLoading) return;
        if (!tenantId) return; // Don't load if no tenant selected

        // Check onboarding status
        const checkOnboarding = async () => {
            try {
                // Use role from user object
                const role = user?.role;
                if (role === 'owner' || role === 'admin' || role === 'manager') {
                    const res = await fetchClient('/onboarding/check');
                    if (!res.seeded) {
                        router.push('/onboarding');
                        return; // Stop loading dashboard
                    }
                }

                // If seeded or not owner, load stats
                setLoading(true);
                loadStats();
                loadAlerts();
                loadSalesChart();

            } catch (error) {
                console.error('Failed to check onboarding status', error);
                // Fallback to loading stats
                setLoading(true);
                loadStats();
                loadAlerts();
                loadSalesChart();
            }
        };

        // Debounced loading
        const timeoutId = setTimeout(() => {
            checkOnboarding();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [tenantId, userLoading, dateRange, router, user?.role]); // ✅ FIX: Reload when tenant or date changes

    async function loadStats() {
        if (!dateRange.from || !dateRange.to) return;
        try {
            const response = await fetchClient(`/dashboard/stats?startDate=${dateRange.from}&endDate=${dateRange.to}`);
            if (response) {
                setStats({
                    vendasMes: Number(response.vendasMes || 0),
                    custoMercadoria: Number(response.custoMercadoria || 0),
                    cmvTeorico: Number(response.cmvTeorico || 0),
                    comprasMes: Number(response.comprasMes || 0),
                    topItems: response.topItems || [],
                    // Map objects { category: string, ... } to string[]
                    categories: (response.topCategories || []).map((c: any) => c.category),
                    custoEstrutura: response.custoEstrutura || { valor: 0, periodo: 'Mês' },
                    taxaOcupacao: Number(response.taxaOcupacao || 0),
                    lucroBruto: Number(response.lucroBruto || 0)
                });
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    }


    async function loadAlerts() {
        try {
            const response = await fetchClient('/alerts');
            setActiveAlerts(response.length);
            // Pass all alerts to PDF (PDF component handles sorting/filtering)
            setAlerts(response);
        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
        }
    }

    async function loadSalesChart() {
        try {
            // Fetch sales data for the selected date range
            const response = await fetchClient(`/dashboard/sales-chart?startDate=${dateRange.from}&endDate=${dateRange.to}`);
            setSalesData(response || []);
        } catch (error) {
            console.error('Erro ao carregar dados de vendas:', error);
            // Fallback to empty array
            setSalesData([]);
        }
    }

    return (
        <RoleGuard allowedRoles={["admin", "manager"]}>
            <AppLayout>
                <div className="space-y-6 p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                            <p className="text-muted-foreground">
                                Visão geral do desempenho do seu restaurante.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            {/* Date Range Selector */}
                            <div className="flex items-center gap-2 bg-white p-2 rounded border">
                                <input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                                    className="px-2 py-1 text-sm outline-none"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                                    className="px-2 py-1 text-sm outline-none"
                                />
                            </div>

                            {/* Export PDF Button */}
                            <Button
                                onClick={() => setExportModalOpen(true)}
                                disabled={loading}
                                className="gap-2"
                            >
                                <FileDown className="h-4 w-4" />
                                Exportar PDF
                            </Button>
                        </div>
                    </div>



                    {/* First row: 4 KPI cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {loading ? (
                            <>
                                <SkeletonKPICard />
                                <SkeletonKPICard />
                                <SkeletonKPICard />
                                <SkeletonKPICard />
                            </>
                        ) : (
                            <>
                                <KPICard
                                    title="Vendas"
                                    value={`€ ${(stats.vendasMes || 0).toFixed(2)}`}
                                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                                    description="No período selecionado"
                                />
                                <KPICard
                                    title="CMV Atual"
                                    value={`€ ${(stats.custoMercadoria || 0).toFixed(2)}`}
                                    icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                                    description="Custo total de mercadorias"
                                />
                                <KPICard
                                    title="CMV %"
                                    value={`${(stats.cmvTeorico || 0).toFixed(1)}%`}
                                    icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
                                    description="da receita total"
                                />
                                <KPICard
                                    title="Compras"
                                    value={`€ ${(stats.comprasMes || 0).toFixed(2)}`}
                                    icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                                    description="No período selecionado"
                                />
                            </>
                        )}
                    </div>

                    {/* Second row: 3 KPI cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {loading ? (
                            <>
                                <SkeletonKPICard />
                                <SkeletonKPICard />
                                <SkeletonKPICard />
                            </>
                        ) : (
                            <>
                                <KPICard
                                    title="Custo de Estrutura"
                                    value={`€ ${(stats.custoEstrutura?.valor || 0).toFixed(2)}`}
                                    icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                                    description="Proporcional ao período"
                                />
                                <KPICard
                                    title="Taxa de Ocupação"
                                    value={`${(stats.taxaOcupacao || 0).toFixed(1)}%`}
                                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                                    description="Pratos principais vendidos"
                                />
                                <KPICard
                                    title="Lucro Bruto"
                                    value={`€ ${(stats.lucroBruto || 0).toFixed(2)}`}
                                    valueClassName={(stats.lucroBruto || 0) >= 0 ? "text-green-600" : "text-red-600"}
                                    icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
                                    description="Vendas - CMV - Estrutura"
                                />
                            </>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-4">
                            {loading || !dateRange.from || !dateRange.to ? (
                                <SkeletonChart />
                            ) : (
                                <SalesChart
                                    // Pass strings directly.
                                    startDate={dateRange.from}
                                    endDate={dateRange.to}
                                />
                            )}
                        </div>
                        <div className="col-span-3">
                            <SystemAlerts />
                        </div>
                    </div>

                    <TopRecipesGrid items={stats.topItems} categories={stats.categories} />

                    {/* Export PDF Modal */}
                    <ExportPDFModal
                        open={exportModalOpen}
                        onOpenChange={setExportModalOpen}
                        pdfDocument={
                            <DashboardPDF
                                restaurantName={restaurantName}
                                dateRange={{
                                    from: dateRange.from ? new Date(dateRange.from).toLocaleDateString('pt-PT') : '',
                                    to: dateRange.to ? new Date(dateRange.to).toLocaleDateString('pt-PT') : '',
                                }}
                                stats={stats}
                                activeAlerts={activeAlerts}
                                salesData={salesData}
                                topMenuItems={stats.topItems
                                    ?.filter((item: any) => (item.vendas > 0 || item.cmv > 0))
                                    .slice(0, 5)
                                    .map((item: any) => ({
                                        nome: item.name,
                                        vendas: item.vendas || 0,
                                        quantidade: item.quantity || 0,
                                        cmv: item.cmv || 0,
                                    })) || []}
                                alerts={alerts}
                                generatedBy={userName}
                                logoUrl="/logo.png"
                            />
                        }
                        fileName={`dashboard-${dateRange.from}-${dateRange.to}`}
                    />
                </div>
            </AppLayout>
        </RoleGuard>
    );
}

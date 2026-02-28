"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchClient } from '@/lib/api';

interface SalesTrendData {
    date: string;
    vendas: number;
    custos: number;
}

type Period = '7d' | '30d' | '3m' | '6m' | '1y';

interface SalesChartProps {
    startDate: string;
    endDate: string;
}

export function SalesChart({ startDate, endDate }: SalesChartProps) {
    const [data, setData] = useState<SalesTrendData[]>([]);
    const [loading, setLoading] = useState(true);

    // ✅ FIX: Track tenantId to reload when it changes
    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        const currentTenantId = localStorage.getItem('tenantId');
        setTenantId(currentTenantId);
    }, []);

    useEffect(() => {
        if (!tenantId || !startDate || !endDate) return;

        const controller = new AbortController();

        // ✅ FIX: Reset data before loading
        setData([]);
        setLoading(true);

        loadSalesData(controller.signal);

        return () => {
            controller.abort();
        };
    }, [startDate, endDate, tenantId]); // Primitives (strings) are stable dependencies

    async function loadSalesData(signal?: AbortSignal) {
        setLoading(true);
        try {
            // Convert to ISO string for backend if needed, or pass as is if backend handles YYYY-MM-DD
            // But existing logic used toISOString(). Let's assume input is YYYY-MM-DD
            const startISO = new Date(startDate).toISOString();
            const endISO = new Date(endDate).toISOString();

            // Note: fetchClient might not support signal, but if it uses fetch internally it should be passed.
            // If fetchClient doesn't support it, we check signal.aborted before setting state.
            const response = await fetchClient(
                `/dashboard/sales-chart?startDate=${startISO}&endDate=${endISO}`
            );

            if (signal?.aborted) return;

            // API now returns: [{ date: '...', vendas: 0, custos: 0 }, ... ]
            const rawData = Array.isArray(response) ? response : [];
            const mappedData = rawData.map((item: any) => ({
                date: item.date,
                vendas: Number(item.vendas || 0),
                custos: Number(item.custos || 0)
            }));
            setData(mappedData);
        } catch (error) {
            if (signal?.aborted) return;
            console.error('Erro ao carregar dados de vendas:', error);
            setData([]);
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }

    const chartData = useMemo(() => {
        return data.map(item => ({
            date: new Date(item.date).toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: 'short'
            }),
            vendas: item.vendas,
            custos: item.custos
        }));
    }, [data]);

    const totalSales = useMemo(() => {
        return data.reduce((sum: number, d: SalesTrendData) => sum + d.vendas, 0);
    }, [data]);

    const totalCosts = useMemo(() => {
        return data.reduce((sum: number, d: SalesTrendData) => sum + d.custos, 0);
    }, [data]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Vendas vs Custos</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                        A carregar dados...
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                        Sem dados para o período selecionado
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                    tickFormatter={(value) => `€${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        padding: '8px 12px'
                                    }}
                                    formatter={(value: number) => `€${value.toFixed(2)}`}
                                />
                                <Legend
                                    formatter={(value) => {
                                        if (value === 'vendas') return 'Vendas';
                                        if (value === 'custos') return 'Custos';
                                        return value;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="vendas"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorSales)"
                                    name="Vendas"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="custos"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    fill="url(#colorCosts)"
                                    name="Custos"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                            <span>Vendas: € {totalSales.toFixed(2)}</span>
                            <span>Custos: € {totalCosts.toFixed(2)}</span>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

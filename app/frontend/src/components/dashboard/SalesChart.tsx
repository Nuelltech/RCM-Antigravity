"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchClient } from '@/lib/api';

interface SalesTrendData {
    date: string;
    total: number;
}

type Period = '7d' | '30d' | '3m' | '6m' | '1y';

export function SalesChart() {
    const [period, setPeriod] = useState<Period>('30d');
    const [data, setData] = useState<SalesTrendData[]>([]);
    const [loading, setLoading] = useState(true);

    // ✅ FIX: Track tenantId to reload when it changes
    const [tenantId, setTenantId] = useState<string | null>(null);

    const periodLabels: Record<Period, string> = {
        '7d': 'Últimos 7 dias',
        '30d': 'Últimos 30 dias',
        '3m': 'Últimos 3 meses',
        '6m': 'Últimos 6 meses',
        '1y': 'Último ano'
    };

    useEffect(() => {
        const currentTenantId = localStorage.getItem('tenantId');
        setTenantId(currentTenantId);
    }, []);

    useEffect(() => {
        if (!tenantId) return;
        // ✅ FIX: Reset data before loading
        setData([]);
        setLoading(true);
        loadSalesData();
    }, [period, tenantId]); // ✅ FIX: Added tenantId dependency

    async function loadSalesData() {
        setLoading(true);
        try {
            const now = new Date();
            let startDate: Date;

            switch (period) {
                case '7d':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '3m':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                    break;
                case '6m':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                    break;
                case '1y':
                    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                    break;
            }

            const response = await fetchClient(
                `/sales/dashboard?startDate=${startDate.toISOString()}&endDate=${now.toISOString()}`
            );
            setData(response.trend || []);
        } catch (error) {
            console.error('Erro ao carregar dados de vendas:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    }

    const chartData = useMemo(() => {
        return data.map(item => ({
            date: new Date(item.date).toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: 'short'
            }),
            sales: item.total
        }));
    }, [data]);

    const totalSales = useMemo(() => {
        return data.reduce((sum, d) => sum + d.total, 0);
    }, [data]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Vendas do Mês</CardTitle>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as Period)}
                    className="text-sm border rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {Object.entries(periodLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </select>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                        A carregar dados...
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                        Sem dados de vendas para o período selecionado
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
                                    formatter={(value: number) => [`€${value.toFixed(2)}`, 'Vendas']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorSales)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                            <span>Total: € {totalSales.toFixed(2)}</span>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

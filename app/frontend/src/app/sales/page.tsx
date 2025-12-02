"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchClient } from "@/lib/api";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { format, subDays } from "date-fns";

export default function SalesPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd"),
    });

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await fetchClient(
                `/sales/dashboard?startDate=${dateRange.start}&endDate=${dateRange.end}`
            );
            setData(result);
        } catch (error) {
            console.error("Failed to load sales data:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold">Vendas</h1>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex items-center gap-2 bg-white p-1 rounded border w-full sm:w-auto">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="px-2 py-1 text-sm outline-none w-full sm:w-auto"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="px-2 py-1 text-sm outline-none w-full sm:w-auto"
                            />
                        </div>
                        <Link href="/sales/new" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Venda
                            </Button>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">A carregar...</div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
                                    <span className="text-2xl font-bold">€ {data?.totalSales?.toFixed(2) || "0.00"}</span>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* Trend Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Tendência de Vendas</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data?.trend || []}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Items List */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalhe por Item</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2">Item</th>
                                                <th className="text-right p-2">Quantidade</th>
                                                <th className="text-right p-2">Total (€)</th>
                                                <th className="text-right p-2">Custo Total (€)</th>
                                                <th className="text-right p-2">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data?.itemsList?.map((item: any) => (
                                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                                    <td className="p-2">{item.name}</td>
                                                    <td className="text-right p-2">{item.quantity}</td>
                                                    <td className="text-right p-2">€ {item.total.toFixed(2)}</td>
                                                    <td className="text-right p-2">
                                                        € {((item.quantity || 0) * (item.cmv || 0)).toFixed(2)}
                                                    </td>
                                                    <td className="text-right p-2">
                                                        <Link href={`/sales/item/${item.id}`}>
                                                            <Button variant="ghost" size="sm">Ver Detalhes</Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

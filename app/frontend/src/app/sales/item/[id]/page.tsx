"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchClient } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { format, subDays } from "date-fns";

export default function ItemSalesPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [itemName, setItemName] = useState("Item");
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd"),
    });

    useEffect(() => {
        loadData();
    }, [params.id, dateRange]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch item details to get name (optional, or get from sales data if available)
            // We can fetch item details separately or rely on sales data.
            // Let's fetch item details first to be sure.
            // Actually, the backend /item/:id endpoint returns trend and totals, but maybe not name if no sales?
            // Let's assume we can fetch menu item details from /menu/:id if needed, but we don't have that endpoint explicitly planned.
            // We'll just use the sales data for now or fetch list and find.
            // A better way is to add name to the response of /item/:id in backend.
            // But I can't change backend easily now without rewriting.
            // I'll fetch /menu and find the item for the name.

            const [salesData, menuData] = await Promise.all([
                fetchClient(`/sales/item/${params.id}?startDate=${dateRange.start}&endDate=${dateRange.end}`),
                fetchClient("/menu")
            ]);

            setData(salesData);
            const item = menuData.find((i: any) => i.id === Number(params.id));
            if (item) setItemName(item.nome_comercial);

        } catch (error) {
            console.error("Failed to load item sales data:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/sales">
                        <Button type="button" variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold">Vendas: {itemName}</h1>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded border w-fit">
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="px-2 py-1 text-sm outline-none"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="px-2 py-1 text-sm outline-none"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">A carregar...</div>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">€ {data?.totalSales?.toFixed(2) || "0.00"}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Quantidade Vendida</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{data?.totalQuantity || 0}</div>
                                </CardContent>
                            </Card>
                        </div>

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
                    </>
                )}
            </div>
        </AppLayout>
    );
}

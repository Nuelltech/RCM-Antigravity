"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchClient } from "@/lib/api";
import { Calendar as CalendarIcon, Download, Filter, Search } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface ConsumptionItem {
    produto_id: number;
    codigo: string;
    nome: string;
    unidade_medida: string;
    quantidade_consumida: number;
    preco_unitario: number;
    custo_total: number;
}

interface ConsumptionData {
    periodo: {
        inicio: string;
        fim: string;
    };
    total_vendas: number;
    custo_total: number;
    consumos: ConsumptionItem[];
}

export default function ConsumosPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ConsumptionData | null>(null);
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    });
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await fetchClient(
                `/consumos?data_inicio=${dateRange.start}&data_fim=${dateRange.end}`
            );
            setData(result);
        } catch (error) {
            console.error("Failed to load consumption data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data) return;

        const headers = ["Código", "Produto", "Unidade", "Quantidade", "Custo Unitário", "Custo Total"];
        const csvContent = [
            headers.join(","),
            ...data.consumos.map(item => [
                item.codigo,
                `"${item.nome}"`,
                item.unidade_medida,
                item.quantidade_consumida.toFixed(4),
                item.preco_unitario.toFixed(4),
                item.custo_total.toFixed(2)
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `consumos_${dateRange.start}_${dateRange.end}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredItems = data?.consumos.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Relatório de Consumos</h1>
                        <p className="text-gray-500">Análise de ingredientes e produtos consumidos</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex items-center gap-2 bg-white p-1 rounded border w-full sm:w-auto">
                            <CalendarIcon className="w-4 h-4 text-gray-500 ml-2" />
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
                        <Button variant="outline" onClick={handleExport} disabled={!data || data.consumos.length === 0}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Total de Vendas Analisadas</CardTitle>
                                    <Filter className="h-4 w-4 text-gray-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{data?.total_vendas || 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Custo Total de Consumo</CardTitle>
                                    <div className="h-4 w-4 text-gray-400">€</div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">€ {data?.custo_total.toFixed(2) || "0.00"}</div>
                                    <p className="text-xs text-gray-500 mt-1">Baseado no custo atual dos produtos</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Produtos Distintos</CardTitle>
                                    <Search className="h-4 w-4 text-gray-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{data?.consumos.length || 0}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Table */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Detalhe por Produto</CardTitle>
                                    <div className="relative w-64">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            placeholder="Pesquisar produto..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-8 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Código</th>
                                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Produto</th>
                                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Unidade</th>
                                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Quantidade</th>
                                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Custo Unit.</th>
                                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Custo Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-4 text-center text-gray-500">
                                                        Nenhum consumo encontrado para este período.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredItems.map((item) => (
                                                    <tr key={item.produto_id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                        <td className="p-4 align-middle font-medium">{item.codigo}</td>
                                                        <td className="p-4 align-middle">{item.nome}</td>
                                                        <td className="p-4 align-middle">
                                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                                {item.unidade_medida}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 align-middle text-right font-mono">{item.quantidade_consumida.toFixed(3)}</td>
                                                        <td className="p-4 align-middle text-right text-gray-500">€ {item.preco_unitario.toFixed(3)}</td>
                                                        <td className="p-4 align-middle text-right font-bold">€ {item.custo_total.toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            )}
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

"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchClient } from "@/lib/api";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { format, subDays } from "date-fns";
import { TrendingUp, TrendingDown, ShoppingCart, Package, FileText, ChevronLeft, ChevronRight, Search, X, Eye } from "lucide-react";

const COLORS = ['#f97316', '#0f172a', '#64748b', '#94a3b8', '#cbd5e1'];

export default function PurchasesPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd"),
    });

    useEffect(() => {
        loadData();
    }, [dateRange, currentPage]);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await fetchClient(
                `/purchases/dashboard?startDate=${dateRange.start}&endDate=${dateRange.end}&page=${currentPage}&pageSize=10`
            );
            setData(result);
        } catch (error) {
            console.error("Failed to load purchases data:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadProductAnalysis = async (productId: number) => {
        try {
            const result = await fetchClient(
                `/purchases/product/${productId}/analysis?startDate=${dateRange.start}&endDate=${dateRange.end}`
            );
            setSelectedProduct(result);
            setShowModal(true);
        } catch (error) {
            console.error("Failed to load product analysis:", error);
        }
    };

    const searchProducts = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const result = await fetchClient(`/products?search=${query}&limit=5`);
            // O endpoint retorna { data: [], meta: {} }
            setSearchResults(result.data || []);
        } catch (error) {
            console.error("Failed to search products:", error);
        }
    };

    const renderSparkline = (priceHistory: { date: Date; price: number }[]) => {
        if (!priceHistory || priceHistory.length === 0) return null;
        if (priceHistory.length === 1) {
            // Single point - render flat line
            return (
                <svg width="60" height="20" className="inline-block ml-2">
                    <line x1="0" y1="10" x2="60" y2="10" stroke="#f97316" strokeWidth="1.5" />
                </svg>
            );
        }

        const prices = priceHistory.map(p => p.price).filter(p => !isNaN(p) && isFinite(p));
        if (prices.length === 0) return null;

        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const priceRange = maxPrice - minPrice || 1;

        const points = priceHistory.map((point, i) => {
            const x = (i / (priceHistory.length - 1)) * 60;
            const y = 20 - ((point.price - minPrice) / priceRange) * 15;
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg width="60" height="20" className="inline-block ml-2">
                <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1.5"
                    points={points}
                />
            </svg>
        );
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold">Compras</h1>
                    <div className="flex items-center gap-2 bg-white p-1 rounded border w-full md:w-auto">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="px-2 py-1 text-sm outline-none w-full md:w-auto"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="px-2 py-1 text-sm outline-none w-full md:w-auto"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">A carregar...</div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* Total Spent */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
                                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        € {data?.summary?.totalSpent?.toFixed(2) || "0.00"}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Total Purchases */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Nº Compras</CardTitle>
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {data?.summary?.totalPurchases || 0}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Total Invoices */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Nº Faturas</CardTitle>
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {data?.summary?.totalInvoices || 0}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Month over Month */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">vs Mês Anterior</CardTitle>
                                    {data?.summary?.vsLastMonth >= 0 ? (
                                        <TrendingUp className="h-4 w-4 text-red-500" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-green-500" />
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-2xl font-bold ${data?.summary?.vsLastMonth >= 0 ? 'text-red-500' : 'text-green-500'
                                        }`}>
                                        {data?.summary?.vsLastMonth > 0 ? '+' : ''}
                                        {data?.summary?.vsLastMonth?.toFixed(1) || '0.0'}%
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Trend Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Tendência de Compras</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data?.trend || []}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip formatter={(value: any) => `€${value.toFixed(2)}`} />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#f97316"
                                            strokeWidth={2}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Bottom Grid: Products, Suppliers */}
                        <div className="grid gap-4 md:grid-cols-3">
                            {/* Products List with Pagination */}
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Produtos Comprados</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left p-2">Produto</th>
                                                    <th className="text-right p-2">Total (€)</th>
                                                    <th className="text-right p-2">%</th>
                                                    <th className="text-center p-2">Evolução</th>
                                                    <th className="text-center p-2">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data?.products?.items?.map((product: any, idx: number) => (
                                                    <tr key={product.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => loadProductAnalysis(product.id)}>
                                                        <td className="p-2">{product.name}</td>
                                                        <td className="text-right p-2 font-medium">
                                                            € {product.totalSpent?.toFixed(2)}
                                                        </td>
                                                        <td className="text-right p-2 text-xs text-muted-foreground">
                                                            {product.percentage?.toFixed(1)}%
                                                        </td>
                                                        <td className="text-center p-2">
                                                            {renderSparkline(product.priceHistory || [])}
                                                        </td>
                                                        <td className="text-center p-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    loadProductAnalysis(product.id);
                                                                }}
                                                                className="p-1 hover:bg-gray-200 rounded"
                                                                title="Ver detalhes"
                                                            >
                                                                <Eye className="h-4 w-4 text-gray-600" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Pagination */}
                                    {data?.products?.pagination && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <div className="text-sm text-muted-foreground">
                                                Página {data.products.pagination.page} de {data.products.pagination.totalPages}
                                                {' '}({data.products.pagination.totalItems} produtos)
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => currentPage < data.products.pagination.totalPages && setCurrentPage(currentPage + 1)}
                                                    disabled={currentPage >= data.products.pagination.totalPages}
                                                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Top 5 Suppliers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top 5 Fornecedores</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {data?.topSuppliers?.map((supplier: any, idx: number) => (
                                            <div key={supplier.id} className="border-b pb-2">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-medium text-sm truncate flex-1">
                                                        {supplier.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        {supplier.percentage.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">
                                                        {supplier.invoicesCount} faturas
                                                    </span>
                                                    <span className="font-medium">
                                                        € {supplier.totalSpent.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Product Search */}
                        <Card>
                            <CardHeader>
                                <CardTitle>🔍 Pesquisar Produto</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Digite o nome do produto..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            searchProducts(e.target.value);
                                        }}
                                        className="w-full px-4 py-2 border rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto bg-white shadow-lg">
                                        {searchResults.map((product) => (
                                            <div
                                                key={product.id}
                                                onClick={() => {
                                                    loadProductAnalysis(product.id);
                                                    setSearchQuery("");
                                                    setSearchResults([]);
                                                }}
                                                className="p-3 hover:bg-gray-50 cursor-pointer"
                                            >
                                                <div className="font-medium">{product.nome}</div>
                                                <div className="text-xs text-gray-500">
                                                    {product.subfamilia?.familia?.nome}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    Pesquise qualquer produto para ver histórico e evolução de preços
                                </p>
                            </CardContent>
                        </Card>

                        {/* Category Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Breakdown por Categoria</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data?.byCategory?.chart || []}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={(entry) => `${entry.category} (${entry.percentage.toFixed(0)}%)`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="totalSpent"
                                                >
                                                    {data?.byCategory?.chart?.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: any) => `€${value.toFixed(2)}`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {data?.byCategory?.all?.map((cat: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                                    />
                                                    <span className="text-sm">{cat.category}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium">
                                                        € {cat.totalSpent.toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {cat.percentage.toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Invoices Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>📄 Faturas do Período</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {data?.invoices && data.invoices.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left p-2">Nº Fatura</th>
                                                    <th className="text-left p-2">Fornecedor</th>
                                                    <th className="text-center p-2">Data</th>
                                                    <th className="text-center p-2">Items</th>
                                                    <th className="text-right p-2">Total (€)</th>
                                                    <th className="text-center p-2">Estado</th>
                                                    <th className="text-center p-2">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.invoices.map((invoice: any) => (
                                                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                                        <td className="p-2 font-medium">{invoice.numero_fatura}</td>
                                                        <td className="p-2">{invoice.fornecedor}</td>
                                                        <td className="p-2 text-center">{new Date(invoice.data_fatura).toLocaleDateString('pt-PT')}</td>
                                                        <td className="p-2 text-center">{invoice.items_count}</td>
                                                        <td className="p-2 text-right font-medium">€{invoice.total.toFixed(2)}</td>
                                                        <td className="p-2 text-center">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${invoice.status === 'approved'
                                                                ? 'bg-green-100 text-green-700'
                                                                : invoice.status === 'partial'
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {invoice.status === 'approved' ? 'Aprovada' : invoice.status === 'partial' ? 'Aprovada Parcial' : 'Pendente'}
                                                            </span>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <a
                                                                href={`/invoices/${invoice.fatura_importacao_id}`}
                                                                className="text-blue-600 hover:text-blue-800"
                                                                title="Ver Fatura"
                                                            >
                                                                👁️
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">Sem faturas no período selecionado</p>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Product Analysis Modal */}
                {showModal && selectedProduct && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold">📊 {selectedProduct.product.name}</h2>
                                    <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Statistics */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="text-xs text-gray-500">Preço Médio</div>
                                        <div className="text-xl font-bold">€{selectedProduct.statistics.avgPrice?.toFixed(2) || '0.00'}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="text-xs text-gray-500">Preço Mínimo</div>
                                        <div className="text-xl font-bold text-green-600">€{selectedProduct.statistics.minPrice?.toFixed(2) || '0.00'}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="text-xs text-gray-500">Preço Máximo</div>
                                        <div className="text-xl font-bold text-red-600">€{selectedProduct.statistics.maxPrice?.toFixed(2) || '0.00'}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="text-xs text-gray-500">Variação</div>
                                        <div className={`text-xl font-bold ${(selectedProduct.statistics.priceChange || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {(selectedProduct.statistics.priceChange || 0) > 0 ? '+' : ''}{(selectedProduct.statistics.priceChange || 0).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Price Evolution Chart */}
                                <div className="mb-6">
                                    <h3 className="font-semibold mb-3">Evolução de Preço Unitário (Últimos 6 meses)</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart data={selectedProduct.priceEvolution}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="price" stroke="#f97316" strokeWidth={2} name="Preço (€)" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Insights */}
                                {selectedProduct.insights.length > 0 && (
                                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                        <h3 className="font-semibold mb-2">💡 Insights</h3>
                                        <ul className="space-y-1">
                                            {selectedProduct.insights.map((insight: string, idx: number) => (
                                                <li key={idx} className="text-sm">{insight}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Purchase History */}
                                <div className="mb-6">
                                    <h3 className="font-semibold mb-3">
                                        📦 Histórico de Compras
                                        {selectedProduct.filteredPeriod && ` (${selectedProduct.filteredPeriod.purchaseCount} compras)`}
                                    </h3>
                                    {selectedProduct.purchaseHistory.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="p-2 text-left border">Data</th>
                                                        <th className="p-2 text-left border">Fornecedor</th>
                                                        <th className="p-2 text-right border">Qtd</th>
                                                        <th className="p-2 text-right border">Preço/un</th>
                                                        <th className="p-2 text-right border">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedProduct.purchaseHistory.map((purchase: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="p-2 border">{purchase.date}</td>
                                                            <td className="p-2 border">{purchase.supplier}</td>
                                                            <td className="p-2 text-right border">{purchase.quantity}</td>
                                                            <td className="p-2 text-right border">€{purchase.unitPrice.toFixed(2)}</td>
                                                            <td className="p-2 text-right border font-medium">€{purchase.total.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Sem compras no período selecionado</p>
                                    )}
                                </div>

                                {/* Supplier Comparison */}
                                {selectedProduct.supplierComparison.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-3">🏢 Comparação de Fornecedores</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="p-2 text-left border">Fornecedor</th>
                                                        <th className="p-2 text-right border">Preço Médio</th>
                                                        <th className="p-2 text-right border">Último Preço</th>
                                                        <th className="p-2 text-right border">Nº Compras</th>
                                                        <th className="p-2 text-right border">Total Gasto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedProduct.supplierComparison.map((supplier: any, idx: number) => (
                                                        <tr key={idx} className={`hover:bg-gray-50 ${idx === 0 ? 'bg-green-50' : ''}`}>
                                                            <td className="p-2 border font-medium">{supplier.name}</td>
                                                            <td className="p-2 text-right border">€{supplier.avgPrice.toFixed(2)}</td>
                                                            <td className="p-2 text-right border">€{supplier.lastPrice.toFixed(2)}</td>
                                                            <td className="p-2 text-right border">{supplier.purchaseCount}</td>
                                                            <td className="p-2 text-right border font-medium">€{supplier.totalSpent.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

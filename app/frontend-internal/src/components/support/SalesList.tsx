'use client';

import { useState, useEffect } from 'react';
import { internalTenantsService } from '@/services/internal-tenants.service';
import { ShoppingCart, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Sale {
    id: number;
    ficheiro_url: string;
    status: string;
    createdAt: string;
    processado_em: string | null;
}

interface SalesListProps {
    tenantId: string;
}

export function SalesList({ tenantId }: SalesListProps) {
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchSales();
    }, [tenantId, filter, page]);

    const fetchSales = async () => {
        try {
            setIsLoading(true);
            const filters: any = { page, limit: 20 };
            if (filter !== 'all') {
                filters.status = filter;
            }

            const response = await internalTenantsService.getSales(tenantId, filters);
            if (response.success) {
                setSales(response.data.data);
                setTotal(response.data.pagination.total);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
            toast.error('Erro ao carregar vendas');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReprocess = async (saleId: number) => {
        try {
            const response = await internalTenantsService.reprocessSales(tenantId, saleId.toString());
            if (response.success) {
                toast.success('Venda enfileirada para reprocessamento');
                fetchSales();
            }
        } catch (error) {
            toast.error('Erro ao reprocessar venda');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'reviewing':
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-600" />;
            default:
                return <ShoppingCart className="w-5 h-5 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-700';
            case 'error':
                return 'bg-red-100 text-red-700';
            case 'reviewing':
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
                <label className="text-sm font-medium text-slate-700">Filtrar:</label>
                <div className="flex gap-2">
                    {['all', 'pending', 'approved', 'error'].map((f) => (
                        <button
                            key={f}
                            onClick={() => {
                                setFilter(f);
                                setPage(1);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            {f === 'all' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 animate-pulse">
                            <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Sales List */}
                    <div className="space-y-3">
                        {sales.length === 0 ? (
                            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
                                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">Nenhuma venda encontrada</p>
                            </div>
                        ) : (
                            sales.map((sale) => (
                                <div
                                    key={sale.id}
                                    className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            {getStatusIcon(sale.status)}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-semibold text-gray-900">Venda #{sale.id}</h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(sale.status)}`}>
                                                        {sale.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600">
                                                    {new Date(sale.createdAt).toLocaleDateString('pt-PT')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={sale.ficheiro_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                            >
                                                Ver Ficheiro
                                            </a>
                                            {sale.status === 'error' && (
                                                <button
                                                    onClick={() => handleReprocess(sale.id)}
                                                    className="px-3 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Reprocessar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {total > 20 && (
                        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200">
                            <p className="text-sm text-slate-600">Total: {total} vendas</p>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    disabled={page * 20 >= total}
                                    onClick={() => setPage(page + 1)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

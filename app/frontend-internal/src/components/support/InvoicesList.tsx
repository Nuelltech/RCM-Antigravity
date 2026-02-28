'use client';

import { useState, useEffect } from 'react';
import { internalTenantsService } from '@/services/internal-tenants.service';
import { FileText, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Invoice {
    id: number;
    ficheiro_url: string;
    status: string;
    createdAt: string;
    processado_em: string | null;
    fornecedor_nome: string | null;
    total_com_iva: any; // Prisma Decimal comes as string in JSON
}

interface InvoicesListProps {
    tenantId: string;
}

export function InvoicesList({ tenantId }: InvoicesListProps) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchInvoices();
    }, [tenantId, filter, page]);

    const fetchInvoices = async () => {
        try {
            setIsLoading(true);
            const filters: any = { page, limit: 20 };
            if (filter !== 'all') {
                filters.status = filter;
            }

            const response = await internalTenantsService.getInvoices(tenantId, filters);
            if (response.success) {
                setInvoices(response.data.data);
                setTotal(response.data.pagination.total);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Erro ao carregar faturas');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReprocess = async (invoiceId: number) => {
        try {
            const response = await internalTenantsService.reprocessInvoice(tenantId, invoiceId.toString());
            if (response.success) {
                toast.success('Fatura enfileirada para reprocessamento');
                fetchInvoices();
            }
        } catch (error) {
            toast.error('Erro ao reprocessar fatura');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'imported':
            case 'approved':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'reviewing':
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-600" />;
            default:
                return <FileText className="w-5 h-5 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'imported':
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
                    {['all', 'pending', 'imported', 'error'].map((f) => (
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
                    {/* Invoices List */}
                    <div className="space-y-3">
                        {invoices.length === 0 ? (
                            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">Nenhuma fatura encontrada</p>
                            </div>
                        ) : (
                            invoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            {getStatusIcon(invoice.status)}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {invoice.fornecedor_nome || 'Fornecedor desconhecido'}
                                                    </h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(invoice.status)}`}>
                                                        {invoice.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600">
                                                    ID: {invoice.id} • {new Date(invoice.createdAt).toLocaleDateString('pt-PT')}
                                                    {invoice.total_com_iva && ` • €${Number(invoice.total_com_iva).toFixed(2)}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={invoice.ficheiro_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                            >
                                                Ver PDF
                                            </a>
                                            {invoice.status === 'error' && (
                                                <button
                                                    onClick={() => handleReprocess(invoice.id)}
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
                            <p className="text-sm text-slate-600">
                                Total: {total} faturas
                            </p>
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

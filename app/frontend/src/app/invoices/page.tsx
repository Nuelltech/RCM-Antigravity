'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

interface Invoice {
    id: number;
    ficheiro_nome: string;
    fornecedor_nome?: string;
    numero_fatura?: string;
    data_fatura?: string;
    total_com_iva?: number;
    status: string;
    createdAt: string;
    linhas?: Array<{ id: number; status: string }>;
}

export default function InvoicesPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        fetchInvoices();
    }, [filter]);

    const fetchInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/invoices?${params}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-tenant-id': tenantId || '',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setInvoices(data.invoices);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: any; icon: any; className?: string }> = {
            pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
            processing: { label: 'Processando', variant: 'default', icon: Clock },
            reviewing: { label: 'Em Revisão', variant: 'default', icon: AlertCircle },
            approved: { label: 'Aprovada', variant: 'default', icon: CheckCircle, className: 'bg-green-600 text-white hover:bg-green-700' },
            rejected: { label: 'Rejeitada', variant: 'destructive', icon: XCircle },
            error: { label: 'Erro', variant: 'destructive', icon: AlertCircle },
        };

        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className={`flex items-center gap-1 w-fit ${config.className || ''}`}>
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-PT');
    };

    const formatCurrency = (value?: number) => {
        if (!value) return '-';
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Importação de Faturas</h1>
                        <p className="text-muted-foreground">
                            Importe e processe faturas de fornecedores automaticamente
                        </p>
                    </div>
                    <Button onClick={() => router.push('/invoices/upload')} size="lg">
                        <Upload className="mr-2 h-4 w-4" />
                        Importar Fatura
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{invoices.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Em Revisão</CardTitle>
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {invoices.filter((i) => i.status === 'reviewing').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {invoices.filter((i) => i.status === 'approved').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Erros</CardTitle>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {invoices.filter((i) => i.status === 'error').length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Faturas Importadas</CardTitle>
                        <CardDescription>
                            Gerencie e revise faturas importadas
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 mb-4">
                            <Button
                                variant={filter === 'all' ? 'default' : 'outline'}
                                onClick={() => setFilter('all')}
                                size="sm"
                            >
                                Todas
                            </Button>
                            <Button
                                variant={filter === 'reviewing' ? 'default' : 'outline'}
                                onClick={() => setFilter('reviewing')}
                                size="sm"
                            >
                                Em Revisão
                            </Button>
                            <Button
                                variant={filter === 'approved' ? 'default' : 'outline'}
                                onClick={() => setFilter('approved')}
                                size="sm"
                            >
                                Aprovadas
                            </Button>
                            <Button
                                variant={filter === 'error' ? 'default' : 'outline'}
                                onClick={() => setFilter('error')}
                                size="sm"
                            >
                                Erros
                            </Button>
                        </div>

                        {/* Table */}
                        {loading ? (
                            <div className="text-center py-8">Carregando...</div>
                        ) : invoices.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Nenhuma fatura encontrada</p>
                                <Button
                                    variant="link"
                                    onClick={() => router.push('/invoices/upload')}
                                    className="mt-2"
                                >
                                    Importar primeira fatura
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ficheiro</TableHead>
                                        <TableHead>Fornecedor</TableHead>
                                        <TableHead>Nº Fatura</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Linhas</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Importado</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">
                                                {invoice.ficheiro_nome}
                                            </TableCell>
                                            <TableCell>{invoice.fornecedor_nome || '-'}</TableCell>
                                            <TableCell>{invoice.numero_fatura || '-'}</TableCell>
                                            <TableCell>{formatDate(invoice.data_fatura)}</TableCell>
                                            <TableCell>{formatCurrency(invoice.total_com_iva)}</TableCell>
                                            <TableCell>
                                                {invoice.linhas?.length || 0} itens
                                            </TableCell>
                                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                                            <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Ver
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

'use client';

import { fetchClient } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Loader2,
    FileText,
    ChevronRight,
    Upload,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileWarning
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SalesImport {
    id: number;
    ficheiro_nome: string;
    data_venda: string | null;
    total_bruto: number | null;
    total_liquido: number | null;
    status: string;
    erro_mensagem: string | null;
    createdAt: string;
    _count: {
        linhas: number;
    };
}

export default function SalesImportsListPage() {
    const router = useRouter();
    const [imports, setImports] = useState<SalesImport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchImports();
    }, []);

    const fetchImports = async () => {
        try {
            const data = await fetchClient('/vendas/importacoes');
            setImports(data);
        } catch (err) {
            console.error('Error fetching imports:', err);
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh if there are pending items
    useEffect(() => {
        const hasPendingItems = imports.some(i => ['processing', 'pending'].includes(i.status));

        if (hasPendingItems) {
            const interval = setInterval(fetchImports, 5000);
            return () => clearInterval(interval);
        }
    }, [imports]); // Re-run effect when imports change (to check if we still need to poll)

    const formatCurrency = (value: number | null) => {
        if (!value) return '-';
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getFriendlyErrorMessage = (error: string | null) => {
        if (!error) return 'Erro desconhecido';
        if (error.includes('overloaded') || error.includes('503')) return 'Sistema temporariamente ocupado. Tente novamente.';
        if (error.includes('timeout')) return 'Tempo limite excedido. Tente novamente.';
        if (error.includes('PDF')) return 'Erro ao ler PDF. Verifique o ficheiro.';
        return error; // Fallback to original message
    };

    const getStatusBadge = (status: string, errorMessage: string | null) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aprovado
                    </Badge>
                );
            case 'reviewing':
                return (
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Em Revisão
                    </Badge>
                );
            case 'pending':
            case 'processing':
                return (
                    <Badge variant="secondary">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        A Processar
                    </Badge>
                );
            case 'error':
                return (
                    <div className="flex flex-col items-start gap-1">
                        <Badge variant="destructive" title={errorMessage || 'Erro desconhecido'}>
                            <XCircle className="h-3 w-3 mr-1" />
                            Erro
                        </Badge>
                        {errorMessage && (
                            <span className="text-xs text-red-500 max-w-[200px] truncate" title={errorMessage}>
                                {getFriendlyErrorMessage(errorMessage)}
                            </span>
                        )}
                    </div>
                );
            case 'rejected':
                return (
                    <Badge variant="outline">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejeitado
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="container mx-auto p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Importações de Vendas</h1>
                        <p className="text-muted-foreground">
                            Histórico de relatórios importados via PDF
                        </p>
                    </div>
                    <Button onClick={() => router.push('/sales/import')}>
                        <Upload className="mr-2 h-4 w-4" />
                        Novo Import
                    </Button>
                </div>

                {/* Table Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Relatórios Importados</CardTitle>
                        <CardDescription>
                            {imports.length} import(s) encontrado(s)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {imports.length === 0 ? (
                            <div className="text-center py-12">
                                <FileWarning className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-2">Nenhum relatório importado</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Comece por carregar um relatório de vendas (Z-Report, POS export)
                                </p>
                                <Button onClick={() => router.push('/sales/import')}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Importar Relatório
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ficheiro</TableHead>
                                        <TableHead>Data Venda</TableHead>
                                        <TableHead className="text-right">Total Bruto</TableHead>
                                        <TableHead className="text-right">Total Líquido</TableHead>
                                        <TableHead className="text-center">Itens</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Importado Em</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {imports.map((imp) => (
                                        <TableRow
                                            key={imp.id}
                                            className="cursor-pointer hover:bg-accent/50"
                                            onClick={() => router.push(`/sales/importacoes/${imp.id}`)}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">{imp.ficheiro_nome}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatDate(imp.data_venda)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(imp.total_bruto)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(imp.total_liquido)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline">{imp._count.linhas}</Badge>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(imp.status, imp.erro_mensagem)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(imp.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/sales/importacoes/${imp.id}`);
                                                    }}
                                                >
                                                    Ver
                                                    <ChevronRight className="ml-1 h-4 w-4" />
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

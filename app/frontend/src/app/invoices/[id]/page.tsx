'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    AlertCircle,
    Search,
    Loader2,
    FileText,
    Package,
    Plus,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { QuickCreateProduct } from '@/components/invoices/QuickCreateProduct';
import { QuickCreateVariation } from '@/components/invoices/QuickCreateVariation';
import { SelectVariationModal } from '@/components/invoices/SelectVariationModal';

interface InvoiceLine {
    id: number;
    linha_numero: number;
    descricao_original: string;
    quantidade?: number;
    unidade?: string;
    preco_unitario?: number;
    preco_total?: number;
    iva_percentual?: number;    // NEW: IVA percentage
    iva_valor?: number;         // NEW: IVA amount
    produto_id?: number;
    variacao_id?: number;
    confianca_match?: number;
    status: string;
    produto?: {
        id: number;
        nome: string;
    };
    variacao?: {
        id: number;
        nome: string;
    };
}

interface Invoice {
    id: number;
    ficheiro_nome: string;
    fornecedor_nome?: string;
    fornecedor_nif?: string;
    numero_fatura?: string;
    data_fatura?: string;
    total_sem_iva?: number;
    total_iva?: number;
    total_com_iva?: number;
    status: string;
    ocr_texto_bruto?: string;
    linhas: InvoiceLine[];
}

interface ProductSuggestion {
    produtoId: number;
    produtoNome: string;
    unidadeMedida?: string;  // Unit of measurement (L, KG, UN)
    confianca: number;
    matchReason: string;
    variations?: Array<{
        id: number;
        tipo_unidade_compra: string;
        unidades_por_compra: number;
        preco_compra: number;
        preco_unitario: number;
    }>;
}

export default function InvoiceReviewPage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = params?.id as string;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Product matching modal
    const [matchingLine, setMatchingLine] = useState<InvoiceLine | null>(null);
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);  // NEW
    const [showQuickCreateVariation, setShowQuickCreateVariation] = useState(false); // NEW
    const [selectingVariation, setSelectingVariation] = useState<{
        lineId: number;
        produto: ProductSuggestion;
    } | null>(null);

    useEffect(() => {
        if (invoiceId) {
            fetchInvoice();
        }
    }, [invoiceId]);

    // Manual search with debounce
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) return;

        const timer = setTimeout(async () => {
            await fetchManualSearch(searchQuery);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchInvoice = async () => {
        try {
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-tenant-id': tenantId || '',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setInvoice(data);
            } else {
                setError('Fatura não encontrada');
            }
        } catch (err) {
            setError('Erro ao carregar fatura');
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestions = async (lineId: number) => {
        setLoadingSuggestions(true);
        setSearchQuery(''); // Reset search when opening modal
        try {
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}/lines/${lineId}/suggestions`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-tenant-id': tenantId || '',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('📥 API Response:', data);
                console.log('📥 First suggestion variations:', data[0]?.variations);
                setSuggestions(data);
            }
        } catch (err) {
            console.error('Error fetching suggestions:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const fetchManualSearch = async (query: string) => {
        setLoadingSuggestions(true);
        try {
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/products/search?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-tenant-id': tenantId || '',
                    },
                }
            );

            if (response.ok) {
                const products = await response.json();
                // Convert to ProductSuggestion format
                const searchResults = products.map((p: any) => ({
                    produtoId: p.id,
                    produtoNome: p.nome,
                    confianca: 100, // Manual search = exact match
                    matchReason: 'Manual search',
                    variations: p.variations || [] // Use variations from API
                }));
                setSuggestions(searchResults);
            }
        } catch (err) {
            console.error('Error searching products:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleMatchProduct = async (lineId: number, produtoId: number, produtoNome: string, variations?: any[]) => {
        console.log('🔍 CALLED:', { lineId, produtoId, produtoNome, variations });

        // If product has variations, show selection modal (allows creating new variations)
        if (variations && variations.length > 0) {
            console.log('✅ HAS VARIATIONS - SHOW MODAL');
            const produto = suggestions.find(s => s.produtoId === produtoId);
            if (produto) {
                console.log('✅ SETTING STATE');
                setSelectingVariation({
                    lineId,
                    produto
                });
            }
            return;
        }

        console.log('ℹ️ NO VARIATIONS - AUTO MATCH');
        // No variations - auto match product directly
        await performMatch(lineId, produtoId, undefined);
    };

    const performMatch = async (lineId: number, produtoId: number, variacaoId?: number) => {
        try {
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}/lines/${lineId}/match`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        'x-tenant-id': tenantId || '',
                    },
                    body: JSON.stringify({
                        produto_id: produtoId,
                        variacao_id: variacaoId
                    }),
                }
            );

            if (response.ok) {
                setMatchingLine(null);
                setSelectingVariation(null);
                fetchInvoice(); // Refresh
            }
        } catch (err) {
            console.error('Error matching product:', err);
        }
    };

    const handleApprove = async () => {
        // Check if all lines are matched
        const unmatchedLines = invoice?.linhas.filter((l) => !l.produto_id) || [];

        // If unmatched lines exist, ask for confirmation
        if (unmatchedLines.length > 0) {
            const confirmed = window.confirm(
                `⚠️ Existem ${unmatchedLines.length} artigo(s) sem correspondência.\n\n` +
                `Deseja aprovar a fatura parcialmente?\n\n` +
                `✓ Os artigos com correspondência serão processados\n` +
                `✗ Os artigos sem correspondência serão ignorados`
            );

            if (!confirmed) {
                return; // User cancelled
            }
        }

        setApproving(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}/approve`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-tenant-id': tenantId || '',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                const statusMessage = data.partial
                    ? `\n\n⚠️ Aprovação PARCIAL: ${unmatchedLines.length} artigo(s) não processado(s)`
                    : '';

                alert(
                    `Fatura aprovada com sucesso!${statusMessage}\n\n` +
                    `Compra #${data.compra_id} criada\n` +
                    `${data.items_created} itens criados\n` +
                    `${data.prices_updated} preços atualizados`
                );
                router.push('/invoices');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erro ao aprovar fatura');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao aprovar fatura');
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async () => {
        if (!confirm('Tem certeza que deseja rejeitar esta fatura?')) return;

        try {
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'x-tenant-id': tenantId || '',
                },
            });
            router.push('/invoices');
        } catch (err) {
            setError('Erro ao rejeitar fatura');
        }
    };

    const openMatchingModal = (line: InvoiceLine) => {
        setMatchingLine(line);
        setSearchQuery(line.descricao_original);
        fetchSuggestions(line.id);
    };

    const getLineStatusBadge = (line: InvoiceLine) => {
        if (line.produto_id) {
            const confidence = line.confianca_match || 0;
            if (confidence >= 80) {
                return (
                    <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Matched ({confidence}%)
                    </Badge>
                );
            } else {
                return (
                    <Badge variant="default" className="bg-yellow-500">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Revisão ({confidence}%)
                    </Badge>
                );
            }
        }
        return (
            <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Pendente
            </Badge>
        );
    };

    const formatCurrency = (value?: number) => {
        if (!value) return '-';
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-PT');
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error && !invoice) {
        return (
            <div className="container mx-auto p-6">
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!invoice) return null;

    const unmatchedCount = invoice.linhas.filter((l) => !l.produto_id).length;
    const canApprove = invoice.status === 'reviewing'; // Allow partial approvals

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/invoices')}
                            className="mb-4"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                        <h1 className="text-3xl font-bold">Revisão de Fatura</h1>
                        <p className="text-muted-foreground">{invoice.ficheiro_nome}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleReject} disabled={approving}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeitar
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={!canApprove || approving}
                        >
                            {approving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            Aprovar e Integrar
                        </Button>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Warning if unmatched lines */}
                {unmatchedCount > 0 && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>{unmatchedCount}</strong> linha(s) ainda precisam de matching de produtos
                        </AlertDescription>
                    </Alert>
                )}

                {/* Invoice Header */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dados da Fatura</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Fornecedor</Label>
                                <p className="font-medium">{invoice.fornecedor_nome || '-'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">NIF</Label>
                                <p className="font-medium">{invoice.fornecedor_nif || '-'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Nº Fatura</Label>
                                <p className="font-medium">{invoice.numero_fatura || '-'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Data</Label>
                                <p className="font-medium">{formatDate(invoice.data_fatura)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Total s/ IVA</Label>
                                <p className="font-medium">{formatCurrency(invoice.total_sem_iva)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">IVA</Label>
                                <p className="font-medium">{formatCurrency(invoice.total_iva)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Total c/ IVA</Label>
                                <p className="font-medium text-lg">{formatCurrency(invoice.total_com_iva)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Status</Label>
                                {invoice.status === 'approved' ? (
                                    <Badge className="mt-1 flex items-center gap-1 w-fit bg-green-600 text-white hover:bg-green-700">
                                        <CheckCircle className="h-3 w-3" />
                                        Aprovada
                                    </Badge>
                                ) : invoice.status === 'rejected' ? (
                                    <Badge variant="destructive" className="mt-1 flex items-center gap-1 w-fit">
                                        <XCircle className="h-3 w-3" />
                                        Rejeitada
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="mt-1">{invoice.status}</Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Linhas da Fatura</CardTitle>
                        <CardDescription>
                            {invoice.linhas.length} itens • {invoice.linhas.filter((l) => l.produto_id).length} matched
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Descrição Original</TableHead>
                                    <TableHead>Qtd</TableHead>
                                    <TableHead>Un.</TableHead>
                                    <TableHead className="text-center">IVA %</TableHead>
                                    <TableHead className="text-right">P.Unit s/IVA</TableHead>
                                    <TableHead className="text-right">P.Unit c/IVA</TableHead>
                                    <TableHead className="text-right">Total s/IVA</TableHead>
                                    <TableHead className="text-right">Total c/IVA</TableHead>
                                    <TableHead>Produto Matched</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.linhas.map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>{line.linha_numero}</TableCell>
                                        <TableCell className="font-medium max-w-xs">
                                            {line.descricao_original}
                                        </TableCell>
                                        <TableCell>{line.quantidade || '-'}</TableCell>
                                        <TableCell>{line.unidade || '-'}</TableCell>
                                        <TableCell className="text-center">
                                            {line.iva_percentual ? `${line.iva_percentual}%` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(line.preco_unitario)}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(
                                                line.preco_unitario && line.iva_percentual
                                                    ? line.preco_unitario * (1 + line.iva_percentual / 100)
                                                    : line.preco_unitario
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(line.preco_total)}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(
                                                line.preco_total && line.iva_percentual
                                                    ? line.preco_total * (1 + line.iva_percentual / 100)
                                                    : line.preco_total
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {line.produto ? (
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm">{line.produto.nome}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{getLineStatusBadge(line)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openMatchingModal(line)}
                                            >
                                                <Search className="h-4 w-4 mr-1" />
                                                {line.produto_id ? 'Alterar' : 'Associar'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Product Matching Modal */}
                <Dialog open={!!matchingLine} onOpenChange={() => setMatchingLine(null)}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Associar Produto</DialogTitle>
                            <DialogDescription>
                                Linha: {matchingLine?.descricao_original}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Search */}
                            <div>
                                <Label>Procurar produto</Label>
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Nome do produto..."
                                />
                            </div>

                            {/* Suggestions */}
                            <div>
                                <Label>
                                    {searchQuery ? `Resultados (${suggestions.length})` : `Sugestões (${suggestions.length})`}
                                </Label>
                                {loadingSuggestions ? (
                                    <div className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </div>
                                ) : suggestions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        Nenhuma sugestão encontrada
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {suggestions.map((suggestion, idx) => {
                                            console.log(`📋 Rendering suggestion ${idx}:`, suggestion.produtoNome, 'variations:', suggestion.variations?.length || 0);
                                            return (
                                                <div
                                                    key={suggestion.produtoId}
                                                    className="border rounded-lg p-3 hover:bg-accent cursor-pointer flex justify-between items-center"
                                                    onClick={() => {
                                                        console.log('🖱️ CLICK on:', suggestion.produtoNome, 'variations:', suggestion.variations);
                                                        if (matchingLine) {
                                                            handleMatchProduct(
                                                                matchingLine.id,
                                                                suggestion.produtoId,
                                                                suggestion.produtoNome,
                                                                suggestion.variations
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <div>
                                                        <p className="font-medium">{suggestion.produtoNome}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {suggestion.matchReason}
                                                        </p>
                                                    </div>
                                                    <Badge variant={suggestion.confianca >= 80 ? 'default' : 'secondary'}>
                                                        {suggestion.confianca}%
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Quick Create Button */}
                            <div className="border-t pt-4 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowQuickCreate(true)}
                                    className="w-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Criar Produto Novo
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Quick Create Product Modal */}
                {matchingLine && (
                    <QuickCreateProduct
                        open={showQuickCreate}
                        onClose={() => setShowQuickCreate(false)}
                        onSuccess={() => {
                            setShowQuickCreate(false);
                            setMatchingLine(null);
                            fetchInvoice();
                        }}
                        lineData={matchingLine}
                    />
                )}

                {/* Variation Selection Modal */}
                <SelectVariationModal
                    open={!!selectingVariation}
                    onClose={() => setSelectingVariation(null)}
                    produto={selectingVariation?.produto ? {
                        id: selectingVariation.produto.produtoId,
                        nome: selectingVariation.produto.produtoNome
                    } : null}
                    variations={selectingVariation?.produto.variations || []}
                    onSelect={(variacaoId) => {
                        if (selectingVariation) {
                            performMatch(
                                selectingVariation.lineId,
                                selectingVariation.produto.produtoId,
                                variacaoId
                            );
                        }
                    }}
                    onCreateNew={() => {
                        setShowQuickCreateVariation(true);
                    }}
                />

                {/* Quick Create Variation Modal */}
                {selectingVariation && (
                    <QuickCreateVariation
                        open={showQuickCreateVariation}
                        onClose={() => setShowQuickCreateVariation(false)}
                        onSuccess={(variacaoId) => {
                            // Match the line with the newly created variation
                            if (selectingVariation) {
                                performMatch(
                                    selectingVariation.lineId,
                                    selectingVariation.produto.produtoId,
                                    variacaoId
                                );
                            }
                            setShowQuickCreateVariation(false);
                        }}
                        produto={{
                            id: selectingVariation.produto.produtoId,
                            nome: selectingVariation.produto.produtoNome,
                            unidade_medida: selectingVariation.produto.unidadeMedida || 'UN'
                        }}
                        lineData={matchingLine || undefined}
                    />
                )}
            </div>
        </AppLayout>
    );
}

'use client';

import { fetchClient } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Loader2,
    Check,
    X,
    AlertTriangle,
    Search,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowLeft,
    Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SalesLine {
    id: number;
    linha_numero: number;
    descricao_original: string;
    quantidade: number | null;
    preco_unitario: number | null;
    preco_total: number;
    menu_item_id: number | null;
    confianca_match: number | null;
    status: string;
    menuItem?: {
        id: number;
        nome_comercial: string;
    };
    metadata?: {
        inferred_quantity?: boolean;
        inference_reason?: string;
        price_mismatch?: boolean;
        system_pvp?: number;
        file_price?: number;
        original_qty?: number;
    };
}

interface SalesImport {
    id: number;
    ficheiro_nome: string;
    data_venda: string | null;
    total_bruto: number | null;
    total_liquido: number | null;
    iva_6_base: number | null;
    iva_13_base: number | null;
    iva_23_base: number | null;
    pagamento_dinheiro: number | null;
    pagamento_cartao: number | null;
    status: string;
    linhas: SalesLine[];
}

interface MenuItemSuggestion {
    menuItemId: number;
    menuItemNome: string;
    confianca: number;
    matchReason: string;
}

export default function SalesReviewPage() {
    const router = useRouter();
    const params = useParams();
    const salesImportId = params.id as string;
    const { toast } = useToast();

    const [salesImport, setSalesImport] = useState<SalesImport | null>(null);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Manual search state
    const [matchingLine, setMatchingLine] = useState<SalesLine | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<MenuItemSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Price Update State
    const [itemsToUpdatePrice, setItemsToUpdatePrice] = useState<number[]>([]);

    useEffect(() => {
        if (salesImportId) {
            fetchSalesImport();
        }
    }, [salesImportId]);

    // Debounced search
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) return;

        const timer = setTimeout(async () => {
            await fetchManualSearch(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchSalesImport = async () => {
        try {
            const data = await fetchClient(`/vendas/importacoes/${salesImportId}`);
            setSalesImport(data);
        } catch (err) {
            setError('Erro ao carregar importação');
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestions = async (lineId: number) => {
        setLoadingSuggestions(true);
        setSearchQuery('');
        try {
            const data = await fetchClient(`/vendas/importacoes/${salesImportId}/linhas/${lineId}/suggestions`);
            setSuggestions(data);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const fetchManualSearch = async (query: string) => {
        setLoadingSuggestions(true);
        try {
            const menuItems = await fetchClient(`/menu?search=${encodeURIComponent(query)}`);

            const searchResults = menuItems.map((m: any) => ({
                menuItemId: m.id,
                menuItemNome: m.nome_comercial,
                confianca: 100,
                matchReason: 'Procura manual'
            }));
            setSuggestions(searchResults);
        } catch (err) {
            console.error('Error searching menu:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleMatchMenuItem = async (lineId: number, menuItemId: number) => {
        try {
            await fetchClient(`/vendas/importacoes/${salesImportId}/linhas/${lineId}/match`, {
                method: 'POST',
                body: JSON.stringify({ menu_item_id: menuItemId }),
            });

            setMatchingLine(null);
            fetchSalesImport(); // Refresh

            toast({
                title: "Sucesso",
                description: "Correspondência guardada com sucesso",
                variant: "default"
            });
        } catch (err) {
            console.error('Error matching:', err);
        }
    };

    const togglePriceUpdate = (menuItemId: number) => {
        setItemsToUpdatePrice(prev =>
            prev.includes(menuItemId)
                ? prev.filter(id => id !== menuItemId)
                : [...prev, menuItemId]
        );
    };

    const handleApprove = async () => {
        const unmatchedLines = salesImport?.linhas.filter((l) => !l.menu_item_id) || [];

        if (unmatchedLines.length > 0) {
            const confirmed = window.confirm(
                `⚠️ Existem ${unmatchedLines.length} linha(s) sem correspondência.\n\n` +
                `Deseja aprovar parcialmente?\n\n` +
                `✓ Linhas com correspondência serão processadas\n` +
                `✗ Linhas sem correspondência serão ignoradas`
            );

            if (!confirmed) return;
        }

        setApproving(true);
        setError(null);

        try {
            const data = await fetchClient(`/vendas/importacoes/${salesImportId}/approve`, {
                method: 'POST',
                body: JSON.stringify({
                    updatePrices: itemsToUpdatePrice
                })
            });

            const statusMessage = data.partial
                ? `\n\n⚠️ Aprovação PARCIAL: ${unmatchedLines.length} linha(s) não processada(s)`
                : '';

            const priceMsg = itemsToUpdatePrice.length > 0
                ? `\n✓ ${itemsToUpdatePrice.length} preço(s) atualizado(s) no sistema`
                : '';

            alert(
                `Importação aprovada com sucesso!${statusMessage}${priceMsg}\n\n` +
                `${data.vendas_criadas} venda(s) criada(s)`
            );
            router.push('/sales');
        } catch (err: any) {
            setError(err.message || 'Erro ao aprovar importação');
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async () => {
        if (!confirm('Tem certeza que deseja rejeitar esta importação?')) return;

        try {
            await fetchClient(`/vendas/importacoes/${salesImportId}`, {
                method: 'DELETE',
            });
            router.push('/sales/importacoes');
        } catch (err) {
            setError('Erro ao rejeitar importação');
        }
    };

    const openMatchingModal = (line: SalesLine) => {
        setMatchingLine(line);
        setSearchQuery(line.descricao_original);
        fetchSuggestions(line.id);
    };

    const getLineStatusBadge = (line: SalesLine) => {
        if (line.menu_item_id) {
            const confidence = line.confianca_match || 0;
            // If there's a price mismatch or inferred quantity, warn but still green if matched?
            // User requested explicit warning.

            if (line.metadata?.price_mismatch) {
                return (
                    <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Reparar Preço
                    </Badge>
                );
            }

            if (confidence >= 80) {
                return (
                    <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Matched ({confidence}%)
                    </Badge>
                );
            } else {
                return (
                    <Badge className="bg-orange-400">
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

    const formatCurrency = (value?: number | null) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-PT');
    };

    const renderPriceCell = (line: SalesLine) => {
        const mismatch = line.metadata?.price_mismatch;
        const systemPrice = line.metadata?.system_pvp;
        const filePrice = line.preco_unitario;

        if (mismatch && line.menu_item_id) {
            return (
                <div className="flex flex-col items-end">
                    <span className="font-bold text-yellow-600 bg-yellow-50/50 px-1 rounded flex items-center gap-1">
                        {formatCurrency(filePrice)}
                        <AlertTriangle className="h-3 w-3" />
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                        Sys: {formatCurrency(systemPrice)}
                    </span>
                    {line.menu_item_id && (
                        <div className="flex items-center gap-1 mt-1">
                            <Checkbox
                                id={`upd-${line.id}`}
                                checked={itemsToUpdatePrice.includes(line.menu_item_id!)}
                                onChange={() => togglePriceUpdate(line.menu_item_id!)}
                                className="h-3 w-3"
                            />
                            <label htmlFor={`upd-${line.id}`} className="text-[10px] cursor-pointer text-muted-foreground select-none">
                                Atualizar
                            </label>
                        </div>
                    )}
                </div>
            );
        }
        return <div className="text-right">{formatCurrency(filePrice)}</div>;
    };

    const renderQuantityCell = (line: SalesLine) => {
        if (line.metadata?.inferred_quantity) {
            return (
                <div className="text-right flex flex-col items-end">
                    <span className="font-bold text-blue-600 cursor-help flex items-center gap-1" title={line.metadata.inference_reason || 'Quantidade inferida'}>
                        {line.quantidade}
                        <span className="text-[10px] bg-blue-100 px-1 rounded">Calc</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        Orig: {line.metadata.original_qty ?? '-'}
                    </span>
                </div>
            );
        }
        return <div className="text-right">{line.quantidade || '-'}</div>;
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

    if (error && !salesImport) {
        return (
            <AppLayout>
                <div className="container mx-auto p-6">
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            </AppLayout>
        );
    }

    if (!salesImport) return null;

    const unmatchedCount = salesImport.linhas.filter((l) => !l.menu_item_id).length;
    const canApprove = salesImport.status === 'reviewing';

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/sales/importacoes')}
                            className="mb-4"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                        <h1 className="text-3xl font-bold">Revisão de Importação</h1>
                        <p className="text-muted-foreground transition-colors hover:text-foreground">
                            {salesImport.ficheiro_nome}
                            <span className="ml-2 text-xs bg-muted px-2 py-1 rounded-full">ID: {salesImport.id}</span>
                        </p>
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
                            <strong>{unmatchedCount}</strong> linha(s) precisam de matching com o menu
                        </AlertDescription>
                    </Alert>
                )}

                {/* Sales Header */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dados do Relatório</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Data Venda</Label>
                                <p className="font-medium">{formatDate(salesImport.data_venda)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Total Bruto</Label>
                                <p className="font-medium">{formatCurrency(salesImport.total_bruto)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Total Líquido</Label>
                                <p className="font-medium text-lg text-primary">{formatCurrency(salesImport.total_liquido)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Dinheiro</Label>
                                <p className="font-medium">{formatCurrency(salesImport.pagamento_dinheiro)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Cartão</Label>
                                <p className="font-medium">{formatCurrency(salesImport.pagamento_cartao)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">IVA 6%</Label>
                                <p className="font-medium">{formatCurrency(salesImport.iva_6_base)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">IVA 13%</Label>
                                <p className="font-medium">{formatCurrency(salesImport.iva_13_base)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">IVA 23%</Label>
                                <p className="font-medium">{formatCurrency(salesImport.iva_23_base)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Itens Vendidos</CardTitle>
                        <CardDescription>
                            {salesImport.linhas.length} itens • {salesImport.linhas.filter((l) => l.menu_item_id).length} matched
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead className="text-right">P.Unit</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Menu Item Matched</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {salesImport.linhas.map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>{line.linha_numero}</TableCell>
                                        <TableCell className="font-medium max-w-xs truncate" title={line.descricao_original}>
                                            {line.descricao_original}
                                        </TableCell>
                                        <TableCell>{renderQuantityCell(line)}</TableCell>
                                        <TableCell>{renderPriceCell(line)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(line.preco_total)}</TableCell>
                                        <TableCell>
                                            {line.menuItem ? (
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm truncate max-w-[200px]" title={line.menuItem.nome_comercial}>
                                                        {line.menuItem.nome_comercial}
                                                    </span>
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
                                                {line.menu_item_id ? 'Alt' : 'Assoc'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Matching Modal */}
                <Dialog open={!!matchingLine} onOpenChange={() => setMatchingLine(null)}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Associar Item do Menu</DialogTitle>
                            <DialogDescription>
                                Linha: {matchingLine?.descricao_original}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Search */}
                            <div>
                                <Label>Procurar no menu</Label>
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Nome do item..."
                                    className="mt-1"
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
                                    <div className="space-y-2 max-h-96 overflow-y-auto mt-2">
                                        {suggestions.map((suggestion) => (
                                            <div
                                                key={suggestion.menuItemId}
                                                className="border rounded-lg p-3 hover:bg-accent cursor-pointer flex justify-between items-center transition-colors"
                                                onClick={() => {
                                                    if (matchingLine) {
                                                        handleMatchMenuItem(matchingLine.id, suggestion.menuItemId);
                                                    }
                                                }}
                                            >
                                                <div>
                                                    <p className="font-medium">{suggestion.menuItemNome}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {suggestion.matchReason}
                                                    </p>
                                                </div>
                                                <Badge variant={suggestion.confianca >= 80 ? 'default' : 'secondary'}>
                                                    {suggestion.confianca}%
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

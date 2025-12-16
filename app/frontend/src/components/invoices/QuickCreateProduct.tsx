'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuickCreateProductProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    lineData: {
        id: number;
        descricao_original: string;
        descricao_limpa?: string;
        quantidade?: number;
        unidade?: string;
        preco_unitario?: number;
        iva_percentual?: number;
        emb_tipo?: string;
        emb_quantidade?: number;
        emb_unidade?: string;
        preco_por_kg?: number;
        preco_por_litro?: number;
        preco_por_unidade?: number;
    };
}

interface Familia {
    id: number;
    nome: string;
    subfamilias: Subfamilia[];
}

interface Subfamilia {
    id: number;
    nome: string;
}

export function QuickCreateProduct({ open, onClose, onSuccess, lineData }: QuickCreateProductProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [familias, setFamilias] = useState<Familia[]>([]);

    // Form state
    const [nome, setNome] = useState('');
    const [familiaId, setFamiliaId] = useState<number | undefined>();
    const [subfamiliaId, setSubfamiliaId] = useState<number | undefined>();
    const [unidadeMedida, setUnidadeMedida] = useState<'KG' | 'L' | 'Unidade'>('KG');

    // Variation data
    const [tipoUnidadeCompra, setTipoUnidadeCompra] = useState('');
    const [unidadesPorCompra, setUnidadesPorCompra] = useState(1);
    const [volumePorUnidade, setVolumePorUnidade] = useState<number | undefined>();
    const [precoCompra, setPrecoCompra] = useState(0);

    // Initialize form values when lineData changes
    useEffect(() => {
        setNome(lineData.descricao_limpa || lineData.descricao_original);

        const tipo = lineData.emb_tipo
            ? `${lineData.emb_tipo} ${lineData.emb_quantidade}${lineData.emb_unidade}`
            : `${lineData.quantidade} ${lineData.unidade}`;
        setTipoUnidadeCompra(tipo);

        const unidades = lineData.emb_quantidade || lineData.quantidade || 1;
        setUnidadesPorCompra(unidades);

        // Calculate TOTAL purchase price (not unit price!)
        // preco_unitario from invoice is already per kg/liter/unit
        // We need: quantity × preco_unitario × (1 + IVA)
        let precoTotal = 0;
        if (lineData.preco_unitario && lineData.quantidade) {
            precoTotal = lineData.preco_unitario * lineData.quantidade;

            // Add IVA if available
            if (lineData.iva_percentual) {
                precoTotal = precoTotal * (1 + lineData.iva_percentual / 100);
            }
        }

        setPrecoCompra(precoTotal);
    }, [lineData]);

    // Load familias on mount
    useEffect(() => {
        if (open) {
            loadFamilias();
        }
    }, [open]);

    const loadFamilias = async () => {
        try {
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/families`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-tenant-id': tenantId || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setFamilias(data);
            }
        } catch (err) {
            console.error('Error loading families:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/quick-create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-tenant-id': tenantId || '',
                },
                body: JSON.stringify({
                    nome,
                    familia_id: familiaId,
                    subfamilia_id: subfamiliaId,
                    unidade_medida: unidadeMedida,
                    vendavel: false,
                    variacao_compra: {
                        tipo_unidade_compra: tipoUnidadeCompra,
                        unidades_por_compra: Number(unidadesPorCompra),
                        volume_por_unidade: volumePorUnidade ? Number(volumePorUnidade) : undefined,
                        preco_compra: Number(precoCompra),
                    },
                    line_id: lineData.id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar produto');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const selectedFamilia = familias.find(f => f.id === familiaId);
    const precoPorUnidade = unidadesPorCompra > 0 ? precoCompra / unidadesPorCompra : 0;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Criar Produto Novo</DialogTitle>
                    <DialogDescription>
                        Da linha: {lineData.descricao_original}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label htmlFor="nome">Nome do Produto *</Label>
                            <Input
                                id="nome"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="familia">Família</Label>
                            <Select value={familiaId?.toString()} onValueChange={(v) => setFamiliaId(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {familias.map(f => (
                                        <SelectItem key={f.id} value={f.id.toString()}>
                                            {f.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="subfamilia">Subfamília</Label>
                            <Select
                                value={subfamiliaId?.toString()}
                                onValueChange={(v) => setSubfamiliaId(parseInt(v))}
                                disabled={!selectedFamilia}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedFamilia?.subfamilias.map(sf => (
                                        <SelectItem key={sf.id} value={sf.id.toString()}>
                                            {sf.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="unidade">Unidade de Medida *</Label>
                            <Select value={unidadeMedida} onValueChange={(v: any) => setUnidadeMedida(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="KG">Kilogramas (KG)</SelectItem>
                                    <SelectItem value="L">Litros (L)</SelectItem>
                                    <SelectItem value="Unidade">Unidade</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-medium mb-3">Variação de Compra</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="tipo">Nome da Variação</Label>
                                <Input
                                    id="tipo"
                                    value={tipoUnidadeCompra}
                                    onChange={(e) => setTipoUnidadeCompra(e.target.value)}
                                    placeholder="ex: Cx 4kg, Saco 800g"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="unidades">Unidades por Compra</Label>
                                <Input
                                    id="unidades"
                                    type="number"
                                    step="0.001"
                                    value={unidadesPorCompra}
                                    onChange={(e) => setUnidadesPorCompra(parseFloat(e.target.value))}
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Ex: 4 (kg), 0.8 (kg), 20 (un)
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="volume">Volume/Qtd por Unidade</Label>
                                <Input
                                    id="volume"
                                    type="number"
                                    step="0.001"
                                    placeholder="Ex: 0.33 para 33cl"
                                    value={volumePorUnidade || ""}
                                    onChange={(e) => setVolumePorUnidade(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Opcional. Para produtos embalados (ex: 24 garrafas × 0.33L)
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="preco">Preço de Compra (c/IVA)</Label>
                                <Input
                                    id="preco"
                                    type="number"
                                    step="0.01"
                                    value={precoCompra}
                                    onChange={(e) => setPrecoCompra(parseFloat(e.target.value))}
                                    required
                                />
                                {lineData.iva_percentual && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        IVA: {lineData.iva_percentual}%
                                    </p>
                                )}
                            </div>

                            <div className="col-span-2 bg-muted p-3 rounded-md space-y-2">
                                {volumePorUnidade ? (
                                    <>
                                        <p className="text-sm font-medium">
                                            Preço por Unidade Embalagem: {(precoCompra / unidadesPorCompra).toFixed(4)}€/un
                                        </p>
                                        <p className="text-sm font-medium text-primary">
                                            Preço Unitário (Produto): {(precoCompra / (unidadesPorCompra * volumePorUnidade)).toFixed(4)}€/{unidadeMedida.toLowerCase()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Volume Total: {(unidadesPorCompra * volumePorUnidade).toFixed(3)} {unidadeMedida.toLowerCase()}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm font-medium">
                                        Preço Unitário Calculado: {(precoCompra / unidadesPorCompra).toFixed(4)}€/{unidadeMedida.toLowerCase()}
                                    </p>
                                )}
                                {lineData.preco_por_kg && unidadeMedida === 'KG' && (
                                    <p className="text-xs text-muted-foreground">
                                        (Sugestão do Gemini: {Number(lineData.preco_por_kg).toFixed(4)}€/kg)
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            <Plus className="h-4 w-4 mr-2" />
                            {loading ? 'A criar...' : 'Criar e Associar'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

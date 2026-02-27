'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { fetchClient } from '@/lib/api';
import { DecimalInput } from "@/components/ui/decimal-input";

interface QuickCreateVariationProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (variacaoId: number) => void;
    produto: {
        id: number;
        nome: string;
        unidade_medida?: string;
    };
    lineData?: {
        quantidade?: number;
        unidade?: string;
        preco_unitario?: number;
        preco_total?: number;
    };
}

export function QuickCreateVariation({
    open,
    onClose,
    onSuccess,
    produto,
    lineData
}: QuickCreateVariationProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        tipo_unidade_compra: lineData?.unidade || '',
        quantidade_embalagem: undefined as number | undefined,
        unidades_por_compra: undefined as unknown as number, // Start empty to force user input
        preco_compra: lineData?.preco_total || 0,
        fornecedor: '',
        codigo_fornecedor: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetchClient('/products/variations', {
                method: 'POST',
                body: JSON.stringify({
                    produto_id: produto.id,
                    tipo_unidade_compra: formData.tipo_unidade_compra,
                    volume_por_unidade: formData.quantidade_embalagem ? Number(formData.quantidade_embalagem) : undefined,
                    unidades_por_compra: Number(formData.unidades_por_compra || 0),
                    preco_compra: 0, // Will be calculated during integration
                    fornecedor: formData.fornecedor || undefined,
                    codigo_fornecedor: formData.codigo_fornecedor || undefined,
                }),
            });

            onSuccess(response.id);
        } catch (error: any) {
            alert(`❌ Erro ao criar variação: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Calculate unit price exactly like the backend does
    const divisor = formData.quantidade_embalagem
        ? formData.unidades_por_compra * formData.quantidade_embalagem
        : formData.unidades_por_compra;
    const precoUnitario = divisor > 0
        ? formData.preco_compra / divisor
        : 0;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Criar Nova Variação</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Produto: <span className="font-medium">{produto.nome}</span>
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tipo_unidade">Tipo de Unidade de Compra *</Label>
                        <Input
                            id="tipo_unidade"
                            placeholder="Ex: Pack 6un, Barril 50L"
                            value={formData.tipo_unidade_compra}
                            onChange={(e) =>
                                setFormData({ ...formData, tipo_unidade_compra: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nº de Itens na Embalagem *</Label>
                            <DecimalInput
                                step="0.001"
                                placeholder="Ex: 6, 12, 24..."
                                value={formData.unidades_por_compra || ''}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        unidades_por_compra: parseFloat(e.target.value) || 0,
                                    })
                                }
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Quantas unidades individuais vêm? (Ex: <b>6</b> para pack 6uni, <b>12</b> para caixa 12kg)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Volume/Qtd por Unidade</Label>
                            <DecimalInput
                                step="0.001"
                                placeholder="Ex: 0.33 para 33cl"
                                value={formData.quantidade_embalagem || ''}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        quantidade_embalagem: e.target.value ? parseFloat(e.target.value) : undefined,
                                    })
                                }
                            />
                            <p className="text-xs text-gray-500">
                                Opcional. Para produtos embalados (ex: 24 garrafas × 0.33L)
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md space-y-2 border border-blue-100">
                        <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-1.5 rounded-full mt-0.5">
                                <span className="text-blue-600 block w-4 h-4 text-center font-bold text-xs">€</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-blue-900">Cálculo Automático de Preço</h4>
                                <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                                    Não precisa inserir o preço agora. O sistema vai calcular automaticamente
                                    o <strong>Preço de Compra</strong> e o <strong>Custo Unitário</strong> baseando-se no
                                    Valor Total da linha da fatura assim que aprovar a importação.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fornecedor">Fornecedor (Opcional)</Label>
                        <Input
                            id="fornecedor"
                            placeholder="Nome do fornecedor"
                            value={formData.fornecedor}
                            onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="codigo_fornecedor">Código Fornecedor (Opcional)</Label>
                        <Input
                            id="codigo_fornecedor"
                            placeholder="Código do produto no fornecedor"
                            value={formData.codigo_fornecedor}
                            onChange={(e) =>
                                setFormData({ ...formData, codigo_fornecedor: e.target.value })
                            }
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                loading ||
                                !formData.tipo_unidade_compra ||
                                formData.unidades_por_compra <= 0
                            }
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Variação'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

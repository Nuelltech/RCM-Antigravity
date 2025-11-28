"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Star } from "lucide-react";
import { fetchClient } from "@/lib/api";

interface VariacaoProduto {
    id: number;
    tipo_unidade_compra: string;
    unidades_por_compra: number;
    preco_compra: number;
    preco_unitario: number;
    fornecedor?: string;
    codigo_fornecedor?: string;
    data_ultima_compra?: string;
    ativo: boolean;
    updatedAt: string;
}

interface PurchaseVariationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    produtoId: string;
    variations: VariacaoProduto[];
    mainVariation: VariacaoProduto | null;
    onRefresh: () => void;
}

export function PurchaseVariationsModal({
    isOpen,
    onClose,
    produtoId,
    variations,
    mainVariation,
    onRefresh
}: PurchaseVariationsModalProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingVariation, setEditingVariation] = useState<VariacaoProduto | null>(null);
    const [formData, setFormData] = useState({
        tipo_unidade_compra: "",
        unidades_por_compra: 0,
        preco_compra: 0,
        fornecedor: "",
        codigo_fornecedor: "",
        ativo: true,
    });

    const handleEdit = (variation: VariacaoProduto) => {
        setEditingVariation(variation);
        setFormData({
            tipo_unidade_compra: variation.tipo_unidade_compra,
            unidades_por_compra: variation.unidades_por_compra,
            preco_compra: variation.preco_compra,
            fornecedor: variation.fornecedor || "",
            codigo_fornecedor: variation.codigo_fornecedor || "",
            ativo: variation.ativo,
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingVariation) return;

        try {
            await fetchClient(`/variacoes-produto/${editingVariation.id}`, {
                method: "PUT",
                body: JSON.stringify(formData),
            });

            alert("✅ Variação atualizada com sucesso!");
            setIsEditModalOpen(false);
            setEditingVariation(null);
            onRefresh();
        } catch (error: any) {
            alert(`❌ Erro: ${error.message}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Tem a certeza que deseja desativar esta variação?")) return;

        try {
            await fetchClient(`/variacoes-produto/${id}`, {
                method: "DELETE",
            });

            alert("✅ Variação desativada com sucesso!");
            onRefresh();
        } catch (error: any) {
            alert(`❌ Erro: ${error.message}`);
        }
    };

    const isMainVariation = (variation: VariacaoProduto) => {
        return mainVariation?.id === variation.id;
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Gerir Variações de Compra</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {variations.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                                Nenhuma variação de compra encontrada.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {variations.map((variation) => (
                                    <div
                                        key={variation.id}
                                        className={`border rounded-lg p-4 ${isMainVariation(variation)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200"
                                            } ${!variation.ativo ? "opacity-50" : ""}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {isMainVariation(variation) && (
                                                        <Star className="h-4 w-4 text-blue-500 fill-blue-500" />
                                                    )}
                                                    <h4 className="font-semibold text-lg">
                                                        {variation.tipo_unidade_compra}
                                                    </h4>
                                                    {!variation.ativo && (
                                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                                            Inativa
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-600">Unidades por compra:</span>
                                                        <p className="font-medium">{variation.unidades_por_compra}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Preço de compra:</span>
                                                        <p className="font-medium">€{variation.preco_compra.toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Preço unitário:</span>
                                                        <p className="font-medium text-blue-600">
                                                            €{variation.preco_unitario.toFixed(4)}
                                                        </p>
                                                    </div>
                                                    {variation.fornecedor && (
                                                        <div>
                                                            <span className="text-gray-600">Fornecedor:</span>
                                                            <p className="font-medium">{variation.fornecedor}</p>
                                                        </div>
                                                    )}
                                                    {variation.data_ultima_compra && (
                                                        <div>
                                                            <span className="text-gray-600">Última compra:</span>
                                                            <p className="font-medium">
                                                                {new Date(variation.data_ultima_compra).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 ml-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(variation)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(variation.id)}
                                                    disabled={!variation.ativo}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Variation Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Variação de Compra</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tipo de Unidade de Compra</Label>
                            <Input
                                placeholder="Ex: Caixa 12un, Saco 5kg"
                                value={formData.tipo_unidade_compra}
                                onChange={(e) =>
                                    setFormData({ ...formData, tipo_unidade_compra: e.target.value })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Unidades por Compra</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={formData.unidades_por_compra}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            unidades_por_compra: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Preço de Compra (€)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.preco_compra}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            preco_compra: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Fornecedor (Opcional)</Label>
                            <Input
                                placeholder="Nome do fornecedor"
                                value={formData.fornecedor}
                                onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Código Fornecedor (Opcional)</Label>
                            <Input
                                placeholder="Código do produto no fornecedor"
                                value={formData.codigo_fornecedor}
                                onChange={(e) =>
                                    setFormData({ ...formData, codigo_fornecedor: e.target.value })
                                }
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="ativo"
                                checked={formData.ativo}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, ativo: checked as boolean })
                                }
                            />
                            <Label htmlFor="ativo">Variação Ativa</Label>
                        </div>

                        <div className="bg-blue-50 p-3 rounded text-sm">
                            <p className="text-gray-700">
                                <strong>Preço Unitário Calculado:</strong>{" "}
                                €
                                {formData.unidades_por_compra > 0
                                    ? (formData.preco_compra / formData.unidades_por_compra).toFixed(4)
                                    : "0.0000"}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleSaveEdit}>
                            Guardar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

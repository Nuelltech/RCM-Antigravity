'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductVariation {
    id: number;
    tipo_unidade_compra: string;
    unidades_por_compra: number;
    preco_compra: number;
    preco_unitario: number;
}

interface SelectVariationModalProps {
    open: boolean;
    onClose: () => void;
    produto: {
        id: number;
        nome: string;
    } | null;
    variations: ProductVariation[];
    onSelect: (variacaoId: number) => void;
    onCreateNew: () => void;
}

export function SelectVariationModal({
    open,
    onClose,
    produto,
    variations,
    onSelect,
    onCreateNew
}: SelectVariationModalProps) {
    const [selectedId, setSelectedId] = useState<number | null>(
        variations[0]?.id || null  // First variation = default
    );

    const handleConfirm = () => {
        if (selectedId) {
            onSelect(selectedId);
        }
    };

    if (!produto) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Escolher Variação</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Produto: <span className="font-medium">{produto.nome}</span>
                    </p>
                </DialogHeader>

                <div className="py-4">
                    {variations.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhuma variação encontrada para este produto.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {variations.map((variation) => (
                                <div
                                    key={variation.id}
                                    className={cn(
                                        "relative flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                                        selectedId === variation.id
                                            ? "border-primary bg-primary/5"
                                            : "hover:bg-accent"
                                    )}
                                    onClick={() => setSelectedId(variation.id)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{variation.tipo_unidade_compra}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {Number(variation.unidades_por_compra).toFixed(0)} un/compra · €{Number(variation.preco_unitario).toFixed(2)}/un
                                        </div>
                                    </div>
                                    {selectedId === variation.id && (
                                        <Check className="h-5 w-5 text-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={onCreateNew}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Nova Variação
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedId}>
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

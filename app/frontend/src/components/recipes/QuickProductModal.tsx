import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Loader2, Search, Check, Globe } from 'lucide-react';

interface Family {
    id: number;
    nome: string;
    subfamilias: { id: number; nome: string; codigo?: string }[];
}

interface GlobalProductSuggestion {
    id: number;
    nome: string;
    unidade_medida: string;
    subfamilia_codigo: string | null;
    media_preco_mercado: number | null;
}

interface QuickProductModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProductCreated: (product: any) => void;
}

export function QuickProductModal({ open, onOpenChange, onProductCreated }: QuickProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [families, setFamilies] = useState<Family[]>([]);

    // Form fields
    const [nome, setNome] = useState('');
    const [unidadeMedida, setUnidadeMedida] = useState('KG');
    const [subfamiliaId, setSubfamiliaId] = useState<string>('');
    const [precoCompra, setPrecoCompra] = useState<number | undefined>();

    // Global Catalog Search
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<GlobalProductSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (open) {
            loadFamilies();
            // Reset fields
            setNome('');
            setUnidadeMedida('KG');
            setSubfamiliaId('');
            setPrecoCompra(undefined);
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [open]);

    const loadFamilies = async () => {
        try {
            const data = await fetchClient('/products/families');
            setFamilies(data);
        } catch (error) {
            console.error('Failed to load families', error);
        }
    };

    const handleNameChange = (val: string) => {
        setNome(val);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (val.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        searchTimeout.current = setTimeout(() => {
            searchGlobalCatalog(val);
        }, 500);
    };

    const searchGlobalCatalog = async (query: string) => {
        setIsSearching(true);
        try {
            const res = await fetchClient(`/catalog/search?q=${encodeURIComponent(query)}&limit=5`);
            if (res.items && res.items.length > 0) {
                setSuggestions(res.items);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        } catch (error) {
            console.error('Global search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const applySuggestion = (suggestion: GlobalProductSuggestion) => {
        setNome(suggestion.nome);
        setUnidadeMedida(suggestion.unidade_medida);
        if (suggestion.media_preco_mercado) {
            setPrecoCompra(Number(suggestion.media_preco_mercado));
        }

        // Try to match subfamily by code
        if (suggestion.subfamilia_codigo) {
            for (const fam of families) {
                const sub = fam.subfamilias.find(s => s.codigo === suggestion.subfamilia_codigo);
                if (sub) {
                    setSubfamiliaId(sub.id.toString());
                    break;
                }
            }
        }
        setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nome.trim() || !subfamiliaId || precoCompra === undefined || precoCompra <= 0) {
            alert('Por favor, preencha todos os campos obrigatórios com valores válidos.');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Product
            const product = await fetchClient('/products', {
                method: 'POST',
                body: JSON.stringify({
                    nome,
                    subfamilia_id: parseInt(subfamiliaId),
                    unidade_medida: unidadeMedida,
                    vendavel: false
                })
            });

            // 2. Create Initial Variation (Price)
            const variation = await fetchClient('/products/variations', {
                method: 'POST',
                body: JSON.stringify({
                    produto_id: product.id,
                    tipo_unidade_compra: unidadeMedida,
                    unidades_por_compra: 1, // 1 unit of that measure
                    preco_compra: precoCompra
                })
            });

            // Merge for the parent component
            const completeProduct = {
                ...product,
                variacoes: [variation]
            };

            onProductCreated(completeProduct);
            onOpenChange(false);
        } catch (error: any) {
            alert(`Erro ao criar produto: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Flatten families for the select group
    const renderFamilyOptions = () => {
        return families.map(fam => (
            <optgroup key={fam.id} label={fam.nome}>
                {fam.subfamilias.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.nome}</option>
                ))}
            </optgroup>
        ));
    };

    return (
        <Dialog open={open} onOpenChange={(o) => (!loading && onOpenChange(o))}>
            <DialogContent className="sm:max-w-md overflow-visible">
                <DialogHeader>
                    <DialogTitle>Criar Produto Rápido</DialogTitle>
                    <DialogDescription>
                        Crie um ingrediente base na sua base de dados sem sair da receita.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2 relative">
                        <label className="text-sm font-medium">Nome do Produto *</label>
                        <div className="relative">
                            <Input
                                value={nome}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Ex: Batata Doce"
                                required
                                autoComplete="off"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                            )}
                        </div>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                                <div className="p-2 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-1 border-b">
                                    <Globe className="w-3 h-3" /> Sugestões do Catálogo Global
                                </div>
                                {suggestions.map(s => (
                                    <div
                                        key={s.id}
                                        className="p-3 hover:bg-orange-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                                        onClick={() => applySuggestion(s)}
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{s.nome}</div>
                                            <div className="text-xs text-gray-500">
                                                {s.subfamilia_codigo || 'Sem Categoria'} • {s.unidade_medida}
                                            </div>
                                        </div>
                                        {s.media_preco_mercado && (
                                            <div className="text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                                                ~€{Number(s.media_preco_mercado).toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Família / Subfamília *</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={subfamiliaId}
                                onChange={(e) => setSubfamiliaId(e.target.value)}
                                required
                            >
                                <option value="">Selecione...</option>
                                {renderFamilyOptions()}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Unidade de Medida *</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={unidadeMedida}
                                onChange={(e) => setUnidadeMedida(e.target.value)}
                                required
                            >
                                <option value="KG">Quilograma (KG)</option>
                                <option value="L">Litro (L)</option>
                                <option value="Unidade">Unidade</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Preço de Compra * (por {unidadeMedida})</label>
                        <DecimalInput
                            step="0.01"
                            lang="en"
                            inputMode="decimal"
                            value={precoCompra || ''}
                            onChange={(e) => setPrecoCompra(e.target.value ? Number(e.target.value) : undefined)}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Este valor define o custo base inicial para a ficha técnica.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-orange-500 hover:bg-orange-600 gap-2" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Check className="w-4 h-4" />
                            Guardar Produto
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

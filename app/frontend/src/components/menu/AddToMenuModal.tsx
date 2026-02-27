"use client";

import { useState, useEffect } from "react";
import { X, Calculator, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchClient } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import type { AvailableRecipe } from "@/types/menu";

interface AvailableProduct {
    id: number;
    nome: string;
    custo_unitario: number;
    unidade_medida: string;
    quantidade_vendida: number;
    preco_venda?: number;
    imagem_url: string | null;
}

interface AddToMenuModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface AvailableCombo {
    id: number;
    nome: string;
    tipo: string;
    custo_total: number;
    imagem_url: string | null;
}

export function AddToMenuModal({ onClose, onSuccess }: AddToMenuModalProps) {
    const [activeTab, setActiveTab] = useState<"receita" | "combo" | "produto">("receita");
    const [recipes, setRecipes] = useState<AvailableRecipe[]>([]);
    const [combos, setCombos] = useState<AvailableCombo[]>([]);
    const [products, setProducts] = useState<AvailableProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedRecipeId, setSelectedRecipeId] = useState<number | undefined>();
    const [selectedComboId, setSelectedComboId] = useState<number | undefined>();
    const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
    const [nomeComercial, setNomeComercial] = useState("");
    const [pvp, setPvp] = useState("");
    const [categoria, setCategoria] = useState("");
    const [descricao, setDescricao] = useState("");

    useEffect(() => {
        loadAvailableItems();
    }, []);

    const loadAvailableItems = async () => {
        try {
            const [recipesData, combosData, productsData] = await Promise.all([
                fetchClient("/menu/available-recipes"),
                fetchClient("/menu/available-combos"),
                fetchClient("/menu/available-products"),
            ]);
            setRecipes(recipesData.sort((a: AvailableRecipe, b: AvailableRecipe) => a.nome.localeCompare(b.nome)));
            setCombos(combosData.sort((a: AvailableCombo, b: AvailableCombo) => a.nome.localeCompare(b.nome)));
            setProducts(productsData.sort((a: AvailableProduct, b: AvailableProduct) => a.nome.localeCompare(b.nome)));
        } catch (error) {
            console.error("Failed to load available items:", error);
        } finally {
            setLoading(false);
        }
    };

    const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);
    const selectedCombo = combos.find(c => c.id === selectedComboId);
    const selectedProduct = products.find(p => p.id === selectedProductId);

    // Auto-fill name when item is selected
    useEffect(() => {
        if (activeTab === "receita" && selectedRecipe) {
            setNomeComercial(selectedRecipe.nome);
            setCategoria(selectedRecipe.categoria || "");
        } else if (activeTab === "combo" && selectedCombo) {
            setNomeComercial(selectedCombo.nome);
            setCategoria("Combos");
        } else if (activeTab === "produto" && selectedProduct) {
            setNomeComercial(selectedProduct.nome);
            setCategoria("Bebidas"); // Default suggestion
            if (selectedProduct.preco_venda) {
                setPvp(selectedProduct.preco_venda.toString());
            }
        }
    }, [selectedRecipeId, selectedComboId, selectedProductId, activeTab, recipes, combos, products]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const pvpNumber = parseFloat(pvp);
            if (isNaN(pvpNumber) || pvpNumber <= 0) {
                alert("O PVP deve ser maior que zero.");
                return;
            }

            await fetchClient("/menu", {
                method: "POST",
                body: JSON.stringify({
                    receita_id: activeTab === "receita" ? selectedRecipeId : undefined,
                    combo_id: activeTab === "combo" ? selectedComboId : undefined,
                    formato_venda_id: activeTab === "produto" ? selectedProductId : undefined,
                    nome_comercial: nomeComercial,
                    pvp: pvpNumber,
                    categoria_menu: categoria,
                    descricao_menu: descricao,
                }),
            });

            onSuccess();
        } catch (error) {
            console.error("Failed to add to menu:", error);
            alert("Erro ao adicionar ao menu. Verifique se o item já existe.");
        } finally {
            setSubmitting(false);
        }
    };

    // Calculations
    const custo = activeTab === "receita"
        ? (selectedRecipe?.custo_por_porcao || 0)
        : activeTab === "combo"
            ? (selectedCombo?.custo_total || 0)
            : (selectedProduct?.custo_unitario || 0);

    const pvpNumber = parseFloat(pvp) || 0;
    const margem = pvpNumber - custo;
    const margemPercent = pvpNumber > 0 ? (margem / pvpNumber) * 100 : 0;
    const cmvPercent = pvpNumber > 0 ? (custo / pvpNumber) * 100 : 0;

    const getProfitabilityColor = (margemPercent: number) => {
        if (margemPercent >= 70) return "text-green-600";
        if (margemPercent >= 50) return "text-yellow-600";
        return "text-red-600";
    };

    const getProfitabilityLabel = (margemPercent: number) => {
        if (margemPercent >= 70) return "Ótima";
        if (margemPercent >= 50) return "Boa";
        return "Baixa";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold">Adicionar ao Menu</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Type Selection Tabs */}
                    <div className="flex border-b">
                        <button
                            type="button"
                            className={`flex-1 py-2 text-sm font-medium border-b-2 ${activeTab === "receita"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            onClick={() => setActiveTab("receita")}
                        >
                            Receita
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2 text-sm font-medium border-b-2 ${activeTab === "combo"
                                ? "border-purple-600 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            onClick={() => setActiveTab("combo")}
                        >
                            Combo
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2 text-sm font-medium border-b-2 ${activeTab === "produto"
                                ? "border-orange-600 text-orange-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            onClick={() => setActiveTab("produto")}
                        >
                            Produto / Bebida
                        </button>
                    </div>

                    {/* Item Selection */}
                    <div className="space-y-2">
                        <Label>
                            {activeTab === "receita" ? "Selecione a Receita" : activeTab === "combo" ? "Selecione o Combo" : "Selecione o Produto"}
                        </Label>
                        <select
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={
                                activeTab === "receita"
                                    ? selectedRecipeId || ""
                                    : activeTab === "combo"
                                        ? selectedComboId || ""
                                        : selectedProductId || ""
                            }
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                if (activeTab === "receita") setSelectedRecipeId(val);
                                else if (activeTab === "combo") setSelectedComboId(val);
                                else setSelectedProductId(val);
                            }}
                            required
                        >
                            <option value="">Selecione...</option>
                            {activeTab === "receita" && recipes.map((recipe) => (
                                <option key={recipe.id} value={recipe.id}>
                                    {recipe.nome} (Custo: € {recipe.custo_por_porcao.toFixed(2)})
                                </option>
                            ))}
                            {activeTab === "combo" && combos.map((combo) => (
                                <option key={combo.id} value={combo.id}>
                                    {combo.nome} (Custo: € {combo.custo_total.toFixed(2)})
                                </option>
                            ))}
                            {activeTab === "produto" && products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.nome} (Custo: € {product.custo_unitario.toFixed(2)})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500">
                            {activeTab === "receita"
                                ? "Apenas receitas 'Finais' ativas aparecem aqui."
                                : activeTab === "combo"
                                    ? "Apenas combos ativos aparecem aqui."
                                    : "Apenas produtos marcados como 'Disponível no Menu' aparecem aqui."}
                        </p>
                    </div>

                    {/* Commercial Name */}
                    <div className="space-y-2">
                        <Label>Nome Comercial no Menu</Label>
                        <input
                            type="text"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={nomeComercial}
                            onChange={(e) => setNomeComercial(e.target.value)}
                            required
                            placeholder="Ex: Bitoque da Casa"
                        />
                    </div>

                    {/* Pricing & Margins */}
                    <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border">
                        <div className="space-y-2">
                            <Label>Preço de Venda (PVP)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500">€</span>
                                <DecimalInput
                                    step="0.01"
                                    min="0"
                                    lang="en"
                                    inputMode="decimal"
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm font-semibold"
                                    value={pvp}
                                    onChange={(e) => setPvp(e.target.value)}
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Custo Unitário</Label>
                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-gray-100 px-3 text-sm text-gray-600">
                                € {custo.toFixed(2)}
                            </div>
                        </div>

                        {/* Analysis */}
                        <div className="col-span-2 grid grid-cols-3 gap-4 pt-2 border-t">
                            <div>
                                <span className="text-xs text-gray-500 block">Margem Bruta</span>
                                <span className={`font-semibold ${margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    € {margem.toFixed(2)}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 block">Margem %</span>
                                <div className="flex items-center gap-1">
                                    <span className={`font-semibold ${getProfitabilityColor(margemPercent)}`}>
                                        {margemPercent.toFixed(1)}%
                                    </span>
                                    {pvpNumber > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 ${getProfitabilityColor(margemPercent)}`}>
                                            {getProfitabilityLabel(margemPercent)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 block">CMV %</span>
                                <span className="font-semibold text-gray-700">
                                    {cmvPercent.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoria no Menu</Label>
                            <input
                                type="text"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={categoria}
                                onChange={(e) => setCategoria(e.target.value)}
                                placeholder="Ex: Pratos Principais"
                                list="categories"
                            />
                            <datalist id="categories">
                                <option value="Entradas" />
                                <option value="Pratos Principais" />
                                <option value="Sobremesas" />
                                <option value="Bebidas" />
                                <option value="Combos" />
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição (Opcional)</Label>
                            <input
                                type="text"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                placeholder="Descrição para o cliente..."
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting || (!selectedRecipeId && !selectedComboId && !selectedProductId)}>
                            {submitting ? "Adicionando..." : "Adicionar ao Menu"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

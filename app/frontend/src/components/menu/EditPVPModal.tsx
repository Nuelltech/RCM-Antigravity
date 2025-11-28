"use client";

import { useState, useEffect } from "react";
import { fetchClient } from "@/lib/api";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuItemWithRecipe } from "@/types/menu";

interface EditPVPModalProps {
    item: MenuItemWithRecipe;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditPVPModal({ item, onClose, onSuccess }: EditPVPModalProps) {
    const [pvp, setPvp] = useState(item.pvp.toString());
    const [nomeComercial, setNomeComercial] = useState(item.nome_comercial);
    const [categoria, setCategoria] = useState(item.categoria_menu || "");
    const [descricao, setDescricao] = useState(item.descricao_menu || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pvpNumber = parseFloat(pvp) || 0;
    const custo = item.receita?.custo_por_porcao ?? item.combo?.custo_total ?? item.formatoVenda?.custo_unitario ?? 0;
    const newMargem = pvpNumber - custo;
    const newMargemPercentual = pvpNumber > 0 ? ((pvpNumber - custo) / pvpNumber) * 100 : 0;
    const newCMV = pvpNumber > 0 ? (custo / pvpNumber) * 100 : 0;

    const isValidPVP = pvpNumber > custo;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValidPVP) {
            setError("O PVP deve ser maior que o custo");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await fetchClient(`/menu/${item.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    pvp: pvpNumber,
                    nome_comercial: nomeComercial,
                    categoria_menu: categoria || undefined,
                    descricao_menu: descricao || undefined,
                }),
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || "Erro ao atualizar item do menu");
        } finally {
            setLoading(false);
        }
    };

    const getCMVColor = (cmv: number) => {
        if (cmv < 30) return "text-green-600 bg-green-50";
        if (cmv < 35) return "text-yellow-600 bg-yellow-50";
        return "text-red-600 bg-red-50";
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-semibold">Editar Item do Menu</h2>
                        <p className="text-sm text-gray-500 mt-1">{item.receita?.nome ?? item.combo?.nome ?? item.formatoVenda?.nome ?? "Item"}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Current vs New Comparison */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <div className="text-sm text-gray-500 mb-2">Valores Atuais</div>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-sm">PVP:</span>
                                    <span className="font-semibold">€ {item.pvp.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm">Margem:</span>
                                    <span className="font-semibold">€ {item.margem_bruta?.toFixed(2) ?? "0.00"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm">CMV:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCMVColor(item.cmv_percentual)}`}>
                                        {item.cmv_percentual.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-2">Novos Valores</div>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-sm">PVP:</span>
                                    <span className="font-semibold text-green-600">€ {pvpNumber.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Margem:</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold">€ {newMargem.toFixed(2)}</span>
                                        {newMargem > (item.margem_bruta || 0) ? (
                                            <TrendingUp className="h-3 w-3 text-green-600" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 text-red-600" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm">CMV:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCMVColor(newCMV)}`}>
                                        {newCMV.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Input Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Comercial
                        </label>
                        <input
                            type="text"
                            value={nomeComercial}
                            onChange={(e) => setNomeComercial(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            PVP (Preço de Venda ao Público) *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">€</span>
                            <input
                                type="number"
                                step="0.01"
                                lang="en"
                                inputMode="decimal"
                                value={pvp}
                                onChange={(e) => setPvp(e.target.value)}
                                className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${!isValidPVP && pvpNumber > 0 ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Custo por porção: € {custo.toFixed(2)} • Margem: {newMargemPercentual.toFixed(1)}%
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Categoria
                        </label>
                        <select
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">Selecione...</option>
                            <option value="Entradas">Entradas</option>
                            <option value="Principais">Principais</option>
                            <option value="Sobremesas">Sobremesas</option>
                            <option value="Bebidas">Bebidas</option>
                            <option value="Snacks">Snacks</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descrição para o Menu
                        </label>
                        <textarea
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Descrição comercial do prato..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={loading || !isValidPVP}
                        >
                            {loading ? "A guardar..." : "Guardar Alterações"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

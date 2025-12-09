"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchClient } from "@/lib/api";
import { Plus, Trash2, Calculator, ShoppingCart, Save } from "lucide-react";

interface AvailableItem {
    id: number;
    nome: string;
}

interface AvailableProduct extends AvailableItem {
    unidade_medida: string;
}

interface SimulationItem {
    tipo: 'receita' | 'combo' | 'formato_venda';
    id: number;
    nome: string;
    quantidade: number;
}

interface SimulationResult {
    total_itens: number;
    custo_total: number;
    consumos: {
        produto_id: number;
        codigo: string;
        nome: string;
        unidade_medida: string;
        quantidade_consumida: number;
        preco_unitario: number;
        custo_total: number;
    }[];
}

export default function PurchaseCalculatorPage() {
    const [items, setItems] = useState<SimulationItem[]>([]);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [loading, setLoading] = useState(false);

    // Tab & Data State
    const [activeTab, setActiveTab] = useState<"receita" | "combo" | "formato_venda">("receita");
    const [recipes, setRecipes] = useState<AvailableItem[]>([]);
    const [combos, setCombos] = useState<AvailableItem[]>([]);
    const [salesFormats, setSalesFormats] = useState<AvailableProduct[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    // Selection State
    const [selectedId, setSelectedId] = useState<string>("");

    useEffect(() => {
        loadAvailableItems();
    }, []);

    const loadAvailableItems = async () => {
        try {
            const [recipesData, combosData, formatsData] = await Promise.all([
                fetchClient("/consumos/items/recipes"),
                fetchClient("/consumos/items/combos"),
                fetchClient("/consumos/items/sales-formats"),
            ]);
            setRecipes(recipesData);
            setCombos(combosData);
            setSalesFormats(formatsData);
        } catch (error) {
            console.error("Failed to load available items:", error);
        } finally {
            setDataLoading(false);
        }
    };

    const handleAddItem = () => {
        if (!selectedId) return;
        const id = Number(selectedId);

        let newItem: SimulationItem | null = null;

        if (activeTab === "receita") {
            const recipe = recipes.find(r => r.id === id);
            if (recipe) {
                newItem = { tipo: 'receita', id: recipe.id, nome: recipe.nome, quantidade: 1 };
            }
        } else if (activeTab === "combo") {
            const combo = combos.find(c => c.id === id);
            if (combo) {
                newItem = { tipo: 'combo', id: combo.id, nome: combo.nome, quantidade: 1 };
            }
        } else if (activeTab === "formato_venda") {
            const format = salesFormats.find(f => f.id === id);
            if (format) {
                newItem = { tipo: 'formato_venda', id: format.id, nome: format.nome, quantidade: 1 };
            }
        }

        if (newItem) {
            setItems([...items, newItem]);
            setSelectedId("");
            setSimulationResult(null);
        }
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
        setSimulationResult(null);
    };

    const updateQuantity = (index: number, quantity: number) => {
        const newItems = [...items];
        newItems[index].quantidade = quantity;
        setItems(newItems);
        setSimulationResult(null);
    };

    const handleCalculate = async () => {
        if (items.length === 0) return;

        setLoading(true);
        try {
            const payload = {
                itens: items.map((i: SimulationItem) => ({
                    tipo: i.tipo,
                    id: i.id,
                    quantidade: i.quantidade
                }))
            };

            const result = await fetchClient('/consumos/simulacao', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setSimulationResult(result);
        } catch (error) {
            console.error("Simulation failed:", error);
            alert("Erro ao calcular. Verifique se todos os itens são válidos.");
        } finally {
            setLoading(false);
        }
    };

    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [listName, setListName] = useState("");

    const handleSaveList = async () => {
        if (!simulationResult || !listName) return;

        setLoading(true);
        try {
            const payload = {
                nome: listName,
                itens: simulationResult.consumos.map((c: any) => ({
                    tipo: 'produto',
                    id: c.produto_id,
                    quantidade: c.quantidade_consumida
                }))
            };

            await fetchClient('/inventory/calculator-lists', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setSaveDialogOpen(false);
            setListName("");
            alert("Lista guardada com sucesso!");
        } catch (error) {
            console.error("Failed to save list:", error);
            alert("Erro ao guardar lista.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Calculadora de Compras</h1>
                    <p className="text-gray-500">Simule necessidades de compra com base no plano de produção</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Left Column: Production Plan */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                Plano de Produção
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Tabbed Selection */}
                            <div className="space-y-4">
                                <div className="flex border-b">
                                    <button
                                        type="button"
                                        className={`flex-1 py-2 text-sm font-medium border-b-2 ${activeTab === "receita"
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                            }`}
                                        onClick={() => { setActiveTab("receita"); setSelectedId(""); }}
                                    >
                                        Receita
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex-1 py-2 text-sm font-medium border-b-2 ${activeTab === "combo"
                                            ? "border-purple-600 text-purple-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                            }`}
                                        onClick={() => { setActiveTab("combo"); setSelectedId(""); }}
                                    >
                                        Combo
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex-1 py-2 text-sm font-medium border-b-2 ${activeTab === "formato_venda"
                                            ? "border-orange-600 text-orange-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                            }`}
                                        onClick={() => { setActiveTab("formato_venda"); setSelectedId(""); }}
                                    >
                                        Produto / Bebida
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={selectedId}
                                            onChange={(e) => setSelectedId(e.target.value)}
                                            disabled={dataLoading}
                                        >
                                            <option value="">Selecione...</option>
                                            {activeTab === "receita" && recipes.map((recipe) => (
                                                <option key={recipe.id} value={recipe.id}>
                                                    {recipe.nome}
                                                </option>
                                            ))}
                                            {activeTab === "combo" && combos.map((combo) => (
                                                <option key={combo.id} value={combo.id}>
                                                    {combo.nome}
                                                </option>
                                            ))}
                                            {activeTab === "formato_venda" && salesFormats.map((format) => (
                                                <option key={format.id} value={format.id}>
                                                    {format.nome} ({format.unidade_medida})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button onClick={handleAddItem} disabled={!selectedId}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-2 mt-4">
                                {items.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-md">
                                        Adicione itens para começar a simulação
                                    </div>
                                ) : (
                                    items.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                                            <div className="flex-1">
                                                <div className="font-medium">{item.nome}</div>
                                                <div className="text-xs text-gray-500 uppercase">
                                                    {item.tipo === 'formato_venda' ? 'Produto' : item.tipo}
                                                </div>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.quantidade}
                                                onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                                                className="w-20 h-8 px-2 border rounded text-right"
                                            />
                                            <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleCalculate}
                                disabled={items.length === 0 || loading}
                            >
                                {loading ? "A calcular..." : (
                                    <>
                                        <Calculator className="w-4 h-4 mr-2" />
                                        Calcular Necessidades
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Right Column: Results */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Resultados da Simulação</CardTitle>
                            {simulationResult && (
                                <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar Lista
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {!simulationResult ? (
                                <div className="text-center py-12 text-gray-500">
                                    Os resultados aparecerão aqui após o cálculo
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                            <div className="text-sm text-gray-500">Custo Total Estimado</div>
                                            <div className="text-2xl font-bold text-orange-600">
                                                € {simulationResult.custo_total.toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <div className="text-sm text-gray-500">Total de Ingredientes</div>
                                            <div className="text-2xl font-bold text-blue-600">
                                                {simulationResult.consumos.length}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="p-2 text-left">Produto</th>
                                                    <th className="p-2 text-right">Qtd. Necessária</th>
                                                    <th className="p-2 text-right">Custo Est.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {simulationResult.consumos.map((item) => (
                                                    <tr key={item.produto_id}>
                                                        <td className="p-2">
                                                            <div className="font-medium">{item.nome}</div>
                                                            <div className="text-xs text-gray-500">{item.codigo}</div>
                                                        </td>
                                                        <td className="p-2 text-right font-mono">
                                                            {item.quantidade_consumida.toFixed(3)} {item.unidade_medida}
                                                        </td>
                                                        <td className="p-2 text-right text-gray-600">
                                                            € {item.custo_total.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Save List Dialog */}
                {saveDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
                            <h2 className="text-lg font-bold">Guardar Lista para Inventário</h2>
                            <p className="text-sm text-gray-500">
                                Dê um nome a esta lista para a identificar facilmente no inventário.
                            </p>
                            <input
                                className="w-full border rounded p-2"
                                placeholder="Ex: Encomenda Semanal"
                                value={listName}
                                onChange={e => setListName(e.target.value)}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSaveList} disabled={!listName || loading}>
                                    {loading ? "A guardar..." : "Guardar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

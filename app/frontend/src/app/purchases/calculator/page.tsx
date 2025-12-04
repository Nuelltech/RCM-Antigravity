"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchClient } from "@/lib/api";
import { Plus, Trash2, Calculator, ShoppingCart, Search } from "lucide-react";

interface SimulationItem {
    tipo: 'receita' | 'combo';
    id: number;
    nome: string;
    quantidade: number;
}

interface SearchResult {
    id: number;
    nome: string;
    tipo: 'receita' | 'combo';
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
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [loading, setLoading] = useState(false);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length >= 2) {
                searchItems();
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const searchItems = async () => {
        setIsSearching(true);
        try {
            // Fetch recipes (returns paginated response with .data)
            const recipesResponse = await fetchClient(`/recipes?search=${searchTerm}&limit=5`);
            const recipes = recipesResponse.data || [];

            // Fetch combos (returns array directly)
            const combos = await fetchClient(`/combos`);

            // Filter combos by search term (since endpoint doesn't support search param)
            const filteredCombos = Array.isArray(combos)
                ? combos.filter((c: any) =>
                    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
                ).slice(0, 5)
                : [];

            const results: SearchResult[] = [
                ...recipes.map((r: any) => ({ id: r.id, nome: r.nome, tipo: 'receita' as const })),
                ...filteredCombos.map((c: any) => ({ id: c.id, nome: c.nome, tipo: 'combo' as const }))
            ];

            console.log('Search results:', results);
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const addItem = (item: SearchResult) => {
        setItems([...items, { ...item, quantidade: 1 }]);
        setSearchTerm("");
        setSearchResults([]);
        setSimulationResult(null); // Reset result when items change
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
                itens: items.map(i => ({
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
                            {/* Search Box */}
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    placeholder="Adicionar receita ou combo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                        {searchResults.map((result, idx) => (
                                            <div
                                                key={`${result.tipo}-${result.id}-${idx}`}
                                                className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                                                onClick={() => addItem(result)}
                                            >
                                                <span>{result.nome}</span>
                                                <span className="text-xs text-gray-500 uppercase px-2 py-0.5 bg-gray-200 rounded">
                                                    {result.tipo}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Items List */}
                            <div className="space-y-2">
                                {items.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-md">
                                        Adicione itens para começar a simulação
                                    </div>
                                ) : (
                                    items.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                                            <div className="flex-1">
                                                <div className="font-medium">{item.nome}</div>
                                                <div className="text-xs text-gray-500 uppercase">{item.tipo}</div>
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
                        <CardHeader>
                            <CardTitle>Resultados da Simulação</CardTitle>
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
            </div>
        </AppLayout>
    );
}

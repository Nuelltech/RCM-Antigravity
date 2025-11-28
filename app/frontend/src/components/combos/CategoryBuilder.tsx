// CategoryBuilder component – allows building Simple Combos (category based)
import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchClient } from "@/lib/api";
import type { RecipeOption, FormatoVendaOption } from "@/types/combo";

interface OpcaoRow {
    id: string;
    tipo: "receita" | "formato_venda";
    receita_id?: number;
    formato_venda_id?: number;
    nome: string;
    custo_unitario: number;
}

interface CategoryRow {
    id: string;
    categoria: string;
    ordem: number;
    obrigatoria: boolean;
    opcoes: OpcaoRow[];
}

interface CategoryBuilderProps {
    categorias: CategoryRow[];
    onChange: (categorias: CategoryRow[]) => void;
}

export function CategoryBuilder({ categorias, onChange }: CategoryBuilderProps) {
    const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [showAddOptionModal, setShowAddOptionModal] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [recipes, setRecipes] = useState<RecipeOption[]>([]);
    const [formatosVenda, setFormatosVenda] = useState<FormatoVendaOption[]>([]);
    const [modalTab, setModalTab] = useState<"receita" | "formato_venda">("receita");
    const [loading, setLoading] = useState(false);

    // Load recipes and formatos venda (including expired ones just in case)
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [recipesData, formatosData] = await Promise.all([
                    fetchClient("/recipes"),
                    fetchClient("/formatos-venda?includeExpired=true").catch(() => []),
                ]);
                setRecipes(recipesData.filter((r: any) => r.tipo === "Final"));
                setFormatosVenda(formatosData);
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const addCategory = () => {
        if (!newCategoryName.trim()) return;
        const newCategory: CategoryRow = {
            id: `cat-${Date.now()}`,
            categoria: newCategoryName.trim(),
            ordem: categorias.length,
            obrigatoria: true,
            opcoes: [],
        };
        onChange([...categorias, newCategory]);
        setNewCategoryName("");
        setShowAddCategoryInput(false);
    };

    const removeCategory = (categoryId: string) => {
        onChange(categorias.filter((cat) => cat.id !== categoryId));
    };

    const updateCategory = (categoryId: string, updates: Partial<CategoryRow>) => {
        onChange(
            categorias.map((cat) => (cat.id === categoryId ? { ...cat, ...updates } : cat))
        );
    };

    const openAddOptionModal = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        setShowAddOptionModal(true);
    };

    const addOption = (
        tipo: "receita" | "formato_venda",
        item: RecipeOption | FormatoVendaOption
    ) => {
        if (!selectedCategoryId) return;
        const newOption: OpcaoRow = {
            id: `opt-${Date.now()}`,
            tipo,
            ...(tipo === "receita"
                ? {
                    receita_id: item.id,
                    custo_unitario: (item as RecipeOption).custo_por_porcao,
                }
                : {
                    formato_venda_id: item.id,
                    custo_unitario: (item as FormatoVendaOption).custo_unitario,
                }),
            nome: item.nome,
        };
        onChange(
            categorias.map((cat) =>
                cat.id === selectedCategoryId
                    ? { ...cat, opcoes: [...cat.opcoes, newOption] }
                    : cat
            )
        );
        setShowAddOptionModal(false);
    };

    const removeOption = (categoryId: string, optionId: string) => {
        onChange(
            categorias.map((cat) =>
                cat.id === categoryId
                    ? { ...cat, opcoes: cat.opcoes.filter((opt) => opt.id !== optionId) }
                    : cat
            )
        );
    };

    const getMaxCost = (opcoes: OpcaoRow[]): number => {
        if (opcoes.length === 0) return 0;
        return Math.max(...opcoes.map((opt) => opt.custo_unitario));
    };

    const getTotalCost = (): number => {
        return categorias.reduce((total, cat) => total + getMaxCost(cat.opcoes), 0);
    };

    return (
        <div className="space-y-6">
            {/* Total Cost Display */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="pt-6">
                    <div className="text-sm text-gray-600 mb-1">Custo Total Calculado</div>
                    <div className="text-3xl font-bold text-purple-900">€ {getTotalCost().toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">Soma dos custos máximos de cada categoria</div>
                </CardContent>
            </Card>

            {/* Categories List */}
            {categorias.map((categoria) => (
                <Card key={categoria.id} className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Input
                                    value={categoria.categoria}
                                    onChange={(e) => updateCategory(categoria.id, { categoria: e.target.value })}
                                    placeholder="Nome da categoria (ex: Sopa, Prato Principal)"
                                    className="text-lg font-semibold"
                                />
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeCategory(categoria.id)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={categoria.obrigatoria}
                                    onChange={(e) =>
                                        updateCategory(categoria.id, { obrigatoria: e.target.checked })
                                    }
                                />
                                Obrigatória
                            </label>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Options List */}
                        {categoria.opcoes.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                                Nenhuma opção adicionada. Clique em "Adicionar Opção" abaixo.
                            </div>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {categoria.opcoes.map((opcao) => (
                                    <div
                                        key={opcao.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${opcao.tipo === "receita"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-blue-100 text-blue-700"
                                                    }`}
                                            >
                                                {opcao.tipo === "receita" ? "Receita" : "Bebida"}
                                            </span>
                                            <span className="font-medium">{opcao.nome}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold">€ {opcao.custo_unitario.toFixed(2)}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeOption(categoria.id, opcao.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Add Option Button */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAddOptionModal(categoria.id)}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Opção
                        </Button>
                        {/* Max Cost Badge */}
                        {categoria.opcoes.length > 0 && (
                            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-orange-700 font-medium">🔺 Custo Máximo desta categoria:</span>
                                    <span className="font-bold text-orange-900">€ {getMaxCost(categoria.opcoes).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}

            {/* Add Category Section */}
            {showAddCategoryInput ? (
                <Card className="border-2 border-dashed border-purple-300">
                    <CardContent className="pt-6">
                        <div className="flex gap-2">
                            <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Nome da nova categoria"
                                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                                autoFocus
                            />
                            <Button type="button" onClick={addCategory}>Adicionar</Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowAddCategoryInput(false);
                                    setNewCategoryName("");
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-dashed border-purple-300 hover:border-purple-500"
                    onClick={() => setShowAddCategoryInput(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Categoria
                </Button>
            )}

            {/* Add Option Modal */}
            {showAddOptionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
                        <h2 className="text-xl font-bold mb-4">Adicionar Opção à Categoria</h2>
                        {/* Tabs */}
                        <div className="flex gap-2 mb-4 border-b">
                            <button
                                type="button"
                                className={`px-4 py-2 font-medium transition-colors ${modalTab === "receita" ? "border-b-2 border-purple-600 text-purple-600" : "text-gray-500 hover:text-gray-700"
                                    }`}
                                onClick={() => setModalTab("receita")}
                            >
                                Receitas
                            </button>
                            <button
                                type="button"
                                className={`px-4 py-2 font-medium transition-colors ${modalTab === "formato_venda" ? "border-b-2 border-purple-600 text-purple-600" : "text-gray-500 hover:text-gray-700"
                                    }`}
                                onClick={() => setModalTab("formato_venda")}
                            >
                                Bebidas/Formatos Venda
                            </button>
                        </div>
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="text-center py-8 text-gray-400">A carregar...</div>
                            ) : modalTab === "receita" ? (
                                <div className="space-y-2">
                                    {recipes.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">Nenhuma receita disponível</div>
                                    ) : (
                                        recipes.map((recipe) => (
                                            <div key={recipe.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                                <div>
                                                    <div className="font-medium">{recipe.nome}</div>
                                                    <div className="text-sm text-gray-500">Custo: € {recipe.custo_por_porcao.toFixed(2)}</div>
                                                </div>
                                                <Button type="button" size="sm" onClick={() => addOption("receita", recipe)}>
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Adicionar
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {formatosVenda.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">Nenhum formato de venda disponível</div>
                                    ) : (
                                        formatosVenda.map((formato) => (
                                            <div key={formato.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                                <div>
                                                    <div className="font-medium">{formato.nome}</div>
                                                    <div className="text-sm text-gray-500">Custo: € {formato.custo_unitario.toFixed(2)}</div>
                                                </div>
                                                <Button type="button" size="sm" onClick={() => addOption("formato_venda", formato)}>
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Adicionar
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <Button type="button" className="mt-4 self-end" onClick={() => setShowAddOptionModal(false)}>
                            Fechar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

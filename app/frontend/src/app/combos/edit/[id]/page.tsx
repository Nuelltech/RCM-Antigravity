"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { Plus, Trash2, ArrowLeft, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { CategoryBuilder } from "@/components/combos/CategoryBuilder";

interface Recipe {
    id: number;
    nome: string;
    tipo: "Final" | "Pre-preparo";
    custo_por_porcao: number;
}

interface Product {
    id: number;
    nome: string;
    unidade_medida: string;
    variacoes: {
        preco_unitario: number;
    }[];
}

interface ComboItemRow {
    id: string;
    type: "recipe" | "product";
    receita_id?: number;
    produto_id?: number;
    nome: string;
    quantidade: number;
    custo_unitario: number;
    custo_total: number;
    observacoes: string;
}

interface ComboOption {
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
    opcoes: ComboOption[];
}

export default function EditComboPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Form fields
    const [tipo, setTipo] = useState<"Simples" | "Complexo">("Simples");
    const [nome, setNome] = useState("");
    const [descricao, setDescricao] = useState("");
    const [imagemUrl, setImagemUrl] = useState("");

    // Complex combo state
    const [items, setItems] = useState<ComboItemRow[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalTab, setModalTab] = useState<"recipe" | "product">("recipe");

    // Simple combo state
    const [categorias, setCategorias] = useState<CategoryRow[]>([]);

    // Calculated total
    const custoTotal = tipo === "Complexo"
        ? items.reduce((sum, item) => sum + item.custo_total, 0)
        : categorias.reduce((sum, cat) => {
            if (cat.opcoes.length === 0) return sum;
            return sum + Math.max(...cat.opcoes.map(opt => opt.custo_unitario));
        }, 0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [recipesData, productsData, comboData] = await Promise.all([
                fetchClient("/recipes?limit=1000"),
                fetchClient("/products?limit=1000"),
                fetchClient(`/combos/${params.id}`),
            ]);

            setRecipes((recipesData.data || []).filter((r: Recipe) => r.tipo === "Final").sort((a: Recipe, b: Recipe) => a.nome.localeCompare(b.nome)));
            setProducts((productsData.data || []).sort((a: Product, b: Product) => a.nome.localeCompare(b.nome)));

            setNome(comboData.nome);
            setDescricao(comboData.descricao || "");
            setTipo(comboData.tipo);

            if (comboData.tipo === "Complexo" && comboData.itens) {
                setItems(comboData.itens.map((item: any) => ({
                    id: Date.now().toString() + Math.random(),
                    type: item.receita_id ? "recipe" : "product",
                    receita_id: item.receita_id,
                    produto_id: item.produto_id,
                    nome: item.receita?.nome || item.produto?.nome || "Item desconhecido",
                    quantidade: Number(item.quantidade),
                    custo_unitario: Number(item.custo_unitario),
                    custo_total: Number(item.custo_total),
                    observacoes: item.observacoes || "",
                })));
            } else if (comboData.tipo === "Simples" && comboData.categorias) {
                setCategorias(comboData.categorias.map((cat: any) => ({
                    id: Date.now().toString() + Math.random(),
                    categoria: cat.categoria,
                    ordem: cat.ordem,
                    obrigatoria: cat.obrigatoria,
                    opcoes: cat.opcoes.map((opt: any) => ({
                        id: Date.now().toString() + Math.random(),
                        tipo: opt.receita_id ? "receita" : "formato_venda",
                        receita_id: opt.receita_id,
                        formato_venda_id: opt.formato_venda_id,
                        nome: opt.receita?.nome || opt.formatoVenda?.nome || "Opção desconhecida",
                        custo_unitario: Number(opt.custo_unitario),
                    })).sort((a: ComboOption, b: ComboOption) => a.nome.localeCompare(b.nome)),
                })));
            }
        } catch (error) {
            console.error("Failed to load data:", error);
            alert("Erro ao carregar dados do combo.");
            router.push("/combos");
        } finally {
            setLoading(false);
        }
    };

    const addRecipe = (recipe: Recipe) => {
        setItems([
            ...items,
            {
                id: Date.now().toString(),
                type: "recipe",
                receita_id: recipe.id,
                nome: recipe.nome,
                quantidade: 1,
                custo_unitario: recipe.custo_por_porcao,
                custo_total: recipe.custo_por_porcao,
                observacoes: "",
            },
        ]);
        setShowAddModal(false);
    };

    const addProduct = (product: Product) => {
        const price = Number(product.variacoes[0]?.preco_unitario || 0);
        setItems([
            ...items,
            {
                id: Date.now().toString(),
                type: "product",
                produto_id: product.id,
                nome: product.nome,
                quantidade: 1,
                custo_unitario: price,
                custo_total: price,
                observacoes: "",
            },
        ]);
        setShowAddModal(false);
    };

    const updateQuantity = (id: string, quantidade: number) => {
        setItems(
            items.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        quantidade,
                        custo_total: quantidade * item.custo_unitario,
                    }
                    : item
            )
        );
    };

    const updateObservacoes = (id: string, observacoes: string) => {
        setItems(items.map((item) => (item.id === id ? { ...item, observacoes } : item)));
    };

    const removeItem = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nome.trim()) {
            alert("❌ Nome do combo é obrigatório");
            return;
        }

        if (tipo === "Complexo" && items.length === 0) {
            alert("❌ Adicione pelo menos um item ao combo complexo");
            return;
        }

        if (tipo === "Simples" && categorias.length === 0) {
            alert("❌ Adicione pelo menos uma categoria ao combo simples");
            return;
        }

        setSaving(true);

        try {
            const payload = tipo === "Complexo" ? {
                nome,
                tipo: "Complexo" as const,
                descricao: descricao || undefined,
                imagem_url: imagemUrl || undefined,
                itens: items.map((item) => ({
                    receita_id: item.receita_id,
                    produto_id: item.produto_id,
                    quantidade: item.quantidade,
                    observacoes: item.observacoes || undefined,
                })),
            } : {
                nome,
                tipo: "Simples" as const,
                descricao: descricao || undefined,
                imagem_url: imagemUrl || undefined,
                categorias: categorias.map((cat) => ({
                    categoria: cat.categoria,
                    ordem: cat.ordem,
                    obrigatoria: cat.obrigatoria,
                    opcoes: cat.opcoes.map((opc) => ({
                        receita_id: opc.receita_id,
                        formato_venda_id: opc.formato_venda_id,
                    })),
                })),
            };

            await fetchClient(`/combos/${params.id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            alert("✅ Combo atualizado com sucesso!");
            router.push("/combos");
        } catch (error: any) {
            alert(`❌ Erro ao atualizar combo: ${error.message || "Erro desconhecido"}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-screen">
                    <p>A carregar...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-6xl">
                <Link
                    href="/combos"
                    className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para Combos
                </Link>

                <h1 className="mb-8 text-3xl font-bold tracking-tight">Editar Combo</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Básicas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Tipo Selector - Disabled for Edit */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo de Combo</label>
                                <div className="flex gap-4 opacity-75">
                                    <div
                                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${tipo === "Simples"
                                            ? "border-purple-600 bg-purple-50 text-purple-900"
                                            : "border-gray-200 bg-gray-50 text-gray-400"
                                            }`}
                                    >
                                        <div className="font-semibold">📋 Combo Simples</div>
                                        <div className="text-xs mt-1">
                                            Menu com categorias e opções
                                        </div>
                                    </div>
                                    <div
                                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${tipo === "Complexo"
                                            ? "border-purple-600 bg-purple-50 text-purple-900"
                                            : "border-gray-200 bg-gray-50 text-gray-400"
                                            }`}
                                    >
                                        <div className="font-semibold">📦 Combo Fixo</div>
                                        <div className="text-xs mt-1">
                                            Itens fixos incluídos
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    O tipo de combo não pode ser alterado após a criação.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome do Combo *</label>
                                <Input
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Ex: Menu Executivo, Combo Família..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição</label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    placeholder="Descrição do combo..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">URL da Imagem</label>
                                <Input
                                    type="url"
                                    value={imagemUrl}
                                    onChange={(e) => setImagemUrl(e.target.value)}
                                    placeholder="https://exemplo.com/imagem.jpg"
                                />
                            </div>

                            {imagemUrl && (
                                <div className="aspect-video w-64 border rounded-lg overflow-hidden bg-gray-50">
                                    <img
                                        src={imagemUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Cost Display */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm text-gray-500 mb-1">Custo Total do Combo</div>
                            <div className="text-3xl font-bold">€ {custoTotal.toFixed(2)}</div>
                        </CardContent>
                    </Card>

                    {/* Conditional Content Based on Type */}
                    {tipo === "Complexo" ? (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Itens do Combo</CardTitle>
                                <Button type="button" onClick={() => setShowAddModal(true)} size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar Item
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {items.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                                        Tipo
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                                        Nome
                                                    </th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                                        Quantidade
                                                    </th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                                        Custo Unit.
                                                    </th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                                        Custo Total
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                                        Observações
                                                    </th>
                                                    <th className="px-3 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="px-3 py-2">
                                                            <span
                                                                className={`inline-block px-2 py-1 rounded text-xs font-medium ${item.type === "recipe"
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-blue-100 text-blue-700"
                                                                    }`}
                                                            >
                                                                {item.type === "recipe" ? "Receita" : "Produto"}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 font-medium">{item.nome}</td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                lang="en"
                                                                inputMode="decimal"
                                                                className="h-9 w-24 text-right"
                                                                value={item.quantidade}
                                                                onChange={(e) =>
                                                                    updateQuantity(item.id, Number(e.target.value))
                                                                }
                                                                min="0.01"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-sm">
                                                            € {item.custo_unitario.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-medium">
                                                            € {item.custo_total.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                className="h-9"
                                                                value={item.observacoes}
                                                                onChange={(e) =>
                                                                    updateObservacoes(item.id, e.target.value)
                                                                }
                                                                placeholder="Notas..."
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeItem(item.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-red-600" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <CategoryBuilder categorias={categorias} onChange={setCategorias} />
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Link href="/combos">
                            <Button variant="outline" type="button">
                                Cancelar
                            </Button>
                        </Link>
                        <Button type="submit" disabled={saving}>
                            {saving ? "A guardar..." : "Guardar Alterações"}
                        </Button>
                    </div>
                </form>

                {/* Add Item Modal (for Complex combos) */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
                            <h2 className="text-xl font-bold mb-4">Adicionar Item ao Combo</h2>

                            {/* Tabs */}
                            <div className="flex gap-2 mb-4 border-b">
                                <button
                                    type="button"
                                    className={`px-4 py-2 font-medium transition-colors ${modalTab === "recipe"
                                        ? "border-b-2 border-purple-600 text-purple-600"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    onClick={() => setModalTab("recipe")}
                                >
                                    Receitas
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 py-2 font-medium transition-colors ${modalTab === "product"
                                        ? "border-b-2 border-purple-600 text-purple-600"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    onClick={() => setModalTab("product")}
                                >
                                    Produtos
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto">
                                {modalTab === "recipe" ? (
                                    <div className="space-y-2">
                                        {recipes.map((recipe) => (
                                            <div
                                                key={recipe.id}
                                                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                                            >
                                                <div>
                                                    <div className="font-medium">{recipe.nome}</div>
                                                    <div className="text-sm text-gray-500">
                                                        Custo: € {recipe.custo_por_porcao.toFixed(2)}
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => addRecipe(recipe)}
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Adicionar
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {products.map((product) => (
                                            <div
                                                key={product.id}
                                                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                                            >
                                                <div>
                                                    <div className="font-medium">{product.nome}</div>
                                                    <div className="text-sm text-gray-500">
                                                        Preço: €{" "}
                                                        {Number(product.variacoes[0]?.preco_unitario || 0).toFixed(2)}{" "}
                                                        / {product.unidade_medida}
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => addProduct(product)}
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Adicionar
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Close */}
                            <div className="flex justify-end mt-4">
                                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

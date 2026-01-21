"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";

interface Product {
    id: number;
    nome: string;
    unidade_medida: string;
    variacoes: {
        preco_unitario: number;
    }[];
}

interface Recipe {
    id: number;
    nome: string;
    custo_por_porcao: number;
    unidade_medida: string;
}

interface IngredientRow {
    id: string;
    tipo: 'produto' | 'preparo';
    produto_id: number | null;
    receita_preparo_id: number | null;
    produto_nome: string;
    quantidade_bruta: number;
    quantidade_liquida: number;
    rentabilidade: number;
    unidade: string;
    preco_unitario: number;
    custo_ingrediente: number;
    notas: string;
}

interface StepRow {
    id: string;
    ordem: number;
    descricao: string;
}

export default function EditRecipePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [prepreparos, setPrepreparos] = useState<Recipe[]>([]);

    // Recipe form fields
    const [nome, setNome] = useState("");
    const [numeroPorcoes, setNumeroPorcoes] = useState(1);
    const [tempoPreparacao, setTempoPreparacao] = useState<number | undefined>();
    const [quantidadeProduzida, setQuantidadeProduzida] = useState<number | undefined>();
    const [unidadeMedida, setUnidadeMedida] = useState("KG");
    const [tipo, setTipo] = useState<"Final" | "Pre-preparo">("Final");
    const [descricao, setDescricao] = useState("");
    const [imagemUrl, setImagemUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [quantidadePorPorcao, setQuantidadePorPorcao] = useState<number | undefined>();

    // Ingredients and steps
    const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
    const [steps, setSteps] = useState<StepRow[]>([]);

    // Calculated values
    const [totalCMV, setTotalCMV] = useState(0);
    const [cmvPerPortion, setCmvPerPortion] = useState(0);

    useEffect(() => {
        loadProducts();
        loadPrepreparos();
        loadRecipe();
    }, [params.id]);

    useEffect(() => {
        // Recalculate CMV when ingredients or portions change
        const total = ingredients.reduce((sum, ing) => sum + ing.custo_ingrediente, 0);
        setTotalCMV(total);
        setCmvPerPortion(numeroPorcoes > 0 ? total / numeroPorcoes : 0);
    }, [ingredients, numeroPorcoes]);

    useEffect(() => {
        // Calculate quantity per portion
        if (quantidadeProduzida && numeroPorcoes > 0) {
            setQuantidadePorPorcao(quantidadeProduzida / numeroPorcoes);
        } else {
            setQuantidadePorPorcao(undefined);
        }
    }, [quantidadeProduzida, numeroPorcoes]);


    const loadProducts = async () => {
        try {
            const data = await fetchClient("/products?limit=1000");
            setProducts((data.data || []).sort((a: Product, b: Product) => a.nome.localeCompare(b.nome)));
        } catch (error) {
            console.error("Failed to load products:", error);
        }
    };

    const loadPrepreparos = async () => {
        try {
            const data = await fetchClient("/recipes?type=Pre-preparo&limit=1000");
            setPrepreparos((data.data || []).sort((a: Recipe, b: Recipe) => a.nome.localeCompare(b.nome)));
        } catch (error) {
            console.error("Failed to load pre-preparations:", error);
        }
    };

    const loadRecipe = async () => {
        try {
            const data = await fetchClient(`/recipes/${params.id}`);
            console.log('📋 Recipe data loaded:', data);
            console.log('🥗 Ingredientes:', data.ingredientes);

            // Fill form
            setNome(data.nome);
            setNumeroPorcoes(data.numero_porcoes);
            setTempoPreparacao(data.tempo_preparacao);
            setQuantidadeProduzida(data.quantidade_total_produzida);
            setUnidadeMedida(data.unidade_medida || "KG");
            setTipo(data.tipo);
            setDescricao(data.descricao || "");
            setImagemUrl(data.imagem_url || "");
            setVideoUrl(data.video_url || "");

            // Fill ingredients
            const loadedIngredients: IngredientRow[] = data.ingredientes.map((ing: any) => {
                console.log('🔍 Processando ingrediente:', ing);
                const quantidadeBruta = ing.quantidade_bruta !== null ? Number(ing.quantidade_bruta) : Number(ing.quantidade || 0);
                const quantidadeLiquida = ing.quantidade_liquida !== null ? Number(ing.quantidade_liquida) : quantidadeBruta;
                const rentabilidade = quantidadeBruta > 0 ? (quantidadeLiquida / quantidadeBruta) * 100 : 100;

                return {
                    id: ing.id.toString(),
                    tipo: ing.receita_preparo_id ? 'preparo' : 'produto',
                    produto_id: ing.produto_id,
                    receita_preparo_id: ing.receita_preparo_id,
                    produto_nome: ing.produto?.nome || ing.receita_preparo?.nome || "",
                    quantidade_bruta: quantidadeBruta,
                    quantidade_liquida: quantidadeLiquida,
                    rentabilidade: rentabilidade,
                    unidade: ing.produto?.unidade_medida || ing.receita_preparo?.unidade_medida || ing.unidade || "",
                    preco_unitario: Number(ing.produto?.variacoes?.[0]?.preco_unitario || 0) || Number(ing.receita_preparo?.custo_por_porcao || 0),
                    custo_ingrediente: Number(ing.custo_ingrediente || 0),
                    notas: ing.notas || "",
                };
            });
            console.log('✅ Ingredientes carregados:', loadedIngredients);
            setIngredients(loadedIngredients);

            // Fill steps
            const loadedSteps: StepRow[] = (data.etapas || []).map((step: any) => ({
                id: step.id.toString(),
                ordem: step.numero_etapa,
                descricao: step.descricao,
            }));
            setSteps(loadedSteps);
        } catch (error) {
            console.error("Failed to load recipe:", error);
            alert("Erro ao carregar receita");
            router.push("/recipes");
        } finally {
            setLoading(false);
        }
    };

    const updateIngredient = (id: string, field: keyof IngredientRow, value: any) => {
        setIngredients(
            ingredients.map((ing) => {
                if (ing.id !== id) return ing;

                const updated = { ...ing, [field]: value };

                // If product changed, fetch product details
                if (field === "produto_id" && value) {
                    const product = products.find((p) => p.id === value);
                    if (product) {
                        updated.produto_nome = product.nome;
                        updated.unidade = product.unidade_medida;
                        updated.preco_unitario = Number(product.variacoes[0]?.preco_unitario || 0);
                    }
                }

                // If pre-preparation changed, fetch recipe details
                if (field === "receita_preparo_id" && value) {
                    const preparo = prepreparos.find((r) => r.id === value);
                    if (preparo) {
                        updated.produto_nome = preparo.nome;
                        updated.unidade = preparo.unidade_medida || 'Porção';
                        updated.preco_unitario = Number(preparo.custo_por_porcao);
                    }
                }

                // Recalculate cost
                updated.custo_ingrediente = updated.quantidade_bruta * updated.preco_unitario;

                // Recalculate rentabilidade
                if (updated.quantidade_bruta > 0) {
                    updated.rentabilidade = (updated.quantidade_liquida / updated.quantidade_bruta) * 100;
                } else {
                    updated.rentabilidade = 100;
                }

                return updated;
            })
        );
    };

    const addIngredient = () => {
        setIngredients([
            ...ingredients,
            {
                id: Date.now().toString(),
                tipo: 'produto',
                produto_id: null,
                receita_preparo_id: null,
                produto_nome: "",
                quantidade_bruta: 0,
                quantidade_liquida: 0,
                rentabilidade: 100,
                unidade: "",
                preco_unitario: 0,
                custo_ingrediente: 0,
                notas: "",
            },
        ]);
    };

    const addPreparo = () => {
        setIngredients([
            ...ingredients,
            {
                id: Date.now().toString(),
                tipo: 'preparo',
                produto_id: null,
                receita_preparo_id: null,
                produto_nome: "",
                quantidade_bruta: 0,
                quantidade_liquida: 0,
                rentabilidade: 100,
                unidade: "",
                preco_unitario: 0,
                custo_ingrediente: 0,
                notas: "",
            },
        ]);
    };

    const removeIngredient = (id: string) => {
        setIngredients(ingredients.filter((ing) => ing.id !== id));
    };

    const addStep = () => {
        setSteps([
            ...steps,
            {
                id: Date.now().toString(),
                ordem: steps.length + 1,
                descricao: "",
            },
        ]);
    };

    const updateStep = (id: string, descricao: string) => {
        setSteps(steps.map((step) => (step.id === id ? { ...step, descricao } : step)));
    };

    const removeStep = (id: string) => {
        const filtered = steps.filter((step) => step.id !== id);
        // Reorder
        setSteps(filtered.map((step, idx) => ({ ...step, ordem: idx + 1 })));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                nome,
                numero_porcoes: numeroPorcoes,
                tempo_preparacao: tempoPreparacao,
                quantidade_total_produzida: quantidadeProduzida,
                unidade_medida: unidadeMedida,
                tipo,
                descricao,
                imagem_url: imagemUrl,
                video_url: videoUrl,
                ingredientes: ingredients.map((ing) => ({
                    produto_id: ing.tipo === 'produto' ? ing.produto_id! : undefined,
                    receita_preparo_id: ing.tipo === 'preparo' ? ing.receita_preparo_id! : undefined,
                    quantidade_bruta: ing.quantidade_bruta,
                    quantidade_liquida: ing.quantidade_liquida || undefined,
                    notas: ing.notas,
                })),
                etapas: steps.map((step) => ({
                    ordem: step.ordem,
                    descricao: step.descricao,
                })),
            };

            await fetchClient(`/recipes/${params.id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            alert("✅ Receita atualizada com sucesso!");
            router.push(`/recipes/${params.id}`);
        } catch (error: any) {
            console.error("Error:", error);
            alert(`❌ Erro: ${error.message || "Erro ao atualizar receita"}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Tem a certeza que deseja apagar a receita "${nome}"?`)) {
            return;
        }

        try {
            await fetchClient(`/recipes/${params.id}`, { method: "DELETE" });
            toast({
                title: "✅ Receita eliminada",
                description: "A receita foi removida com sucesso.",
            });
            router.push("/recipes");
        } catch (error: any) {
            console.error("Delete error:", error);
            // Extrair mensagem de erro do backend
            const errorMessage = error.error || error.message || "Erro ao eliminar receita";
            toast({
                title: "❌ Não foi possível eliminar",
                description: errorMessage,
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">A carregar receita...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/recipes/${params.id}`}>
                            <Button type="button" variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Cancelar
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold">Editar Receita</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Apagar Receita
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "A guardar..." : "Guardar Alterações"}
                        </Button>
                    </div>
                </div>

                {/* CMV Display */}
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">CMV Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600">€ {totalCMV.toFixed(2)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">CMV por Porção</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-blue-600">€ {cmvPerPortion.toFixed(2)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informações Básicas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Nome da Receita *</label>
                                <Input
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tipo *</label>
                                <select
                                    value={tipo}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTipo(e.target.value as "Final" | "Pre-preparo")}
                                    className="w-full px-3 py-2 border rounded-md"
                                    required
                                >
                                    <option value="Final">Final</option>
                                    <option value="Pre-preparo">Pré-preparo</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Nº de Porções *</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    lang="en"
                                    inputMode="decimal"
                                    value={numeroPorcoes}
                                    onChange={(e) => setNumeroPorcoes(parseFloat(e.target.value))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tempo de Preparação (min)</label>
                                <Input
                                    type="number"
                                    lang="en"
                                    inputMode="decimal"
                                    value={tempoPreparacao || ""}
                                    onChange={(e) => setTempoPreparacao(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Qtd Total Produzida</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    lang="en"
                                    inputMode="decimal"
                                    value={quantidadeProduzida || ""}
                                    onChange={(e) => setQuantidadeProduzida(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                            </div>
                        </div>

                        {/* Calculated Portion Quantity Indicator */}
                        {quantidadePorPorcao && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">
                                    Quantidade por Porção
                                </label>
                                <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                                    {quantidadePorPorcao.toFixed(2)} {unidadeMedida}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2">Unidade de Medida</label>
                            <select
                                value={unidadeMedida}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUnidadeMedida(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="KG">KG</option>
                                <option value="L">L</option>
                                <option value="Unidade">Unidade</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Descrição</label>
                            <textarea
                                value={descricao}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescricao(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">URL da Imagem</label>
                                <Input
                                    type="url"
                                    value={imagemUrl}
                                    onChange={(e) => setImagemUrl(e.target.value)}
                                    placeholder="https://exemplo.com/imagem.jpg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">URL do Vídeo</label>
                                <Input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://youtube.com/..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Ingredients */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Ingredientes</CardTitle>
                            <Button type="button" onClick={addIngredient} size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Ingrediente
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">Produto</th>
                                        <th className="text-left p-2">Qtd Bruta</th>
                                        <th className="text-left p-2">Qtd Líquida</th>
                                        <th className="text-left p-2">Rentab. %</th>
                                        <th className="text-left p-2">Unidade</th>
                                        <th className="text-left p-2">Preço Unit.</th>
                                        <th className="text-left p-2">Custo</th>
                                        <th className="text-left p-2">Notas</th>
                                        <th className="text-left p-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingredients.filter(ing => ing.tipo === 'produto').map((ing) => (
                                        <tr key={ing.id} className="border-b">
                                            <td className="p-2">
                                                <select
                                                    value={ing.produto_id || ""}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                        updateIngredient(ing.id, "produto_id", parseInt(e.target.value))
                                                    }
                                                    className="w-full px-2 py-1 border rounded"
                                                    required
                                                >
                                                    <option value="">Selecione...</option>
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    step="0.001"
                                                    lang="en"
                                                    inputMode="decimal"
                                                    value={ing.quantidade_bruta}
                                                    onChange={(e) =>
                                                        updateIngredient(ing.id, "quantidade_bruta", parseFloat(e.target.value) || 0)
                                                    }
                                                    className="w-24"
                                                    required
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    step="0.001"
                                                    lang="en"
                                                    inputMode="decimal"
                                                    value={ing.quantidade_liquida}
                                                    onChange={(e) =>
                                                        updateIngredient(ing.id, "quantidade_liquida", parseFloat(e.target.value) || 0)
                                                    }
                                                    className="w-24"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={ing.rentabilidade.toFixed(2)}
                                                    className="w-20 bg-gray-50"
                                                    readOnly
                                                    title="Calculado automaticamente: (Qtd Líquida / Qtd Bruta) × 100"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    value={ing.unidade}
                                                    className="w-16 bg-gray-50"
                                                    readOnly
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={ing.preco_unitario}
                                                    className="w-24 bg-gray-50"
                                                    readOnly
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    value={`€ ${ing.custo_ingrediente.toFixed(2)}`}
                                                    className="w-24 bg-gray-50"
                                                    readOnly
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    value={ing.notas}
                                                    onChange={(e) => updateIngredient(ing.id, "notas", e.target.value)}
                                                    className="w-32"
                                                    placeholder="Notas..."
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeIngredient(ing.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Pre-Preparations */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Pré-Preparos</CardTitle>
                            <Button type="button" onClick={addPreparo} size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Pré-Preparo
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {ingredients.filter(ing => ing.tipo === 'preparo').length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Nenhum pré-preparo adicionado.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-2">Pré-Preparo</th>
                                            <th className="text-left p-2">Qty (Porções)</th>
                                            <th className="text-left p-2">Unidade</th>
                                            <th className="text-left p-2">Custo/Porção</th>
                                            <th className="text-left p-2">Custo Total</th>
                                            <th className="text-left p-2">Notas</th>
                                            <th className="text-left p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ingredients.filter(ing => ing.tipo === 'preparo').map((ing) => (
                                            <tr key={ing.id} className="border-b">
                                                <td className="p-2">
                                                    <select
                                                        value={ing.receita_preparo_id || ""}
                                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                            updateIngredient(ing.id, "receita_preparo_id", parseInt(e.target.value))
                                                        }
                                                        className="w-full px-2 py-1 border rounded"
                                                        required
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {prepreparos.map((r) => (
                                                            <option key={r.id} value={r.id}>
                                                                {r.nome}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        lang="en"
                                                        inputMode="decimal"
                                                        value={ing.quantidade_bruta}
                                                        onChange={(e) =>
                                                            updateIngredient(ing.id, "quantidade_bruta", parseFloat(e.target.value) || 0)
                                                        }
                                                        className="w-24"
                                                        required
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={ing.unidade}
                                                        className="w-20 bg-gray-50"
                                                        readOnly
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={ing.preco_unitario}
                                                        className="w-24 bg-gray-50"
                                                        readOnly
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={`€ ${ing.custo_ingrediente.toFixed(2)}`}
                                                        className="w-24 bg-gray-50"
                                                        readOnly
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={ing.notas}
                                                        onChange={(e) => updateIngredient(ing.id, "notas", e.target.value)}
                                                        className="w-32"
                                                        placeholder="Notas..."
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeIngredient(ing.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
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

                {/* Steps */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Modo de Preparo</CardTitle>
                            <Button type="button" onClick={addStep} size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Etapa
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {steps.map((step) => (
                            <div key={step.id} className="flex gap-3 items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                                    {step.ordem}
                                </div>
                                <Input
                                    value={step.descricao}
                                    onChange={(e) => updateStep(step.id, e.target.value)}
                                    placeholder="Descreva esta etapa..."
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeStep(step.id)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>


            </form>

        </AppLayout>
    );
}

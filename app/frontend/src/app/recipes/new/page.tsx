"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { Plus, Trash2, ArrowLeft, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";

interface Product {
    id: number;
    nome: string;
    unidade_medida: string;
    variacoes: {
        preco_unitario: number;
    }[];
}

interface IngredientRow {
    id: string;
    produto_id: number | null;
    produto_nome: string;
    quantidade_bruta: number;
    quantidade_liquida: number;
    rentabilidade: number; // Calculado: (Qtd Líquida / Qtd Bruta) * 100
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

export default function NewRecipePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

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

    // Ingredients and steps
    const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
    const [steps, setSteps] = useState<StepRow[]>([]);

    // Calculated values
    const [totalCMV, setTotalCMV] = useState(0);
    const [cmvPerPortion, setCmvPerPortion] = useState(0);

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        // Recalculate CMV when ingredients or portions change
        const total = ingredients.reduce((sum, ing) => sum + ing.custo_ingrediente, 0);
        setTotalCMV(total);
        setCmvPerPortion(numeroPorcoes > 0 ? total / numeroPorcoes : 0);
    }, [ingredients, numeroPorcoes]);

    const loadProducts = async () => {
        try {
            console.log('🔍 Loading products...');
            const data = await fetchClient("/products?limit=1000");
            console.log('✅ Products loaded:', data?.data?.length || 0, 'products');
            setProducts((data.data || []).sort((a, b) => a.nome.localeCompare(b.nome)));
        } catch (error) {
            console.error("❌ Failed to load products:", error);
            alert("Erro ao carregar produtos. Verifica se o backend está a correr.");
        }
    };

    const addIngredient = () => {
        setIngredients([
            ...ingredients,
            {
                id: Date.now().toString(),
                produto_id: null,
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
                        // Convert Decimal to number
                        updated.preco_unitario = Number(product.variacoes[0]?.preco_unitario || 0);
                    }
                }

                // Recalculate cost
                updated.custo_ingrediente = updated.quantidade_bruta * updated.preco_unitario;

                // Recalculate rentabilidade: (Qtd Líquida / Qtd Bruta) * 100
                if (updated.quantidade_bruta > 0) {
                    updated.rentabilidade = (updated.quantidade_liquida / updated.quantidade_bruta) * 100;
                } else {
                    updated.rentabilidade = 0;
                }

                return updated;
            })
        );
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

    const removeStep = (id: string) => {
        const filtered = steps.filter((s) => s.id !== id);
        // Renumber steps
        setSteps(filtered.map((s, idx) => ({ ...s, ordem: idx + 1 })));
    };

    const updateStep = (id: string, descricao: string) => {
        setSteps(steps.map((s) => (s.id === id ? { ...s, descricao } : s)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nome.trim()) {
            alert("❌ Nome da receita é obrigatório");
            return;
        }

        if (ingredients.length === 0) {
            alert("❌ Adicione pelo menos um ingrediente");
            return;
        }

        if (ingredients.some((ing) => !ing.produto_id)) {
            alert("❌ Selecione um produto para todos os ingredientes");
            return;
        }

        if (ingredients.some((ing) => ing.quantidade_bruta <= 0)) {
            alert("❌ Quantidade bruta deve ser maior que zero");
            return;
        }

        setLoading(true);

        try {
            const payload = {
                nome,
                numero_porcoes: numeroPorcoes,
                tempo_preparacao: tempoPreparacao,
                quantidade_total_produzida: quantidadeProduzida,
                unidade_medida: unidadeMedida,
                tipo,
                descricao: descricao || undefined,
                imagem_url: imagemUrl || undefined,
                video_url: videoUrl || undefined,
                ingredientes: ingredients.map((ing) => ({
                    produto_id: ing.produto_id!,
                    quantidade_bruta: ing.quantidade_bruta,
                    quantidade_liquida: ing.quantidade_liquida || ing.quantidade_bruta,
                    notas: ing.notas || undefined,
                })),
                etapas: steps.length > 0 ? steps.map((s) => ({
                    ordem: s.ordem,
                    descricao: s.descricao,
                })) : undefined,
            };

            await fetchClient("/recipes", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            alert("✅ Receita criada com sucesso!");
            router.push("/recipes");
        } catch (error: any) {
            alert(`❌ Erro ao criar receita: ${error.message || "Erro desconhecido"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-6xl">
                <Link
                    href="/recipes"
                    className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para Receitas
                </Link>

                <h1 className="mb-8 text-3xl font-bold tracking-tight">Nova Receita</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Básicas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium">Nome da Receita *</label>
                                    <Input
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Ex: Arroz Branco, Bacalhau à Lagareiro..."
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nº de Porções *</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        lang="en"
                                        inputMode="decimal"
                                        value={numeroPorcoes}
                                        onChange={(e) => setNumeroPorcoes(Number(e.target.value))}
                                        min="0.01"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tempo de Preparação (min)</label>
                                    <Input
                                        type="number"
                                        lang="en"
                                        inputMode="decimal"
                                        value={tempoPreparacao || ""}
                                        onChange={(e) => setTempoPreparacao(e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="Em minutos"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Quantidade Total Produzida</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        lang="en"
                                        inputMode="decimal"
                                        value={quantidadeProduzida || ""}
                                        onChange={(e) => setQuantidadeProduzida(e.target.value ? Number(e.target.value) : undefined)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Unidade de Medida</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={unidadeMedida}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUnidadeMedida(e.target.value)}
                                    >
                                        <option value="KG">Quilograma (KG)</option>
                                        <option value="L">Litro (L)</option>
                                        <option value="Unidade">Unidade</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tipo de Receita *</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={tipo}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTipo(e.target.value as "Final" | "Pre-preparo")}
                                        required
                                    >
                                        <option value="Final">Final</option>
                                        <option value="Pre-preparo">Pré-preparo</option>
                                    </select>
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium">Comentário da Receita</label>
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={descricao}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescricao(e.target.value)}
                                        placeholder="Comentários, observações ou notas sobre a receita..."
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

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">URL do Vídeo</label>
                                    <Input
                                        type="url"
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        placeholder="https://youtube.com/watch?v=..."
                                    />
                                </div>

                                {/* Image and Video Preview Side by Side */}
                                {(imagemUrl || videoUrl) && (
                                    <div className="col-span-2">
                                        <label className="text-sm font-medium mb-2 block">Pré-visualização</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Image Preview */}
                                            {imagemUrl && (
                                                <div className="relative aspect-[3/4] border rounded-lg overflow-hidden bg-gray-50">
                                                    <img
                                                        src={imagemUrl}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Video Preview */}
                                            {videoUrl && (
                                                <div className="relative aspect-[3/4] border rounded-lg overflow-hidden bg-black">
                                                    {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                                                        <div className="relative w-full h-full">
                                                            <iframe
                                                                className="w-full h-full"
                                                                src={(() => {
                                                                    let embedUrl = videoUrl;
                                                                    try {
                                                                        // Convert youtube.com/watch?v=ID to youtube.com/embed/ID
                                                                        if (embedUrl.includes("youtube.com/watch")) {
                                                                            const videoId = new URL(embedUrl).searchParams.get("v");
                                                                            embedUrl = `https://www.youtube.com/embed/${videoId}`;
                                                                        }
                                                                        // Convert youtu.be/ID to youtube.com/embed/ID
                                                                        else if (embedUrl.includes("youtu.be/")) {
                                                                            const videoId = embedUrl.split("youtu.be/")[1].split("?")[0];
                                                                            embedUrl = `https://www.youtube.com/embed/${videoId}`;
                                                                        }
                                                                    } catch (e) {
                                                                        console.error("Error parsing YouTube URL:", e);
                                                                    }
                                                                    return embedUrl;
                                                                })()}
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                                title="Recipe Video"
                                                            />
                                                            {/* Fallback link */}
                                                            <div className="absolute bottom-2 right-2">
                                                                <a
                                                                    href={videoUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                                                                >
                                                                    Ver no YouTube
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <video
                                                            className="w-full h-full object-cover"
                                                            controls
                                                            src={videoUrl}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* CMV Display */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Total CMV</div>
                                    <div className="text-3xl font-bold">€ {totalCMV.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">CMV por Porção</div>
                                    <div className="text-3xl font-bold">€ {cmvPerPortion.toFixed(2)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ingredients */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Ficha Técnica de Ingredientes</CardTitle>
                            <Button type="button" onClick={addIngredient} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {ingredients.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum ingrediente adicionado. Clique em "Adicionar" para começar.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Produto</th>
                                                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Qty Bruta</th>
                                                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Qty Líquida</th>
                                                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Rentabilidade</th>
                                                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Unid</th>
                                                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Preço Unit</th>
                                                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Custo</th>
                                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Comentário</th>
                                                <th className="px-2 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {ingredients.map((ing) => (
                                                <tr key={ing.id}>
                                                    <td className="px-2 py-2">
                                                        <select
                                                            className="flex h-9 w-full rounded border border-input bg-background px-2 text-sm"
                                                            value={ing.produto_id || ""}
                                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateIngredient(ing.id, "produto_id", Number(e.target.value))}
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {products.map((p) => (
                                                                <option key={p.id} value={p.id}>{p.nome}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            type="number"
                                                            step="0.001"
                                                            lang="en"
                                                            inputMode="decimal"
                                                            className="h-9 w-24 text-right"
                                                            value={ing.quantidade_bruta}
                                                            onChange={(e) => updateIngredient(ing.id, "quantidade_bruta", Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            type="number"
                                                            step="0.001"
                                                            lang="en"
                                                            inputMode="decimal"
                                                            className="h-9 w-24 text-right"
                                                            value={ing.quantidade_liquida}
                                                            onChange={(e) => updateIngredient(ing.id, "quantidade_liquida", Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-sm">
                                                        {ing.quantidade_bruta > 0
                                                            ? ((ing.quantidade_liquida / ing.quantidade_bruta) * 100).toFixed(1) + '%'
                                                            : '-'
                                                        }
                                                    </td>
                                                    <td className="px-2 py-2 text-center text-sm">{ing.unidade || "-"}</td>
                                                    <td className="px-2 py-2 text-right text-sm">€ {Number(ing.preco_unitario || 0).toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right font-medium">€ {Number(ing.custo_ingrediente || 0).toFixed(2)}</td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            className="h-9"
                                                            value={ing.notas}
                                                            onChange={(e) => updateIngredient(ing.id, "notas", e.target.value)}
                                                            placeholder="Notas..."
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeIngredient(ing.id)}
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

                    {/* Steps */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Etapas da Receita</CardTitle>
                            <Button type="button" onClick={addStep} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Etapa
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {steps.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhuma etapa adicionada (opcional).
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {steps.map((step) => (
                                        <div key={step.id} className="flex gap-3">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 font-semibold text-sm">
                                                {step.ordem}
                                            </div>
                                            <textarea
                                                className="flex-1 min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={step.descricao}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateStep(step.id, e.target.value)}
                                                placeholder="Descreva esta etapa..."
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeStep(step.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Link href="/recipes">
                            <Button variant="outline" type="button">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={loading}>
                            {loading ? "A criar..." : "Confirmar Receita"}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

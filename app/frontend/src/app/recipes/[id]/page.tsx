"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";

export default function ViewRecipePage() {
    const params = useParams();
    const router = useRouter();
    const [recipe, setRecipe] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRecipe();
    }, [params.id]);

    const loadRecipe = async () => {
        try {
            const data = await fetchClient(`/recipes/${params.id}`);
            setRecipe(data);
        } catch (error) {
            console.error("Failed to load recipe:", error);
            alert("Erro ao carregar receita");
            router.push("/recipes");
        } finally {
            setLoading(false);
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

    if (!recipe) {
        return null;
    }

    const cmvTotal = recipe.custo_total || 0;
    const cmvPerPortion = recipe.custo_por_porcao || 0;

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/recipes">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold">{recipe.nome}</h1>
                    </div>
                    <Link href={`/recipes/edit/${recipe.id}`}>
                        <Button>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Receita
                        </Button>
                    </Link>
                </div>

                {/* Image and Video Side by Side */}
                {(recipe.imagem_url || recipe.video_url) && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                {recipe.imagem_url && (
                                    <div className="max-h-64 border rounded-lg overflow-hidden bg-gray-50">
                                        <img
                                            src={recipe.imagem_url}
                                            alt={recipe.nome}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                                {recipe.video_url && (
                                    <div className="max-h-64 border rounded-lg overflow-hidden bg-black">
                                        <iframe
                                            className="w-full h-64"
                                            src={(() => {
                                                let url = recipe.video_url;
                                                if (url.includes("youtube.com/watch")) {
                                                    const videoId = new URL(url).searchParams.get("v");
                                                    return `https://www.youtube.com/embed/${videoId}`;
                                                } else if (url.includes("youtu.be/")) {
                                                    const videoId = url.split("youtu.be/")[1].split("?")[0];
                                                    return `https://www.youtube.com/embed/${videoId}`;
                                                }
                                                return url;
                                            })()}
                                            allowFullScreen
                                            title={recipe.nome}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Recipe Info */}
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">CMV Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600">€ {cmvTotal.toFixed(2)}</p>
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
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Tipo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{recipe.tipo}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Metadata */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informações Básicas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500">Porções</label>
                                <p className="text-lg">{recipe.numero_porcoes}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Tempo de Preparação</label>
                                <p className="text-lg">{recipe.tempo_preparacao ? `${recipe.tempo_preparacao} min` : "-"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Quantidade Produzida</label>
                                <p className="text-lg">
                                    {recipe.quantidade_total_produzida
                                        ? `${recipe.quantidade_total_produzida} ${recipe.unidade_medida || ""}`
                                        : "-"}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Dificuldade</label>
                                <p className="text-lg">{recipe.dificuldade || "-"}</p>
                            </div>
                        </div>
                        {recipe.descricao && (
                            <div className="mt-4">
                                <label className="text-sm font-medium text-gray-500">Descrição</label>
                                <p className="text-gray-700 mt-1">{recipe.descricao}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Ingredients */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ingredientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="px-4 py-2 text-left text-sm font-medium">Produto</th>
                                        <th className="px-4 py-2 text-right text-sm font-medium">Qtd Bruta</th>
                                        <th className="px-4 py-2 text-right text-sm font-medium">Qtd Líquida</th>
                                        <th className="px-4 py-2 text-right text-sm font-medium">Rentabilidade</th>
                                        <th className="px-4 py-2 text-center text-sm font-medium">Unidade</th>
                                        <th className="px-4 py-2 text-right text-sm font-medium">Custo</th>
                                        <th className="px-4 py-2 text-left text-sm font-medium">Notas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recipe.ingredientes?.map((ing: any, idx: number) => (
                                        <tr key={idx} className="border-b">
                                            <td className="px-4 py-2">{ing.produto?.nome || "-"}</td>
                                            <td className="px-4 py-2 text-right">
                                                {Number(ing.quantidade_bruta).toFixed(3)}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {ing.quantidade_liquida ? Number(ing.quantidade_liquida).toFixed(3) : "-"}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {ing.quantidade_bruta > 0 && ing.quantidade_liquida
                                                    ? `${((ing.quantidade_liquida / ing.quantidade_bruta) * 100).toFixed(1)}%`
                                                    : "-"}
                                            </td>
                                            <td className="px-4 py-2 text-center">{ing.produto?.unidade_medida || "-"}</td>
                                            <td className="px-4 py-2 text-right font-medium">
                                                € {Number(ing.custo_ingrediente || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">{ing.notas || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Steps */}
                {recipe.etapas && recipe.etapas.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Modo de Preparação</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-4">
                                {recipe.etapas.map((step: any) => (
                                    <li key={step.id} className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                                            {step.numero_etapa}
                                        </span>
                                        <p className="flex-1 pt-1">{step.descricao}</p>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

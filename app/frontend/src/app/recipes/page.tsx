"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { Plus, Grid3X3, List, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";

interface Recipe {
    id: number;
    nome: string;
    tipo: "Final" | "Pre-preparo";
    numero_porcoes: number;
    quantidade_total_produzida: number | null;
    quantidade_por_porcao: number | null;
    custo_total: number;
    custo_por_porcao: number;
    imagem_url: string | null;
    descricao: string | null;
    categoria: string | null;
    dificuldade: string | null;
    _count: {
        ingredientes: number;
    };
}

export default function RecipesPage() {
    const router = useRouter();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"card" | "list">("card");
    const [sortBy, setSortBy] = useState("nome");

    useEffect(() => {
        loadRecipes();
    }, [sortBy]);

    const loadRecipes = async () => {
        try {
            const data = await fetchClient(`/recipes?sortBy=${sortBy}&order=asc`);
            setRecipes(data);
        } catch (error) {
            console.error("Failed to load recipes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (id: number) => {
        router.push(`/recipes/${id}`);
    };

    const handleEdit = (id: number) => {
        router.push(`/recipes/edit/${id}`);
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex h-96 items-center justify-center">
                    <div className="text-gray-400">A carregar receitas...</div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Receitas</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Gerencie as receitas do seu restaurante.
                        </p>
                    </div>
                    <Link href="/recipes/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nova Receita
                        </Button>
                    </Link>
                </div>

                {/* Filters and View */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <select
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="nome">Ordenar por Nome</option>
                            <option value="custo">Ordenar por Custo</option>
                            <option value="tipo">Ordenar por Tipo</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant={viewMode === "card" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("card")}
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("list")}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                {recipes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <ChefHat className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhuma receita encontrada</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Comece criando a sua primeira receita.
                        </p>
                        <Link href="/recipes/new">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Nova Receita
                            </Button>
                        </Link>
                    </div>
                ) : viewMode === "card" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recipes.map((recipe) => (
                            <div
                                key={recipe.id}
                                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                {/* Image */}
                                <div className="h-48 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                                    {recipe.imagem_url ? (
                                        <img
                                            src={recipe.imagem_url}
                                            alt={recipe.nome}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <ChefHat className="h-20 w-20 text-orange-300" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 space-y-3">
                                    <div>
                                        <h3 className="font-semibold text-lg">{recipe.nome}</h3>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${recipe.tipo === "Final"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-blue-100 text-blue-700"
                                            }`}>
                                            {recipe.tipo}
                                        </span>
                                    </div>

                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div className="flex justify-between">
                                            <span>Custo/Porção:</span>
                                            <span className="font-semibold">€ {recipe.custo_por_porcao.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Porções:</span>
                                            <span>{recipe.numero_porcoes}</span>
                                        </div>
                                        {recipe.quantidade_por_porcao && (
                                            <div className="flex justify-between">
                                                <span>Qty/Porção:</span>
                                                <span>{recipe.quantidade_por_porcao.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span>Ingredientes:</span>
                                            <span>{recipe._count.ingredientes}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleView(recipe.id)}
                                        >
                                            Ver
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleEdit(recipe.id)}
                                        >
                                            Editar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Porções</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo/Porção</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingredientes</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {recipes.map((recipe) => (
                                    <tr key={recipe.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{recipe.nome}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${recipe.tipo === "Final"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-blue-100 text-blue-700"
                                                }`}>
                                                {recipe.tipo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">{recipe.numero_porcoes}</td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            € {recipe.custo_por_porcao.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right">{recipe._count.ingredientes}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleView(recipe.id)}
                                                >
                                                    Ver
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleEdit(recipe.id)}
                                                >
                                                    Editar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

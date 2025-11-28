"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { Plus, Grid3X3, List, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import type { Combo } from "@/types/combo";

export default function CombosPage() {
    const router = useRouter();
    const [combos, setCombos] = useState<Combo[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"card" | "list">("card");
    const [sortBy, setSortBy] = useState("nome");

    useEffect(() => {
        loadCombos();
    }, [sortBy]);

    const loadCombos = async () => {
        try {
            const data = await fetchClient(`/combos?sortBy=${sortBy}&order=asc`);
            setCombos(data);
        } catch (error) {
            console.error("Failed to load combos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (id: number) => {
        router.push(`/combos/${id}`);
    };

    const handleEdit = (id: number) => {
        router.push(`/combos/edit/${id}`);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja eliminar este combo?")) return;

        try {
            await fetchClient(`/combos/${id}`, {
                method: "DELETE",
            });
            loadCombos(); // Reload list
        } catch (error) {
            console.error("Failed to delete combo:", error);
            alert("Erro ao eliminar combo");
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex h-96 items-center justify-center">
                    <div className="text-gray-400">A carregar combos...</div>
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
                        <h1 className="text-3xl font-bold tracking-tight">Combos</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Gerencie os combos do seu menu.
                        </p>
                    </div>
                    <Link href="/combos/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Combo
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
                {combos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Package2 className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum combo encontrado</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Comece criando o seu primeiro combo.
                        </p>
                        <Link href="/combos/new">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Combo
                            </Button>
                        </Link>
                    </div>
                ) : viewMode === "card" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {combos.map((combo) => (
                            <div
                                key={combo.id}
                                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                {/* Image */}
                                <div className="h-48 bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                                    {combo.imagem_url ? (
                                        <img
                                            src={combo.imagem_url}
                                            alt={combo.nome}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Package2 className="h-20 w-20 text-purple-300" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 space-y-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-lg">{combo.nome}</h3>
                                            <span
                                                className={`px-2 py-0.5 text-xs font-medium rounded ${combo.tipo === "Simples"
                                                        ? "bg-purple-100 text-purple-700"
                                                        : "bg-blue-100 text-blue-700"
                                                    }`}
                                            >
                                                {combo.tipo === "Simples" ? "📋 Simples" : "📦 Fixo"}
                                            </span>
                                        </div>
                                        {combo.descricao && (
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                {combo.descricao}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div className="flex justify-between">
                                            <span>Custo Total:</span>
                                            <span className="font-semibold">€ {combo.custo_total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{combo.tipo === "Simples" ? "Categorias:" : "Itens:"}</span>
                                            <span>
                                                {combo.tipo === "Simples"
                                                    ? (combo._count?.categorias || 0)
                                                    : (combo._count?.itens || 0)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleView(combo.id)}
                                        >
                                            Ver
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleEdit(combo.id)}
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
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Itens</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo Total</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {combos.map((combo) => (
                                    <tr key={combo.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{combo.nome}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-500 truncate max-w-xs">
                                                {combo.descricao || "-"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">{combo._count?.itens || 0}</td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            € {combo.custo_total.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleView(combo.id)}
                                                >
                                                    Ver
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleEdit(combo.id)}
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

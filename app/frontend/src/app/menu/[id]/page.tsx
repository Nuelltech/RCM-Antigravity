"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Package, ChefHat, Box } from "lucide-react";
import Link from "next/link";

export default function ViewMenuItemPage() {
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMenuItem();
    }, [params.id]);

    const loadMenuItem = async () => {
        try {
            const data = await fetchClient(`/menu/${params.id}`);
            setItem(data);
        } catch (error) {
            console.error("Failed to load menu item:", error);
            alert("Erro ao carregar item do menu");
            router.push("/menu");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">A carregar item...</p>
                </div>
            </AppLayout>
        );
    }

    if (!item) {
        return null;
    }

    // Determine cost and type
    let custo = 0;
    let tipo = "";
    let sourceIcon = null;
    let sourceLink = "";
    let sourceName = "";

    if (item.receita) {
        custo = item.receita.custo_por_porcao;
        tipo = "Receita";
        sourceIcon = <ChefHat className="w-5 h-5 text-orange-500" />;
        sourceLink = `/recipes/${item.receita.id}`;
        sourceName = item.receita.nome;
    } else if (item.combo) {
        custo = item.combo.custo_total;
        tipo = "Combo";
        sourceIcon = <Box className="w-5 h-5 text-purple-500" />;
        sourceLink = `/combos/${item.combo.id}`;
        sourceName = item.combo.nome;
    } else if (item.formatoVenda) {
        custo = item.formatoVenda.custo_unitario;
        tipo = "Produto";
        sourceIcon = <Package className="w-5 h-5 text-blue-500" />;
        sourceName = item.formatoVenda.nome;
    }

    const getCMVColor = (cmv: number) => {
        if (cmv <= 25) return "text-green-600";
        if (cmv <= 35) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/menu">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold">{item.nome_comercial}</h1>
                                <span
                                    className={`px-3 py-1 text-sm font-medium rounded ${item.ativo
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    {item.ativo ? "✔ Ativo" : "⊗ Inativo"}
                                </span>
                            </div>
                            {item.categoria_menu && (
                                <p className="text-gray-600 mt-1">
                                    Categoria: {item.categoria_menu}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Image */}
                {item.imagem_url && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="max-h-96 border rounded-lg overflow-hidden bg-gray-50">
                                <img
                                    src={item.imagem_url}
                                    alt={item.nome_comercial}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">PVP</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-blue-600">
                                € {item.pvp.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Custo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-gray-700">
                                € {custo.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Margem Bruta</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600">
                                € {(item.margem_bruta || 0).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {(item.margem_percentual || 0).toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">CMV</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-2xl font-bold ${getCMVColor(item.cmv_percentual)}`}>
                                {item.cmv_percentual.toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Source Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informação da Fonte</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    {sourceIcon}
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500">Tipo</div>
                                    <div className="font-semibold text-lg">{tipo}</div>
                                    <div className="text-sm text-gray-600 mt-1">{sourceName}</div>
                                </div>
                            </div>
                            {sourceLink && (
                                <Link href={sourceLink}>
                                    <Button variant="outline" size="sm">
                                        Ver {tipo}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Allergens */}
                {item.alergenios && item.alergenios.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Alergénios</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {item.alergenios.map((allergen: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium"
                                    >
                                        {allergen}
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Notas */}
                {item.notas && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Notas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700">{item.notas}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

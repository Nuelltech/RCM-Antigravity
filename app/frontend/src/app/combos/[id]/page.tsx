"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Package2 } from "lucide-react";
import Link from "next/link";
import type { Combo } from "@/types/combo";

export default function ViewComboPage() {
    const params = useParams();
    const router = useRouter();
    const [combo, setCombo] = useState<Combo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCombo();
    }, [params.id]);

    const loadCombo = async () => {
        try {
            const data = await fetchClient(`/combos/${params.id}`);
            setCombo(data);
        } catch (error) {
            console.error("Failed to load combo:", error);
            alert("Erro ao carregar combo");
            router.push("/combos");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">A carregar combo...</p>
                </div>
            </AppLayout>
        );
    }

    if (!combo) {
        return null;
    }

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/combos">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold">{combo.nome}</h1>
                                <span
                                    className={`px-3 py-1 text-sm font-medium rounded ${combo.tipo === "Simples"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-blue-100 text-blue-700"
                                        }`}
                                >
                                    {combo.tipo === "Simples" ? "📋 Simples" : "📦 Fixo"}
                                </span>
                            </div>
                            {combo.descricao && (
                                <p className="text-gray-600 mt-1">{combo.descricao}</p>
                            )}
                        </div>
                    </div>
                    <Link href={`/combos/edit/${combo.id}`}>
                        <Button>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Combo
                        </Button>
                    </Link>
                </div>

                {/* Image */}
                {combo.imagem_url && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="max-h-96 border rounded-lg overflow-hidden bg-gray-50">
                                <img
                                    src={combo.imagem_url}
                                    alt={combo.nome}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cost Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Custo Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600">
                                € {combo.custo_total.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Tipo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{combo.tipo}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">
                                {combo.tipo === "Simples" ? "Categorias" : "Itens"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">
                                {combo.tipo === "Simples"
                                    ? combo.categorias?.length || 0
                                    : combo.itens?.length || 0}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Simple Combo - Categories */}
                {combo.tipo === "Simples" && combo.categorias && combo.categorias.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Categorias</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {combo.categorias.map((cat: any, idx: number) => (
                                    <div key={idx} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-semibold text-lg">{cat.categoria}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${cat.obrigatoria ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {cat.obrigatoria ? 'Obrigatória' : 'Opcional'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        Ordem: {cat.ordem}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500">Custo Máx.</div>
                                                <div className="font-bold text-lg text-green-600">
                                                    € {Number(cat.custo_max_calculado || 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border-t pt-3">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                                Itens disponíveis: ({cat.opcoes?.length || 0})
                                            </div>
                                            <div className="grid gap-2">
                                                {cat.opcoes?.map((opcao: any) => {
                                                    const isReceita = !!opcao.receita_id;
                                                    const nome = isReceita
                                                        ? opcao.receita?.nome
                                                        : opcao.formatoVenda?.nome;
                                                    const custo = Number(opcao.custo_unitario || 0);

                                                    return (
                                                        <div
                                                            key={opcao.id}
                                                            className="flex justify-between items-center bg-gray-50 p-2 rounded"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-0.5 rounded text-xs ${isReceita ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                    {isReceita ? 'Receita' : 'Produto'}
                                                                </span>
                                                                <span>{nome || '-'}</span>
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700">
                                                                € {custo.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {(!cat.opcoes || cat.opcoes.length === 0) && (
                                                    <div className="text-sm text-gray-500 italic p-2">
                                                        Nenhum item disponível
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Fixed Combo - Items */}
                {combo.tipo === "Complexo" && combo.itens && combo.itens.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Itens do Combo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="px-4 py-2 text-left text-sm font-medium">
                                                Tipo
                                            </th>
                                            <th className="px-4 py-2 text-left text-sm font-medium">
                                                Item
                                            </th>
                                            <th className="px-4 py-2 text-right text-sm font-medium">
                                                Quantidade
                                            </th>
                                            <th className="px-4 py-2 text-right text-sm font-medium">
                                                Custo Unitário
                                            </th>
                                            <th className="px-4 py-2 text-right text-sm font-medium">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {combo.itens.map((item: any, idx: number) => {
                                            const isReceita = !!item.receita;
                                            const nome = isReceita ? item.receita?.nome : item.produto?.nome;
                                            const tipo = isReceita ? 'Receita' : 'Produto';
                                            const custo = Number(item.custo_unitario || 0);
                                            const total = Number(item.custo_total || 0);

                                            return (
                                                <tr key={idx} className="border-b">
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-1 rounded text-xs ${isReceita ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {tipo}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {nome || "-"}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {item.quantidade}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        € {custo.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-medium">
                                                        € {total.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}


            </div>
        </AppLayout>
    );
}

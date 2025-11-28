"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchClient } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";

// Schema
const productSchema = z.object({
    nome: z.string().min(1, "Nome do produto é obrigatório"),
    familia_id: z.string().min(1, "Família é obrigatória"),
    subfamilia_id: z.string().min(1, "Subfamília é obrigatória"),
    unidade_medida: z.enum(["KG", "L", "Unidade"]),
    descricao: z.string().optional(),
    imagem_url: z.string().url("URL inválida").optional().or(z.literal("")),
    tipo_unidade_compra: z.string().min(1, "Formato de compra é obrigatório"),
    unidades_por_compra: z.number().min(0.01, "Quantidade deve ser maior que 0"),
    preco_compra: z.number().min(0.01, "Preço deve ser maior que 0"),
    fornecedor: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

interface Family {
    id: number;
    nome: string;
    subfamilias: { id: number; nome: string }[];
}

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [families, setFamilies] = useState<Family[]>([]);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            unidade_medida: "KG",
            unidades_por_compra: 1,
            preco_compra: 0,
        },
    });

    const selectedFamilyId = watch("familia_id");

    useEffect(() => {
        loadFamilies();
    }, []);

    const loadFamilies = async () => {
        try {
            const data = await fetchClient("/products/families");
            setFamilies(data);
        } catch (error) {
            console.error("Failed to load families:", error);
        }
    };

    const onSubmit = async (data: ProductForm) => {
        setLoading(true);
        try {
            const productPayload = {
                nome: data.nome,
                subfamilia_id: Number(data.subfamilia_id),
                unidade_medida: data.unidade_medida,
                descricao: data.descricao,
                imagem_url: data.imagem_url,
            };

            const product = await fetchClient("/products", {
                method: "POST",
                body: JSON.stringify(productPayload),
            });

            const variationPayload = {
                produto_id: product.id,
                tipo_unidade_compra: data.tipo_unidade_compra,
                unidades_por_compra: data.unidades_por_compra,
                preco_compra: data.preco_compra,
                fornecedor: data.fornecedor,
            };

            await fetchClient("/products/variations", {
                method: "POST",
                body: JSON.stringify(variationPayload),
            });

            alert(`✅ Produto criado com sucesso!\n\nCódigo: ${product.codigo_interno || 'N/A'}\nNome: ${product.nome}`);
            router.push("/products");
        } catch (error: any) {
            const errorMessage = error.message || "Erro ao criar produto";
            if (errorMessage.includes("já existe")) {
                alert(`⚠️ ${errorMessage}`);
            } else {
                alert(`❌ Erro ao criar produto: ${errorMessage}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const selectedFamily = families.find(
        (f) => f.id.toString() === selectedFamilyId
    );

    return (
        <AppLayout>
            <div className="max-w-4xl">
                <Link
                    href="/products"
                    className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para Produtos
                </Link>

                <h1 className="mb-8 text-3xl font-bold tracking-tight">Novo Produto</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Básicas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome do Produto</label>
                                <Input placeholder="Ex: Cebola Roxa, Leite Meio Gordo..." {...register("nome")} />
                                {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Família</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        {...register("familia_id")}
                                    >
                                        <option value="">Selecione...</option>
                                        {families.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.nome}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.familia_id && <p className="text-xs text-red-500">{errors.familia_id.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Subfamília</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        {...register("subfamilia_id")}
                                        disabled={!selectedFamilyId}
                                    >
                                        <option value="">Selecione...</option>
                                        {selectedFamily?.subfamilias.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.nome}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.subfamilia_id && <p className="text-xs text-red-500">{errors.subfamilia_id.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Unidade de Medida</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    {...register("unidade_medida")}
                                >
                                    <option value="KG">Quilograma (KG)</option>
                                    <option value="L">Litro (L)</option>
                                    <option value="Unidade">Unidade</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição (Opcional)</label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder="Descrição do produto..."
                                    {...register("descricao")}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">URL da Imagem (Opcional)</label>
                                <Input
                                    type="url"
                                    placeholder="https://exemplo.com/imagem.jpg"
                                    {...register("imagem_url")}
                                />
                                {errors.imagem_url && <p className="text-xs text-red-500">{errors.imagem_url.message}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Dados de Compra</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Formato de Compra</label>
                                    <Input placeholder="Ex: Saco 5kg" {...register("tipo_unidade_compra")} />
                                    {errors.tipo_unidade_compra && <p className="text-xs text-red-500">{errors.tipo_unidade_compra.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Quantidade</label>
                                    <Input type="number" step="0.001" lang="en" inputMode="decimal" {...register("unidades_por_compra", { valueAsNumber: true })} />
                                    {errors.unidades_por_compra && <p className="text-xs text-red-500">{errors.unidades_por_compra.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Preço de Compra (€)</label>
                                    <Input type="number" step="0.01" lang="en" inputMode="decimal" {...register("preco_compra", { valueAsNumber: true })} />
                                    {errors.preco_compra && <p className="text-xs text-red-500">{errors.preco_compra.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fornecedor (Opcional)</label>
                                    <Input placeholder="Nome do fornecedor" {...register("fornecedor")} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/products">
                            <Button variant="outline" type="button">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={loading}>
                            {loading ? "A criar..." : "Criar Produto"}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
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
    volume_por_unidade: z.number().optional(),
    preco_compra: z.number().min(0.01, "Preço deve ser maior que 0"),
    fornecedor: z.string().optional(),
    // Sales Format
    vendavel: z.boolean().default(false),
    formato_nome: z.string().optional(),
    formato_unidade: z.string().optional(),
    formato_quantidade: z.number().optional(),
    formato_preco: z.number().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

interface Family {
    id: number;
    nome: string;
    subfamilias: { id: number; nome: string }[];
}

interface Template {
    id: number;
    nome: string;
    quantidade: number;
    unidade_medida: string;
}

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [families, setFamilies] = useState<Family[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            unidade_medida: "KG",
            unidades_por_compra: 1,
            volume_por_unidade: undefined,
            preco_compra: 0,
            vendavel: false,
            formato_quantidade: 1,
        },
    });

    const isVendavel = watch("vendavel");
    const productName = watch("nome");
    const productUnit = watch("unidade_medida");

    // Auto-fill sales format fields
    useEffect(() => {
        if (isVendavel) {
            if (productName && !watch("formato_nome")) {
                setValue("formato_nome", productName);
            }
            if (productUnit && !watch("formato_unidade")) {
                setValue("formato_unidade", productUnit);
            }
        }
    }, [isVendavel, productName, productUnit]);

    const selectedFamilyId = watch("familia_id");

    useEffect(() => {
        loadFamilies();
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await fetchClient('/template-formatos-venda?ativo=true');
            setTemplates(data.sort((a: Template, b: Template) => a.nome.localeCompare(b.nome)));
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        if (!templateId) {
            setSelectedTemplateId(null);
            return;
        }

        const template = templates.find(t => t.id === Number(templateId));
        if (template) {
            setSelectedTemplateId(template.id);
            // Auto-populate fields
            const currentProductName = watch("nome") || "";
            setValue('formato_nome', `${currentProductName} ${template.nome}`.trim());
            setValue('formato_quantidade', template.quantidade);
            setValue('formato_unidade', template.unidade_medida);
        }
    };

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
                vendavel: data.vendavel,
            };

            const product = await fetchClient("/products", {
                method: "POST",
                body: JSON.stringify(productPayload),
            });

            const variationPayload = {
                produto_id: product.id,
                tipo_unidade_compra: data.tipo_unidade_compra,
                unidades_por_compra: data.unidades_por_compra,
                volume_por_unidade: data.volume_por_unidade,
                preco_compra: data.preco_compra,
                fornecedor: data.fornecedor,
            };

            await fetchClient("/products/variations", {
                method: "POST",
                body: JSON.stringify(variationPayload),
            });

            // Create Sales Format if vendavel
            if (data.vendavel) {
                const salesFormatPayload = {
                    produto_id: product.id,
                    template_id: selectedTemplateId,
                    nome: data.formato_nome || data.nome,
                    quantidade_vendida: data.formato_quantidade || 1,
                    unidade_medida: data.formato_unidade || data.unidade_medida,
                    preco_venda: data.formato_preco || 0,
                    disponivel_menu: true,
                };

                await fetchClient("/formatos-venda", {
                    method: "POST",
                    body: JSON.stringify(salesFormatPayload),
                });
            }

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

                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="vendavel"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    {...register("vendavel")}
                                />
                                <label
                                    htmlFor="vendavel"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Este produto é vendável (pode ser adicionado ao menu)
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sales Data (Conditional) */}
                    {isVendavel && (
                        <Card className="border-blue-200 bg-blue-50/30">
                            <CardHeader>
                                <CardTitle className="text-blue-800 flex items-center gap-2">
                                    Dados de Venda
                                    <span className="text-xs font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                        Produto Vendável
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Template Selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Template (Opcional)</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={selectedTemplateId || ''}
                                        onChange={(e) => handleTemplateSelect(e.target.value)}
                                    >
                                        <option value="">Sem template</option>
                                        {templates.map((template) => (
                                            <option key={template.id} value={template.id}>
                                                {template.nome} ({template.quantidade} {template.unidade_medida})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500">
                                        Selecione um template para preencher automaticamente os campos
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nome na Venda</label>
                                        <Input placeholder="Ex: Coca-Cola Lata" {...register("formato_nome")} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Preço de Venda (€) (Opcional)</label>
                                        <DecimalInput
                                            step="0.01"
                                            placeholder="0.00"
                                            {...register("formato_preco", { valueAsNumber: true })}
                                        />
                                        <p className="text-xs text-gray-500">Se deixado em branco, será 0.00</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Quantidade Vendida</label>
                                        <DecimalInput
                                            step="0.001"
                                            {...register("formato_quantidade", { valueAsNumber: true })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Unidade de Venda</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            {...register("formato_unidade")}
                                        >
                                            <option value="Unidade">Unidade</option>
                                            <option value="KG">Quilograma (KG)</option>
                                            <option value="L">Litro (L)</option>
                                            <option value="ML">Mililitro (ML)</option>
                                            <option value="G">Grama (G)</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Dados de Compra</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo de Unidade de Compra</label>
                                <Input placeholder="Ex: Pack 6un, Barril 50L, Saco 5kg" {...register("tipo_unidade_compra")} />
                                {errors.tipo_unidade_compra && <p className="text-xs text-red-500">{errors.tipo_unidade_compra.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Unidades por Compra</label>
                                    <DecimalInput step="0.001" lang="en" inputMode="decimal" {...register("unidades_por_compra", { valueAsNumber: true })} />
                                    {errors.unidades_por_compra && <p className="text-xs text-red-500">{errors.unidades_por_compra.message}</p>}
                                    <p className="text-xs text-gray-500">Opcional. Para produtos embalados (ex: 24 garrafas × 0.33L)</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Volume/Qtd por Unidade</label>
                                    <DecimalInput step="0.001" lang="en" inputMode="decimal" placeholder="Ex: 0.33 para 33cl" {...register("volume_por_unidade", { valueAsNumber: true })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Preço de Compra (€)</label>
                                    <DecimalInput step="0.01" lang="en" inputMode="decimal" {...register("preco_compra", { valueAsNumber: true })} />
                                    {errors.preco_compra && <p className="text-xs text-red-500">{errors.preco_compra.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fornecedor (Opcional)</label>
                                    <Input placeholder="Nome do fornecedor" {...register("fornecedor")} />
                                </div>
                            </div>

                            {/* Price Calculation Preview */}
                            {watch("unidades_por_compra") > 0 && watch("preco_compra") > 0 && (
                                <div className="bg-blue-50 p-3 rounded text-sm space-y-2">
                                    {watch("volume_por_unidade") ? (
                                        <>
                                            <p className="text-gray-700">
                                                <strong>Preço por Unidade Embalagem:</strong> €
                                                {(watch("preco_compra") / watch("unidades_por_compra")).toFixed(4)}/un
                                            </p>
                                            <p className="text-gray-700 font-semibold">
                                                <strong>Preço Unitário (Produto):</strong> €
                                                {(watch("preco_compra") / (watch("unidades_por_compra") * (watch("volume_por_unidade") || 1))).toFixed(4)}/{watch("unidade_medida")}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                Volume Total: {(watch("unidades_por_compra") * (watch("volume_por_unidade") || 0)).toFixed(3)} {watch("unidade_medida")}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-gray-700">
                                            <strong>Preço Unitário Calculado:</strong> €
                                            {(watch("preco_compra") / watch("unidades_por_compra")).toFixed(4)}
                                        </p>
                                    )}
                                </div>
                            )}
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
        </AppLayout >
    );
}

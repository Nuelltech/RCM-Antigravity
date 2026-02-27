"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchClient } from "@/lib/api";
import { ArrowLeft, Loader2, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PurchaseVariationsModal } from "@/components/products/PurchaseVariationsModal";
import UpdatePriceModal from "@/components/produtos/UpdatePriceModal";

// Schemas
const productSchema = z.object({
    nome: z.string().min(1, "Nome do produto é obrigatório"),
    familia_id: z.string().min(1, "Família é obrigatória"),
    subfamilia_id: z.string().min(1, "Subfamília é obrigatória"),
    unidade_medida: z.enum(["KG", "L", "Unidade"]),
    descricao: z.string().optional(),
    imagem_url: z.string().url("URL inválida").optional().or(z.literal("")),
    vendavel: z.boolean().optional(),
});

const formatoVendaSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    quantidade_vendida: z.number().min(0.001, "Quantidade deve ser maior que 0"),
    unidade_medida: z.string().min(1, "Unidade é obrigatória"),
    preco_venda: z.number().min(0.01, "Preço deve ser maior que 0"),
    variacao_origem_id: z.number().optional(),
    disponivel_menu: z.boolean().optional(),
    ordem_exibicao: z.number().optional(),
    custo_unitario: z.number().nullable().optional(),
});

type ProductForm = z.infer<typeof productSchema>;
type FormatoVendaForm = z.infer<typeof formatoVendaSchema>;

interface Family {
    id: number;
    nome: string;
    subfamilias: { id: number; nome: string }[];
}

interface Product {
    id: number;
    nome: string;
    unidade_medida: string;
    descricao?: string;
    imagem_url?: string;
    vendavel?: boolean;
    subfamilia: {
        id: number;
        nome: string;
        familia: {
            id: number;
            nome: string;
        };
    };
    variacoes?: Array<{
        id: number;
        tipo_unidade_compra: string;
        preco_unitario: number;
    }>;
}


interface FormatoVenda {
    id: number;
    nome: string;
    unidade_medida: string;
    quantidade_vendida: number;
    preco_venda: number;
    custo_unitario?: number;
    margem_percentual?: number;
    variacao_origem_id?: number;
    disponivel_menu?: boolean;
    ordem_exibicao?: number;
}

interface VariacaoProduto {
    id: number;
    produto_id: number;
    tipo_unidade_compra: string;
    unidades_por_compra: number;
    preco_compra: number;
    preco_unitario: number;
    fornecedor?: string;
    codigo_fornecedor?: string;
    data_ultima_compra?: string;
    ativo: boolean;
    updatedAt: string;
    produto: {
        nome: string;
        codigo_interno?: string;
    };
}

interface Template {
    id: number;
    nome: string;
    quantidade: number;
    unidade_medida: string;
}

export default function EditProductPage() {

    const router = useRouter();
    const params = useParams();
    const productId = params?.id as string;

    const [loading, setLoading] = useState(false);
    const [saleFormats, setSaleFormats] = useState<FormatoVenda[]>([]);
    const [showSaleFormats, setShowSaleFormats] = useState(false);
    const [saleLoading, setSaleLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [families, setFamilies] = useState<Family[]>([]);
    const [product, setProduct] = useState<Product | null>(null);

    // Purchase Variation states
    const [purchaseVariations, setPurchaseVariations] = useState<VariacaoProduto[]>([]);
    const [mainVariation, setMainVariation] = useState<VariacaoProduto | null>(null);
    const [isVariationsModalOpen, setIsVariationsModalOpen] = useState(false);
    const [isEditVariationModalOpen, setIsEditVariationModalOpen] = useState(false);
    const [editingVariation, setEditingVariation] = useState<VariacaoProduto | null>(null);
    const [isPriceUpdateModalOpen, setIsPriceUpdateModalOpen] = useState(false);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingFormat, setEditingFormat] = useState<FormatoVenda | null>(null);

    // Template states
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
    });

    const {
        register: registerFormat,
        handleSubmit: handleSubmitFormat,
        setValue: setFormatValue,
        reset: resetFormat,
        formState: { errors: formatErrors },
    } = useForm<FormatoVendaForm>({
        resolver: zodResolver(formatoVendaSchema),
    });

    // Watch vendavel flag
    const isVendavel = watch('vendavel');

    // Load families and product data
    useEffect(() => {
        const loadData = async () => {
            try {
                const familiesData = await fetchClient("/products/families");
                setFamilies(familiesData);

                const productData: Product = await fetchClient(`/products/${productId}`);
                setProduct(productData);
                setValue("nome", productData.nome);
                setValue("unidade_medida", productData.unidade_medida as "KG" | "L" | "Unidade");
                setValue("descricao", productData.descricao || "");
                setValue("imagem_url", productData.imagem_url || "");
                setValue("familia_id", productData.subfamilia.familia.id.toString());
                setValue("subfamilia_id", productData.subfamilia.id.toString());
                setValue("vendavel", productData.vendavel ?? false);
            } catch (error) {
                console.error("Failed to load data:", error);
                alert("❌ Erro ao carregar produto");
                router.push("/products");
            } finally {
                setInitialLoading(false);
            }
        };
        loadData();
    }, [productId, router, setValue]);

    // Load sell variations
    const loadSaleFormats = async () => {
        try {
            setSaleLoading(true);
            const formats = await fetchClient(`/formatos-venda?produto_id=${productId}`);
            setSaleFormats(formats);
        } catch (error) {
            console.error('Failed to load sell variations:', error);
            alert('❌ Erro ao carregar variações de venda');
        } finally {
            setSaleLoading(false);
        }
    };

    // Fetch sell variations when toggled
    useEffect(() => {
        if (showSaleFormats && isVendavel) {
            loadSaleFormats();
        }
    }, [showSaleFormats, isVendavel, productId]);

    // Load templates on mount
    useEffect(() => {
        loadTemplates();
    }, []);

    // Load purchase variations
    const loadPurchaseVariations = async () => {
        try {
            const variations = await fetchClient(`/products/${productId}/variations`);
            setPurchaseVariations(variations);

            // Find main variation (most recent)
            if (variations.length > 0) {
                const sortedVariations = [...variations].sort((a: any, b: any) => {
                    const dateA = new Date(a.data_ultima_compra || a.updatedAt).getTime();
                    const dateB = new Date(b.data_ultima_compra || b.updatedAt).getTime();
                    return dateB - dateA;
                });
                setMainVariation(sortedVariations[0]);
            } else {
                setMainVariation(null);
            }
        } catch (error) {
            console.error('Failed to load purchase variations:', error);
        }
    };

    // Load purchase variations on mount
    useEffect(() => {
        if (productId) {
            loadPurchaseVariations();
        }
    }, [productId]);

    const onSubmit = async (data: ProductForm) => {
        setLoading(true);
        try {
            const productPayload = {
                nome: data.nome,
                subfamilia_id: Number(data.subfamilia_id),
                unidade_medida: data.unidade_medida,
                descricao: data.descricao,
                imagem_url: data.imagem_url,
                vendavel: data.vendavel ?? false,
            };

            await fetchClient(`/products/${productId}`, {
                method: "PUT",
                body: JSON.stringify(productPayload),
            });

            alert("✅ Produto atualizado com sucesso!");
            router.push("/products");
        } catch (error: any) {
            const errorMessage = error.message || "Erro ao atualizar produto";
            alert(`❌ ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async () => {
        try {
            const data = await fetchClient('/template-formatos-venda?ativo=true');
            setTemplates(data.sort((a: Template, b: Template) => a.nome.localeCompare(b.nome)));
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        if (!templateId || !product) {
            setSelectedTemplateId(null);
            return;
        }

        const template = templates.find(t => t.id === Number(templateId));
        if (template) {
            setSelectedTemplateId(template.id);
            // Auto-populate fields
            setFormatValue('nome', `${product.nome} ${template.nome}`);
            setFormatValue('quantidade_vendida', template.quantidade);
            setFormatValue('unidade_medida', template.unidade_medida);
        }
    };

    const handleCreateFormat = async (data: FormatoVendaForm) => {
        try {
            await fetchClient('/formatos-venda', {
                method: 'POST',
                body: JSON.stringify({
                    produto_id: Number(productId),
                    template_id: selectedTemplateId,
                    ...data,
                }),
            });
            alert('✅ Variação criada com sucesso!');
            setIsCreateModalOpen(false);
            setSelectedTemplateId(null);
            resetFormat();
            loadSaleFormats();
        } catch (error: any) {
            alert(`❌ Erro ao criar variação: ${error.message}`);
        }
    };

    const handleUpdateFormat = async (data: FormatoVendaForm) => {
        if (!editingFormat) return;
        try {
            await fetchClient(`/formatos-venda/${editingFormat.id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            alert('✅ Variação atualizada com sucesso!');
            setIsEditModalOpen(false);
            setEditingFormat(null);
            resetFormat();
            loadSaleFormats();
        } catch (error: any) {
            alert(`❌ Erro ao atualizar variação: ${error.message}`);
        }
    };

    const handleDeleteFormat = async (formatId: number, formatName: string) => {
        if (!confirm(`Tem certeza que deseja eliminar a variação "${formatName}"?`)) {
            return;
        }
        try {
            await fetchClient(`/formatos-venda/${formatId}`, {
                method: 'DELETE',
            });
            alert('✅ Variação eliminada com sucesso!');
            loadSaleFormats();
        } catch (error: any) {
            alert(`❌ Erro ao eliminar variação: ${error.message}`);
        }
    };

    const openEditModal = (format: FormatoVenda) => {
        setEditingFormat(format);
        setFormatValue('nome', format.nome);
        setFormatValue('quantidade_vendida', format.quantidade_vendida);
        setFormatValue('unidade_medida', format.unidade_medida);
        setFormatValue('preco_venda', format.preco_venda);
        setFormatValue('variacao_origem_id', format.variacao_origem_id);
        setFormatValue('disponivel_menu', format.disponivel_menu ?? true);
        setFormatValue('ordem_exibicao', format.ordem_exibicao ?? 0);
        setIsEditModalOpen(true);
    };

    const selectedFamilyId = watch("familia_id");
    const selectedFamily = families.find(
        (f) => f.id.toString() === selectedFamilyId
    );

    if (initialLoading) {
        return (
            <AppLayout>
                <div className="flex h-96 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            </AppLayout>
        );
    }

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

                <h1 className="mb-8 text-3xl font-bold tracking-tight">Editar Produto</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Básicas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome do Produto</Label>
                                <Input id="nome" placeholder="Ex: Cebola Roxa, Leite Meio Gordo..." {...register("nome")} />
                                {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="familia_id">Família</Label>
                                    <select
                                        id="familia_id"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        {...register("familia_id")}
                                    >
                                        <option value="">Selecione...</option>
                                        {families.map((f: Family) => (
                                            <option key={f.id} value={f.id}>
                                                {f.nome}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.familia_id && <p className="text-xs text-red-500">{errors.familia_id.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subfamilia_id">Subfamília</Label>
                                    <select
                                        id="subfamilia_id"
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
                                <Label htmlFor="unidade_medida">Unidade de Medida</Label>
                                <select
                                    id="unidade_medida"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    {...register("unidade_medida")}
                                >
                                    <option value="KG">Quilograma (KG)</option>
                                    <option value="L">Litro (L)</option>
                                    <option value="Unidade">Unidade</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="vendavel"
                                    {...register("vendavel")}
                                    checked={watch("vendavel")}
                                />
                                <Label htmlFor="vendavel">Vendável</Label>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="descricao">Descrição (Opcional)</Label>
                                <textarea
                                    id="descricao"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder="Descrição do produto..."
                                    {...register("descricao")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="imagem_url">URL da Imagem (Opcional)</Label>
                                <Input
                                    id="imagem_url"
                                    type="url"
                                    placeholder="https://exemplo.com/imagem.jpg"
                                    {...register("imagem_url")}
                                />
                                {errors.imagem_url && <p className="text-xs text-red-500">{errors.imagem_url.message}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/products">
                            <Button variant="outline" type="button">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={loading}>
                            {loading ? "A guardar..." : "Guardar Alterações"}
                        </Button>
                    </div>
                </form>

                {/* Sell Variations Section */}
                {isVendavel && (
                    <Card className="mt-6">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Variações de Venda</CardTitle>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        resetFormat();
                                        setIsCreateModalOpen(true);
                                    }}
                                    className="gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Adicionar Variação
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!showSaleFormats ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowSaleFormats(true)}
                                >
                                    Ver Variações de Venda
                                </Button>
                            ) : saleLoading ? (
                                <p className="text-center py-4">Carregando variações...</p>
                            ) : saleFormats.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Nenhuma variação de venda encontrada.</p>
                            ) : (
                                <div className="space-y-2">
                                    {saleFormats.map((format: FormatoVenda) => (
                                        <div key={format.id} className="border rounded-md p-4 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex-1">
                                                <h4 className="font-semibold">{format.nome}</h4>
                                                <p className="text-sm text-gray-600">
                                                    {format.quantidade_vendida} {format.unidade_medida} - €{format.preco_venda.toFixed(2)}
                                                </p>
                                                {format.custo_unitario && (
                                                    <p className="text-xs text-gray-500">
                                                        Custo: €{format.custo_unitario.toFixed(2)} |
                                                        Margem: {format.margem_percentual?.toFixed(1)}%
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditModal(format)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700"
                                                    onClick={() => handleDeleteFormat(format.id, format.nome)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Purchase Variations Section */}
                <Card className="mt-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Variações de Compra</CardTitle>
                            <Button
                                type="button"
                                onClick={() => setIsVariationsModalOpen(true)}
                                variant="outline"
                            >
                                Gerir Variações
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {mainVariation ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600">Variação Principal (Custo Atual)</p>
                                        <h4 className="font-semibold text-lg">{mainVariation.tipo_unidade_compra}</h4>
                                        <p className="text-sm text-gray-700 mt-1">
                                            {mainVariation.unidades_por_compra} unidades por €{Number(mainVariation.preco_compra).toFixed(2)}
                                        </p>
                                        <p className="text-blue-600 font-semibold mt-2">
                                            Preço Unitário: €{Number(mainVariation.preco_unitario).toFixed(4)}
                                        </p>
                                        {mainVariation.data_ultima_compra && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Última compra: {new Date(mainVariation.data_ultima_compra).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => setIsPriceUpdateModalOpen(true)}
                                        className="bg-orange-500 hover:bg-orange-600 text-white gap-2 ml-4"
                                    >
                                        <Edit className="h-4 w-4" />
                                        Atualizar Preço (Async)
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>Nenhuma variação de compra ativa encontrada.</p>
                                <p className="text-sm mt-2">Clique em "Gerir Variações" para adicionar.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Create Format Modal */}
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Variação de Venda</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmitFormat(handleCreateFormat)} className="space-y-4">
                            {/* Template Selector */}
                            <div className="space-y-2">
                                <Label htmlFor="template-select">Template (Opcional)</Label>
                                <select
                                    id="template-select"
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

                            <div className="space-y-2">
                                <Label htmlFor="create-nome">Nome</Label>
                                <Input
                                    id="create-nome"
                                    placeholder="Ex: Coca-Cola Lata 33cl"
                                    {...registerFormat("nome")}
                                />
                                {formatErrors.nome && <p className="text-xs text-red-500">{formatErrors.nome.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create-quantidade">Quantidade Vendida</Label>
                                    <Input
                                        id="create-quantidade"
                                        step="0.001"
                                        lang="en"
                                        inputMode="decimal"
                                        placeholder="1.0"
                                        {...registerFormat("quantidade_vendida", { valueAsNumber: true })}
                                    />
                                    {formatErrors.quantidade_vendida && <p className="text-xs text-red-500">{formatErrors.quantidade_vendida.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="create-unidade">Unidade de Medida</Label>
                                    <select
                                        id="create-unidade"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        {...registerFormat("unidade_medida")}
                                    >
                                        <option value="ML">ML</option>
                                        <option value="L">L</option>
                                        <option value="G">G</option>
                                        <option value="KG">KG</option>
                                        <option value="UN">UN</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-preco">Preço de Venda (€)</Label>
                                <Input
                                    id="create-preco"
                                    step="0.01"
                                    lang="en"
                                    inputMode="decimal"
                                    placeholder="2.50"
                                    {...registerFormat("preco_venda", { valueAsNumber: true })}
                                />
                                {formatErrors.preco_venda && <p className="text-xs text-red-500">{formatErrors.preco_venda.message}</p>}
                            </div>

                            {product?.variacoes && product.variacoes.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="create-variacao">Variação Origem (Opcional)</Label>
                                    <select
                                        id="create-variacao"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        {...registerFormat("variacao_origem_id", {
                                            setValueAs: (v) => v === "" ? undefined : Number(v)
                                        })}
                                    >
                                        <option value="">Nenhuma</option>
                                        {product.variacoes.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.tipo_unidade_compra} - €{Number(v.preco_unitario).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="create-disponivel"
                                    {...registerFormat("disponivel_menu")}
                                    defaultChecked={true}
                                />
                                <Label htmlFor="create-disponivel">Disponível no Menu</Label>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit">Criar Variação</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Format Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Variação de Venda</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmitFormat(handleUpdateFormat)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-nome">Nome</Label>
                                <Input
                                    id="edit-nome"
                                    placeholder="Ex: Coca-Cola Lata 33cl"
                                    {...registerFormat("nome")}
                                />
                                {formatErrors.nome && <p className="text-xs text-red-500">{formatErrors.nome.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-quantidade">Quantidade (decimal)</Label>
                                    <Input
                                        id="edit-quantidade"
                                        step="0.001"
                                        lang="en"
                                        inputMode="decimal"
                                        placeholder="0.33"
                                        {...registerFormat("quantidade_vendida", { valueAsNumber: true })}
                                    />
                                    {formatErrors.quantidade_vendida && <p className="text-xs text-red-500">{formatErrors.quantidade_vendida.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-unidade">Unidade</Label>
                                    <select
                                        id="edit-unidade"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        {...registerFormat("unidade_medida")}
                                    >
                                        <option value="ML">ML</option>
                                        <option value="L">L</option>
                                        <option value="G">G</option>
                                        <option value="KG">KG</option>
                                        <option value="UN">UN</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-preco">Preço de Venda (€)</Label>
                                <Input
                                    id="edit-preco"
                                    step="0.01"
                                    lang="en"
                                    inputMode="decimal"
                                    placeholder="2.50"
                                    {...registerFormat("preco_venda", { valueAsNumber: true })}
                                />
                                {formatErrors.preco_venda && <p className="text-xs text-red-500">{formatErrors.preco_venda.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-custo">Custo Unitário (€) - Opcional</Label>
                                <Input
                                    id="edit-custo"
                                    step="0.01"
                                    lang="en"
                                    inputMode="decimal"
                                    placeholder="0.80"
                                    {...registerFormat("custo_unitario", {
                                        setValueAs: (v) => v === "" ? null : Number(v)
                                    })}
                                />
                                <p className="text-xs text-gray-500">
                                    Se deixar em branco, será calculado automaticamente com base na variação origem
                                </p>
                                {formatErrors.custo_unitario && <p className="text-xs text-red-500">{formatErrors.custo_unitario.message}</p>}
                            </div>

                            {product?.variacoes && product.variacoes.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="edit-variacao">Variação Origem (Opcional)</Label>
                                    <select
                                        id="edit-variacao"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        {...registerFormat("variacao_origem_id", {
                                            setValueAs: (v) => v === "" ? undefined : Number(v)
                                        })}
                                    >
                                        <option value="">Nenhuma</option>
                                        {product.variacoes.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.tipo_unidade_compra} - €{Number(v.preco_unitario).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="edit-disponivel"
                                    {...registerFormat("disponivel_menu")}
                                />
                                <Label htmlFor="edit-disponivel">Disponível no Menu</Label>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit">Atualizar Variação</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Purchase Variations Modal */}
            <PurchaseVariationsModal
                isOpen={isVariationsModalOpen}
                onClose={() => setIsVariationsModalOpen(false)}
                produtoId={productId}
                produtoUnidade={product?.unidade_medida || "KG"}
                variations={purchaseVariations}
                mainVariation={mainVariation}
                onRefresh={loadPurchaseVariations}
            />

            {/* Update Price Modal (Async Jobs Test) */}
            {mainVariation && (
                <UpdatePriceModal
                    isOpen={isPriceUpdateModalOpen}
                    onClose={() => setIsPriceUpdateModalOpen(false)}
                    variacao={mainVariation}
                    onSuccess={() => {
                        loadPurchaseVariations();
                        setIsPriceUpdateModalOpen(false);
                    }}
                />
            )}
        </AppLayout>
    );
}


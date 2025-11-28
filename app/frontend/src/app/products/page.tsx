"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchClient } from "@/lib/api";
import { Plus, Search, LayoutGrid, LayoutList, Filter, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";

interface Product {
    id: number;
    nome: string;
    codigo_interno: string;
    unidade_medida: string;
    vendavel?: boolean;
    imagem_url?: string;
    subfamilia: {
        id: number;
        nome: string;
        familia: {
            id: number;
            nome: string;
        };
    };
    variacoes: {
        preco_unitario: number;
    }[];
}

interface Family {
    id: number;
    nome: string;
    subfamilias: { id: number; nome: string }[];
}

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [families, setFamilies] = useState<Family[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
    const [selectedSubfamilyId, setSelectedSubfamilyId] = useState<string>("");
    const [vendavelFilter, setVendavelFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    useEffect(() => {
        loadProducts();
        loadFamilies();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await fetchClient("/products");
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products:", error);
        } finally {
            setLoading(false);
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

    const handleDelete = async (productId: number, productName: string) => {
        if (!confirm(`Tem certeza que deseja apagar o produto "${productName}"?`)) {
            return;
        }

        try {
            await fetchClient(`/products/${productId}`, {
                method: "DELETE",
            });
            alert("✅ Produto apagado com sucesso!");
            loadProducts();
        } catch (error: any) {
            alert(`❌ Erro ao apagar produto: ${error.message || "Erro desconhecido"}`);
        }
    };

    const handleEdit = (productId: number) => {
        router.push(`/products/edit/${productId}`);
    };

    const clearFilters = () => {
        setSelectedFamilyId("");
        setSelectedSubfamilyId("");
        setSearchTerm("");
        setVendavelFilter("all");
    };

    // Filter products
    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFamily = !selectedFamilyId || product.subfamilia.familia.id.toString() === selectedFamilyId;
        const matchesSubfamily = !selectedSubfamilyId || product.subfamilia.id.toString() === selectedSubfamilyId;
        const matchesVendavel = vendavelFilter === "all" ||
            (vendavelFilter === "vendavel" && product.vendavel) ||
            (vendavelFilter === "nao-vendavel" && !product.vendavel);

        return matchesSearch && matchesFamily && matchesSubfamily && matchesVendavel;
    });

    const selectedFamily = families.find((f: Family) => f.id.toString() === selectedFamilyId);

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
                        <p className="text-muted-foreground">
                            Gerencie os ingredientes e produtos do seu restaurante.
                        </p>
                    </div>
                    <Link href="/products/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Produto
                        </Button>
                    </Link>
                </div>

                {/* Filters and Search */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-1 gap-4">
                                {/* Search */}
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Pesquisar por nome ou código..."
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {/* Family Filter */}
                                <select
                                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={selectedFamilyId}
                                    onChange={(e) => {
                                        setSelectedFamilyId(e.target.value);
                                        setSelectedSubfamilyId("");
                                    }}
                                >
                                    <option value="">Todas as Famílias</option>
                                    {families.map((f: Family) => (
                                        <option key={f.id} value={f.id}>
                                            {f.nome}
                                        </option>
                                    ))}
                                </select>

                                {/* Subfamily Filter */}
                                <select
                                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                    value={selectedSubfamilyId}
                                    onChange={(e) => setSelectedSubfamilyId(e.target.value)}
                                    disabled={!selectedFamilyId}
                                >
                                    <option value="">Todas as Subfamílias</option>
                                    {selectedFamily?.subfamilias.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.nome}
                                        </option>
                                    ))}
                                </select>

                                {/* Vendavel Filter */}
                                <select
                                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={vendavelFilter}
                                    onChange={(e) => setVendavelFilter(e.target.value)}
                                >
                                    <option value="all">Todos</option>
                                    <option value="vendavel">Vendáveis</option>
                                    <option value="nao-vendavel">Não Vendáveis</option>
                                </select>

                                {/* Clear Filters */}
                                {(selectedFamilyId || selectedSubfamilyId || searchTerm || vendavelFilter !== "all") && (
                                    <Button variant="outline" onClick={clearFilters} className="gap-2">
                                        <Filter className="h-4 w-4" />
                                        Limpar
                                    </Button>
                                )}
                            </div>

                            {/* View Toggle */}
                            <div className="flex gap-2">
                                <Button
                                    variant={viewMode === "list" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setViewMode("list")}
                                >
                                    <LayoutList className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === "grid" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setViewMode("grid")}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Products Display */}
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Carregando produtos...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <p className="text-muted-foreground">Nenhum produto encontrado.</p>
                        </CardContent>
                    </Card>
                ) : viewMode === "list" ? (
                    /* List View */
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-auto">
                                <table className="w-full">
                                    <thead className="border-b bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Código</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Família</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subfamília</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unidade</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Vendável</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Custo Unit.</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((product) => (
                                            <tr key={product.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                                    {product.codigo_interno || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium">{product.nome}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{product.subfamilia.familia.nome}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{product.subfamilia.nome}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                        {product.unidade_medida}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm">
                                                    {product.vendavel ? (
                                                        <span className="text-green-600 font-medium">✓ Sim</span>
                                                    ) : (
                                                        <span className="text-gray-400">Não</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium">
                                                    {product.variacoes.length > 0
                                                        ? `€ ${Number(product.variacoes[0].preco_unitario).toFixed(2)}`
                                                        : "-"}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleEdit(product.id)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                            onClick={() => handleDelete(product.id, product.nome)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Grid View */
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredProducts.map((product) => (
                            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <CardContent className="p-0">
                                    {/* Image or Placeholder */}
                                    {product.imagem_url ? (
                                        <div className="h-32 overflow-hidden">
                                            <img
                                                src={product.imagem_url}
                                                alt={product.nome}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-32 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                                            <span className="text-4xl">🍽️</span>
                                        </div>
                                    )}

                                    <div className="p-4 space-y-3">
                                        {/* Code */}
                                        <div className="text-xs font-mono text-gray-500">
                                            {product.codigo_interno || "SEM CÓDIGO"}
                                        </div>

                                        {/* Name */}
                                        <h3 className="font-semibold text-lg leading-tight">{product.nome}</h3>

                                        {/* Family/Subfamily */}
                                        <div className="text-sm text-gray-600">
                                            <div>{product.subfamilia.familia.nome}</div>
                                            <div className="text-xs text-gray-500">{product.subfamilia.nome}</div>
                                        </div>

                                        {/* Unit and Price */}
                                        <div className="flex items-center justify-between">
                                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium">
                                                {product.unidade_medida}
                                            </span>
                                            <span className="text-sm font-semibold">
                                                {product.variacoes.length > 0
                                                    ? `€ ${Number(product.variacoes[0].preco_unitario).toFixed(2)}`
                                                    : "-"}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2 border-t">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 gap-2"
                                                onClick={() => handleEdit(product.id)}
                                            >
                                                <Edit className="h-3 w-3" />
                                                Editar
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(product.id, product.nome)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { fetchClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Trash2, ArrowLeft, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function InventoryPage() {
    const router = useRouter();
    const [view, setView] = useState<'list' | 'setup' | 'counting'>('list');
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Setup State
    const [type, setType] = useState('Total');
    const [name, setName] = useState('');
    const [filters, setFilters] = useState<any>({});

    // Data for filters
    const [families, setFamilies] = useState<any[]>([]);
    const [subfamilies, setSubfamilies] = useState<any[]>([]);
    const [calcLists, setCalcLists] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);

    // Sorting
    const [sortField, setSortField] = useState<string>('produto.nome');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Product variations cache
    const [productVariations, setProductVariations] = useState<Record<number, any[]>>({});

    useEffect(() => {
        loadSessions();
        loadAuxData();
    }, []);

    const loadSessions = async () => {
        try {
            const data = await fetchClient('/inventory/sessions');
            setSessions(data);
            if (data.length > 0) {
                // Optionally auto-open the first one? No, let user choose.
            } else {
                setView('setup'); // No open sessions, go to setup
            }
        } catch (error) {
            console.error("Failed to load sessions", error);
        }
    };

    const loadAuxData = async () => {
        try {
            const [famsData, lists, locs] = await Promise.all([
                fetchClient('/products/families'),
                fetchClient('/inventory/calculator-lists'),
                fetchClient('/inventory/locations'),
            ]);
            setFamilies(famsData);
            // Extract subfamilies from families
            const allSubfamilies = famsData.flatMap((f: any) => f.subfamilias || []);
            setSubfamilies(allSubfamilies);
            setCalcLists(lists);
            setLocations(locs);
        } catch (error) {
            console.error("Failed to load aux data", error);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const session = await fetchClient('/inventory/sessions', {
                method: 'POST',
                body: JSON.stringify({
                    tipo: type,
                    nome: name,
                    filtros: filters
                })
            });
            await openSession(session.id);
        } catch (error) {
            alert("Erro ao gerar inventário");
        } finally {
            setLoading(false);
        }
    };

    const openSession = async (id: number) => {
        setLoading(true);
        try {
            const session = await fetchClient(`/inventory/sessions/${id}`);
            setCurrentSession(session);
            setView('counting');
        } catch (error) {
            alert("Erro ao abrir sessão");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSession = async () => {
        if (!confirm("Tem a certeza? Isto irá atualizar o stock teórico.")) return;
        setLoading(true);
        try {
            await fetchClient(`/inventory/sessions/${currentSession.id}/close`, {
                method: 'POST'
            });
            alert("Inventário fechado com sucesso!");
            setView('list');
            loadSessions();
            setCurrentSession(null);
        } catch (error) {
            alert("Erro ao fechar inventário");
        } finally {
            setLoading(false);
        }
    };

    // Counting Logic
    const updateItem = async (itemId: number, data: any) => {
        // Optimistic update? Or wait? Let's wait for simplicity first.
        try {
            await fetchClient(`/inventory/items/${itemId}`, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
            // Update local state
            setCurrentSession((prev: any) => ({
                ...prev,
                itens: prev.itens.map((i: any) => i.id === itemId ? { ...i, ...data } : i)
            }));
        } catch (error) {
            console.error("Failed to update item", error);
        }
    };

    const loadProductVariations = async (productId: number) => {
        if (productVariations[productId]) return productVariations[productId];

        try {
            const variations = await fetchClient(`/products/${productId}/variations`);
            setProductVariations(prev => ({ ...prev, [productId]: variations }));
            return variations;
        } catch (error) {
            console.error("Failed to load variations", error);
            return [];
        }
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const getSortedItems = (items: any[]) => {
        if (!items) return [];

        return [...items].sort((a, b) => {
            let aVal, bVal;

            switch (sortField) {
                case 'produto.nome':
                    aVal = a.produto?.nome || '';
                    bVal = b.produto?.nome || '';
                    break;
                case 'produto.subfamilia.familia.nome':
                    aVal = a.produto?.subfamilia?.familia?.nome || '';
                    bVal = b.produto?.subfamilia?.familia?.nome || '';
                    break;
                case 'produto.subfamilia.nome':
                    aVal = a.produto?.subfamilia?.nome || '';
                    bVal = b.produto?.subfamilia?.nome || '';
                    break;
                case 'localizacao.nome':
                    aVal = a.localizacao?.nome || '';
                    bVal = b.localizacao?.nome || '';
                    break;
                default:
                    return 0;
            }

            const comparison = aVal.localeCompare(bVal);
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    };

    const addItemRow = async (productId: number) => {
        try {
            const newItem = await fetchClient(`/inventory/sessions/${currentSession.id}/items`, {
                method: 'POST',
                body: JSON.stringify({ productId })
            });
            setCurrentSession((prev: any) => ({
                ...prev,
                itens: [...prev.itens, newItem].sort((a, b) => a.produto.nome.localeCompare(b.produto.nome))
            }));
        } catch (error) {
            alert("Erro ao adicionar linha");
        }
    };

    const deleteItem = async (itemId: number) => {
        if (!confirm("Tem certeza que deseja eliminar esta linha?")) return;
        try {
            await fetchClient(`/inventory/items/${itemId}`, {
                method: 'DELETE'
            });
            setCurrentSession((prev: any) => ({
                ...prev,
                itens: prev.itens.filter((i: any) => i.id !== itemId)
            }));
        } catch (error) {
            alert("Erro ao eliminar linha");
        }
    };

    if (view === 'list') {
        return (
            <AppLayout>
                <div className="p-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Inventário</h1>
                        <Button onClick={() => setView('setup')} className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="w-4 h-4 mr-2" /> Novo Inventário
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {sessions.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center text-gray-500">
                                    Nenhum inventário em aberto.
                                </CardContent>
                            </Card>
                        ) : (
                            sessions.map(session => (
                                <Card key={session.id} className="cursor-pointer hover:border-orange-500 transition-colors" onClick={() => openSession(session.id)}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-lg font-medium">
                                            {session.nome}
                                        </CardTitle>
                                        <Badge>{session.tipo}</Badge>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-gray-500">
                                            Iniciado em: {new Date(session.data_inicio).toLocaleString()}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (view === 'setup') {
        return (
            <AppLayout>
                <div className="p-8 space-y-6 max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => setView('list')}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                        </Button>
                        <h1 className="text-3xl font-bold">Novo Inventário</h1>
                    </div>

                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome da Sessão</label>
                                <Input
                                    placeholder="Ex: Inventário Mensal - Dezembro"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>

                            <Tabs value={type} onValueChange={setType} className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="Total">Inventário Total</TabsTrigger>
                                    <TabsTrigger value="Calculadora">Calculadora</TabsTrigger>
                                    <TabsTrigger value="Personalizado">Personalizado</TabsTrigger>
                                </TabsList>

                                <TabsContent value="Total" className="mt-4 p-4 border rounded-md bg-gray-50">
                                    <p className="text-sm text-gray-600">
                                        Serão carregados todos os produtos ativos do sistema.
                                    </p>
                                </TabsContent>

                                <TabsContent value="Calculadora" className="mt-4 p-4 border rounded-md bg-gray-50 space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Selecione uma lista guardada na Calculadora de Compras.
                                    </p>
                                    <Select onValueChange={(v) => setFilters({ ...filters, lista_calculadora_id: Number(v) })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma lista..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {calcLists.map(l => (
                                                <SelectItem key={l.id} value={l.id.toString()}>
                                                    {l.nome} ({new Date(l.createdAt).toLocaleDateString()})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TabsContent>

                                <TabsContent value="Personalizado" className="mt-4 p-4 border rounded-md bg-gray-50 space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Família</label>
                                            <Select onValueChange={(v) => setFilters({ ...filters, familia_id: Number(v) })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Todas" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {families.map(f => (
                                                        <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Subfamília</label>
                                            <Select onValueChange={(v) => setFilters({ ...filters, subfamilia_id: Number(v) })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Todas" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {subfamilies
                                                        .filter(s => !filters.familia_id || s.familia_id === filters.familia_id)
                                                        .map(s => (
                                                            <SelectItem key={s.id} value={s.id.toString()}>{s.nome}</SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Localização</label>
                                            <Select onValueChange={(v) => setFilters({ ...filters, localizacao_id: Number(v) })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Todas" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {locations.map(l => (
                                                        <SelectItem key={l.id} value={l.id.toString()}>{l.nome}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <Button
                                className="w-full bg-orange-600 hover:bg-orange-700"
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? "A gerar..." : "Gerar Inventário"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    // Counting View
    return (
        <AppLayout>
            <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => setView('list')}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">{currentSession?.nome}</h1>
                            <p className="text-sm text-gray-500">
                                {currentSession?.itens.length} itens • {currentSession?.tipo}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleCloseSession}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={loading}
                    >
                        <CheckCircle className="w-4 h-4 mr-2" /> Fechar Inventário
                    </Button>
                </div>

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort('produto.nome')}
                                >
                                    Produto {sortField === 'produto.nome' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort('localizacao.nome')}
                                >
                                    Localização {sortField === 'localizacao.nome' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                <TableHead>Variação</TableHead>
                                <TableHead className="w-32">Quantidade</TableHead>
                                <TableHead className="w-20"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {getSortedItems(currentSession?.itens).map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs">{item.produto.codigo_interno || '-'}</TableCell>
                                    <TableCell className="font-medium">{item.produto.nome}</TableCell>
                                    <TableCell>{item.unidade_medida}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={item.localizacao_id?.toString()}
                                            onValueChange={(v) => updateItem(item.id, { localizacao_id: Number(v) })}
                                        >
                                            <SelectTrigger className="h-8 w-[140px]">
                                                <SelectValue placeholder="Local..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {locations.map(l => (
                                                    <SelectItem key={l.id} value={l.id.toString()}>{l.nome}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <VariationSelect
                                            productId={item.produto_id}
                                            value={item.variacao_id}
                                            onChange={(variacaoId: number) => updateItem(item.id, { variacao_id: variacaoId })}
                                            loadVariations={loadProductVariations}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <DecimalInput
                                            className="h-8"
                                            value={item.quantidade_contada}
                                            onChange={(e: any) => updateItem(item.id, { quantidade: Number(e.target.value) })}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => addItemRow(item.produto_id)}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}

// Variation Select Component
function VariationSelect({ productId, value, onChange, loadVariations }: any) {
    const [variations, setVariations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchVariations = async () => {
            setLoading(true);
            const vars = await loadVariations(productId);
            setVariations(vars || []);
            setLoading(false);
        };
        fetchVariations();
    }, [productId]);

    if (loading) return <span className="text-sm text-gray-400">...</span>;
    if (!variations || variations.length === 0) return <span className="text-sm text-gray-500">-</span>;

    return (
        <Select value={value?.toString()} onValueChange={(v) => onChange(Number(v))}>
            <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Padrão" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="0">Padrão</SelectItem>
                {variations.map((v: any) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                        {v.tipo_unidade_compra} ({v.unidades_por_compra} {v.produto?.unidade_medida || 'un'})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

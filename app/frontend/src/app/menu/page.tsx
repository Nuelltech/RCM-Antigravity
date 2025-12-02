"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, LayoutGrid, List, MoreHorizontal, Edit, Trash2, ToggleLeft, ToggleRight, Package, MenuSquare } from "lucide-react";
import { fetchClient } from "@/lib/api";
import { AddToMenuModal } from "@/components/menu/AddToMenuModal";
import { EditPVPModal } from "@/components/menu/EditPVPModal";
import { MenuCard } from "@/components/menu/MenuCard";
import type { MenuItemWithRecipe } from "@/types/menu";

export default function MenuPage() {
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [menuItems, setMenuItems] = useState<MenuItemWithRecipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItemWithRecipe | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    useEffect(() => {
        loadMenu();
    }, []);

    const loadMenu = async () => {
        try {
            const data = await fetchClient("/menu");
            setMenuItems(data);
        } catch (error) {
            console.error("Failed to load menu:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (itemId: number) => {
        try {
            await fetchClient(`/menu/${itemId}/toggle`, { method: "PATCH" });
            loadMenu();
        } catch (error) {
            console.error("Failed to toggle item:", error);
        }
    };

    const handleDelete = async (itemId: number) => {
        if (!confirm("Tem certeza que deseja remover este item do menu?")) return;

        try {
            await fetchClient(`/menu/${itemId}`, { method: "DELETE" });
            loadMenu();
        } catch (error) {
            console.error("Failed to delete item:", error);
        }
    };

    const filteredItems = menuItems.filter(item => {
        const matchesSearch = item.nome_comercial.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === "all" || item.categoria_menu === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(menuItems.map(i => i.categoria_menu).filter(Boolean)));

    const getCMVColor = (cmv: number) => {
        if (cmv <= 25) return "bg-green-100 text-green-800";
        if (cmv <= 35) return "bg-yellow-100 text-yellow-800";
        return "bg-red-100 text-red-800";
    };

    return (
        <AppLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Menu</h1>
                        <p className="text-gray-600 mt-1">
                            Gerencie os itens disponíveis para venda
                        </p>
                    </div>
                    <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar ao Menu
                    </Button>
                </div>

                {/* Category Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(() => {
                        const stats = new Map<string, { totalCost: number, totalPvp: number, count: number }>();

                        menuItems.forEach(item => {
                            if (!item.ativo) return; // Only active items for theoretical CMV? Or all? Usually active.
                            const cat = item.categoria_menu || 'Sem Categoria';
                            const current = stats.get(cat) || { totalCost: 0, totalPvp: 0, count: 0 };

                            let cost = 0;
                            if (item.receita) cost = Number(item.receita.custo_por_porcao);
                            else if (item.combo) cost = Number(item.combo.custo_total);
                            else if (item.formatoVenda) cost = Number(item.formatoVenda.custo_unitario);

                            stats.set(cat, {
                                totalCost: current.totalCost + cost,
                                totalPvp: current.totalPvp + Number(item.pvp),
                                count: current.count + 1
                            });
                        });

                        return Array.from(stats.entries())
                            .sort((a: [string, any], b: [string, any]) => a[0].localeCompare(b[0]))
                            .map(([name, data]) => {
                                const cmv = data.totalPvp > 0 ? (data.totalCost / data.totalPvp) * 100 : 0;
                                return (
                                    <div key={name} className="bg-white p-4 rounded-lg shadow-sm border">
                                        <div className="text-sm font-medium text-gray-500 truncate" title={name}>{name}</div>
                                        <div className="mt-2 flex items-end justify-between">
                                            <div>
                                                <div className={`text-2xl font-bold ${getCMVColor(cmv).replace('bg-', 'text-').replace('-100', '-600')}`}>
                                                    {cmv.toFixed(1)}%
                                                </div>
                                                <div className="text-xs text-gray-400">CMV Teórico</div>
                                            </div>
                                            <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                {data.count} itens
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                    })()}
                </div>

                {/* Filters & Controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar no menu..."
                                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            <select
                                className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="all">Todas as Categorias</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat as string}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 border-l pl-4">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-md ${viewMode === "grid" ? "bg-gray-100 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                            <LayoutGrid className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-md ${viewMode === "list" ? "bg-gray-100 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                            <List className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                        <p className="text-gray-500">Nenhum item encontrado no menu.</p>
                        <Button variant="link" onClick={() => setShowAddModal(true)}>
                            Adicionar primeiro item
                        </Button>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item) => (
                            <MenuCard
                                key={item.id}
                                item={item}
                                onEdit={setEditingItem}
                                onToggle={handleToggleActive}
                                onDelete={handleDelete}
                                getCMVColor={getCMVColor}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PVP</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margem</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">CMV</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredItems.map((item) => {
                                    let custo = 0;
                                    if (item.receita) custo = item.receita.custo_por_porcao;
                                    else if (item.combo) custo = item.combo.custo_total;
                                    else if (item.formatoVenda) custo = item.formatoVenda.custo_unitario;

                                    const isCombo = !!item.combo;
                                    const isProduct = !!item.formatoVenda;

                                    return (
                                        <tr key={item.id} className={`hover:bg-gray-50 ${!item.ativo ? 'opacity-60' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                                                        {item.imagem_url ? (
                                                            <img className="h-10 w-10 object-cover" src={item.imagem_url} alt="" />
                                                        ) : isProduct ? (
                                                            <Package className="h-6 w-6 text-blue-300" />
                                                        ) : (
                                                            <MenuSquare className={`h-6 w-6 ${isCombo ? "text-purple-300" : "text-orange-300"}`} />
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{item.nome_comercial}</div>
                                                        <div className="text-xs text-gray-500 flex gap-1 items-center">
                                                            {isCombo && <span className="text-purple-600 font-medium">[Combo]</span>}
                                                            {isProduct && <span className="text-blue-600 font-medium">[Produto]</span>}
                                                            {!isCombo && !isProduct && <span className="text-orange-600 font-medium">[Receita]</span>}
                                                            {item.receita?.nome || item.combo?.nome || item.formatoVenda?.nome}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.categoria_menu || "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                                € {item.pvp.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                                € {custo.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                <div className="text-gray-900">€ {item.margem_bruta?.toFixed(2)}</div>
                                                <div className="text-xs text-gray-500">{item.margem_percentual?.toFixed(1)}%</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCMVColor(item.cmv_percentual)}`}>
                                                    {item.cmv_percentual.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {item.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => window.location.href = `/menu/${item.id}`} className="text-gray-600 hover:text-gray-900" title="Ver detalhes">
                                                        Ver
                                                    </button>
                                                    <button onClick={() => setEditingItem(item)} className="text-blue-600 hover:text-blue-900">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleToggleActive(item.id)} className="text-gray-600 hover:text-gray-900">
                                                        {item.ativo ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddModal && (
                <AddToMenuModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadMenu();
                    }}
                />
            )}

            {editingItem && (
                <EditPVPModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSuccess={() => {
                        setEditingItem(null);
                        loadMenu();
                    }}
                />
            )}
        </AppLayout>
    );
}

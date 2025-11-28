"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { TrendingUp, Euro, Filter, Package } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type FilterType = 'sales' | 'revenue';

interface TopItem {
    id: number;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    image: string;
}

interface TopRecipesGridProps {
    items?: TopItem[];
    categories?: string[];
}

export function TopRecipesGrid({ items = [], categories = [] }: TopRecipesGridProps) {
    const [filter, setFilter] = useState<FilterType>('sales');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const sortedItems = useMemo(() => {
        let filtered = items;

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(item => item.category === categoryFilter);
        }

        return [...filtered].sort((a, b) => {
            if (filter === 'sales') {
                return b.quantity - a.quantity;
            }
            return b.revenue - a.revenue;
        }).slice(0, 5);
    }, [items, filter, categoryFilter]);

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle>Top Vendas</CardTitle>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Categorias</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setFilter('sales')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'sales'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <TrendingUp className="w-4 h-4 inline mr-1" />
                            Vendas
                        </button>
                        <button
                            onClick={() => setFilter('revenue')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'revenue'
                                ? 'bg-white text-green-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Euro className="w-4 h-4 inline mr-1" />
                            Faturação
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {sortedItems.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-gray-500">
                            Nenhum item encontrado para os filtros selecionados.
                        </div>
                    ) : (
                        sortedItems.map((item, index) => (
                            <Link
                                key={item.id}
                                href={`/menu`} // Redirect to menu since we don't have individual sales pages per item yet
                                className="group"
                            >
                                <div className="relative overflow-hidden rounded-lg border border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg h-full flex flex-col">
                                    {/* Image */}
                                    <div className="aspect-square relative overflow-hidden bg-gray-100">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Package className="w-12 h-12" />
                                            </div>
                                        )}
                                        {/* Ranking badge */}
                                        <div className="absolute top-2 left-2 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                                            #{index + 1}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-3 flex-1 flex flex-col">
                                        <h3 className="font-semibold text-sm text-gray-900 truncate mb-1" title={item.name}>
                                            {item.name}
                                        </h3>
                                        <div className="text-xs text-gray-500 mb-2">{item.category}</div>

                                        <div className="mt-auto flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                                            {filter === 'sales' ? (
                                                <>
                                                    <span className="text-gray-600">Qtd. Vendida</span>
                                                    <span className="font-bold text-blue-600">{item.quantity}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-gray-600">Total</span>
                                                    <span className="font-bold text-green-600">
                                                        € {item.revenue.toFixed(2)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

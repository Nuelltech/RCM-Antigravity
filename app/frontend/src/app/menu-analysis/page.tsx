"use client";

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Star, HelpCircle, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

type Classification = 'star' | 'puzzle' | 'workhorse' | 'dog';

interface MenuAnalysisItem {
    id: number;
    nome_comercial: string;
    categoria_menu: string | null;
    pvp: number;
    margemContribuicao: number;
    margemPercentual: number;
    volumeVendas: number;
    receitaTotal: number;
    custoMedio: number;
    classification: Classification;
    imagemUrl: string | null;
}

interface MenuAnalysisSummary {
    totalItems: number;
    totalRevenue: number;
    avgMarginPercent: number;
    categories: {
        stars: number;
        puzzles: number;
        workhorses: number;
        dogs: number;
    };
    thresholds: {
        medianMargin: number;
        medianVolume: number;
    };
}

interface MenuAnalysisResponse {
    items: MenuAnalysisItem[];
    summary: MenuAnalysisSummary;
}

const classificationConfig = {
    star: {
        label: 'Star',
        icon: Star,
        color: '#10b981', // green-500
        bg: 'bg-green-50',
        border: 'border-green-500',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-800',
        emoji: '🌟'
    },
    puzzle: {
        label: 'Puzzle',
        icon: HelpCircle,
        color: '#f59e0b', // amber-500
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-800',
        emoji: '❓'
    },
    workhorse: {
        label: 'Workhorse',
        icon: TrendingUp,
        color: '#3b82f6', // blue-500
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        text: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-800',
        emoji: '💰'
    },
    dog: {
        label: 'Dog',
        icon: AlertTriangle,
        color: '#ef4444', // red-500
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-800',
        emoji: '🐕'
    }
};

export default function MenuAnalysisPage() {
    const [data, setData] = useState<MenuAnalysisResponse | null>(null);
    const [loading, setLoading] = useState(true);

    // Default to last 30 days
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });

    useEffect(() => {
        loadAnalysis();
    }, [startDate, endDate]);

    async function loadAnalysis() {
        try {
            setLoading(true);
            const response = await fetchClient(`/menu/analysis?startDate=${startDate}&endDate=${endDate}`);
            setData(response);
        } catch (error) {
            console.error('Erro ao carregar análise:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <AppLayout>
                <div className="p-6">
                    <div className="flex items-center justify-center h-64">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!data) {
        return (
            <AppLayout>
                <div className="p-6">
                    <p className="text-center text-gray-500">Erro ao carregar dados</p>
                </div>
            </AppLayout>
        );
    }

    // Prepare scatter plot data
    const scatterData = data.items.map(item => ({
        x: item.volumeVendas,
        y: item.margemContribuicao,
        name: item.nome_comercial,
        classification: item.classification,
        pvp: item.pvp,
        margin: item.margemPercentual
    }));

    return (
        <AppLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Menu Engineering</h1>
                        <p className="text-gray-600 mt-1">Análise de Rentabilidade do Menu</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Date Range Selector - Same as Dashboard */}
                        <div className="flex items-center gap-2 bg-white p-2 rounded border">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-2 py-1 text-sm outline-none"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-2 py-1 text-sm outline-none"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={loadAnalysis}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(data.summary.categories).map(([key, count]) => {
                        // Map plural keys from backend to singular keys in config
                        const keyMap: Record<string, Classification> = {
                            'stars': 'star',
                            'puzzles': 'puzzle',
                            'workhorses': 'workhorse',
                            'dogs': 'dog'
                        };
                        const configKey = keyMap[key] || key as Classification;
                        const config = classificationConfig[configKey];

                        return (
                            <Card key={key} className={config.border + ' border-2'}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <span className="text-2xl">{config.emoji}</span>
                                        {config.label}s
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{count}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {((count / data.summary.totalItems) * 100).toFixed(1)}% do total
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Scatter Plot */}
                <Card>
                    <CardHeader>
                        <CardTitle>Matriz de Rentabilidade</CardTitle>
                        <CardDescription>
                            Margem de Contribuição (€) vs Volume de Vendas
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={500}>
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    type="number"
                                    dataKey="x"
                                    name="Volume"
                                    label={{ value: 'Volume de Vendas (unidades)', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="y"
                                    name="Margem"
                                    label={{ value: 'Margem (€)', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-3 shadow-lg rounded-lg border">
                                                    <p className="font-semibold">{data.name}</p>
                                                    <p className="text-sm text-gray-600">Volume: {data.x} unidades</p>
                                                    <p className="text-sm text-gray-600">Margem: €{data.y.toFixed(2)}</p>
                                                    <p className="text-sm text-gray-600">PVP: €{data.pvp.toFixed(2)}</p>
                                                    <Badge className={classificationConfig[data.classification as Classification].badge}>
                                                        {classificationConfig[data.classification as Classification].label}
                                                    </Badge>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                {/* Reference lines for median */}
                                <ReferenceLine
                                    x={data.summary.thresholds.medianVolume}
                                    stroke="#666"
                                    strokeDasharray="5 5"
                                    label={{ value: 'Mediana Volume', position: 'top' }}
                                />
                                <ReferenceLine
                                    y={data.summary.thresholds.medianMargin}
                                    stroke="#666"
                                    strokeDasharray="5 5"
                                    label={{ value: 'Mediana Margem', position: 'right' }}
                                />
                                <Scatter data={scatterData}>
                                    {scatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={classificationConfig[entry.classification].color} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>

                        {/* Legend */}
                        <div className="flex justify-center gap-6 mt-4 flex-wrap">
                            {Object.entries(classificationConfig).map(([key, config]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                                    <span className="text-sm font-medium">{config.emoji} {config.label}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Items Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Todos os Itens do Menu</CardTitle>
                        <CardDescription>
                            {data.summary.totalItems} itens analisados
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4">Prato</th>
                                        <th className="text-left py-3 px-4">Categoria</th>
                                        <th className="text-right py-3 px-4">PVP</th>
                                        <th className="text-right py-3 px-4">Margem €</th>
                                        <th className="text-right py-3 px-4">Margem %</th>
                                        <th className="text-right py-3 px-4">Volume</th>
                                        <th className="text-right py-3 px-4">Receita</th>
                                        <th className="text-center py-3 px-4">Classificação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items
                                        .sort((a, b) => b.receitaTotal - a.receitaTotal)
                                        .map((item) => {
                                            const config = classificationConfig[item.classification];
                                            return (
                                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                                    <td className="py-3 px-4 font-medium">{item.nome_comercial}</td>
                                                    <td className="py-3 px-4 text-sm text-gray-600">
                                                        {item.categoria_menu || '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">€{item.pvp.toFixed(2)}</td>
                                                    <td className="py-3 px-4 text-right font-semibold">
                                                        €{item.margemContribuicao.toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        {item.margemPercentual.toFixed(1)}%
                                                    </td>
                                                    <td className="py-3 px-4 text-right">{item.volumeVendas}</td>
                                                    <td className="py-3 px-4 text-right font-semibold">
                                                        €{item.receitaTotal.toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <Badge className={config.badge}>
                                                            {config.emoji} {config.label}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recomendações Estratégicas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Stars */}
                            {data.summary.categories.stars > 0 && (
                                <div className={`p-4 rounded-lg border-2 ${classificationConfig.star.border} ${classificationConfig.star.bg}`}>
                                    <h3 className="font-bold mb-2 flex items-center gap-2">
                                        🌟 Stars ({data.summary.categories.stars})
                                    </h3>
                                    <ul className="text-sm space-y-1">
                                        <li>✓ Manter e proteger estes pratos</li>
                                        <li>✓ Destacar no menu fisicamente</li>
                                        <li>✓ Treinar equipa para sugerir</li>
                                        <li>✓ Garantir qualidade consistente</li>
                                    </ul>
                                </div>
                            )}

                            {/* Puzzles */}
                            {data.summary.categories.puzzles > 0 && (
                                <div className={`p-4 rounded-lg border-2 ${classificationConfig.puzzle.border} ${classificationConfig.puzzle.bg}`}>
                                    <h3 className="font-bold mb-2 flex items-center gap-2">
                                        ❓ Puzzles ({data.summary.categories.puzzles})
                                    </h3>
                                    <ul className="text-sm space-y-1">
                                        <li>✓ Melhorar visibilidade no menu</li>
                                        <li>✓ Treinar equipa para recomendar</li>
                                        <li>✓ Considerar promoções temporárias</li>
                                        <li>✓ Avaliar nome e descrição</li>
                                    </ul>
                                </div>
                            )}

                            {/* Workhorses */}
                            {data.summary.categories.workhorses > 0 && (
                                <div className={`p-4 rounded-lg border-2 ${classificationConfig.workhorse.border} ${classificationConfig.workhorse.bg}`}>
                                    <h3 className="font-bold mb-2 flex items-center gap-2">
                                        💰 Workhorses ({data.summary.categories.workhorses})
                                    </h3>
                                    <ul className="text-sm space-y-1">
                                        <li>✓ Tentar aumentar preço gradualmente</li>
                                        <li>✓ Reduzir custos dos ingredientes</li>
                                        <li>✓ Otimizar porções</li>
                                        <li>✓ Bundling com pratos de alta margem</li>
                                    </ul>
                                </div>
                            )}

                            {/* Dogs */}
                            {data.summary.categories.dogs > 0 && (
                                <div className={`p-4 rounded-lg border-2 ${classificationConfig.dog.border} ${classificationConfig.dog.bg}`}>
                                    <h3 className="font-bold mb-2 flex items-center gap-2">
                                        🐕 Dogs ({data.summary.categories.dogs})
                                    </h3>
                                    <ul className="text-sm space-y-1">
                                        <li>✓ Considerar remover do menu</li>
                                        <li>✓ Substituir por alternativa melhor</li>
                                        <li>✓ Usar como ingrediente de outros pratos</li>
                                        <li>✓ Simplificar o menu</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

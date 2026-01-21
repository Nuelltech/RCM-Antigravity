"use client";

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    const [detailsModal, setDetailsModal] = useState<Classification | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>('all'); // 'all', 'Bebidas', etc.

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

    // Extract unique categories from data for dynamic filter
    const uniqueCategories = Array.from(
        new Set(data.items.map(item => item.categoria_menu).filter(cat => cat != null))
    ).sort();

    // Category icon mapping
    const getCategoryIcon = (category: string | null) => {
        if (!category) return '📦';
        const iconMap: Record<string, string> = {
            'Bebidas': '🍹',
            'Principais': '🍽️',
            'Sobremesas': '🍰',
            'Combos': '🎁',
            'Entradas': '🥗',
            'Sopas': '🍲',
            'Aperitivos': '🥙',
            'Petiscos': '🍢'
        };
        return iconMap[category] || '📦';
    };

    // Filter items by category
    const filteredItems = categoryFilter === 'all'
        ? data.items
        : data.items.filter(item => item.categoria_menu === categoryFilter);

    // Recalculate thresholds for filtered items
    const recalculateThresholds = (items: MenuAnalysisItem[]) => {
        if (items.length === 0) return { medianMargin: 0, medianVolume: 0 };

        const margins = items.map(i => i.margemContribuicao).sort((a, b) => a - b);
        const volumes = items.map(i => i.volumeVendas).sort((a, b) => a - b);

        const medianIndex = Math.floor(margins.length / 2);
        return {
            medianMargin: margins[medianIndex],
            medianVolume: volumes[medianIndex]
        };
    };

    const thresholds = recalculateThresholds(filteredItems);

    // Reclassify items based on new thresholds
    const reclassifiedItems = filteredItems.map(item => {
        const isHighMargin = item.margemContribuicao >= thresholds.medianMargin;
        const isHighVolume = item.volumeVendas >= thresholds.medianVolume;

        let newClassification: Classification;
        if (isHighMargin && isHighVolume) newClassification = 'star';
        else if (isHighMargin && !isHighVolume) newClassification = 'puzzle';
        else if (!isHighMargin && isHighVolume) newClassification = 'workhorse';
        else newClassification = 'dog';

        return { ...item, classification: newClassification };
    });

    // Recalculate summary for filtered data
    const filteredSummary = {
        ...data.summary,
        totalItems: reclassifiedItems.length,
        totalRevenue: reclassifiedItems.reduce((sum, item) => sum + item.receitaTotal, 0),
        avgMarginPercent: reclassifiedItems.length > 0
            ? reclassifiedItems.reduce((sum, item) => sum + item.margemPercentual, 0) / reclassifiedItems.length
            : 0,
        categories: {
            stars: reclassifiedItems.filter(i => i.classification === 'star').length,
            puzzles: reclassifiedItems.filter(i => i.classification === 'puzzle').length,
            workhorses: reclassifiedItems.filter(i => i.classification === 'workhorse').length,
            dogs: reclassifiedItems.filter(i => i.classification === 'dog').length
        },
        thresholds
    };

    // Prepare scatter plot data
    const scatterData = reclassifiedItems.map(item => ({
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
                        {/* Category Filter */}
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filtrar por categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">📊 Todo o Menu</SelectItem>
                                {uniqueCategories.map(category => (
                                    <SelectItem key={category} value={category}>
                                        {getCategoryIcon(category)} {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

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
                    {Object.entries(filteredSummary.categories).map(([key, count]) => {
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
                                    x={thresholds.medianVolume}
                                    stroke="#666"
                                    strokeDasharray="5 5"
                                    label={{ value: 'Mediana Volume', position: 'top' }}
                                />
                                <ReferenceLine
                                    y={thresholds.medianMargin}
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
                                    {reclassifiedItems
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
                            {filteredSummary.categories.stars > 0 && (
                                <div className={`p-4 rounded-lg border-2 ${classificationConfig.star.border} ${classificationConfig.star.bg}`}>
                                    <h3 className="font-bold mb-2 flex items-center gap-2 justify-between">
                                        <span>🌟 Stars ({filteredSummary.categories.stars})</span>
                                        <Button size="sm" variant="outline" onClick={() => setDetailsModal('star')}>Saber Mais</Button>
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
                            {filteredSummary.categories.puzzles > 0 && (
                                <div className={`p-4 rounded-lg border-2 ${classificationConfig.puzzle.border} ${classificationConfig.puzzle.bg}`}>
                                    <h3 className="font-bold mb-2 flex items-center gap-2 justify-between">
                                        <span>❓ Puzzles ({filteredSummary.categories.puzzles})</span>
                                        <Button size="sm" variant="outline" onClick={() => setDetailsModal('puzzle')}>Saber Mais</Button>
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
                            {filteredSummary.categories.workhorses > 0 && (
                                <div className={`p-4 rounded-lg border-2 ${classificationConfig.workhorse.border} ${classificationConfig.workhorse.bg}`}>
                                    <h3 className="font-bold mb-2 flex items-center gap-2 justify-between">
                                        <span>💰 Workhorses ({filteredSummary.categories.workhorses})</span>
                                        <Button size="sm" variant="outline" onClick={() => setDetailsModal('workhorse')}>Saber Mais</Button>
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
                            {filteredSummary.categories.dogs > 0 && (
                                <div className={`p-4 rounded-lg border-2 ${classificationConfig.dog.border} ${classificationConfig.dog.bg}`}>
                                    <h3 className="font-bold mb-2 flex items-center gap-2 justify-between">
                                        <span>🐕 Dogs ({filteredSummary.categories.dogs})</span>
                                        <Button size="sm" variant="outline" onClick={() => setDetailsModal('dog')}>Saber Mais</Button>
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

            {/* Details Modal */}
            <Dialog open={!!detailsModal} onOpenChange={() => setDetailsModal(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    {detailsModal === 'star' && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-2xl">
                                    🌟 Stars - Estrelas do Menu
                                </DialogTitle>
                                <DialogDescription>
                                    Alto Volume + Alta Margem = Popular E Lucrativo
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">✅ Principais Causas:</h4>
                                    <ul className="space-y-1 text-sm list-disc pl-5">
                                        <li>Receita perfeita e sabor excecional</li>
                                        <li>Preço otimizado (valor percebido &gt; custo real)</li>
                                        <li>Marketing eficaz e destaque no menu</li>
                                        <li>Eficiência operacional na preparação</li>
                                        <li>Identidade/prato assinatura do restaurante</li>
                                        <li>Apresentação visual forte e "Instagramável"</li>
                                        <li>Taxa de repetição de compra alta (&gt;70%)</li>
                                        <li>Reviews e testemunhos positivos</li>
                                        <li>Consistência absoluta na qualidade</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">🎯 Ações Prioritárias:</h4>
                                    <ul className="space-y-1 text-sm list-disc pl-5">
                                        <li>Proteger qualidade a todo custo</li>
                                        <li>Destacar no menu com foto e destaque visual</li>
                                        <li>Treinar staff para recomendar sempre</li>
                                        <li className="font-medium">Monitorizar margem - se custo subir, aumentar PREÇO (não baixar qualidade)</li>
                                        <li>Promover nas redes sociais</li>
                                        <li>Se margem ficar insustentável: Otimizar ingredientes SEM comprometer sabor</li>
                                        <li className="text-orange-600">Último recurso: Reformular ou remover se impossível manter rentabilidade</li>
                                    </ul>
                                </div>
                            </div>
                        </>
                    )}

                    {detailsModal === 'puzzle' && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-2xl">
                                    ❓ Puzzles - Enigmas
                                </DialogTitle>
                                <DialogDescription>
                                    Alta Margem + Baixo Volume = Lucrativo mas Pouco Popular
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">✅ Principais Causas:</h4>
                                    <ul className="space-y-1 text-sm list-disc pl-5">
                                        <li>Posicionamento escondido no menu</li>
                                        <li>Preço parece alto (falta justificação)</li>
                                        <li>Descrição inadequada ou nome pouco apelativo</li>
                                        <li className="font-medium">Qualidade/sabor não agrada ao público-alvo</li>
                                        <li className="font-medium">Confeção inconsistente (cliente arrisca menos)</li>
                                        <li>Desconhecimento do cliente (prato novo/exótico)</li>
                                        <li>Marketing insuficiente</li>
                                        <li>Staff não recomenda/desconhece</li>
                                        <li>Concorrência interna (há Stars similares)</li>
                                        <li>Apresentação visual inferior</li>
                                        <li>Sazonalidade errada</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">🎯 Ações Prioritárias:</h4>
                                    <ul className="space-y-1 text-sm list-disc pl-5">
                                        <li>Destacar no menu (foto, posição estratégica)</li>
                                        <li>Criar promoções temporárias</li>
                                        <li>Treinar staff para recomendar ativamente</li>
                                        <li>Melhorar nome e descrição</li>
                                        <li>Combo com Stars para aumentar vendas</li>
                                        <li>Sample gratuito para experimentação</li>
                                        <li className="text-orange-600">Se problema for qualidade: Reformular receita ou remover</li>
                                    </ul>
                                </div>
                            </div>
                        </>
                    )}

                    {detailsModal === 'workhorse' && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-2xl">
                                    💰 Workhorses - Cavalos de Trabalho
                                </DialogTitle>
                                <DialogDescription>
                                    Alto Volume + Baixa Margem = Popular mas Pouco Lucrativo
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">✅ Principais Causas:</h4>
                                    <ul className="space-y-1 text-sm list-disc pl-5">
                                        <li>Preço muito baixo (medo de aumentar)</li>
                                        <li>Custos de ingredientes altos</li>
                                        <li>Guerra de preços com concorrência</li>
                                        <li>Ineficiência operacional (desperdício alto)</li>
                                        <li>Estratégia deliberada (loss leader)</li>
                                        <li>Má formação de preço inicial</li>
                                        <li>Porção excessiva</li>
                                        <li>Custos ocultos (preparação complexa)</li>
                                        <li>Prato clássico/tradicional do restaurante</li>
                                        <li>Promoções permanentes</li>
                                        <li>Erosão de margem (custos subiram, preço não)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">🎯 Ações Prioritárias:</h4>
                                    <ul className="space-y-1 text-sm list-disc pl-5">
                                        <li>Aumentar preço gradualmente (5-10%)</li>
                                        <li>Reduzir porção ligeiramente</li>
                                        <li>Otimizar receita (ingredientes mais baratos)</li>
                                        <li>Reduzir desperdício na preparação</li>
                                        <li>Criar versão premium (maior margem)</li>
                                        <li>Oferecer extras pagos</li>
                                        <li>Usar para upsell de bebidas/sobremesas</li>
                                    </ul>
                                    <p className="text-sm italic mt-2 text-gray-600">
                                        💡 Nota: Workhorses trazem volume e amortizam custos fixos. Ideal ter 30% do menu nesta categoria.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {detailsModal === 'dog' && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-2xl">
                                    🐕 Dogs - Perdedores
                                </DialogTitle>
                                <DialogDescription>
                                    Baixo Volume + Baixa Margem = Não é Popular NEM Lucrativo
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">✅ Principais Causas:</h4>
                                    <ul className="space-y-1 text-sm list-disc pl-5">
                                        <li>Qualidade fraca ou sabor inadequado</li>
                                        <li>Reputação negativa (reviews ruins)</li>
                                        <li>Preço vs valor desalinhado</li>
                                        <li>Má combinação (caro E custoso)</li>
                                        <li>Não encaixa no conceito do restaurante</li>
                                        <li>Prato ultrapassado ou fora de moda</li>
                                        <li>Ingrediente exótico demais</li>
                                        <li>Complexidade excessiva na preparação</li>
                                        <li>Concorrência melhor (interna ou externa)</li>
                                        <li>Apresentação fraca</li>
                                        <li>Sazonalidade errada</li>
                                        <li>Marketing inexistente</li>
                                        <li>Problemas operacionais graves</li>
                                        <li>Experiência/fusão falhada</li>
                                        <li>Custos descontrolados</li>
                                        <li>Target errado (público não é o esperado)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2 text-red-600">⚠️ Ação Urgente:</h4>
                                    <ul className="space-y-1 text-sm list-disc pl-5">
                                        <li className="font-semibold text-red-600">ELIMINAR do menu (recomendado)</li>
                                        <li>Reformular completamente a receita</li>
                                        <li>Substituir por alternativa melhor</li>
                                        <li>Usar ingredientes em outros pratos</li>
                                        <li>Simplificar o menu</li>
                                    </ul>
                                    <p className="text-sm italic mt-2 text-red-600 font-medium bg-red-50 p-2 rounded">
                                        💡 Regra: Se tens de FORÇAR vendas, remove! Dogs custam dinheiro, espaço e reputação.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

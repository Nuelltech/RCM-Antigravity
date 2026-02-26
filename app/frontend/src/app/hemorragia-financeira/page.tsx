"use client";

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    TrendingDown, TrendingUp, AlertTriangle, Flame, RefreshCw,
    DollarSign, Activity, Target, ArrowUpRight, ArrowDownRight, Info
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (mirror backend response)
// ---------------------------------------------------------------------------

type Gravidade = 'atencao' | 'critico' | 'catastrofe';

interface ItemPerda {
    id: number;
    nome_comercial: string;
    categoria_menu: string | null;
    cmvAtual: number;
    cmvTarget: number;
    excessoCMV: number;
    pvpMedio: number;
    custoUnitario: number;
    volumeVendas: number;
    perdaUnitaria: number;
    totalPerdido: number;
    pvpSugerido: number;
    gravidade: Gravidade;
    imagemUrl: string | null;
}

interface ItemGanho {
    id: number;
    nome_comercial: string;
    categoria_menu: string | null;
    cmvAtual: number;
    cmvTarget: number;
    economiasCMV: number;
    pvpMedio: number;
    custoUnitario: number;
    volumeVendas: number;
    ganhoUnitario: number;
    totalGanho: number;
    imagemUrl: string | null;
}

interface Resumo {
    totalPerdido: number;
    totalGanho: number;
    saldoLiquido: number;
    numItensPerda: number;
    numItensCatastrofe: number;
    numItensCritico: number;
    numItensAtencao: number;
    numItensGanho: number;
    cmvTarget: number;
    cmvAmarelo: number;
    cmvVermelho: number;
    periodoInicio: string;
    periodoFim: string;
}

interface HemorragiaData {
    perdas: ItemPerda[];
    ganhos: ItemGanho[];
    resumo: Resumo;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gravidadeConfig: Record<Gravidade, { label: string; badgeClass: string; rowClass: string; icon: React.ReactNode }> = {
    atencao: {
        label: '🟡 Atenção',
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        rowClass: 'border-l-4 border-l-yellow-400 hover:bg-yellow-50',
        icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    },
    critico: {
        label: '🔴 Crítico',
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
        rowClass: 'border-l-4 border-l-red-500 hover:bg-red-50',
        icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    },
    catastrofe: {
        label: '🔥 Catástrofe',
        badgeClass: 'bg-orange-900 text-orange-100 border-orange-700',
        rowClass: 'border-l-4 border-l-orange-600 bg-orange-50 hover:bg-orange-100',
        icon: <Flame className="w-4 h-4 text-orange-600" />,
    },
};

function fmt(val: number) {
    return val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDefaultDates() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
    };
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function SkeletonRow() {
    return (
        <tr className="border-b animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
                <td key={i} className="py-3 px-4">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                </td>
            ))}
        </tr>
    );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function HemorragiaFinanceiraPage() {
    const [data, setData] = useState<HemorragiaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dateRange, setDateRange] = useState(getDefaultDates);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange.from, dateRange.to]);

    async function loadData() {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchClient(
                `/hemorragia/analise?startDate=${dateRange.from}&endDate=${dateRange.to}`
            );
            setData(res);
        } catch (err: any) {
            console.error('Erro ao carregar hemorragia financeira:', err);
            setError('Não foi possível carregar os dados. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    const resumo = data?.resumo;

    return (
        <AppLayout>
            <div className="p-6 space-y-6">

                {/* ── HEADER ─────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <span className="text-red-600">🩸</span>
                            Hemorragia Financeira
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Impacto financeiro real do menu vs CMV target configurado
                            {resumo && (
                                <span className="ml-2 text-sm font-medium text-gray-500">
                                    (CMV Target: <strong>{resumo.cmvTarget}%</strong>)
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Date range picker — same pattern as Dashboard */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 bg-white p-2 rounded border shadow-sm">
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                className="px-2 py-1 text-sm outline-none"
                            />
                            <span className="text-gray-400">—</span>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                className="px-2 py-1 text-sm outline-none"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* ── ERROR ──────────────────────────────────────────────── */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* ── KPI SUMMARY CARDS ──────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Total Perdido */}
                    <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                                <ArrowDownRight className="w-4 h-4" />
                                Total a Perder
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-red-600">
                                {loading ? '—' : `€ ${fmt(resumo?.totalPerdido ?? 0)}`}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {loading ? '—' : `${resumo?.numItensPerda ?? 0} pratos acima do CMV target`}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Itens Críticos */}
                    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                                <Flame className="w-4 h-4" />
                                Itens Críticos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-orange-600">
                                {loading ? '—' : (resumo?.numItensCatastrofe ?? 0) + (resumo?.numItensCritico ?? 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {loading ? '—' : `${resumo?.numItensCatastrofe ?? 0} catástrofe · ${resumo?.numItensCritico ?? 0} crítico`}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Total Ganho */}
                    <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4" />
                                Total a Poupar
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-emerald-600">
                                {loading ? '—' : `€ ${fmt(resumo?.totalGanho ?? 0)}`}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {loading ? '—' : `${resumo?.numItensGanho ?? 0} pratos abaixo do CMV target`}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Saldo Líquido */}
                    <Card className={`border-2 ${(resumo?.saldoLiquido ?? 0) >= 0 ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white' : 'border-red-300 bg-gradient-to-br from-red-100 to-white'}`}>
                        <CardHeader className="pb-2">
                            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${(resumo?.saldoLiquido ?? 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                <Activity className="w-4 h-4" />
                                Saldo Líquido
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-extrabold ${(resumo?.saldoLiquido ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {loading ? '—' : `${(resumo?.saldoLiquido ?? 0) >= 0 ? '+' : ''}€ ${fmt(resumo?.saldoLiquido ?? 0)}`}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Ganhos − Perdas no período
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── HEMORRAGIA TABLE ───────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <TrendingDown className="w-5 h-5" />
                            🩸 Hemorragia — O que estás a Perder
                        </CardTitle>
                        <CardDescription>
                            Pratos com CMV acima do target de <strong>{resumo?.cmvTarget ?? 30}%</strong>.
                            Ordenado por impacto financeiro total.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!loading && (!data?.perdas || data.perdas.length === 0) ? (
                            <div className="text-center py-12 text-gray-400">
                                <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Nenhuma hemorragia detetada! 🎉</p>
                                <p className="text-sm mt-1">Todos os pratos com vendas estão dentro do CMV target.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-red-50 text-red-900">
                                            <th className="text-left py-3 px-4 font-semibold">Prato</th>
                                            <th className="text-left py-3 px-4 font-semibold">Categoria</th>
                                            <th className="text-right py-3 px-4 font-semibold">CMV Atual</th>
                                            <th className="text-right py-3 px-4 font-semibold">Excesso CMV</th>
                                            <th className="text-right py-3 px-4 font-semibold">PVP Médio</th>
                                            <th className="text-right py-3 px-4 font-semibold">Vendas</th>
                                            <th className="text-right py-3 px-4 font-semibold">Perda/Unid.</th>
                                            <th className="text-right py-3 px-4 font-semibold bg-red-100">⚠️ TOTAL PERDIDO</th>
                                            <th className="text-right py-3 px-4 font-semibold">PVP Sugerido</th>
                                            <th className="text-center py-3 px-4 font-semibold">Gravidade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading
                                            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                            : data?.perdas.map((item) => {
                                                const cfg = gravidadeConfig[item.gravidade];
                                                return (
                                                    <tr key={item.id} className={`border-b transition-colors ${cfg.rowClass}`}>
                                                        <td className="py-3 px-4 font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {cfg.icon}
                                                                {item.nome_comercial}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-500">
                                                            {item.categoria_menu || '—'}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-semibold text-red-600">
                                                            {item.cmvAtual.toFixed(1)}%
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-red-500">
                                                            +{item.excessoCMV.toFixed(1)}pp
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            €{fmt(item.pvpMedio)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            {item.volumeVendas.toLocaleString('pt-PT')}
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-red-500">
                                                            −€{fmt(item.perdaUnitaria)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-extrabold text-red-700 bg-red-50">
                                                            −€{fmt(item.totalPerdido)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                                                            €{fmt(item.pvpSugerido)}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <Badge className={`text-xs border ${cfg.badgeClass}`}>
                                                                {cfg.label}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        }
                                    </tbody>
                                    {!loading && data && data.perdas.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-red-100 border-t-2 border-red-300">
                                                <td colSpan={7} className="py-3 px-4 font-bold text-red-800 text-right">
                                                    TOTAL HEMORRAGIA NO PERÍODO:
                                                </td>
                                                <td className="py-3 px-4 text-right font-extrabold text-red-800 text-lg">
                                                    −€{fmt(resumo?.totalPerdido ?? 0)}
                                                </td>
                                                <td colSpan={2} />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Info box for perdas */}
                {!loading && (resumo?.totalPerdido ?? 0) > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <strong>O que podes fazer:</strong>{' '}
                            Para cada prato em hemorragia, há 3 opções:
                            {' '}(1) <strong>Aumentar o PVP</strong> para o "PVP Sugerido" mostrado,
                            {' '}(2) <strong>Rever a receita</strong> e reduzir custos de ingredientes,
                            {' '}ou (3) <strong>Mudar de fornecedor</strong> para ingredientes mais baratos.
                        </div>
                    </div>
                )}

                {/* ── SAÚDE TABLE ────────────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-700">
                            <TrendingUp className="w-5 h-5" />
                            💚 Saúde do Menu — O que está a funcionar
                        </CardTitle>
                        <CardDescription>
                            Pratos com CMV abaixo do target de <strong>{resumo?.cmvTarget ?? 30}%</strong>.
                            Estes pratos estão a contribuir positivamente para a margem.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!loading && (!data?.ganhos || data.ganhos.length === 0) ? (
                            <div className="text-center py-12 text-gray-400">
                                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Sem pratos abaixo do CMV target no período.</p>
                                <p className="text-sm mt-1">Pode não haver dados de vendas suficientes ou todos os pratos estão acima do target.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-emerald-50 text-emerald-900">
                                            <th className="text-left py-3 px-4 font-semibold">Prato</th>
                                            <th className="text-left py-3 px-4 font-semibold">Categoria</th>
                                            <th className="text-right py-3 px-4 font-semibold">CMV Atual</th>
                                            <th className="text-right py-3 px-4 font-semibold">Margem Extra</th>
                                            <th className="text-right py-3 px-4 font-semibold">PVP Médio</th>
                                            <th className="text-right py-3 px-4 font-semibold">Vendas</th>
                                            <th className="text-right py-3 px-4 font-semibold">Ganho/Unid.</th>
                                            <th className="text-right py-3 px-4 font-semibold bg-emerald-100">✅ TOTAL POUPADO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading
                                            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                            : data?.ganhos.map((item) => (
                                                <tr key={item.id} className="border-b hover:bg-emerald-50 border-l-4 border-l-emerald-400 transition-colors">
                                                    <td className="py-3 px-4 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Target className="w-4 h-4 text-emerald-500" />
                                                            {item.nome_comercial}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-500">
                                                        {item.categoria_menu || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                                                        {item.cmvAtual.toFixed(1)}%
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-emerald-500">
                                                        −{item.economiasCMV.toFixed(1)}pp
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        €{fmt(item.pvpMedio)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        {item.volumeVendas.toLocaleString('pt-PT')}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-emerald-600">
                                                        +€{fmt(item.ganhoUnitario)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700 bg-emerald-50">
                                                        +€{fmt(item.totalGanho)}
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                    {!loading && data && data.ganhos.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-emerald-100 border-t-2 border-emerald-300">
                                                <td colSpan={7} className="py-3 px-4 font-bold text-emerald-800 text-right">
                                                    TOTAL POUPADO NO PERÍODO:
                                                </td>
                                                <td className="py-3 px-4 text-right font-extrabold text-emerald-800 text-lg">
                                                    +€{fmt(resumo?.totalGanho ?? 0)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── SALDO TOTAL BAR ────────────────────────────────────── */}
                {!loading && resumo && (resumo.totalPerdido > 0 || resumo.totalGanho > 0) && (
                    <Card className={`border-2 ${resumo.saldoLiquido >= 0 ? 'border-blue-200' : 'border-red-300'}`}>
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Saldo Líquido do Período</p>
                                    <p className={`text-4xl font-extrabold mt-1 ${resumo.saldoLiquido >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        {resumo.saldoLiquido >= 0 ? '+' : ''}€{fmt(resumo.saldoLiquido)}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Poupado (€{fmt(resumo.totalGanho)}) − Perdido (€{fmt(resumo.totalPerdido)})
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 text-center">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">CMV Target</p>
                                        <p className="text-2xl font-bold text-gray-700">{resumo.cmvTarget}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Threshold Amarelo</p>
                                        <p className="text-2xl font-bold text-yellow-500">{resumo.cmvAmarelo}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Threshold Vermelho</p>
                                        <p className="text-2xl font-bold text-red-500">{resumo.cmvVermelho}%</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

            </div>
        </AppLayout>
    );
}

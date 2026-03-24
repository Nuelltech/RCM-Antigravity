"use client";

import { useDecisionDashboard } from "@/hooks/api/useDecisionDashboard";
import { AppLayout } from "@/components/layout/AppLayout";
import { MarginStatusHeader } from "@/components/decision-dashboard/MarginStatusHeader";
import { ProblemList } from "@/components/decision-dashboard/ProblemList";
import { ActionList } from "@/components/decision-dashboard/ActionList";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function DecisionDashboardPage() {
    const { data, isLoading, error, refreshDashboard, isValidating } = useDecisionDashboard();
    const [isRefreshing, setIsRefreshing] = useState(false);

    if (error) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <h2 className="text-xl font-bold text-slate-800">Ups, encontrámos um erro</h2>
                    <p className="text-slate-500 mt-2">Não foi possível carregar o Dashboard de Decisões.</p>
                </div>
            </AppLayout>
        );
    }

    if (isLoading || !data) {
        return (
            <AppLayout>
                <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center py-20 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                    <p>A carregar o seu Radar de Decisões...</p>
                </div>
            </AppLayout>
        );
    }

    const { marginStatus, actionList, structuralProblems, recentChanges, occupancyData, structureData, insightMessage } = data;
    
    // Provide a safe fallback if globalMacro is undefined (from stale Redis/SWR cache)
    const globalMacro = data.globalMacro || {
        vendas: 0,
        custosMercadoria: 0,
        custosEstrutura: 0,
        resultadoLiquido: 0
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const handleTaskComplete = (taskId: string) => {
        // Optimistic UI interaction (for phase 1 V1 test)
        console.log("Task marked as completed: ", taskId);
        alert("Ação Registada! A sua decisão foi assinalada com sucesso.");
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshDashboard();
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            Dashboard de Decisões
                        </h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Resumo financeiro claro. Descubra onde está a perder dinheiro em menos de 10 segundos.
                        </p>
                    </div>
                    
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRefresh}
                        disabled={isRefreshing || isValidating}
                        className="text-slate-600 bg-white"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || isValidating) ? 'animate-spin' : ''}`} />
                        Atualizar Dados
                    </Button>
                </div>



                {/* 0. Macro Financials (30 days) - Single Card Layout */}
                <div className="mb-8">
                    <div className="p-6 rounded-2xl border bg-white shadow-sm flex flex-col relative w-full overflow-hidden max-w-2xl">
                        {/* Title & Detail Button */}
                        <div className="flex justify-between items-start mb-6 w-full">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                💰 O Resultado dos ultimos 30 dias de trabalho
                            </h2>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => window.location.href = '/dashboard'}
                                className="text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            >
                                Ver detalhe →
                            </Button>
                        </div>

                        {/* Net Result highlighted */}
                        <div className="mb-2">
                            <div className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${globalMacro.resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {globalMacro.resultadoLiquido > 0 ? '+' : ''}{formatCurrency(globalMacro.resultadoLiquido)}
                            </div>
                            <div className="mt-2 text-sm font-medium text-slate-600 flex items-center gap-2">
                                👉 {globalMacro.resultadoLiquido >= 0 ? 'Margem Segura' : 'Margem frágil'} ({formatCurrency(globalMacro.resultadoLiquido / 30)}/dia)
                            </div>
                        </div>

                        <div className="w-full h-px border-dashed border-b border-slate-200 my-5" />
                        
                        {/* Vendas e Custos */}
                        <div className="flex flex-col gap-1.5 mb-5 border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                            <div className="text-sm text-slate-500 flex items-center justify-between">
                                <span>Vendas:</span> <span className="font-bold text-blue-500 text-base">{formatCurrency(globalMacro.vendas)}</span>
                            </div>
                            <div className="text-sm text-slate-500 flex flex-col pt-1 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <span>Custos:</span> <span className="font-bold text-red-500 text-base">{formatCurrency(globalMacro.custosMercadoria + globalMacro.custosEstrutura)}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 mt-0.5 italic flex justify-end">(inclui Custos de Estrutura + Custo das Mercadorias)</span>
                            </div>
                        </div>

                        {/* Indicators */}
                        <div className="flex flex-col gap-2 mb-2">
                            <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                💸 Perda no menu: <span className="text-red-500 font-bold">-{formatCurrency(marginStatus.currentLoss)}</span>
                            </div>
                            <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                ⚠️ Custos a subir: <span className="text-amber-500 font-bold">-{formatCurrency(marginStatus.additionalRisk)}</span>
                            </div>
                        </div>

                        <div className="w-full h-px border-dashed border-b border-slate-200 my-5" />

                        {/* CMV explanation in natural language */}
                        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 mb-4 leading-relaxed font-medium">
                            <span className="block mb-2 font-normal text-slate-500">
                                Gastou <strong>{marginStatus.cmv.toFixed(1)}%</strong> do valor nas vendas em mercadoria e estrutura. O teto recomendado era <strong>{marginStatus.targetCmv.toFixed(0)}%</strong>. 
                            </span>
                            <div className={`p-3 rounded border-l-4 shadow-sm ${globalMacro.resultadoLiquido >= 0 ? "border-emerald-500 bg-emerald-50" : "border-red-500 bg-red-50"}`}>
                                <div className="flex items-start gap-2">
                                    <span className="text-xl">💡</span>
                                    <div>
                                        <p className="font-semibold text-slate-800 mb-1">Diagnóstico Total da Margem</p>
                                        <span className="font-medium text-slate-700">{insightMessage}</span>
                                        {structureData?.rate > 0 && typeof structureData.breakEvenSales === 'number' && (
                                            <p className="text-xs text-slate-500 mt-2 font-normal flex items-center gap-1">
                                                <span>📊 Ocupação: {occupancyData?.rate || 0}%</span> • 
                                                <span>Estrutura: {structureData.rate}%</span> •
                                                <span>Ponto de Equilíbrio: {formatCurrency(structureData.breakEvenSales)}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2 Title */}
                <div className="mt-10 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        🧩 Desafios Operacionais a Resolver
                    </h2>
                    <p className="text-sm text-slate-500">Onde estão as fugas de dinheiro na ementa e como compensá-las.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (8 cols on large screens) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* 1. Header Margin Status */}
                        <MarginStatusHeader 
                            currentLoss={marginStatus.currentLoss}
                            currentGain={marginStatus.currentGain}
                            netBalance={marginStatus.netBalance}
                            additionalRisk={marginStatus.additionalRisk}
                            cmv={marginStatus.cmv}
                            targetCmv={marginStatus.targetCmv}
                        />

                        {/* 2. Problems Grid (Structural vs Recent) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ProblemList 
                                type="structural" 
                                items={structuralProblems.items} 
                                totalItems={structuralProblems.totalItems} 
                            />
                            <ProblemList 
                                type="recent" 
                                items={recentChanges.items} 
                                totalItems={recentChanges.totalItems} 
                            />
                        </div>
                    </div>

                    {/* Right Column (4 cols on large screens) */}
                    <div className="lg:col-span-4">
                        {/* 3. Auto-Generated Action List */}
                        <ActionList 
                            tasks={actionList.tasks} 
                            onTaskComplete={handleTaskComplete} 
                        />
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}

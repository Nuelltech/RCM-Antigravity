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

    const { marginStatus, actionList, structuralProblems, recentChanges } = data;

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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (8 cols on large screens) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* 1. Header Margin Status */}
                        <MarginStatusHeader 
                            currentLoss={marginStatus.currentLoss}
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

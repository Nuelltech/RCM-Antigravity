"use client";

import { AlertTriangle, TrendingDown } from "lucide-react";
import { StructuralProblem, RecentChange } from "@/hooks/api/useDecisionDashboard";

interface ProblemListProps {
    type: 'structural' | 'recent';
    items: (StructuralProblem | RecentChange)[];
    totalItems: number;
}

export function ProblemList({ type, items, totalItems }: ProblemListProps) {
    const isStructural = type === 'structural';
    
    if (!items || items.length === 0) {
        return (
            <div className={`rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center h-[350px] ${isStructural ? 'bg-rose-50/50' : 'bg-orange-50/50'}`}>
                {isStructural ? <TrendingDown className="h-8 w-8 text-rose-300 mb-2" /> : <AlertTriangle className="h-8 w-8 text-orange-300 mb-2" />}
                <h4 className="font-semibold text-slate-700">Sem problemas a reportar</h4>
                <p className="text-sm text-slate-500 mt-1">
                    {isStructural ? 'Não há pratos com desvio significativo do CMV alvo.' : 'Não há novos alertas de custo com impacto relevante.'}
                </p>
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    return (
        <div className={`rounded-xl border bg-white flex flex-col h-full overflow-hidden shadow-sm`}>
            {/* Header section */}
            <div className={`p-4 border-b flex items-center gap-3 ${isStructural ? 'bg-rose-50' : 'bg-orange-50'}`}>
                <div className={`p-2 rounded-full ${isStructural ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'}`}>
                    {isStructural ? <TrendingDown className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div>
                    <h3 className={`font-bold ${isStructural ? 'text-rose-900' : 'text-orange-900'}`}>
                        {isStructural ? 'MENU COM PERDA REAL' : 'CUSTOS A SUBIR'}
                    </h3>
                    <p className={`text-xs font-medium ${isStructural ? 'text-rose-700/80' : 'text-orange-700/80'}`}>
                        {isStructural ? '💸 Dinheiro perdido nas vendas (Últimos 30 dias)' : '🔮 Prejuízo projetado (Próximos 30 dias)'}
                    </p>
                </div>
            </div>

            {/* List section */}
            <div className="flex-1 overflow-auto">
                <ul className="divide-y divide-slate-100">
                    {items.map((item, index) => {
                        const loss = isStructural ? (item as StructuralProblem).loss : (item as RecentChange).deltaLoss;
                        const actionText = isStructural 
                            ? (item as StructuralProblem).suggestedAction 
                            : `Ajustar preço sugerido: +${formatCurrency((item as RecentChange).priceAdjustment || 0)}`;

                        return (
                            <li key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-semibold text-slate-800 text-base max-w-[70%] truncate" title={item.name}>
                                        {index + 1}. {item.name}
                                    </div>
                                    <div className="font-bold text-red-600 flex flex-col items-end leading-tight">
                                        <span className={`text-[9px] uppercase font-semibold tracking-wider ${isStructural ? 'text-rose-400' : 'text-orange-400'}`}>
                                            {isStructural ? 'Já perdeu:' : 'Vai perder:'}
                                        </span>
                                        <span>-{formatCurrency(loss)}</span>
                                    </div>
                                </div>
                                
                                {isStructural && (
                                    <div className="text-xs text-slate-500 mb-2 font-medium">
                                        CMV Atual: <span className="text-red-600 font-bold">{Math.round((item as StructuralProblem).cmv)}%</span> 
                                        {' '}(Target: {(item as StructuralProblem).targetCmv}%)
                                    </div>
                                )}
                                
                                {!isStructural && (item as RecentChange).extraSalesNeeded && (
                                    <div className="text-xs text-slate-500 mb-2 font-medium">
                                        Pratos extra p/ compensar: <span className="text-orange-600 font-bold">{(item as RecentChange).extraSalesNeeded}</span>
                                    </div>
                                )}

                                <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mt-2 bg-slate-100/50 p-2 rounded-lg border border-slate-100">
                                    👉 {actionText}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Footer section showing Hidden items */}
            {totalItems > items.length && (
                <div className="p-3 bg-slate-50 border-t text-center">
                    <button className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                        Ver +{totalItems - items.length} {isStructural ? 'pratos problemáticos' : 'alterações recentes'}
                    </button>
                </div>
            )}
        </div>
    );
}

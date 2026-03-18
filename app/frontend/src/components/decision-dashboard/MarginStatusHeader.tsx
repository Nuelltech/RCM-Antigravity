"use client";

import { AlertTriangle, TrendingDown } from "lucide-react";

interface MarginStatusHeaderProps {
    currentLoss: number;
    additionalRisk: number;
    cmv: number;
    targetCmv: number;
}

export function MarginStatusHeader({ currentLoss, additionalRisk, cmv, targetCmv }: MarginStatusHeaderProps) {
    const isLosingMoney = currentLoss > 0;
    const hasRisk = additionalRisk > 0;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Hemorrhage Box */}
            <div className={`p-6 rounded-xl border ${isLosingMoney ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'} flex items-start gap-4`}>
                <div className={`p-3 rounded-full ${isLosingMoney ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <TrendingDown className="h-6 w-6" />
                </div>
                <div>
                    <h3 className={`text-sm font-medium ${isLosingMoney ? 'text-red-800' : 'text-emerald-800'}`}>ESTÁ A PERDER DINHEIRO</h3>
                    <div className={`text-3xl font-bold mt-1 ${isLosingMoney ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isLosingMoney ? `-${formatCurrency(currentLoss)}` : '0,00 €'} / mês
                    </div>
                    <p className={`text-sm mt-1 ${isLosingMoney ? 'text-red-700/80' : 'text-emerald-700/80'}`}>
                        (menu atual acima do CMV alvo)
                    </p>
                </div>
            </div>

            {/* Risk Box (Radar) */}
            <div className={`p-6 rounded-xl border ${hasRisk ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'} flex items-start justify-between`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${hasRisk ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className={`text-sm font-medium ${hasRisk ? 'text-orange-800' : 'text-green-800'}`}>RISCO ADICIONAL</h3>
                        <div className={`text-3xl font-bold mt-1 ${hasRisk ? 'text-orange-600' : 'text-green-600'}`}>
                            {hasRisk ? `-${formatCurrency(additionalRisk)}` : '0,00 €'}
                        </div>
                        <p className={`text-sm mt-1 ${hasRisk ? 'text-orange-700/80' : 'text-green-700/80'}`}>
                            {hasRisk ? '(aumentos de custos recentes em análise)' : '(sem alterações de custo recentes)'}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm font-medium text-slate-500 uppercase">CMV Global</div>
                    <div className={`text-2xl font-bold ${cmv > targetCmv ? 'text-red-600' : 'text-slate-700'}`}>
                        {cmv.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Alvo: {targetCmv.toFixed(0)}%</div>
                </div>
            </div>
        </div>
    );
}

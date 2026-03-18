"use client";

import { AlertTriangle, TrendingDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface MarginStatusHeaderProps {
    currentLoss: number;
    currentGain: number;
    netBalance: number;
    additionalRisk: number;
    cmv: number;
    targetCmv: number;
}

export function MarginStatusHeader({ currentLoss, currentGain, netBalance, additionalRisk, cmv, targetCmv }: MarginStatusHeaderProps) {
    const isLosingMoney = currentLoss > 0;
    const hasRisk = additionalRisk > 0;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Hemorrhage Box */}
            <div className={`p-5 rounded-xl border ${isLosingMoney ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'} flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isLosingMoney ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            <TrendingDown className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className={`text-sm font-semibold ${isLosingMoney ? 'text-red-900' : 'text-emerald-900'}`}>Hemorragia Financeira</h3>
                            <p className={`text-[10px] uppercase font-bold tracking-wider ${isLosingMoney ? 'text-red-700/60' : 'text-emerald-700/60'}`}>
                                Últimos 30 Dias
                            </p>
                        </div>
                    </div>
                    <Link href="/hemorragia-financeira">
                        <Button variant="ghost" size="sm" className={`h-8 px-2 text-xs ${isLosingMoney ? 'text-red-700 hover:text-red-800 hover:bg-red-100' : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100'}`}>
                            Ver detalhe <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </Link>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t" style={{ borderColor: isLosingMoney ? '#fecaca' : '#a7f3d0' }}>
                    <div>
                        <div className={`text-xs font-medium mb-1 ${isLosingMoney ? 'text-red-700/70' : 'text-emerald-700/70'}`}>A perder</div>
                        <div className={`text-lg sm:text-xl font-bold ${currentLoss > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {currentLoss > 0 ? `-${formatCurrency(currentLoss)}` : '0,00 €'}
                        </div>
                    </div>
                    <div>
                        <div className={`text-xs font-medium mb-1 ${isLosingMoney ? 'text-red-700/70' : 'text-emerald-700/70'}`}>A ganhar</div>
                        <div className={`text-lg sm:text-xl font-bold ${currentGain > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {currentGain > 0 ? `+${formatCurrency(currentGain)}` : '0,00 €'}
                        </div>
                    </div>
                    <div>
                        <div className={`text-xs font-medium mb-1 ${isLosingMoney ? 'text-red-700/70' : 'text-emerald-700/70'}`}>Saldo Líquido</div>
                        <div className={`text-lg sm:text-xl font-bold ${netBalance > 0 ? 'text-emerald-600' : netBalance < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                            {netBalance > 0 ? '+' : ''}{formatCurrency(netBalance)}
                        </div>
                    </div>
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

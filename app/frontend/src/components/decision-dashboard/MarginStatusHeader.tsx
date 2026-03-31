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
                            <div className="flex items-center gap-1 group relative">
                                <h3 className={`text-sm font-semibold ${isLosingMoney ? 'text-red-900' : 'text-emerald-900'}`}>Hemorragia Financeira</h3>
                                <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-10 font-normal normal-case tracking-normal">
                                    Este valor é real. Representa o lucro líquido exato que o seu restaurante deixou de ganhar no último mês porque vendeu estes pratos com margens abaixo do objetivo.
                                </div>
                                <div className="cursor-help w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] opacity-60">i</div>
                            </div>
                            <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${isLosingMoney ? 'text-red-700/60' : 'text-emerald-700/60'}`}>
                                💸 DINHEIRO PERDIDO NAS VENDAS (Últimos 30 dias)
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
            <div className={`p-5 rounded-xl border ${hasRisk ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'} flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${hasRisk ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1 group relative">
                                <h3 className={`text-sm font-semibold uppercase ${hasRisk ? 'text-orange-900' : 'text-green-900'}`}>Risco de perda adicional</h3>
                                <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-10 font-normal normal-case tracking-normal">
                                    Este valor é uma projecção financeira futura para avisar quanto vai perder mensalmente se não ajustar os preços de venda dos pratos que sofreram aumentos nos fornecedores.
                                </div>
                                <div className="cursor-help w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] opacity-60">i</div>
                            </div>
                            <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${hasRisk ? 'text-orange-700/60' : 'text-green-700/60'}`}>
                                🔮 PREJUÍZO (Próximos 30 dias)
                            </p>
                        </div>
                    </div>
                    <Link href="/alertas-erosao">
                        <Button variant="ghost" size="sm" className={`h-8 px-2 text-xs ${hasRisk ? 'text-orange-700 hover:text-orange-800 hover:bg-orange-100' : 'text-green-700 hover:text-green-800 hover:bg-green-100'}`}>
                            Ver detalhe <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </Link>
                </div>

                <div className="mt-4 pt-4 border-t" style={{ borderColor: hasRisk ? '#fed7aa' : '#bbf7d0' }}>
                    <div>
                        <div className={`text-lg sm:text-2xl font-bold ${hasRisk ? 'text-orange-600' : 'text-green-600'}`}>
                            {hasRisk ? `-${formatCurrency(additionalRisk)}` : '0,00 €'}
                        </div>
                        <p className={`text-[10px] sm:text-xs mt-1 max-w-[150px] sm:max-w-none ${hasRisk ? 'text-orange-700/80' : 'text-green-700/80'}`}>
                            {hasRisk ? '(aumentos de custos em análise)' : '(sem aumentos de custos)'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchClient } from '@/lib/api';
import { TrendingDown, TrendingUp, AlertTriangle, ArrowRight, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CmvResumo {
    totalPerdido: number;
    totalGanho: number;
    saldoLiquido: number;
    numItensPerda: number;
    numItensCritico: number;
    numItensCatastrofe: number;
    cmvTarget: number;
}

interface Props {
    startDate: string;
    endDate: string;
}

export function CmvAlertCard({ startDate, endDate }: Props) {
    const router = useRouter();
    const [resumo, setResumo] = useState<CmvResumo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!startDate || !endDate) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchClient(
                    `/hemorragia/analise?startDate=${startDate}&endDate=${endDate}`
                );
                if (!cancelled && data?.resumo) {
                    setResumo(data.resumo);
                }
            } catch {
                // Fail silently — dashboard should not break if this fails
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [startDate, endDate]);

    // Don't render if there's nothing to show (no data yet or truly nothing)
    if (!loading && (!resumo || (resumo.totalPerdido === 0 && resumo.totalGanho === 0))) {
        return null;
    }

    const isCritical = resumo && (resumo.numItensCritico + resumo.numItensCatastrofe) > 0;
    const saldoPositivo = resumo && resumo.saldoLiquido >= 0;

    return (
        <div
            className={`rounded-2xl border-2 p-5 transition-all ${isCritical
                    ? 'border-red-200 bg-gradient-to-r from-red-50 to-orange-50'
                    : 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50'
                }`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Title + icon */}
                <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2.5 ${isCritical ? 'bg-red-100' : 'bg-amber-100'}`}>
                        <Droplets className={`h-6 w-6 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-base">
                            🩸 Hemorragia Financeira
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Impacto dos pratos acima do CMV target ({resumo?.cmvTarget ?? '—'}%)
                        </p>
                    </div>
                </div>

                {/* Right: CTA */}
                <Button
                    size="sm"
                    variant="outline"
                    className={`shrink-0 gap-1.5 font-semibold border-2 ${isCritical
                            ? 'border-red-300 text-red-700 hover:bg-red-50'
                            : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                        }`}
                    onClick={() => router.push('/hemorragia-financeira')}
                >
                    Ver agora
                    <ArrowRight className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Metrics row */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total a perder */}
                <div className="rounded-xl bg-white/70 px-3 py-2.5 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs text-gray-500 font-medium">A perder</span>
                    </div>
                    {loading ? (
                        <div className="h-5 w-16 bg-red-100 animate-pulse rounded" />
                    ) : (
                        <p className="text-lg font-bold text-red-600">
                            -{(resumo?.totalPerdido ?? 0).toFixed(2)}€
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">no período</p>
                </div>

                {/* Itens críticos */}
                <div className="rounded-xl bg-white/70 px-3 py-2.5 border border-orange-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-xs text-gray-500 font-medium">Pratos críticos</span>
                    </div>
                    {loading ? (
                        <div className="h-5 w-8 bg-orange-100 animate-pulse rounded" />
                    ) : (
                        <p className="text-lg font-bold text-orange-600">
                            {resumo?.numItensPerda ?? 0}
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">acima do target</p>
                </div>

                {/* Total a ganhar */}
                <div className="rounded-xl bg-white/70 px-3 py-2.5 border border-green-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs text-gray-500 font-medium">A ganhar</span>
                    </div>
                    {loading ? (
                        <div className="h-5 w-16 bg-green-100 animate-pulse rounded" />
                    ) : (
                        <p className="text-lg font-bold text-green-600">
                            +{(resumo?.totalGanho ?? 0).toFixed(2)}€
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">no período</p>
                </div>

                {/* Saldo líquido */}
                <div className={`rounded-xl bg-white/70 px-3 py-2.5 border ${saldoPositivo ? 'border-green-100' : 'border-red-100'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs text-gray-500 font-medium">Saldo líquido</span>
                    </div>
                    {loading ? (
                        <div className="h-5 w-16 bg-gray-100 animate-pulse rounded" />
                    ) : (
                        <p className={`text-lg font-bold ${saldoPositivo ? 'text-green-600' : 'text-red-600'}`}>
                            {saldoPositivo ? '+' : ''}{(resumo?.saldoLiquido ?? 0).toFixed(2)}€
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">ganho - perda</p>
                </div>
            </div>
        </div>
    );
}

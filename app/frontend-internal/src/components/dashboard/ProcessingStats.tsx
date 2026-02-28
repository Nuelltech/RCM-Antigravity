"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { FileText, ShoppingBag, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface ProcessingMetrics {
    total: number;
    imported: number;
    pending: number;
    rejected: number;
    error: number;
    success_rate: number;
}

interface ProcessingStatsData {
    invoices: ProcessingMetrics;
    sales: ProcessingMetrics;
}

export function ProcessingStats() {
    const [stats, setStats] = useState<ProcessingStatsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        // Refresh every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const data = await fetchWithAuth('/api/internal/health/processing');
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch processing stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                <div className="h-64 bg-slate-100 rounded-xl"></div>
                <div className="h-64 bg-slate-100 rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
                title="Faturas (Invoices)"
                subtitle="Importação e Processamento"
                icon={FileText}
                metrics={stats?.invoices}
                color="blue"
            />
            <StatCard
                title="Vendas (Sales)"
                subtitle="Importação e Ficheiros"
                icon={ShoppingBag}
                metrics={stats?.sales}
                color="purple"
            />
        </div>
    );
}

function StatCard({ title, subtitle, icon: Icon, metrics, color }: any) {
    if (!metrics) return null;

    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-lg ${(colorClasses as any)[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
            </div>

            <div className="space-y-4">
                <MetricRow
                    label="Total Processado"
                    value={metrics.total}
                    icon={null}
                />
                <div className="h-px bg-slate-100 my-2"></div>
                <MetricRow
                    label="Sucesso"
                    value={metrics.imported}
                    status="success"
                    subValue={`${metrics.success_rate}%`}
                    icon={CheckCircle}
                />
                <MetricRow
                    label="Pendente / Review"
                    value={metrics.pending}
                    status={metrics.pending > 0 ? 'warning' : 'neutral'}
                    icon={Clock}
                />
                <MetricRow
                    label="Erros / Rejeitados"
                    value={metrics.error + metrics.rejected}
                    status={(metrics.error + metrics.rejected) > 0 ? 'error' : 'success'}
                    icon={AlertCircle}
                />
            </div>
        </div>
    );
}

function MetricRow({ label, value, status = 'neutral', subValue, icon: Icon }: any) {
    const statusColors = {
        success: 'text-green-600',
        warning: 'text-amber-600',
        error: 'text-red-600',
        neutral: 'text-gray-900',
    };

    return (
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
                {Icon && <Icon className={`w-4 h-4 ${(statusColors as any)[status]}`} />}
                <span>{label}</span>
            </div>
            <div className="text-right">
                <span className={`font-semibold ${(statusColors as any)[status]}`}>
                    {value}
                </span>
                {subValue && (
                    <span className="text-xs text-slate-400 ml-2">({subValue})</span>
                )}
            </div>
        </div>
    );
}

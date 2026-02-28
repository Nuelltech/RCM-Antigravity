'use client';

import { TenantHealth } from '@/services/internal-tenants.service';
import { Package, UtensilsCrossed, Users, FileText, ShoppingBag, HardDrive } from 'lucide-react';

interface TenantHealthMetricsProps {
    health: TenantHealth | null;
    isLoading?: boolean;
}

export function TenantHealthMetrics({ health, isLoading }: TenantHealthMetricsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!health) {
        return null;
    }

    const metrics = [
        {
            label: 'Produtos',
            value: health.products_count,
            icon: Package,
            color: 'blue',
        },
        {
            label: 'Receitas',
            value: health.recipes_count,
            icon: UtensilsCrossed,
            color: 'purple',
        },
        {
            label: 'Utilizadores',
            value: health.users_count,
            icon: Users,
            color: 'green',
        },
        {
            label: 'Faturas',
            value: health.invoices.total,
            subValue: `${health.invoices.success} ✓ / ${health.invoices.error} ✗`,
            icon: FileText,
            color: 'orange',
            status: health.invoices.error > 0 ? 'warning' : 'ok',
        },
        {
            label: 'Vendas',
            value: health.sales.total,
            subValue: `${health.sales.success} ✓ / ${health.sales.error} ✗`,
            icon: ShoppingBag,
            color: 'pink',
            status: health.sales.error > 0 ? 'warning' : 'ok',
        },
        {
            label: 'Storage',
            value: `${health.storage_used_mb} MB`,
            subValue: `de ${health.storage_limit_mb} MB`,
            icon: HardDrive,
            color: 'slate',
            status:
                health.storage_used_mb / health.storage_limit_mb > 0.9
                    ? 'error'
                    : health.storage_used_mb / health.storage_limit_mb > 0.7
                        ? 'warning'
                        : 'ok',
        },
    ];

    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        pink: 'bg-pink-50 text-pink-600',
        slate: 'bg-slate-50 text-slate-600',
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((metric, index) => {
                const Icon = metric.icon;
                const statusColor =
                    metric.status === 'error'
                        ? 'border-red-300'
                        : metric.status === 'warning'
                            ? 'border-yellow-300'
                            : 'border-slate-200';

                return (
                    <div
                        key={index}
                        className={`bg-white rounded-xl p-4 border ${statusColor} shadow-sm hover:shadow-md transition-shadow`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-lg ${colorClasses[metric.color as keyof typeof colorClasses]}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            {metric.status === 'warning' && (
                                <span className="text-xs text-yellow-600 font-medium">⚠️</span>
                            )}
                            {metric.status === 'error' && (
                                <span className="text-xs text-red-600 font-medium">❌</span>
                            )}
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                        <p className="text-sm text-slate-600">{metric.label}</p>
                        {metric.subValue && (
                            <p className="text-xs text-slate-500 mt-1">{metric.subValue}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

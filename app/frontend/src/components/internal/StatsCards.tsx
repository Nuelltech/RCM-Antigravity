/**
 * Stats Cards Component
 * Display lead statistics in card format
 */

import { LeadStats } from '@/services/leads-internal.service';

interface StatsCardsProps {
    stats: LeadStats | null;
    isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const cards = [
        {
            title: 'Total de Leads',
            value: stats.total,
            icon: '📊',
            color: 'bg-blue-50 text-blue-700',
        },
        {
            title: 'Novos',
            value: stats.new,
            icon: '🆕',
            color: 'bg-green-50 text-green-700',
        },
        {
            title: 'Qualificados',
            value: stats.qualified,
            icon: '✅',
            color: 'bg-purple-50 text-purple-700',
        },
        {
            title: 'Taxa de Conversão',
            value: `${stats.conversionRate}%`,
            icon: '🎯',
            color: 'bg-orange-50 text-orange-700',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                        </div>
                        <div className={`text-4xl ${card.color} rounded-full w-16 h-16 flex items-center justify-center`}>
                            {card.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

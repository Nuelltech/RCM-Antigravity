'use client';

import { TenantError } from '@/services/internal-tenants.service';
import { AlertTriangle, XCircle, AlertCircle, Clock } from 'lucide-react';

interface RecentErrorsListProps {
    errors: TenantError[];
    isLoading?: boolean;
}

export function RecentErrorsList({ errors, isLoading }: RecentErrorsListProps) {
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!errors || errors.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-green-50 rounded-full">
                        <AlertCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-slate-600 font-medium">Nenhum erro recente</p>
                    <p className="text-sm text-slate-500">Não foram encontrados erros nos últimos 7 dias</p>
                </div>
            </div>
        );
    }

    const getLevelIcon = (level: string) => {
        switch (level.toUpperCase()) {
            case 'ERROR':
            case 'CRITICAL':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'WARN':
            case 'WARNING':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-blue-500" />;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level.toUpperCase()) {
            case 'ERROR':
            case 'CRITICAL':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'WARN':
            case 'WARNING':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default:
                return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Erros Recentes (Últimos 7 dias)
                </h3>
            </div>

            {/* Errors List */}
            <div className="divide-y divide-slate-100">
                {errors.map((error) => (
                    <div
                        key={error.id}
                        className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="mt-1">{getLevelIcon(error.level)}</div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getLevelColor(
                                            error.level
                                        )}`}
                                    >
                                        {error.level.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">
                                        {error.source}
                                    </span>
                                </div>

                                <p className="text-sm text-slate-800 font-medium mb-1 break-words">
                                    {error.message}
                                </p>

                                {error.endpoint && (
                                    <p className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded inline-block">
                                        {error.endpoint}
                                    </p>
                                )}
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                {new Date(error.timestamp).toLocaleString('pt-PT', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            {errors.length >= 20 && (
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
                    <p className="text-xs text-slate-500">
                        Mostrando os 20 erros mais recentes
                    </p>
                </div>
            )}
        </div>
    );
}

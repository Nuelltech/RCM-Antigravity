"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { Database, Gauge, Server, Zap } from "lucide-react";

export interface HealthData {
    service: string;
    status: 'UP' | 'DOWN' | 'DEGRADED';
    response_ms?: number;
    details?: any;
}

export interface SystemHealthData {
    status: string;
    services: {
        db: HealthData;
        redis: HealthData;
        workers: HealthData;
        ai?: HealthData;
    };
    stats?: {
        uptime_seconds: number;
        total_requests_today: number;
        avg_response_time_1h: number;
        success_rate_24h: number;
    };
}

export function SystemHealthCards({ healthData }: { healthData?: SystemHealthData }) {
    const [health, setHealth] = useState<SystemHealthData | null>(healthData || null);
    const [isLoading, setIsLoading] = useState(!healthData);

    useEffect(() => {
        if (healthData) {
            setHealth(healthData);
            setIsLoading(false);
            return;
        }

        fetchHealth();
        // Refresh every 30 seconds
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, [healthData]);

    const fetchHealth = async () => {
        try {
            const data = await fetchWithAuth('/api/internal/health/overview');
            setHealth(data.health);
        } catch (error) {
            console.error('Error fetching health:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <HealthCard
                title="Database"
                icon={Database}
                status={health?.services.db.status}
                responseTime={health?.services.db.response_ms}
                isLoading={isLoading}
            />

            <HealthCard
                title="Redis"
                icon={Zap}
                status={health?.services.redis.status}
                responseTime={health?.services.redis.response_ms}
                isLoading={isLoading}
            />

            <HealthCard
                title="Workers"
                icon={Server}
                status={health?.services.workers.status}
                responseTime={health?.services.workers.response_ms}
                isLoading={isLoading}
                details={health?.services.workers.details && (
                    <div className="text-xs text-slate-500 mt-2 flex flex-col gap-1">
                        <div className="flex justify-between">
                            <span>Active Workers:</span>
                            <span className="font-medium text-slate-700">{health.services.workers.details.active_workers}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Queue:</span>
                            <span className="font-medium text-slate-700">{health.services.workers.details.waiting_jobs} jobs</span>
                        </div>
                    </div>
                )}
            />

            <HealthCard
                title="AI Services"
                icon={Zap}
                status={health?.services.ai?.status || 'DOWN'}
                responseTime={health?.services.ai?.response_ms}
                isLoading={isLoading}
                details={health?.services.ai?.details && (
                    <div className="text-xs text-slate-500 mt-3 space-y-1.5 border-t border-slate-100 pt-2">
                        <div className="flex justify-between items-center">
                            <span>Gemini API</span>
                            <span className={`font-medium ${health.services.ai.status === 'UP' ? 'text-green-600' : 'text-red-500'}`}>
                                {health.services.ai.status === 'UP' ? 'Active' : 'Error'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Vision</span>
                            <span className={`font-medium ${(health.services.ai.details as any).vision_active ? 'text-green-600' : 'text-yellow-500'}`}>
                                {(health.services.ai.details as any).vision_active ? 'Ready' : 'Disabled'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Config</span>
                            <span className={`font-medium ${(health.services.ai.details as any).api_key_configured ? 'text-green-600' : 'text-red-500'}`}>
                                {(health.services.ai.details as any).api_key_configured ? 'Valid' : 'Missing'}
                            </span>
                        </div>
                    </div>
                )}
            />
        </div>
    );
}

interface HealthCardProps {
    title: string;
    icon: any;
    status?: 'UP' | 'DOWN' | 'DEGRADED';
    responseTime?: number;
    isLoading?: boolean;
    details?: React.ReactNode;
}

function HealthCard({ title, icon: Icon, status, responseTime, isLoading, details }: HealthCardProps) {
    const statusColors = {
        UP: 'bg-green-50 text-green-700 border-green-200',
        DEGRADED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        DOWN: 'bg-red-50 text-red-700 border-red-200',
    };

    const iconColors = {
        UP: 'bg-green-100 text-green-600',
        DEGRADED: 'bg-yellow-100 text-yellow-600',
        DOWN: 'bg-red-100 text-red-600',
    };

    const currentStatus = status || 'UP';

    return (
        <div className={`rounded-xl p-6 border-2 transition-colors ${statusColors[currentStatus]}`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${iconColors[currentStatus]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${currentStatus === 'UP' ? 'bg-green-200' :
                    currentStatus === 'DEGRADED' ? 'bg-yellow-200' :
                        'bg-red-200'
                    }`}>
                    {currentStatus}
                </div>
            </div>

            {isLoading ? (
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-1"></div>
            ) : (
                <div className="space-y-1">
                    <h3 className="text-lg font-bold">{title}</h3>
                    {responseTime !== undefined && (
                        <p className="text-sm opacity-75">{responseTime}ms response</p>
                    )}
                    {details}
                </div>
            )}
        </div>
    );
}

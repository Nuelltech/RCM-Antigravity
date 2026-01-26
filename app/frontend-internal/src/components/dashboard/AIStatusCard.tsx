"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { Bot, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";

interface AIHealthDetails {
    models: string[];
    vision_active: boolean;
    api_key_configured: boolean;
}

interface AIHealth {
    status: 'UP' | 'DOWN' | 'DEGRADED';
    response_ms: number;
    details?: AIHealthDetails;
}

export function AIStatusCard() {
    const [health, setHealth] = useState<AIHealth | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const data = await fetchWithAuth('/api/internal/health/overview');
            // The overview endpoint returns all services, we extract AI
            setHealth(data.health?.services?.ai);
        } catch (error) {
            console.error('Failed to fetch AI status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="h-full bg-slate-50 rounded-xl animate-pulse"></div>;
    }

    const isUp = health?.status === 'UP';
    const isDown = health?.status === 'DOWN';

    return (
        <div className={`rounded-xl p-6 border-2 transition-colors ${isUp ? 'bg-purple-50 border-purple-100' :
                isDown ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'
            }`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${isUp ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'}`}>
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">AI Services</h3>
                        <p className="text-xs opacity-75">Gemini Pro & Vision</p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${isUp ? 'bg-purple-200 text-purple-800' : 'bg-red-200 text-red-800'
                    }`}>
                    {health?.status || 'UNKNOWN'}
                </div>
            </div>

            <div className="space-y-3">
                <StatusRow
                    label="Gemini API"
                    active={isUp}
                    text={isUp ? 'Operational' : 'Not Responding'}
                />
                <StatusRow
                    label="Vision Capabilities"
                    active={health?.details?.vision_active || false}
                    text={health?.details?.vision_active ? 'Ready' : 'Unavailable'}
                />
                <StatusRow
                    label="API Key"
                    active={health?.details?.api_key_configured || false}
                    text={health?.details?.api_key_configured ? 'Configured' : 'Missing'}
                />
            </div>

            {health?.response_ms !== undefined && (
                <div className="mt-4 pt-4 border-t border-purple-100/50 flex justify-between text-xs text-purple-700/60">
                    <span>Latency</span>
                    <span>{health.response_ms}ms</span>
                </div>
            )}
        </div>
    );
}

function StatusRow({ label, active, text }: { label: string, active: boolean, text: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">{label}</span>
            <div className="flex items-center gap-1.5">
                {active ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className={`font-medium ${active ? 'text-green-700' : 'text-red-700'}`}>
                    {text}
                </span>
            </div>
        </div>
    );
}

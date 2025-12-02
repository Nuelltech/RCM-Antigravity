import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchClient } from '@/lib/api';

interface Alert {
    id: string;
    type: 'cmv' | 'cost_increase' | 'inactivity';
    severity: 'info' | 'warning' | 'high';
    item: string;
    message: string;
    date: string;
}

const severityConfig = {
    high: {
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200'
    },
    warning: {
        icon: AlertCircle,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200'
    },
    info: {
        icon: Info,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200'
    }
};

function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
}

function AlertItem({ alert }: { alert: Alert }) {
    const config = severityConfig[alert.severity];
    const Icon = config.icon;

    return (
        <div className={`flex gap-3 p-3 rounded-lg border ${config.bg} ${config.border}`}>
            <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900">{alert.item}</div>
                <div className="text-sm text-gray-600 mt-0.5">{alert.message}</div>
                <div className="text-xs text-gray-500 mt-1">{formatDate(alert.date)}</div>
            </div>
        </div>
    );
}

export function SystemAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    useEffect(() => {
        loadAlerts();
    }, []);

    async function loadAlerts() {
        try {
            const data = await fetchClient('/alerts');
            setAlerts(data);
        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Alertas</CardTitle>
                    {alerts.length > 0 && (
                        <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                            {alerts.length}
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {alerts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Sem alertas ativos.
                        </p>
                    ) : (
                        alerts.map((alert) => (
                            <AlertItem key={alert.id} alert={alert} />
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

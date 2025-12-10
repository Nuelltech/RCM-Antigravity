"use client";

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Info, TrendingUp, Clock, DollarSign, Check, Archive, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Alert {
    id: string;
    type: 'cmv' | 'cost_increase' | 'inactivity' | 'stale_price';
    severity: 'info' | 'warning' | 'high';
    item: string;
    message: string;
    date: string;
    value?: number;
    threshold?: number;
    lido: boolean;
    arquivado: boolean;
}

const severityConfig = {
    high: {
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-700'
    },
    warning: {
        icon: AlertCircle,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        badge: 'bg-orange-100 text-orange-700'
    },
    info: {
        icon: Info,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-700'
    }
};

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadAlerts();
    }, []);

    async function loadAlerts() {
        setLoading(true);
        try {
            const data = await fetchClient('/alerts/regenerate', {
                method: 'POST',
                body: JSON.stringify({})
            });
            setAlerts(data);
            toast({ description: "Alertas atualizados com sucesso." });
        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os alertas.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleMarkAsRead(id: string) {
        try {
            await fetchClient(`/alerts/${id}/read`, { method: 'PATCH' });
            setAlerts(alerts.map(a => a.id === id ? { ...a, lido: true } : a));
            toast({ description: "Alerta marcado como lido." });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível atualizar o alerta.",
                variant: "destructive",
            });
        }
    }

    async function handleArchive(id: string) {
        try {
            await fetchClient(`/alerts/${id}/archive`, { method: 'PATCH' });
            setAlerts(alerts.filter(a => a.id !== id));
            toast({ description: "Alerta arquivado." });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível arquivar o alerta.",
                variant: "destructive",
            });
        }
    }

    const cmvAlerts = alerts.filter(a => a.type === 'cmv');
    const costAlerts = alerts.filter(a => a.type === 'cost_increase');
    const inactivityAlerts = alerts.filter(a => a.type === 'inactivity');
    const stalePriceAlerts = alerts.filter(a => a.type === 'stale_price');

    return (
        <AppLayout>
            <div className="space-y-6 p-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <AlertTriangle className="h-8 w-8" />
                            Alertas do Sistema
                        </h1>
                        <p className="text-muted-foreground">
                            Monitorize as anomalias e avisos importantes do seu restaurante.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadAlerts} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* CMV Alerts */}
                    <Card className="md:col-span-1 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Margens & CMV
                            </CardTitle>
                            <CardDescription>
                                Itens com CMV acima do esperado
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {cmvAlerts.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Tudo em ordem! Nenhum alerta de CMV.
                                </p>
                            ) : (
                                cmvAlerts.map(alert => (
                                    <AlertItem
                                        key={alert.id}
                                        alert={alert}
                                        onRead={() => handleMarkAsRead(alert.id)}
                                        onArchive={() => handleArchive(alert.id)}
                                    />
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Cost Increase Alerts */}
                    <Card className="md:col-span-1 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Aumento de Custos
                            </CardTitle>
                            <CardDescription>
                                Produtos com aumento de preço recente
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {costAlerts.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Preços estáveis. Nenhum aumento detetado.
                                </p>
                            ) : (
                                costAlerts.map(alert => (
                                    <AlertItem
                                        key={alert.id}
                                        alert={alert}
                                        onRead={() => handleMarkAsRead(alert.id)}
                                        onArchive={() => handleArchive(alert.id)}
                                    />
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Inactivity Alerts */}
                    <Card className="md:col-span-1 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Inatividade
                            </CardTitle>
                            <CardDescription>
                                Ausência de vendas ou compras
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {inactivityAlerts.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Atividade normal detetada.
                                </p>
                            ) : (
                                inactivityAlerts.map(alert => (
                                    <AlertItem
                                        key={alert.id}
                                        alert={alert}
                                        onRead={() => handleMarkAsRead(alert.id)}
                                        onArchive={() => handleArchive(alert.id)}
                                    />
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Stale Price Alerts */}
                    <Card className="md:col-span-1 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Preços Estagnados
                            </CardTitle>
                            <CardDescription>
                                Produtos em uso sem atualização de preço
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stalePriceAlerts.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Todos os preços estão atualizados.
                                </p>
                            ) : (
                                stalePriceAlerts.map(alert => (
                                    <AlertItem
                                        key={alert.id}
                                        alert={alert}
                                        onRead={() => handleMarkAsRead(alert.id)}
                                        onArchive={() => handleArchive(alert.id)}
                                    />
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

function AlertItem({ alert, onRead, onArchive }: { alert: Alert, onRead: () => void, onArchive: () => void }) {
    const config = severityConfig[alert.severity];
    const Icon = config.icon;

    return (
        <div className={`group relative flex gap-3 p-3 rounded-lg border transition-all ${alert.lido ? 'bg-gray-50 border-gray-100 opacity-75' : `${config.bg} ${config.border}`}`}>
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.lido ? 'text-gray-400' : config.color}`} />
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <span className={`font-semibold text-sm truncate pr-2 ${alert.lido ? 'text-gray-600' : 'text-gray-900'}`}>
                        {alert.item}
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {formatDate(alert.date)}
                    </span>
                </div>
                <div className={`text-sm mt-0.5 leading-tight ${alert.lido ? 'text-gray-500' : 'text-gray-700'}`}>
                    {alert.message}
                </div>

                <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!alert.lido && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRead} title="Marcar como lido">
                            <Check className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onArchive} title="Arquivar">
                        <Archive className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

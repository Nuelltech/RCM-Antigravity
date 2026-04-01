"use client";

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { TrendingDown, ArrowUpRight, Ban, CheckCircle, Flame, Target, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';


interface ErosionAlert {
    id: number;
    menu_item_id: number;
    custo_base: string;
    custo_hoje: string;
    volume_30d: number;
    preco_venda_atual: string;
    margem_atual: string;
    perda_projetada: string;
    pratos_extra_necessarios: number;
    preco_sugerido: string;
    data_detecao: string;
    menuItem: {
        nome_comercial: string;
        categoria_menu: string | null;
        imagem_url: string | null;
    };
}

export default function ErosionAlertsPage() {
    const [alerts, setAlerts] = useState<ErosionAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadAlerts();
    }, []);

    async function loadAlerts() {
        setLoading(true);
        try {
            const data = await fetchClient('/erosion-alerts');
            setAlerts(data.alerts || []);
        } catch (error) {
            console.error('Erro ao carregar alertas de erosão:', error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os alertas de erosão.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleResolve(id: number, action: 'RESOLVIDO' | 'IGNORADO') {
        try {
            await fetchClient(`/erosion-alerts/${id}/resolve`, {
                method: 'POST',
                body: JSON.stringify({ status: action })
            });

            toast({
                description: action === 'RESOLVIDO' ? "Alerta resolvido. Baseline atualizada." : "Alerta ignorado.",
                variant: "default"
            });

            setAlerts(alerts.filter(a => a.id !== id));
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível processar a ação.",
                variant: "destructive",
            });
        }
    }

    async function handleTriggerAnalysis() {
        setIsTriggering(true);
        try {
            await fetchClient('/erosion-alerts/trigger', { method: 'POST' });
            
            toast({
                title: "Análise Iniciada",
                description: "O Radar está a verificar o menu em background. Atualize a página em alguns segundos.",
                variant: "default",
            });
            
            // Optionally reload after a short delay
            setTimeout(() => {
                loadAlerts();
            }, 3000);
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível iniciar a análise manual.",
                variant: "destructive",
            });
        } finally {
            setIsTriggering(false);
        }
    }

    return (
        <AppLayout>
            <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-rose-600 dark:text-rose-500">
                            <Flame className="h-8 w-8" />
                            Radar de Risco
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Plataforma de Alertas de Erosão de Margem. Descubra perdas projetadas devido a aumentos de custo.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                        <Button 
                            variant="outline" 
                            disabled={isTriggering} 
                            onClick={handleTriggerAnalysis}
                            className="bg-white shadow-sm"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isTriggering ? 'animate-spin' : ''}`} />
                            Atualizar Radar
                        </Button>
                        
                        {alerts.length > 0 && (
                            <div className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 px-4 py-2 rounded-lg font-medium border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
                                <TrendingDown className="h-5 w-5" />
                                {alerts.length} itens a perder rentabilidade
                            </div>
                        )}
                    </div>
                </div>



                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader className="h-24 bg-muted/50"></CardHeader>
                                <CardContent className="h-32 bg-muted/20"></CardContent>
                                <CardFooter className="h-16 bg-muted/50"></CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                            <CheckCircle className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Tudo protegido!</h2>
                        <p className="text-muted-foreground max-w-md">
                            Não detetámos nenhum aumento de custo em receitas ativas que prejudique a rentabilidade atual.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {alerts.map((alert) => (
                            <Card key={alert.id} className="relative overflow-hidden border-rose-200 dark:border-rose-900/40 shadow-sm hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 p-4">
                                    <Badge variant="destructive" className="font-semibold shadow-sm">Alto Risco</Badge>
                                </div>

                                <CardHeader className="pb-4">
                                    <div className="flex items-start gap-4">
                                        {alert.menuItem.imagem_url ? (
                                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-muted">
                                                <img src={alert.menuItem.imagem_url} alt={alert.menuItem.nome_comercial} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200">
                                                <Target className="w-8 h-8" />
                                            </div>
                                        )}
                                        <div className="pr-12">
                                            <CardTitle className="text-xl line-clamp-2">{alert.menuItem.nome_comercial}</CardTitle>
                                            <CardDescription className="mt-1 flex gap-2 text-sm">
                                                <Badge variant="secondary" className="font-normal text-xs">{alert.volume_30d} Vendas (30d)</Badge>
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pb-4 space-y-5">
                                    {/* Financial Impact Banner */}
                                    <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-lg flex justify-between items-center ring-1 ring-inset ring-rose-200 dark:ring-rose-900/50">
                                        <div>
                                            <div className="text-xs font-semibold uppercase text-rose-500 tracking-wider">Impacto na Margem (30 dias)</div>
                                            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">-{Number(alert.perda_projetada).toFixed(2)}€</div>
                                        </div>
                                        <TrendingDown className="h-10 w-10 text-rose-200 dark:text-rose-800" />
                                    </div>

                                    {/* Costs Breakdown */}
                                    <div className="flex items-center justify-between text-sm py-2 px-1 border-b">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <DollarSign className="w-4 h-4" /> Custo Anterior
                                        </div>
                                        <div className="font-medium">{Number(alert.custo_base).toFixed(2)}€</div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm py-2 px-1">
                                        <div className="flex items-center gap-2 text-amber-600 font-medium">
                                            <TrendingUp className="w-4 h-4" /> Novo Custo Hoje
                                        </div>
                                        <div className="font-bold text-amber-600 dark:text-amber-500">{Number(alert.custo_hoje).toFixed(2)}€</div>
                                    </div>

                                    {/* Actionable Insights */}
                                    <div className="space-y-3 pt-4 border-t border-dashed">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ações Recomendadas</div>
                                        <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded text-sm border border-blue-100 dark:border-blue-900/30">
                                            <span className="font-bold text-blue-700 dark:text-blue-400">Opção 1: Vender Mais</span>
                                            <p className="mt-1 text-muted-foreground">Para não perder este dinheiro, terá de vender mais <strong className="text-foreground">{alert.pratos_extra_necessarios} pratos</strong> este mês mantendo o preço atual.</p>
                                        </div>
                                        <div className="bg-green-50/50 dark:bg-green-950/10 p-3 rounded text-sm border border-green-100 dark:border-green-900/30">
                                            <span className="font-bold text-green-700 dark:text-green-400">Opção 2: Aumentar o Preço</span>
                                            <p className="mt-1 text-muted-foreground">Mudar o Preço de Venda atual de {Number(alert.preco_venda_atual).toFixed(2)}€ para <strong className="text-foreground">{Number(alert.preco_sugerido).toFixed(2)}€</strong> (s/ IVA) para manter a mesma margem de lucro.</p>
                                        </div>
                                        <div className="bg-orange-50/50 dark:bg-orange-950/10 p-3 rounded text-sm border border-orange-100 dark:border-orange-900/30">
                                            <span className="font-bold text-orange-700 dark:text-orange-400">Opção 3: Reduzir Custos</span>
                                            <p className="mt-1 text-muted-foreground">Rever a receita original: renegociar preços de compra com os fornecedores atuais ou ajustar as quantidades servidas para baixar o gasto.</p>
                                        </div>
                                    </div>

                                </CardContent>

                                <CardFooter className="bg-muted/30 pt-4 flex gap-3">
                                    <Button
                                        variant="default"
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => handleResolve(alert.id, 'RESOLVIDO')}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Resolvido
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full text-muted-foreground"
                                        onClick={() => handleResolve(alert.id, 'IGNORADO')}
                                    >
                                        <Ban className="w-4 h-4 mr-2" />
                                        Ignorar
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

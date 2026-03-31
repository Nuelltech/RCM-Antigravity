'use client';

import { useEffect, useState } from 'react';
import { useToast } from './use-toast';
import { fetchClient } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ProcessedInvoice {
    id: number;
    status: 'reviewing' | 'error' | 'processing'; // Added processing
    fornecedor_nome: string | null;
    numero_fatura: string | null;
    processado_em: Date;
    job_id?: string;
}

interface ActiveIntegration {
    id: number;
    job_id: string;
    fatura_id: number;
}

interface JobStatus {
    state: 'active' | 'completed' | 'waiting' | 'failed';
    progress: number;
}

// Module-level state to persist across navigations
let globalLastCheck = new Date(Date.now() - 1000 * 60);
const globalNotifiedIds = new Set<string>();
const activeJobToasts = new Map<string, { 
    update: (props: any) => void, 
    dismiss: () => void, 
    lastProgress: number 
}>();

export function useInvoiceNotifications() {
    const { toast, dismiss: globalDismiss } = useToast();
    const router = useRouter(); 
    const [isPolling, setIsPolling] = useState(false);

    useEffect(() => {
        if (!isPolling) return;

        const pollInterval = setInterval(async () => {
            try {
                // 1. Poll status
                const [invoicesData, salesData, activeData] = await Promise.all([
                    fetchClient(`/invoices/pending-status?since=${globalLastCheck.toISOString()}`).catch(() => ({ invoices: [] })),
                    fetchClient(`/vendas/pending-status?since=${globalLastCheck.toISOString()}`).catch(() => ({ salesImports: [] })),
                    fetchClient(`/invoices/active-integrations`).catch(() => ({ integrations: [] }))
                ]);

                const { invoices } = invoicesData as { invoices: ProcessedInvoice[] };
                const { salesImports } = salesData as { salesImports: any[] };
                const { integrations } = activeData as { integrations: ActiveIntegration[] };

                globalLastCheck = new Date();

                // 2. Invoices
                if (invoices && Array.isArray(invoices)) {
                    for (const invoice of invoices) {
                        const key = `invoice-${invoice.id}`;
                        if (globalNotifiedIds.has(key)) continue;
                        globalNotifiedIds.add(key);

                        if (invoice.status === 'reviewing') {
                            toast({
                                title: '✅ Fatura Processada',
                                description: `${invoice.fornecedor_nome || 'Fatura'} #${invoice.numero_fatura || invoice.id} pronta para revisão`,
                                action: <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/${invoice.id}`)}>Rever</Button>
                            });
                        } else if (invoice.status === 'error') {
                            toast({
                                title: '❌ Erro ao Processar',
                                description: `Erro ao processar fatura #${invoice.numero_fatura || invoice.id}`,
                                variant: 'destructive'
                            });
                        }
                    }
                }

                // 3. Sales
                if (salesImports && Array.isArray(salesImports)) {
                    for (const s of salesImports) {
                        const key = `sales-${s.id}`;
                        if (globalNotifiedIds.has(key)) continue;
                        globalNotifiedIds.add(key);
                        if (s.status === 'reviewing') {
                            toast({ title: '✅ Vendas Processadas', description: `${s.ficheiro_nome} pronta`, action: <Button variant="outline" size="sm" onClick={() => router.push(`/sales/importacoes/${s.id}`)}>Rever</Button> });
                        }
                    }
                }

                // 4. Progress Tracking
                if (integrations && Array.isArray(integrations)) {
                    for (const active of integrations) {
                        const jobId = active.job_id;
                        const jobStatus = await fetchClient(`/invoices/job-status/${jobId}`).catch(() => null) as JobStatus | null;
                        if (!jobStatus) continue;

                        const progress = typeof jobStatus.progress === 'number' ? jobStatus.progress : 0;
                        const state = jobStatus.state;

                        if (!activeJobToasts.has(jobId)) {
                            // First creation
                            const t = toast({
                                title: '🔄 Atualizando Margens...',
                                description: (
                                    <div className="mt-2 space-y-2">
                                        <p className="text-xs text-muted-foreground">Recalculando pratos após integração de fatura.</p>
                                        <Progress value={progress} className="h-1" />
                                    </div>
                                )
                            });
                            activeJobToasts.set(jobId, { update: t.update, dismiss: t.dismiss, lastProgress: progress });
                        } else {
                            // Update existing
                            const entry = activeJobToasts.get(jobId)!;
                            if (progress !== entry.lastProgress || state === 'completed') {
                                if (state === 'completed' || progress >= 100) {
                                    entry.update({
                                        title: '✅ Atualização Concluída',
                                        description: 'Todas as margens e alertas foram atualizados com sucesso.',
                                        variant: 'default',
                                    });
                                    setTimeout(() => { entry.dismiss(); activeJobToasts.delete(jobId); }, 5000);
                                } else {
                                    entry.update({
                                        description: (
                                            <div className="mt-2 space-y-2">
                                                <p className="text-xs text-muted-foreground">Progresso: {progress}%</p>
                                                <Progress value={progress} className="h-1" />
                                            </div>
                                        )
                                    });
                                    activeJobToasts.set(jobId, { ...entry, lastProgress: progress });
                                }
                            }
                        }
                    }
                }

                // Cleanup
                const activeJobIds = new Set(integrations.map(i => i.job_id));
                Array.from(activeJobToasts.entries()).forEach(([jobId, entry]) => {
                    if (!activeJobIds.has(jobId)) {
                        entry.dismiss();
                        activeJobToasts.delete(jobId);
                    }
                });

            } catch (error) {
                console.error('[Polling] Status check failed:', error);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [isPolling, toast, router]);

    return {
        startPolling: () => setIsPolling(true),
        stopPolling: () => setIsPolling(false),
        isPolling
    };
}

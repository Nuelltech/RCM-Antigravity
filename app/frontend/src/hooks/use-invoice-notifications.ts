'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from './use-toast';
import { fetchClient, API_URL } from '@/lib/api';

interface ProcessedInvoice {
    id: number;
    status: 'reviewing' | 'error';
    fornecedor_nome: string | null;
    numero_fatura: string | null;
    processado_em: Date;
}

interface PendingStatusResponse {
    invoices: ProcessedInvoice[];
}

/**
 * Hook for polling invoice processing status and showing notifications
 * Checks every 5 seconds for invoices that recently completed processing
 */
export function useInvoiceNotifications() {
    const { toast } = useToast();
    const [isPolling, setIsPolling] = useState(false);
    const lastCheckRef = useRef<Date>(new Date());
    const notifiedIdsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (!isPolling) return;

        const pollInterval = setInterval(async () => {
            try {
                const data = await fetchClient(`/invoices/pending-status?since=${lastCheckRef.current.toISOString()}`) as PendingStatusResponse;

                const { invoices } = data;

                lastCheckRef.current = new Date();

                // Show toast for each newly completed invoice
                for (const invoice of invoices) {
                    if (notifiedIdsRef.current.has(invoice.id)) continue;

                    notifiedIdsRef.current.add(invoice.id);

                    if (invoice.status === 'reviewing') {
                        toast({
                            title: '✅ Fatura Processada',
                            description: `${invoice.fornecedor_nome || 'Fatura'} #${invoice.numero_fatura || invoice.id} está pronta para revisão`,
                            variant: 'default'
                        });
                    } else if (invoice.status === 'error') {
                        toast({
                            title: '❌ Erro ao Processar',
                            description: `Erro ao processar fatura #${invoice.numero_fatura || invoice.id}`,
                            variant: 'destructive'
                        });
                    }
                }

                // Clean up old notified IDs (keep only last 50)
                if (notifiedIdsRef.current.size > 50) {
                    const idsArray = Array.from(notifiedIdsRef.current);
                    notifiedIdsRef.current = new Set(idsArray.slice(-50));
                }
            } catch (error) {
                console.error('[Polling] Failed to check invoice status:', error);
            }
        }, 5000); // Poll every 5 seconds

        return () => {
            clearInterval(pollInterval);
        };
    }, [isPolling, toast]);

    return {
        startPolling: () => setIsPolling(true),
        stopPolling: () => setIsPolling(false),
        isPolling
    };
}

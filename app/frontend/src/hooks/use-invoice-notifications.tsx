'use client';

import { useEffect, useState } from 'react';
import { useToast } from './use-toast';
import { fetchClient } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface ProcessedInvoice {
    id: number;
    status: 'reviewing' | 'error';
    fornecedor_nome: string | null;
    numero_fatura: string | null;
    processado_em: Date;
}

interface ProcessedSalesImport {
    id: number;
    status: 'reviewing' | 'error';
    ficheiro_nome: string;
    processado_em: Date;
}

interface PendingStatusResponse {
    invoices: ProcessedInvoice[];
}

interface PendingSalesResponse {
    salesImports: ProcessedSalesImport[];
}

// Module-level state to persist across navigations
// Using string IDs to distinguish types: "invoice-123", "sales-456"
// Initialize with a time in the past (1 minute ago) to catch items processed just before app load
let globalLastCheck = new Date(Date.now() - 1000 * 60);
const globalNotifiedIds = new Set<string>();

/**
 * Hook for polling invoice and sales processing status and showing notifications
 * Checks every 5 seconds for items that recently completed processing
 */
export function useInvoiceNotifications() {
    const { toast } = useToast();
    const router = useRouter(); // Use App Router navigation
    const [isPolling, setIsPolling] = useState(false);

    useEffect(() => {
        if (!isPolling) return;

        const pollInterval = setInterval(async () => {
            try {
                // Poll both endpoints concurrently
                const [invoicesData, salesData] = await Promise.all([
                    fetchClient(`/invoices/pending-status?since=${globalLastCheck.toISOString()}`).catch(err => {
                        // Ignore 404s silently (endpoint might not exist yet during dev)
                        if (err.message && err.message.includes('404')) return { invoices: [] };
                        console.error('Error polling invoices:', err);
                        return { invoices: [] };
                    }) as Promise<PendingStatusResponse>,
                    fetchClient(`/vendas/pending-status?since=${globalLastCheck.toISOString()}`).catch(err => {
                        if (err.message && err.message.includes('404')) return { salesImports: [] };
                        console.error('Error polling sales:', err);
                        return { salesImports: [] };
                    }) as Promise<PendingSalesResponse>
                ]);

                const { invoices } = invoicesData || { invoices: [] };
                const { salesImports } = salesData || { salesImports: [] };

                // Update global last check time to NOW
                globalLastCheck = new Date();

                // Process Invoices
                if (invoices && Array.isArray(invoices)) {
                    for (const invoice of invoices) {
                        const key = `invoice-${invoice.id}`;
                        if (globalNotifiedIds.has(key)) continue;

                        globalNotifiedIds.add(key);

                        if (invoice.status === 'reviewing') {
                            toast({
                                title: '✅ Fatura Processada',
                                description: `${invoice.fornecedor_nome || 'Fatura'} #${invoice.numero_fatura || invoice.id} está pronta para revisão`,
                                variant: 'default',
                                action: (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                                    >
                                        Rever
                                    </Button>
                                )
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

                // Process Sales Imports
                if (salesImports && Array.isArray(salesImports)) {
                    for (const salesImport of salesImports) {
                        const key = `sales-${salesImport.id}`;
                        if (globalNotifiedIds.has(key)) continue;

                        globalNotifiedIds.add(key);

                        if (salesImport.status === 'reviewing') {
                            toast({
                                title: '✅ Relatório de Vendas Processado',
                                description: `${salesImport.ficheiro_nome} está pronto para revisão`,
                                variant: 'default',
                                action: (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/sales/importacoes/${salesImport.id}`)}
                                    >
                                        Rever
                                    </Button>
                                )
                            });
                        } else if (salesImport.status === 'error') {
                            toast({
                                title: '❌ Erro ao Processar Vendas',
                                description: `Erro ao processar ${salesImport.ficheiro_nome}`,
                                variant: 'destructive'
                            });
                        }
                    }
                }

                // Clean up old notified IDs (keep only last 50)
                if (globalNotifiedIds.size > 50) {
                    const idsArray = Array.from(globalNotifiedIds);
                    globalNotifiedIds.clear();
                    // Add back the last 50
                    idsArray.slice(-50).forEach(id => globalNotifiedIds.add(id));
                }

            } catch (error) {
                console.error('[Polling] Failed to check status:', error);
            }
        }, 5000); // Poll every 5 seconds

        return () => {
            clearInterval(pollInterval);
        };
    }, [isPolling, toast, router]);

    return {
        startPolling: () => setIsPolling(true),
        stopPolling: () => setIsPolling(false),
        isPolling
    };
}

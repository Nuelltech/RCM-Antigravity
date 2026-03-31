'use client';

import { useEffect, useState } from 'react';
import { fetchClient } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function ActiveRecalculationAlert() {
    const [activeJob, setActiveJob] = useState<{ progress: number } | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const data = await fetchClient('/invoices/active-integrations');
                if (data.integrations && data.integrations.length > 0) {
                    const first = data.integrations[0];
                    const jobStatus = await fetchClient(`/invoices/job-status/${first.job_id}`);
                    if (jobStatus && jobStatus.state !== 'completed') {
                        setActiveJob({ progress: jobStatus.progress || 0 });
                    } else {
                        setActiveJob(null);
                    }
                } else {
                    setActiveJob(null);
                }
            } catch (err) {
                console.error('Failed to check active integrations', err);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 10000); // Polling every 10s is enough for the banner
        return () => clearInterval(interval);
    }, []);

    if (!activeJob) return null;

    return (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 mb-6 transition-all animate-in fade-in slide-in-from-top-2">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-400 font-semibold">
                Recálculo em curso
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-500 mt-1">
                Estamos a atualizar as margens e alertas de erosão com base nas faturas integradas recentemente. 
                Os dados podem estar momentaneamente desatualizados.
                <div className="mt-3 max-w-xs">
                    <Progress value={activeJob.progress} className="h-1 bg-amber-200 dark:bg-amber-900/50" />
                    <p className="text-[10px] mt-1 text-amber-600/70">{activeJob.progress}% processado</p>
                </div>
            </AlertDescription>
        </Alert>
    );
}

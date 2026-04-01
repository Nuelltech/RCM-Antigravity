'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchClient } from '@/lib/api';

export interface ActiveJob {
    id: number;
    job_id: string;
    fatura_id?: number;
    started_at: string;
    progress: number;
    state: string; // 'waiting' | 'active' | 'completed' | 'failed'
}

interface SystemActivityState {
    jobs: ActiveJob[];
    hasActiveJobs: boolean;
    recentlyCompleted: boolean; // true for a few seconds after last job completes
}

export function useSystemActivity() {
    const [state, setState] = useState<SystemActivityState>({
        jobs: [],
        hasActiveJobs: false,
        recentlyCompleted: false,
    });

    const check = useCallback(async () => {
        try {
            const data = await fetchClient('/invoices/active-integrations');
            const integrations: any[] = data?.integrations ?? [];

            if (integrations.length === 0) {
                setState(prev => {
                    const wasActive = prev.hasActiveJobs;
                    if (wasActive) {
                        // Just finished — show "completed" briefly
                        setTimeout(() => {
                            setState(s => ({ ...s, recentlyCompleted: false }));
                        }, 5000);
                        return { jobs: [], hasActiveJobs: false, recentlyCompleted: true };
                    }
                    return { jobs: [], hasActiveJobs: false, recentlyCompleted: prev.recentlyCompleted };
                });
                return;
            }

            // Fetch job status for each active integration
            const jobs: ActiveJob[] = await Promise.all(
                integrations.map(async (integration) => {
                    try {
                        const jobStatus = await fetchClient(`/invoices/job-status/${integration.job_id}`);
                        // Fix: BullMQ progress can be an object — ensure it's always a number
                        const progress = typeof jobStatus?.progress === 'number'
                            ? jobStatus.progress
                            : typeof jobStatus?.progress === 'object' && jobStatus?.progress !== null
                                ? Number(Object.values(jobStatus.progress)[0] ?? 0)
                                : 0;
                        return {
                            id: integration.id,
                            job_id: integration.job_id,
                            fatura_id: integration.fatura_id,
                            started_at: integration.started_at,
                            progress,
                            state: jobStatus?.state ?? 'waiting',
                        };
                    } catch {
                        // Job not found in Redis (expired) — treat as completed
                        return {
                            id: integration.id,
                            job_id: integration.job_id,
                            fatura_id: integration.fatura_id,
                            started_at: integration.started_at,
                            progress: 100,
                            state: 'completed',
                        };
                    }
                })
            );

            // Filter out completed jobs (they'll disappear from DB on next poll anyway)
            const active = jobs.filter(j => j.state !== 'completed' && j.state !== 'failed');

            setState(prev => ({
                jobs: active,
                hasActiveJobs: active.length > 0,
                recentlyCompleted: active.length === 0 && prev.hasActiveJobs
                    ? true
                    : prev.recentlyCompleted,
            }));
        } catch {
            // Silently ignore — don't crash the UI
        }
    }, []);

    useEffect(() => {
        check();
        const interval = setInterval(check, 10000);
        return () => clearInterval(interval);
    }, [check]);

    return state;
}

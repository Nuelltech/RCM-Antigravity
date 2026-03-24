"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { fetchClient } from '@/lib/api';

interface SubscriptionState {
    features: string[];
    planName: string | null;
    planDisplayName: string | null;
    loading: boolean;
    error: string | null;
    status?: string;
    trialEnd?: Date | null;
    daysRemaining?: number;
}

interface SubscriptionContextType extends SubscriptionState {
    hasFeature: (featureKey: string) => boolean;
    refreshFeatures: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Cache em sessionStorage para features de subscrição
const SUB_CACHE_KEY = "subscription_features_cache";
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos

function getSubscriptionCache(userId: string): SubscriptionState | null {
    try {
        const raw = sessionStorage.getItem(SUB_CACHE_KEY);
        if (!raw) return null;
        const { data, cachedAt, cachedUserId } = JSON.parse(raw);
        if (cachedUserId !== userId) return null; // cache de outro utilizador
        if (Date.now() - cachedAt > CACHE_DURATION_MS) {
            sessionStorage.removeItem(SUB_CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function setSubscriptionCache(userId: string, data: Partial<SubscriptionState>) {
    try {
        sessionStorage.setItem(SUB_CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now(), cachedUserId: userId }));
    } catch { /* ignore */ }
}

export function clearSubscriptionCache() {
    try {
        sessionStorage.removeItem(SUB_CACHE_KEY);
    } catch { /* ignore */ }
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const [state, setState] = useState<SubscriptionState>({
        features: [],
        planName: null,
        planDisplayName: null,
        loading: true,
        error: null,
        status: undefined,
        trialEnd: undefined,
        daysRemaining: undefined
    });

    // Load features from API (sempre busca dados frescos)
    const refreshFeatures = async (bust = false) => {
        if (!user) {
            setState({
                features: [],
                planName: null,
                planDisplayName: null,
                loading: false,
                error: null,
            });
            return;
        }

        // ✅ PERFORMANCE FIX: verificar cache antes de fazer chamada à API
        if (!bust) {
            const cached = getSubscriptionCache(user.id);
            if (cached) {
                console.log('[SubscriptionContext] Features carregadas do cache (sessionStorage).');
                setState({ ...cached, loading: false, error: null });
                return;
            }
        }

        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const data = await fetchClient('/subscriptions/features');

            if (!data) {
                console.warn('[SubscriptionContext] No data returned from features API');
                setState(prev => ({ ...prev, loading: false }));
                return;
            }

            const newState = {
                features: data.features || [],
                planName: data.plan || null,
                planDisplayName: data.plan_display_name || null,
                status: data.status,
                trialEnd: data.trial_end,
                daysRemaining: data.days_remaining
            };

            // Guardar no cache para as próximas navegações
            setSubscriptionCache(user.id, newState);

            setState(prev => ({
                ...prev,
                ...newState,
                loading: false,
            }));

        } catch (error: any) {
            console.error('Error fetching subscription features:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to load subscription',
            }));
        }
    };

    // ✅ PERFORMANCE FIX: Depender apenas de user?.id — NÃO de pathname.
    // O pathname anterior causava um re-fetch em CADA mudança de URL.
    // As features de subscrição só mudam em login/logout ou após upgrade de plano.
    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (!user || !token) {
            setState({
                features: [],
                planName: null,
                planDisplayName: null,
                loading: false,
                error: null,
            });
            return;
        }

        // Verificar se estamos numa página pública
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        if (currentPath.startsWith('/auth') || currentPath === '/' || currentPath.startsWith('/accept-invite')) {
            setState({ features: [], planName: null, planDisplayName: null, loading: false, error: null });
            return;
        }

        refreshFeatures(); // usa cache automaticamente se disponível
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]); // ← apenas re-executa quando o utilizador muda, NÃO em cada pathname

    // Auto-refresh a cada 15 minutos (limpar cache e buscar dados frescos)
    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!user || !token) return;

        const interval = setInterval(() => {
            clearSubscriptionCache();
            refreshFeatures(true); // forçar refresh
        }, CACHE_DURATION_MS);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const hasFeature = (featureKey: string): boolean => {
        return state.features.includes(featureKey);
    };

    return (
        <SubscriptionContext.Provider
            value={{
                ...state,
                hasFeature,
                refreshFeatures,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within SubscriptionProvider');
    }
    return context;
}

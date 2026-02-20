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

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

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

    // Load features from API
    const refreshFeatures = async () => {
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
                planName: data.plan || null, // API returns 'plan', context expects 'planName'
                planDisplayName: data.plan_display_name || null,
                status: data.status,
                trialEnd: data.trial_end,
                daysRemaining: data.days_remaining
            };

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

    // Helper to calculate days remaining
    const calculateDaysRemaining = (dateStr: string | null) => {
        if (!dateStr) return undefined;
        const end = new Date(dateStr);
        const now = new Date();
        return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    // Load features on mount and when auth changes
    useEffect(() => {
        const token = localStorage.getItem('token');
        // Don't fetch on public pages or if no token
        if (!user || !token || pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/accept-invite')) {
            setState({
                features: [],
                planName: null,
                planDisplayName: null,
                loading: false,
                error: null,
            });
            return;
        }

        // Fetch from API
        refreshFeatures();
    }, [user?.id, pathname]);

    // Auto-refresh every 15 minutes
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!user || !token) return;

        const interval = setInterval(() => {
            refreshFeatures();
        }, CACHE_DURATION);

        return () => clearInterval(interval);
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

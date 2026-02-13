"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';

interface SubscriptionState {
    features: string[];
    planName: string | null;
    planDisplayName: string | null;
    loading: boolean;
    error: string | null;
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

            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');

            if (!token || !tenantId) {
                setState({
                    features: [],
                    planName: null,
                    planDisplayName: null,
                    loading: false,
                    error: 'Not authenticated',
                });
                return;
            }

            const response = await fetch('/api/subscriptions/features', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantId,
                },
            });

            if (response.status === 402) {
                // No subscription - set empty features
                const emptyState = {
                    features: [],
                    planName: null,
                    planDisplayName: null,
                    loading: false,
                    error: 'No active subscription',
                };
                setState(emptyState);
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch features: ${response.statusText}`);
            }

            const data = await response.json();

            const newState = {
                features: data.features || [],
                planName: data.plan_name || null,
                planDisplayName: data.plan_display_name || null,
                loading: false,
                error: null,
            };

            setState(newState);

        } catch (error: any) {
            console.error('Error fetching subscription features:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to load subscription',
            }));
        }
    };

    // Load features on mount and when auth changes
    useEffect(() => {
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

        // Fetch from API
        refreshFeatures();
    }, [user?.id]);

    // Auto-refresh every 15 minutes
    useEffect(() => {
        if (!user) return;

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

"use client";

import { useSubscription } from '@/contexts/SubscriptionContext';
import React from 'react';

interface FeatureGuardProps {
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showUpgradePrompt?: boolean;
}

export function FeatureGuard({
    feature,
    children,
    fallback,
    showUpgradePrompt = true,
}: FeatureGuardProps) {
    const { hasFeature, loading } = useSubscription();

    // Show loading state
    if (loading) {
        return null;
    }

    // Check if has access
    if (!hasFeature(feature)) {
        if (fallback) {
            return <>{fallback}</>;
        }

        if (showUpgradePrompt) {
            // Import dynamically to avoid circular deps
            const UpgradePrompt = require('./UpgradePrompt').UpgradePrompt;
            return <UpgradePrompt feature={feature} />;
        }

        return null;
    }

    return <>{children}</>;
}

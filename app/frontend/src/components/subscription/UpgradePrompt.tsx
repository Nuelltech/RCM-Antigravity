"use client";

import { Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface UpgradePromptProps {
    feature: string;
    featureName?: string;
    suggestedPlan?: string;
    onClose?: () => void;
}

const FEATURE_NAMES: Record<string, string> = {
    sales: 'Sales Tracking',
    inventory: 'Inventory Management',
    stocks: 'Stock Management',
    ai_forecasting: 'AI Forecasting',
};

const FEATURE_PLANS: Record<string, { plan: string; displayName: string }> = {
    sales: { plan: 'standard', displayName: 'Standard Plan' },
    inventory: { plan: 'plus', displayName: 'Plus Plan' },
    stocks: { plan: 'plus', displayName: 'Plus Plan' },
    ai_forecasting: { plan: 'plus', displayName: 'Plus Plan' },
};

export function UpgradePrompt({
    feature,
    featureName,
    suggestedPlan,
    onClose,
}: UpgradePromptProps) {
    const router = useRouter();

    const displayName = featureName || FEATURE_NAMES[feature] || feature;
    const planInfo = FEATURE_PLANS[feature] || { plan: 'standard', displayName: 'Standard Plan' };
    const targetPlan = suggestedPlan || planInfo.displayName;

    const handleUpgrade = () => {
        router.push('/internal/settings/subscription');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
                {/* Close button */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}

                {/* Lock Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="rounded-full bg-orange-50 p-4">
                        <Lock className="h-8 w-8 text-orange-600" />
                    </div>
                </div>

                {/* Content */}
                <div className="text-center">
                    <h2 className="mb-2 text-2xl font-bold text-gray-900">
                        Feature Locked
                    </h2>
                    <p className="mb-6 text-gray-600">
                        <strong>{displayName}</strong> requires the{' '}
                        <strong>{targetPlan}</strong>.
                    </p>

                    {/* Benefits List */}
                    <div className="mb-6 rounded-lg bg-gray-50 p-4 text-left">
                        <p className="mb-2 text-sm font-semibold text-gray-700">
                            Upgrade to unlock:
                        </p>
                        <ul className="space-y-1 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <span className="text-green-500">✓</span>
                                {displayName}
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-500">✓</span>
                                Advanced analytics
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-500">✓</span>
                                Priority support
                            </li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleUpgrade}
                            className="w-full bg-orange-600 hover:bg-orange-700"
                        >
                            Upgrade to {targetPlan}
                        </Button>
                        {onClose && (
                            <Button
                                onClick={onClose}
                                variant="outline"
                                className="w-full"
                            >
                                Maybe Later
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

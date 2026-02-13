"use client";

import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeatureList } from './FeatureList';

interface Plan {
    id: number;
    name: string;
    display_name: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    features: Array<{ key: string; name: string; category: string }>;
}

interface PlanCardProps {
    plan: Plan;
    currentPlan?: boolean;
    onSelect?: () => void;
    loading?: boolean;
    popular?: boolean;
    billingPeriod?: 'monthly' | 'yearly';
}

export function PlanCard({
    plan,
    currentPlan = false,
    onSelect,
    loading = false,
    popular = false,
    billingPeriod = 'monthly',
}: PlanCardProps) {
    const price = billingPeriod === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
    const totalYearly = plan.price_yearly;
    const discount = billingPeriod === 'yearly'
        ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
        : 0;

    return (
        <div
            className={`relative rounded-2xl border-2 bg-white p-8 shadow-lg transition-all hover:shadow-xl ${currentPlan
                    ? 'border-orange-500'
                    : popular
                        ? 'border-orange-400'
                        : 'border-gray-200'
                }`}
        >
            {/* Popular Badge */}
            {popular && !currentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 rounded-full bg-orange-500 px-4 py-1 text-sm font-semibold text-white">
                        <Star className="h-3 w-3 fill-white" />
                        Most Popular
                    </div>
                </div>
            )}

            {/* Current Plan Badge */}
            {currentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 rounded-full bg-green-500 px-4 py-1 text-sm font-semibold text-white">
                        <Check className="h-3 w-3" />
                        Current Plan
                    </div>
                </div>
            )}

            {/* Plan Name */}
            <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{plan.display_name}</h3>
                <p className="mt-1 text-sm text-gray-600">{plan.description}</p>
            </div>

            {/* Pricing */}
            <div className="mb-6">
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                        €{Math.round(price)}
                    </span>
                    <span className="text-gray600">/month</span>
                </div>
                {billingPeriod === 'yearly' && (
                    <div className="mt-1 text-sm">
                        <span className="text-gray-600">€{totalYearly}/year</span>
                        <span className="ml-2 text-green-600 font-semibold">
                            Save {discount}%
                        </span>
                    </div>
                )}
            </div>

            {/* Features */}
            <div className="mb-6">
                <p className="mb-3 text-sm font-semibold text-gray-700">
                    What's included:
                </p>
                <FeatureList
                    features={plan.features.map(f => ({
                        key: f.key,
                        name: f.name,
                        included: true,
                    }))}
                    compact={true}
                />
            </div>

            {/* Action Button */}
            <Button
                onClick={onSelect}
                disabled={currentPlan || loading}
                className={`w-full ${currentPlan
                        ? 'bg-gray-100 text-gray-600 cursor-not-allowed hover:bg-gray-100'
                        : popular
                            ? 'bg-orange-600 hover:bg-orange-700'
                            : 'bg-gray-900 hover:bg-gray-800'
                    }`}
            >
                {loading ? 'Processing...' : currentPlan ? 'Current Plan' : `Upgrade to ${plan.display_name}`}
            </Button>
        </div>
    );
}

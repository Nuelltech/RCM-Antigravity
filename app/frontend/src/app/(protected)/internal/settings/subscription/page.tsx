"use client";

import { useState, useEffect } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PlanCard } from '@/components/subscription/PlanCard';
import { FeatureList } from '@/components/subscription/FeatureList';
import { CreditCard, Calendar, TrendingUp } from 'lucide-react';

interface Plan {
    id: number;
    name: string;
    display_name: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    features: Array<{ key: string; name: string; category: string }>;
}

interface SubscriptionData {
    subscription: {
        id: number;
        status: string;
        billing_period: string;
        current_period_end: string | null;
        trial_end: string | null;
        plan: {
            id: number;
            name: string;
            display_name: string;
            description: string;
            price_monthly: number;
        };
    } | null;
}

export default function SubscriptionPage() {
    const { planName, features, loading: subscriptionLoading } = useSubscription();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [currentSubscription, setCurrentSubscription] = useState<SubscriptionData['subscription']>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch available plans
                const plansResponse = await fetch('/api/subscriptions/plans', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('internal_token')}`,
                    },
                });
                const plansData = await plansResponse.json();
                setPlans(plansData.plans || []);

                // Fetch current subscription
                const subscriptionResponse = await fetch('/api/subscriptions/current', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('internal_token')}`,
                    },
                });

                if (subscriptionResponse.ok) {
                    const subscriptionData = await subscriptionResponse.json();
                    setCurrentSubscription(subscriptionData.subscription);
                    if (subscriptionData.subscription?.billing_period) {
                        setBillingPeriod(subscriptionData.subscription.billing_period);
                    }
                }
            } catch (error) {
                console.error('Error fetching subscription data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading || subscriptionLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading subscription...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
                <p className="mt-2 text-gray-600">
                    Manage your RCM subscription and access to features
                </p>
            </div>

            {/* Current Plan Overview */}
            {currentSubscription && (
                <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900">Current Plan</h2>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-orange-50 p-2">
                                <CreditCard className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Plan</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {currentSubscription.plan.display_name}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <p className="text-lg font-semibold capitalize text-gray-900">
                                    {currentSubscription.status}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-green-50 p-2">
                                <Calendar className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Billing Period</p>
                                <p className="text-lg font-semibold capitalize text-gray-900">
                                    {currentSubscription.billing_period}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Features Included */}
                    {features.length > 0 && (
                        <div className="mt-6 border-t border-gray-200 pt-6">
                            <h3 className="mb-3 font-semibold text-gray-900">Features Included:</h3>
                            <div className="grid gap-2 md:grid-cols-2">
                                <FeatureList
                                    features={features.map(f => ({
                                        key: f,
                                        name: f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                                        included: true,
                                    }))}
                                    compact={true}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Billing Period Toggle */}
            <div className="mb-6 flex justify-center">
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                    <button
                        onClick={() => setBillingPeriod('monthly')}
                        className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${billingPeriod === 'monthly'
                                ? 'bg-orange-600 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingPeriod('yearly')}
                        className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${billingPeriod === 'yearly'
                                ? 'bg-orange-600 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Yearly
                        <span className="ml-1 text-xs">(Save up to 17%)</span>
                    </button>
                </div>
            </div>

            {/* Available Plans */}
            <div>
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
                    {currentSubscription ? 'Upgrade or Downgrade' : 'Choose Your Plan'}
                </h2>

                <div className="grid gap-6 md:grid-cols-3">
                    {plans.map((plan, index) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            currentPlan={plan.name === planName}
                            popular={index === 1} // Standard is most popular
                            billingPeriod={billingPeriod}
                            onSelect={() => {
                                // TODO: Implement upgrade/downgrade logic (Stripe integration)
                                alert(`Upgrade to ${plan.display_name} - Coming soon with Stripe integration!`);
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Billing History Placeholder */}
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Billing History</h2>
                <p className="text-gray-600">
                    Billing history will be available here once Stripe integration is complete.
                </p>
            </div>
        </div>
    );
}

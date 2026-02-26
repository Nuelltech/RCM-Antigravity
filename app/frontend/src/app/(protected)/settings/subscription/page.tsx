"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchClient } from '@/lib/api';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PlanCard } from '@/components/subscription/PlanCard';
import { FeatureList } from '@/components/subscription/FeatureList';
import { CreditCard, Calendar, TrendingUp, ExternalLink, CheckCircle2, XCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Plan {
    id: number;
    name: string;
    display_name: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    features: Array<{ key: string; name: string; category: string }>;
}

interface CurrentSubscription {
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
}

interface Payment {
    id: string;
    amount: number;
    currency: string;
    status: string;
    billing_date: string;
    paid_at: string | null;
    failed_at: string | null;
    failure_reason: string | null;
}

export default function SubscriptionPage() {
    const { planName, features, loading: subscriptionLoading, status, daysRemaining } = useSubscription();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // ── Confirmation modal ────────────────────────────────────────────────────
    const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const plansData = await fetchClient('/subscriptions/plans');
            setPlans(plansData?.plans || []);

            const subscriptionData = await fetchClient('/subscriptions/current');
            if (subscriptionData?.subscription) {
                setCurrentSubscription(subscriptionData.subscription);
                if (subscriptionData.subscription.billing_period) {
                    setBillingPeriod(subscriptionData.subscription.billing_period as 'monthly' | 'yearly');
                }
            }
        } catch (err) {
            console.error('Error fetching subscription data:', err);
            setError('Erro ao carregar dados da subscrição.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPayments = useCallback(async () => {
        try {
            setPaymentsLoading(true);
            const data = await fetchClient('/subscriptions/billing-history');
            setPayments(data?.payments || []);
        } catch (err) {
            console.error('Error fetching billing history:', err);
        } finally {
            setPaymentsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchPayments();
    }, [status, fetchData, fetchPayments]);

    // ── Step 1: Open the confirmation modal ──────────────────────────────────
    const handleSelectPlan = (selectedPlanName: string) => {
        const plan = plans.find(p => p.name === selectedPlanName);
        if (!plan) return;
        setPendingPlan(plan);
        setConfirmModalOpen(true);
    };

    // ── Step 2: User confirms → call the API ─────────────────────────────────
    const handleConfirmPlanChange = async () => {
        if (!pendingPlan) return;
        const selectedPlanName = pendingPlan.name;
        setConfirmModalOpen(false);

        try {
            setCheckoutLoading(selectedPlanName);
            setError(null);

            // If user already has a Stripe subscription, update it in-place (upgrade/downgrade)
            // Otherwise create a new Checkout session (first-time subscribers)
            const hasActiveStripeSubscription =
                currentSubscription?.status === 'active' ||
                currentSubscription?.status === 'past_due';

            const endpoint = hasActiveStripeSubscription
                ? '/subscriptions/change-plan'
                : '/subscriptions/create-checkout-session';

            const data = await fetchClient(endpoint, {
                method: 'POST',
                body: JSON.stringify({ plan_name: selectedPlanName, billing_period: billingPeriod }),
            });

            if (data?.success) {
                // In-place update — no redirect, just refresh data
                await fetchData();
                setError(null);
            } else if (data?.url || data?.redirectUrl) {
                window.location.href = data.url || data.redirectUrl;
            } else {
                setError(data?.message || 'Erro ao actualizar plano.');
            }
        } catch (err: any) {
            console.error('Plan change error:', err);
            setError(err?.message || 'Erro ao actualizar plano. Verifica se os preços estão configurados no Stripe.');
        } finally {
            setCheckoutLoading(null);
            setPendingPlan(null);
        }
    };

    const handleBillingPortal = async () => {
        try {
            setPortalLoading(true);
            setError(null);

            const data = await fetchClient('/subscriptions/billing-portal');

            if (data?.url) {
                window.open(data.url, '_blank');
            } else {
                setError('Erro ao aceder ao portal de faturação.');
            }
        } catch (err: any) {
            console.error('Billing portal error:', err);
            setError(err?.message || 'Erro ao aceder ao portal de faturação.');
        } finally {
            setPortalLoading(false);
        }
    };

    if (loading || subscriptionLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">A carregar subscrição...</p>
                </div>
            </div>
        );
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-7xl p-6">

                {/* Header */}
                <div className="mb-8 flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestão de Subscrição</h1>
                        <p className="mt-2 text-gray-600">
                            Gere a tua subscrição do RCM e acesso às funcionalidades
                        </p>
                    </div>

                    {currentSubscription && ['active', 'past_due'].includes(currentSubscription.status) && (
                        <Button
                            onClick={handleBillingPortal}
                            disabled={portalLoading}
                            variant="outline"
                            className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            <ExternalLink className="h-4 w-4" />
                            {portalLoading ? 'A abrir...' : 'Gerir Faturação'}
                        </Button>
                    )}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        ⚠️ {error}
                    </div>
                )}

                {/* Current Plan Overview */}
                {currentSubscription && (
                    <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-xl font-semibold text-gray-900">Plano Atual</h2>
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="flex items-start gap-3">
                                <div className="rounded-lg bg-orange-50 p-2">
                                    <CreditCard className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Plano</p>
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
                                    <p className="text-sm text-gray-600">Estado</p>
                                    <p className="text-lg font-semibold capitalize text-gray-900">
                                        {status === 'trial' ? 'Período de Teste'
                                            : status === 'active' ? 'Ativo'
                                                : status === 'grace_period' ? 'Em Atraso'
                                                    : status === 'suspended' ? 'Suspenso'
                                                        : status}
                                    </p>
                                    {status === 'trial' && currentSubscription.trial_end && (
                                        <div className="mt-1">
                                            <p className="text-sm text-orange-600 font-medium">
                                                {daysRemaining} dias restantes
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Válido até {new Date(currentSubscription.trial_end).toLocaleDateString('pt-PT')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="rounded-lg bg-green-50 p-2">
                                    <Calendar className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Período de Faturação</p>
                                    <p className="text-lg font-semibold capitalize text-gray-900">
                                        {currentSubscription.billing_period === 'monthly' ? 'Mensal' : 'Anual'}
                                    </p>
                                    {currentSubscription.current_period_end && (
                                        <p className="text-xs text-gray-500">
                                            Renova em {new Date(currentSubscription.current_period_end).toLocaleDateString('pt-PT')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {features.length > 0 && (
                            <div className="mt-6 border-t border-gray-200 pt-6">
                                <h3 className="mb-3 font-semibold text-gray-900">Funcionalidades Incluídas:</h3>
                                <div className="grid gap-2 md:grid-cols-2">
                                    <FeatureList
                                        features={features.map(f => ({
                                            key: f,
                                            name: f.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
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
                            Mensal
                        </button>
                        <button
                            onClick={() => setBillingPeriod('yearly')}
                            className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${billingPeriod === 'yearly'
                                ? 'bg-orange-600 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Anual <span className="ml-1 text-xs">(Poupa até 17%)</span>
                        </button>
                    </div>
                </div>

                {/* Available Plans */}
                <div>
                    <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
                        {currentSubscription ? 'Alterar Plano' : 'Escolhe o Teu Plano'}
                    </h2>

                    <div className="grid gap-6 md:grid-cols-3">
                        {plans.map((plan, index) => {
                            const isCurrentPlan =
                                plan.name === planName ||
                                plan.name === currentSubscription?.plan?.name ||
                                plan.display_name === currentSubscription?.plan?.display_name;
                            return (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    currentPlan={isCurrentPlan}
                                    popular={index === 1 && !isCurrentPlan}
                                    billingPeriod={billingPeriod}
                                    loading={checkoutLoading === plan.name}
                                    onSelect={() => handleSelectPlan(plan.name)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Billing History */}
                <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900">Histórico de Faturação</h2>

                    {paymentsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                            <span className="ml-2 text-sm text-gray-500">A carregar...</span>
                        </div>
                    ) : payments.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">
                            Sem histórico de pagamentos disponível.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        <th className="pb-3 pr-4">Data</th>
                                        <th className="pb-3 pr-4">Valor</th>
                                        <th className="pb-3 pr-4">Estado</th>
                                        <th className="pb-3">Detalhe</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="py-3">
                                            <td className="py-3 pr-4 text-gray-700">
                                                {new Date(payment.billing_date).toLocaleDateString('pt-PT')}
                                            </td>
                                            <td className="py-3 pr-4 font-semibold text-gray-900">
                                                {payment.amount.toFixed(2)} {payment.currency}
                                            </td>
                                            <td className="py-3 pr-4">
                                                {payment.status === 'succeeded' ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                                        <CheckCircle2 className="h-3 w-3" /> Pago
                                                    </span>
                                                ) : payment.status === 'failed' ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                                        <XCircle className="h-3 w-3" /> Falhado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                                                        <Clock className="h-3 w-3" /> Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-xs text-gray-500">
                                                {payment.status === 'failed' && payment.failure_reason
                                                    ? payment.failure_reason
                                                    : payment.paid_at
                                                        ? `Pago em ${new Date(payment.paid_at).toLocaleDateString('pt-PT')}`
                                                        : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {/* ── Plan Change Confirmation Modal ───────────────────────────────────── */}
            {confirmModalOpen && pendingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4">
                        {/* Close button */}
                        <button
                            onClick={() => { setConfirmModalOpen(false); setPendingPlan(null); }}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-full bg-orange-100 p-2.5">
                                <AlertTriangle className="h-6 w-6 text-orange-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Confirmar Mudança de Plano</h2>
                        </div>

                        {/* Current → New plan comparison */}
                        <div className="mb-5 rounded-xl bg-gray-50 p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-center flex-1">
                                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Plano Atual</p>
                                    <p className="font-semibold text-gray-900">
                                        {currentSubscription?.plan?.display_name ?? 'Sem plano'}
                                    </p>
                                    <p className="text-orange-600 font-bold text-lg">
                                        €{currentSubscription?.plan?.price_monthly?.toFixed(2) ?? '0'}<span className="text-xs font-normal text-gray-400">/mês</span>
                                    </p>
                                </div>
                                <div className="text-2xl text-gray-300 px-3">→</div>
                                <div className="text-center flex-1">
                                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Novo Plano</p>
                                    <p className="font-semibold text-gray-900">{pendingPlan.display_name}</p>
                                    <p className="text-orange-600 font-bold text-lg">
                                        €{billingPeriod === 'yearly'
                                            ? (pendingPlan.price_monthly * 0.8).toFixed(2)
                                            : pendingPlan.price_monthly.toFixed(2)}<span className="text-xs font-normal text-gray-400">/mês</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Proration note for active subscribers */}
                        {currentSubscription?.status === 'active' && (
                            <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 leading-relaxed">
                                <strong>💡 Prorrata automática:</strong> O Stripe calculará a diferença de valor
                                proporcional aos dias restantes do ciclo atual. O ajuste será cobrado ou creditado automaticamente.
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => { setConfirmModalOpen(false); setPendingPlan(null); }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={handleConfirmPlanChange}
                                disabled={!!checkoutLoading}
                            >
                                {checkoutLoading ? 'A processar...' : 'Confirmar Mudança'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

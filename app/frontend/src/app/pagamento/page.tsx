"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { Loader2, CheckCircle, CreditCard, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Plan {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    price_monthly: number;
    features: { key: string; name: string }[];
}

interface SubscriptionStatus {
    status: string;
    message?: string;
    days_remaining?: number;
    trial_end?: string;
    grace_period_end?: string;
}

export default function PagamentoPage() {
    const router = useRouter();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
    const [billingPortalLoading, setBillingPortalLoading] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "yearly">("monthly");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [plansData, statusData] = await Promise.all([
                fetchClient("/subscriptions/plans"),
                fetchClient("/subscriptions/status").catch(() => ({ status: "unknown" })),
            ]);
            setPlans(plansData.plans || []);
            setStatus(statusData);
        } catch (err) {
            console.error("Failed to load subscription data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (planName: string) => {
        setCheckoutLoading(planName);
        try {
            const data = await fetchClient("/subscriptions/create-checkout-session", {
                method: "POST",
                body: JSON.stringify({ plan_name: planName, billing_period: selectedPeriod }),
            });
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            alert(err.message || "Erro ao criar sessão de pagamento. Tente novamente.");
        } finally {
            setCheckoutLoading(null);
        }
    };

    const handleBillingPortal = async () => {
        setBillingPortalLoading(true);
        try {
            const data = await fetchClient("/subscriptions/billing-portal");
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            alert(err.message || "Erro ao abrir portal de faturação.");
        } finally {
            setBillingPortalLoading(false);
        }
    };

    // ── Status Banner ──────────────────────────────────────────────────────────
    const renderStatusBanner = () => {
        if (!status) return null;

        const banners: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
            suspended: {
                color: "bg-red-50 border-red-200 text-red-800",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
                text: "A sua conta está suspensa. Subscreva um plano para recuperar o acesso.",
            },
            trial_expired: {
                color: "bg-amber-50 border-amber-200 text-amber-800",
                icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
                text: "O seu período de trial terminou. Escolha um plano para continuar.",
            },
            past_due: {
                color: "bg-orange-50 border-orange-200 text-orange-800",
                icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
                text: `Pagamento em falta.${status.days_remaining ? ` Tem ${status.days_remaining} dia(s) de carência restante.` : ""} Por favor regularize o pagamento.`,
            },
            trial: {
                color: "bg-blue-50 border-blue-200 text-blue-800",
                icon: <CheckCircle className="h-5 w-5 text-blue-500" />,
                text: `Está em período de trial.${status.days_remaining ? ` ${status.days_remaining} dia(s) restante(s).` : ""} Subscreva agora para não perder o acesso.`,
            },
            active: {
                color: "bg-green-50 border-green-200 text-green-800",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                text: "A sua subscrição está ativa.",
            },
        };

        const banner = banners[status.status] || banners.active;

        return (
            <div className={`flex items-center gap-3 p-4 rounded-lg border mb-8 ${banner.color}`}>
                {banner.icon}
                <p className="text-sm font-medium">{banner.text}</p>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <img src="/images/logo-login.png" alt="RCM" className="h-12 w-auto mx-auto mb-6" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        Escolha o seu plano
                    </h1>
                    <p className="text-gray-500 text-lg">
                        Acesso completo ao Restaurant Cost Manager
                    </p>
                </div>

                {/* Status Banner */}
                <div className="max-w-2xl mx-auto">
                    {renderStatusBanner()}
                </div>

                {/* Period Toggle */}
                <div className="flex justify-center mb-10">
                    <div className="flex bg-white border rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => setSelectedPeriod("monthly")}
                            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${selectedPeriod === "monthly"
                                ? "bg-orange-500 text-white shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Mensal
                        </button>
                        <button
                            onClick={() => setSelectedPeriod("yearly")}
                            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${selectedPeriod === "yearly"
                                ? "bg-orange-500 text-white shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Anual
                            <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                                -20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Plans Grid */}
                {plans.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p>Nenhum plano disponível. Contacte o suporte.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map((plan, idx) => {
                            const isPopular = idx === 1;
                            const isLoading = checkoutLoading === plan.name;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative bg-white rounded-2xl border-2 p-8 flex flex-col shadow-sm transition-shadow hover:shadow-md
                                        ${isPopular ? "border-orange-500 shadow-orange-100" : "border-gray-200"}`}
                                >
                                    {isPopular && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                            <span className="bg-orange-500 text-white text-xs font-semibold px-4 py-1 rounded-full shadow">
                                                Mais popular
                                            </span>
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                                            {plan.display_name}
                                        </h2>
                                        {plan.description && (
                                            <p className="text-sm text-gray-500">{plan.description}</p>
                                        )}
                                    </div>

                                    <div className="mb-6">
                                        <span className="text-4xl font-extrabold text-gray-900">
                                            €{selectedPeriod === "yearly"
                                                ? (plan.price_monthly * 0.8).toFixed(2)
                                                : plan.price_monthly.toFixed(2)}
                                        </span>
                                        <span className="text-gray-400 text-sm">/mês</span>
                                        {selectedPeriod === "yearly" && (
                                            <p className="text-xs text-green-600 mt-1">
                                                Faturado anualmente
                                            </p>
                                        )}
                                    </div>

                                    <ul className="space-y-2.5 mb-8 flex-1">
                                        {plan.features.slice(0, 6).map(f => (
                                            <li key={f.key} className="flex items-center gap-2.5 text-sm text-gray-700">
                                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                {f.name}
                                            </li>
                                        ))}
                                        {plan.features.length > 6 && (
                                            <li className="text-sm text-gray-400 pl-6">
                                                +{plan.features.length - 6} mais funcionalidades
                                            </li>
                                        )}
                                    </ul>

                                    <Button
                                        onClick={() => handleSubscribe(plan.name)}
                                        disabled={!!checkoutLoading}
                                        className={`w-full h-12 font-semibold text-base ${isPopular
                                            ? "bg-orange-500 hover:bg-orange-600 text-white"
                                            : "bg-gray-900 hover:bg-gray-800 text-white"
                                            }`}
                                    >
                                        {isLoading ? (
                                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />A redirecionar...</>
                                        ) : "Subscrever agora"}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Billing Portal (for existing paid customers) */}
                {status?.status === "past_due" && (
                    <div className="mt-10 text-center">
                        <p className="text-sm text-gray-500 mb-3">
                            Já tem uma subscrição ativa? Atualize o método de pagamento:
                        </p>
                        <Button
                            variant="outline"
                            onClick={handleBillingPortal}
                            disabled={billingPortalLoading}
                            className="gap-2"
                        >
                            {billingPortalLoading
                                ? <><Loader2 className="h-4 w-4 animate-spin" />A abrir...</>
                                : <><ExternalLink className="h-4 w-4" />Portal de Faturação Stripe</>
                            }
                        </Button>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 text-center text-sm text-gray-400 space-y-1">
                    <p>Pagamentos processados com segurança via Stripe. Cancele a qualquer momento.</p>
                    <p>
                        <button
                            onClick={() => router.push("/auth/login")}
                            className="underline hover:text-gray-600"
                        >
                            Voltar ao login
                        </button>
                        {" · "}
                        <a href="mailto:suporte@rcm-app.com" className="underline hover:text-gray-600">
                            Contactar suporte
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

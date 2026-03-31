'use client';

import { TenantOverview } from '@/services/internal-tenants.service';
import { Building2, Calendar, CreditCard, Mail, Phone, AlertCircle, ExternalLink, Clock, AlertTriangle } from 'lucide-react';

interface TenantInfoCardProps {
    tenant: TenantOverview | null;
    isLoading?: boolean;
}

function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-PT', opts || { dateStyle: 'short' });
}

function fmtDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-PT');
}

export function TenantInfoCard({ tenant, isLoading }: TenantInfoCardProps) {
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <p className="text-slate-500">Tenant não encontrado</p>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        active: 'bg-green-100 text-green-700',
        trial: 'bg-blue-100 text-blue-700',
        suspended: 'bg-red-100 text-red-700',
        cancelled: 'bg-gray-100 text-gray-700',
        payment_overdue: 'bg-orange-100 text-orange-700',
    };

    const planColors: Record<string, string> = {
        trial: 'bg-blue-50 text-blue-700',
        basico: 'bg-green-50 text-green-700',
        profissional: 'bg-purple-50 text-purple-700',
        enterprise: 'bg-orange-50 text-orange-700',
    };

    const subStatusColors: Record<string, string> = {
        active: 'text-green-600',
        trial: 'text-blue-600',
        past_due: 'text-red-600',
        canceled: 'text-gray-500',
        suspended: 'text-red-700',
    };

    const paymentStatusIcons = {
        ok: <CreditCard className="w-5 h-5 text-green-600" />,
        trial: <Calendar className="w-5 h-5 text-blue-600" />,
        overdue: <AlertCircle className="w-5 h-5 text-red-600" />,
    };

    const sub = tenant.subscription;

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-orange-600" />
                        {tenant.nome_restaurante}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Cliente desde {fmtDate(tenant.created_at, { dateStyle: 'long' })}
                    </p>
                </div>

                {/* Status + Plan Badges — source: TenantSubscription (canonical) */}
                <div className="flex flex-col gap-2 items-end">
                    {/* Subscription status (canonical) */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[sub?.sub_status ?? tenant.status ?? ''] || 'bg-gray-100 text-gray-700'}`}>
                        {(sub?.sub_status ?? tenant.status)?.toUpperCase()}
                    </span>
                    {/* Plan name from subscription (canonical) */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${planColors[tenant.plan] || 'bg-gray-100 text-gray-700'}`}>
                        {sub?.plan_name?.toUpperCase() ?? tenant.plan.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Inconsistency warning: tenant fields differ from subscription */}
            {sub && (
                (tenant.plan.toLowerCase() !== (sub.plan_name ?? '').toLowerCase().replace(' plan', '') &&
                    tenant.plan.toLowerCase() !== (sub.plan_name ?? '').toLowerCase()) ||
                (tenant.status !== sub.sub_status && sub.sub_status !== null)
            ) && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-semibold">Inconsistência de dados detectada</p>
                            <p>Campo <code>tenant.plano</code> = <strong>{tenant.plan}</strong> / Campo <code>tenant.status</code> = <strong>{tenant.status}</strong></p>
                            <p>Dados Stripe: plano = <strong>{sub.plan_name}</strong> / status = <strong>{sub.sub_status}</strong></p>
                            <p className="mt-0.5 text-amber-700">Os campos legacy do tenant podem necessitar de sincronização com a subscrição real.</p>
                        </div>
                    </div>
                )}

            {/* Contact + Access */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                    {tenant.email_contacto && (
                        <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{tenant.email_contacto}</span>
                        </div>
                    )}
                    {tenant.telefone && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{tenant.telefone}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                        {paymentStatusIcons[tenant.payment_status]}
                        <span className="text-slate-700 capitalize">Payment: {tenant.payment_status}</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <div>
                        <p className="text-xs text-slate-500">Último Acesso</p>
                        <p className="text-sm font-medium text-slate-700">{fmtDateTime(tenant.last_access)}</p>
                    </div>
                    <div>
                        {tenant.ativo
                            ? <span className="text-xs text-green-600 font-medium">✓ Conta Ativa</span>
                            : <span className="text-xs text-red-600 font-medium">✗ Conta Inativa</span>}
                    </div>
                </div>
            </div>

            {/* Subscription Details */}
            {sub ? (
                <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        Subscrição
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">

                        {/* Plan */}
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-slate-500 mb-1">Plano</p>
                            <p className="font-semibold text-slate-800">{sub.plan_name || tenant.plan}</p>
                            {sub.sub_status && (
                                <p className={`text-xs font-medium mt-0.5 ${subStatusColors[sub.sub_status] || 'text-slate-600'}`}>
                                    {sub.sub_status.replace('_', ' ').toUpperCase()}
                                </p>
                            )}
                        </div>

                        {/* Trial end */}
                        {sub.trial_end && (
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Trial termina</p>
                                <p className="font-semibold text-blue-800">{fmtDate(sub.trial_end)}</p>
                            </div>
                        )}

                        {/* Next billing */}
                        {sub.next_billing_date && (
                            <div className="bg-green-50 rounded-lg p-3">
                                <p className="text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Próx. Pagamento</p>
                                <p className="font-semibold text-green-800">{fmtDate(sub.next_billing_date)}</p>
                            </div>
                        )}

                        {/* Period end */}
                        {sub.current_period_end && !sub.next_billing_date && (
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-slate-500 mb-1">Período atual até</p>
                                <p className="font-semibold text-slate-800">{fmtDate(sub.current_period_end)}</p>
                            </div>
                        )}

                        {/* Grace period */}
                        {sub.grace_period_end && (
                            <div className="bg-orange-50 rounded-lg p-3">
                                <p className="text-slate-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-500" /> Grace Period até</p>
                                <p className="font-semibold text-orange-700">{fmtDate(sub.grace_period_end)}</p>
                            </div>
                        )}

                        {/* Payment failure */}
                        {sub.payment_failed_at && (
                            <div className="bg-red-50 rounded-lg p-3">
                                <p className="text-slate-500 mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> Falha pagamento</p>
                                <p className="font-semibold text-red-700">{fmtDateTime(sub.payment_failed_at)}</p>
                            </div>
                        )}
                    </div>

                    {/* Suspension reason */}
                    {sub.suspension_reason && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-xs text-red-600 font-medium mb-0.5">Motivo de Suspensão</p>
                            <p className="text-xs text-red-700">{sub.suspension_reason}</p>
                        </div>
                    )}

                    {/* Stripe IDs */}
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {sub.stripe_customer_id && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 shrink-0">Stripe Customer:</span>
                                <a
                                    href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-mono text-indigo-600 hover:text-indigo-800 flex items-center gap-1 truncate"
                                >
                                    {sub.stripe_customer_id}
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                            </div>
                        )}
                        {sub.stripe_subscription_id && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 shrink-0">Stripe Sub:</span>
                                <a
                                    href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-mono text-indigo-600 hover:text-indigo-800 flex items-center gap-1 truncate"
                                >
                                    {sub.stripe_subscription_id}
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400">Sem subscrição ativa registada.</p>
                </div>
            )}
        </div>
    );
}

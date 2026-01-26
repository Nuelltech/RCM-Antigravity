'use client';

import { TenantOverview } from '@/services/internal-tenants.service';
import { Building2, Calendar, CreditCard, Mail, Phone, AlertCircle } from 'lucide-react';

interface TenantInfoCardProps {
    tenant: TenantOverview | null;
    isLoading?: boolean;
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

    const statusColors = {
        active: 'bg-green-100 text-green-700',
        trial: 'bg-blue-100 text-blue-700',
        suspended: 'bg-red-100 text-red-700',
        cancelled: 'bg-gray-100 text-gray-700',
        payment_overdue: 'bg-orange-100 text-orange-700',
    };

    const planColors = {
        trial: 'bg-blue-50 text-blue-700',
        basico: 'bg-green-50 text-green-700',
        profissional: 'bg-purple-50 text-purple-700',
        enterprise: 'bg-orange-50 text-orange-700',
    };

    const paymentStatusIcons = {
        ok: <CreditCard className="w-5 h-5 text-green-600" />,
        trial: <Calendar className="w-5 h-5 text-blue-600" />,
        overdue: <AlertCircle className="w-5 h-5 text-red-600" />,
    };

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-orange-600" />
                        {tenant.nome_restaurante}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Cliente desde {new Date(tenant.created_at).toLocaleDateString('pt-PT')}
                    </p>
                </div>

                {/* Badges */}
                <div className="flex flex-col gap-2">
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[tenant.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'
                            }`}
                    >
                        {tenant.status?.toUpperCase()}
                    </span>
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${planColors[tenant.plan as keyof typeof planColors] || 'bg-gray-100 text-gray-700'
                            }`}
                    >
                        {tenant.plan.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            </div>

            {/* Payment & Access Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                    <p className="text-xs text-slate-500 mb-1">Payment Status</p>
                    <div className="flex items-center gap-2">
                        {paymentStatusIcons[tenant.payment_status]}
                        <span className="text-sm font-medium text-slate-700 capitalize">
                            {tenant.payment_status}
                        </span>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-slate-500 mb-1">Último Acesso</p>
                    <p className="text-sm font-medium text-slate-700">
                        {tenant.last_access
                            ? new Date(tenant.last_access).toLocaleString('pt-PT')
                            : 'Nunca'}
                    </p>
                </div>
            </div>

            {/* Active/Inactive Badge */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                {tenant.ativo ? (
                    <span className="text-xs text-green-600 font-medium">✓ Conta Ativa</span>
                ) : (
                    <span className="text-xs text-red-600 font-medium">✗ Conta Inativa</span>
                )}
            </div>
        </div>
    );
}

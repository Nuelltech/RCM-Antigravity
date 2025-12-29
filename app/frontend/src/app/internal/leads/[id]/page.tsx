/**
 * Internal Lead Detail Page
 * View and manage individual lead details
 */

"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInternalAuth } from '@/contexts/InternalAuthContext';
import InternalProtectedRoute from '@/components/InternalProtectedRoute';
import InternalLayout from '@/components/InternalLayout';
import { leadsInternalService, Lead, LeadStatus } from '@/services/leads-internal.service';
import { LeadStatusBadge } from '@/components/internal/LeadStatusBadge';

const STATUS_FLOW: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST'];

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useInternalAuth();
    const leadId = params.id as string;

    const [lead, setLead] = useState<Lead | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Update status form
    const [newStatus, setNewStatus] = useState<LeadStatus>('NEW');
    const [statusNotes, setStatusNotes] = useState('');
    const [lostReason, setLostReason] = useState('');

    // Internal notes
    const [internalNotes, setInternalNotes] = useState('');

    const fetchLead = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await leadsInternalService.getLeadById(parseInt(leadId, 10));
            setLead(data.lead);
            setNewStatus(data.lead.status);
            setInternalNotes(data.lead.internal_notes || '');
        } catch (err: any) {
            console.error('Error fetching lead:', err);
            setError('Falha ao carregar lead');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLead();
    }, [leadId]);

    const handleStatusUpdate = async () => {
        if (!lead) return;

        try {
            setIsUpdating(true);
            await leadsInternalService.updateStatus(parseInt(leadId, 10), newStatus, statusNotes);
            setStatusNotes('');
            setLostReason('');
            await fetchLead();
        } catch (err: any) {
            console.error('Error updating status:', err);
            alert('Falha ao atualizar status');
        } finally {
            setIsUpdating(false);
        }
    };

    const canEditStatus = () => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        if (user.role === 'MARKETING') {
            return ['NEW', 'CONTACTED', 'QUALIFIED'].includes(newStatus);
        }
        if (user.role === 'SALES') return true;
        return false;
    };

    const formatDate = (dateString: Date | null | undefined) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('pt-PT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <InternalProtectedRoute>
                <InternalLayout>
                    <div className="flex items-center justify-center h-[50vh]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">A carregar lead...</p>
                        </div>
                    </div>
                </InternalLayout>
            </InternalProtectedRoute>
        );
    }

    if (error || !lead) {
        return (
            <InternalProtectedRoute>
                <InternalLayout>
                    <div className="flex items-center justify-center h-[50vh]">
                        <div className="text-center">
                            <p className="text-red-600 mb-4">{error || 'Lead não encontrado'}</p>
                            <button
                                onClick={() => router.push('/internal/leads')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                ← Voltar aos Leads
                            </button>
                        </div>
                    </div>
                </InternalLayout>
            </InternalProtectedRoute>
        );
    }

    return (
        <InternalProtectedRoute>
            <InternalLayout>
                <div>
                    {/* Header */}
                    <div className="mb-6">
                        <button
                            onClick={() => router.push('/internal/leads')}
                            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
                        >
                            ← Voltar aos Leads
                        </button>
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
                                <p className="text-gray-600 mt-1">{lead.email}</p>
                            </div>
                            <LeadStatusBadge status={lead.status} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Info */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Contact Details */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h2 className="text-xl font-semibold mb-4">Detalhes de Contacto</h2>
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Nome</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{lead.name}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{lead.email}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{lead.phone || 'N/A'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Empresa</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{lead.company || 'N/A'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Fonte</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{lead.source}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Data de Criação</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{formatDate(lead.created_at)}</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Message */}
                            {lead.message && (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                    <h2 className="text-xl font-semibold mb-4">Mensagem</h2>
                                    <p className="text-gray-700 whitespace-pre-wrap">{lead.message}</p>
                                </div>
                            )}

                            {/* Status History */}
                            {lead.status_history && lead.status_history.length > 0 && (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                    <h2 className="text-xl font-semibold mb-4">Histórico de Status</h2>
                                    <div className="space-y-3">
                                        {lead.status_history.map((entry: any, index: number) => (
                                            <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <LeadStatusBadge status={entry.status} />
                                                    <span className="text-xs text-gray-500">
                                                        {formatDate(entry.changed_at)}
                                                    </span>
                                                </div>
                                                {entry.notes && (
                                                    <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                                                )}
                                                {entry.changed_by && (
                                                    <p className="text-xs text-gray-500 mt-1">Por: {entry.changed_by}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Update Status */}
                            {canEditStatus() && (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                    <h2 className="text-lg font-semibold mb-4">Atualizar Status</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Novo Status
                                            </label>
                                            <select
                                                value={newStatus}
                                                onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {STATUS_FLOW.map((status) => (
                                                    <option key={status} value={status}>
                                                        {status.replace(/_/g, ' ')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {newStatus === 'LOST' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Motivo da Perda
                                                </label>
                                                <input
                                                    type="text"
                                                    value={lostReason}
                                                    onChange={(e) => setLostReason(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Ex: Preço muito alto"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Notas (opcional)
                                            </label>
                                            <textarea
                                                value={statusNotes}
                                                onChange={(e) => setStatusNotes(e.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Adicione notas sobre esta mudança..."
                                            />
                                        </div>

                                        <button
                                            onClick={handleStatusUpdate}
                                            disabled={isUpdating || newStatus === lead.status}
                                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isUpdating ? 'A atualizar...' : 'Atualizar Status'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Assignment Info */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold mb-4">Atribuição</h2>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Atribuído a</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {lead.assignedUser ? lead.assignedUser.name : 'Não atribuído'}
                                    </dd>
                                </div>
                            </div>

                            {/* Activity Timestamps */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold mb-4">Atividades</h2>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Último Contacto</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{formatDate(lead.last_contacted_at)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Qualificado em</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{formatDate(lead.qualified_at)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Proposta Enviada</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{formatDate(lead.proposal_sent_at)}</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Internal Notes */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold mb-4">Notas Internas</h2>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {internalNotes || 'Sem notas'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </InternalLayout>
        </InternalProtectedRoute>
    );
}

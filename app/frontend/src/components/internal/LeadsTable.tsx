/**
 * Leads Table Component
 * Display leads in a sortable, paginated table
 */

"use client";

import Link from 'next/link';
import { Lead } from '@/services/leads-internal.service';
import { LeadStatusBadge } from './LeadStatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadsTableProps {
    leads: Lead[];
    isLoading?: boolean;
}

export function LeadsTable({ leads, isLoading }: LeadsTableProps) {
    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">A carregar leads...</p>
                </div>
            </div>
        );
    }

    if (!leads || leads.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-lg">Nenhum lead encontrado</p>
                <p className="text-gray-400 text-sm mt-2">Tenta ajustar os filtros</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Lead
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tipo de Negócio
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Atribuído
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Criado
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {leads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">{lead.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600 capitalize">
                                        {lead.business_type.replace(/_/g, ' ')}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <LeadStatusBadge status={lead.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {lead.assignedUser ? (
                                        <div className="text-sm">
                                            <div className="font-medium text-gray-900">{lead.assignedUser.name}</div>
                                            <div className="text-gray-500 text-xs">{lead.assignedUser.role}</div>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">Não atribuído</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {formatDistanceToNow(new Date(lead.createdAt), {
                                        addSuffix: true,
                                        locale: ptBR,
                                    })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link
                                        href={`/internal/leads/${lead.id}`}
                                        className="text-orange-600 hover:text-orange-900 transition-colors"
                                    >
                                        Ver Detalhes →
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

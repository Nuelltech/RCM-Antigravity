"use client";

import { useEffect, useState, useCallback } from "react";
import { useInternalAuth } from "@/contexts/InternalAuthContext";
import { internalLeadsService, Lead, LeadFilters } from "@/services/internal-leads.service";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
    Search,
    Filter,
    MoreHorizontal,
    ArrowRight,
    Mail,
    Calendar,
    Phone,
    User
} from "lucide-react";
import Link from "next/link";

import ProtectedRoute from "@/components/ProtectedRoute";
import InternalLayout from "@/components/InternalLayout";

export default function LeadsPage() {
    const { user, checkPermission } = useInternalAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<LeadFilters>({
        page: 1,
        pageSize: 10,
        status: "",
        search: "",
    });
    const [totalLeads, setTotalLeads] = useState(0);

    const loadLeads = useCallback(async () => {
        try {
            setLoading(true);
            const data = await internalLeadsService.getLeads(filters);
            setLeads(data.leads || []);
            setTotalLeads(data.pagination?.total || 0);
        } catch (error) {
            console.error("Failed to load leads", error);
            toast.error("Erro ao carregar leads");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const loadStats = useCallback(async () => {
        if (!stats) {
            try {
                const statsData = await internalLeadsService.getLeadStats();
                setStats(statsData);
            } catch (error) {
                console.error("Failed to load stats", error);
            }
        }
    }, [stats]);

    useEffect(() => {
        if (!user) return;
        // Verify permission
        if (!checkPermission("leads.list")) {
            toast.error("Sem permissão para ver leads");
            return;
        }
        loadLeads();
        loadStats();
    }, [user, filters, loadLeads, loadStats, checkPermission]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadLeads();
    };

    const statusColors: Record<string, string> = {
        new: "bg-blue-100 text-blue-700",
        contacted: "bg-yellow-100 text-yellow-700",
        qualified: "bg-purple-100 text-purple-700",
        proposal_sent: "bg-orange-100 text-orange-700",
        demo_scheduled: "bg-indigo-100 text-indigo-700",
        won: "bg-green-100 text-green-700",
        lost: "bg-red-100 text-red-700",
        rejected: "bg-gray-100 text-gray-700",
    };

    const statusLabels: Record<string, string> = {
        new: "Novo Lead",
        contacted: "Contactado",
        qualified: "Qualificado",
        proposal_sent: "Proposta Enviada",
        demo_scheduled: "Demo Agendada",
        won: "Ganho",
        lost: "Perdido",
        rejected: "Rejeitado",
    };

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gestão de Leads</h1>
                            <p className="text-gray-500">Acompanhe e gira os leads comerciais.</p>
                        </div>
                        <div className="flex gap-2">
                            {/* Add CSV Export or other actions here */}
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-sm text-gray-500">Total Leads</div>
                                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-sm text-gray-500">Novos (Semana)</div>
                                <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-sm text-gray-500">Conversão</div>
                                <div className="text-2xl font-bold text-green-600">{stats.conversionRate}%</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-sm text-gray-500">Aguardam Contacto</div>
                                <div className="text-2xl font-bold text-orange-600">{stats.new + stats.contacted}</div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                        <form onSubmit={handleSearch} className="flex-1 min-w-[300px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar por nome, email..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                            />
                        </form>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5 text-gray-400" />
                                <select
                                    className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-600 cursor-pointer"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                                >
                                    <option value="">Todos os estados</option>
                                    {Object.entries(statusLabels).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Lead</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Origem</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                                <td className="px-6 py-4"></td>
                                            </tr>
                                        ))
                                    ) : leads.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                Nenhum lead encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        leads.map((lead) => (
                                            <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-500 font-medium">
                                                            {lead.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{lead.name}</div>
                                                            <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                                                <Mail className="h-3 w-3" />
                                                                {lead.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                                                        {statusLabels[lead.status] || lead.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {lead.source_page || "Direto"}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {format(new Date(lead.createdAt), "d MMM, HH:mm", { locale: pt })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/leads/${lead.id}`}
                                                        className="inline-flex items-center justify-center h-8 w-8 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                                    >
                                                        <ArrowRight className="h-5 w-5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                A mostrar {((filters.page || 1) - 1) * (filters.pageSize || 10) + 1} a {Math.min((filters.page || 1) * (filters.pageSize || 10), totalLeads)} de {totalLeads}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    disabled={(filters.page || 1) === 1}
                                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>
                                <button
                                    disabled={(filters.page || 1) * (filters.pageSize || 10) >= totalLeads}
                                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Seguinte
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

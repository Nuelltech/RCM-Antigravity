"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useInternalAuth } from "@/contexts/InternalAuthContext";
import { internalLeadsService, Lead } from "@/services/internal-leads.service";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
    ArrowLeft,
    Mail,
    Building2,
    Calendar,
    Globe,
    CheckCircle,
    XCircle,
    Clock,
    User,
    MessageSquare,
    MapPin
} from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import InternalLayout from "@/components/InternalLayout";

export default function LeadDetailsPage() {
    const { id } = useParams();
    const { user, checkPermission } = useInternalAuth();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [notes, setNotes] = useState("");

    const loadLead = useCallback(async () => {
        try {
            setLoading(true);
            const data = await internalLeadsService.getLeadById(Number(id));
            setLead(data);
        } catch (error) {
            console.error("Failed to load lead", error);
            toast.error("Erro ao carregar lead");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!user) return;
        if (!checkPermission("leads.list")) {
            toast.error("Sem permissão para ver leads");
            return;
        }
        loadLead();
    }, [user, id, loadLead, checkPermission]);

    const handleStatusChange = async (newStatus: string) => {
        if (!lead) return;

        if (!checkPermission("leads.manage")) {
            toast.error("Sem permissão para alterar estado");
            return;
        }

        try {
            setUpdating(true);
            const updatedLead = await internalLeadsService.updateLeadStatus(lead.id, newStatus, notes);
            setLead(updatedLead);
            setNotes(""); // Clear notes after update
            toast.success(`Estado alterado para ${newStatus}`);
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Erro ao atualizar estado");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Lead não encontrado.</p>
                <Link href="/leads" className="text-orange-600 hover:underline mt-4 inline-block">
                    Voltar à lista
                </Link>
            </div>
        );
    }

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
                <div className="space-y-6 max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/leads"
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                                    {lead.status}
                                </span>
                                <span className="text-sm text-gray-500">• {format(new Date(lead.createdAt), "d MMM yyyy, HH:mm", { locale: pt })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Info */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Contact Info */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informação de Contacto</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                        <a href={`mailto:${lead.email}`} className="hover:text-orange-600 transition-colors">
                                            {lead.email}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <Building2 className="h-5 w-5 text-gray-400" />
                                        <span className="capitalize">{lead.business_type.replace(/_/g, " ")}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <Globe className="h-5 w-5 text-gray-400" />
                                        <span>Origem: {lead.source_page || "Landing Page"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Demo Requests */}
                            {lead.demoRequests && lead.demoRequests.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Pedidos de Demonstração</h2>
                                    <div className="space-y-4">
                                        {lead.demoRequests.map((demo: any) => (
                                            <div key={demo.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-medium text-gray-900">{demo.restaurant}</h3>
                                                    <span className="text-xs text-gray-500">
                                                        {format(new Date(demo.createdAt), "d MMM, HH:mm", { locale: pt })}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600 space-y-1">
                                                    <p><span className="font-medium">Desafio Principal:</span> {demo.challenge}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Actions */}
                        <div className="space-y-6">
                            {/* Status Actions */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações</h2>

                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">Notas (Opcional)</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                        rows={3}
                                        placeholder="Adicione notas sobre a alteração de estado..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />

                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <button
                                            onClick={() => handleStatusChange("contacted")}
                                            disabled={updating || lead.status === "contacted"}
                                            className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100 disabled:opacity-50 transition-colors"
                                        >
                                            Contactado
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange("demo_scheduled")}
                                            disabled={updating || lead.status === "demo_scheduled"}
                                            className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                                        >
                                            Agendar Demo
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange("qualified")}
                                            disabled={updating || lead.status === "qualified"}
                                            className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors"
                                        >
                                            Qualificado
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange("proposal_sent")}
                                            disabled={updating || lead.status === "proposal_sent"}
                                            className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 disabled:opacity-50 transition-colors"
                                        >
                                            Env. Proposta
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange("won")}
                                            disabled={updating || lead.status === "won"}
                                            className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 disabled:opacity-50 transition-colors col-span-2"
                                        >
                                            Ganho (Cliente)
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange("lost")}
                                            disabled={updating || lead.status === "lost"}
                                            className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                                        >
                                            Perdido
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange("rejected")}
                                            disabled={updating || lead.status === "rejected"}
                                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                        >
                                            Rejeitado
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Assigned To */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Responsável</h2>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        <User className="h-5 w-5 text-gray-500" />
                                    </div>
                                    <div>
                                        {lead.assignedUser ? (
                                            <>
                                                <div className="font-medium text-gray-900">{lead.assignedUser.name}</div>
                                                <div className="text-xs text-gray-500">{lead.assignedUser.email}</div>
                                            </>
                                        ) : (
                                            <div className="text-sm text-gray-500">Sem responsável atribuído</div>
                                        )}
                                    </div>
                                </div>
                                {/* Assignment UI could be added here later */}
                            </div>
                        </div>
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

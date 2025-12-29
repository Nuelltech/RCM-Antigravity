"use client";

import InternalProtectedRoute from "@/components/InternalProtectedRoute";
import InternalLayout from "@/components/InternalLayout";
import { useInternalAuth } from "@/contexts/InternalAuthContext";
import { Users, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";

export default function InternalDashboardPage() {
    const { user } = useInternalAuth();

    return (
        <InternalProtectedRoute>
            <InternalLayout>
                <div>
                    {/* Welcome Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Bem-vindo, {user?.name}! 👋
                        </h1>
                        <p className="text-slate-600">
                            Aqui está uma visão geral do sistema de leads e demonstrações.
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <span className="text-xs text-slate-500">Hoje</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">0</h3>
                            <p className="text-sm text-slate-600">Novos Leads</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-orange-50 p-3 rounded-lg">
                                    <Calendar className="w-6 h-6 text-orange-600" />
                                </div>
                                <span className="text-xs text-slate-500">Pendente</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">0</h3>
                            <p className="text-sm text-slate-600">Demo Requests</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-green-50 p-3 rounded-lg">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                </div>
                                <span className="text-xs text-slate-500">Este mês</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">0</h3>
                            <p className="text-sm text-slate-600">Conversões</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-purple-50 p-3 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                </div>
                                <span className="text-xs text-slate-500">Taxa</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">0%</h3>
                            <p className="text-sm text-slate-600">Conversão</p>
                        </div>
                    </div>

                    {/* Quick Actions / Info */}
                    <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Sistema de Gestão de Leads
                        </h2>
                        <p className="text-slate-600 mb-6">
                            Este é o dashboard interno para gestão de leads e demo requests.
                            A Fase 3 irá adicionar as funcionalidades completas de visualização e gestão.
                        </p>

                        <div className="bg-slate-50 rounded-lg p-6">
                            <h3 className="font-semibold text-gray-900 mb-2">Próximos Passos (Fase 3):</h3>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Tabela de leads com filtros e pesquisa</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Gestão de demo requests (agendar, contactar, etc.)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Estatísticas do funil de conversão</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Analytics por fonte, business type, etc.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </InternalLayout>
        </InternalProtectedRoute>
    );
}

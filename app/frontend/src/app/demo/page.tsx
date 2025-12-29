"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LeadCaptureModal, LeadData } from "@/components/LeadCaptureModal";
import { DemoRequestForm } from "@/components/DemoRequestForm";
import {
    CheckCircle2,
    TrendingUp,
    AlertTriangle,
    BarChart3,
    Calendar,
    LineChart,
    ArrowLeft,
} from "lucide-react";

import { leadsService } from "@/services/leads.service";

export default function DemoPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasRegistered, setHasRegistered] = useState(false);
    const [showDemoRequest, setShowDemoRequest] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [leadId, setLeadId] = useState<number | undefined>(undefined);

    const handleLeadSubmit = async (data: LeadData) => {
        setIsLoading(true);
        try {
            // Call API
            const lead = await leadsService.createLead(data);
            setLeadId(lead.id);

            // Save to localStorage (keep as backup/history)
            const existingLeads = JSON.parse(localStorage.getItem("leads") || "[]");
            existingLeads.push({
                ...data,
                id: lead.id,
                timestamp: new Date().toISOString(),
            });
            localStorage.setItem("leads", JSON.stringify(existingLeads));

            setIsModalOpen(false);
            setHasRegistered(true);

            // Scroll to video section
            setTimeout(() => {
                document.getElementById("video-demo")?.scrollIntoView({ behavior: "smooth" });
            }, 300);

            // Track video watch (assuming they watch it immediately since it auto-scrolls)
            // Or better, track it when the component mounts or user plays? 
            // For now, let's track it here as "access to demo page granted"
            if (lead.id) {
                leadsService.trackVideoWatched(lead.id).catch(console.error);
            }

        } catch (error) {
            console.error("Error creating lead:", error);
            // Could add toast notification here
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span>Voltar</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/images/logo-login.png" alt="RCM" className="h-10 w-auto" />
                        <span className="text-xl font-bold text-gray-900">RCM</span>
                    </div>
                    <Link href="/auth/login">
                        <Button variant="outline">Entrar</Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-slate-50 to-orange-50">
                <div className="max-w-5xl mx-auto text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                        Veja como o RCM identifica desperdício, margens baixas e preços desatualizados{" "}
                        <span className="text-orange-500">em minutos</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-700 mb-10 max-w-3xl mx-auto">
                        Demonstração real com dados de um restaurante. Sem teoria. Sem promessas vagas.
                    </p>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4 text-center">
                        O que vai ver na demonstração
                    </h2>
                    <p className="text-xl text-gray-600 text-center mb-12">
                        Funcionalidades concretas que gestores usam diariamente
                    </p>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <BarChart3 className="w-10 h-10 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                CMV real por receita, menu e combos
                            </h3>
                            <p className="text-gray-600">
                                Veja o custo exato de cada prato e identifique onde está a perder dinheiro
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <TrendingUp className="w-10 h-10 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                Impacto direto de aumentos de preços nas margens
                            </h3>
                            <p className="text-gray-600">
                                Simule alterações de preços e veja o impacto imediato na rentabilidade
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <AlertTriangle className="w-10 h-10 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                Alertas automáticos de receitas não rentáveis
                            </h3>
                            <p className="text-gray-600">
                                Receba avisos quando uma receita deixa de dar lucro
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <Calendar className="w-10 h-10 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                Simulação de custos para eventos e menus fechados
                            </h3>
                            <p className="text-gray-600">
                                Calcule custos de menus de eventos antes de fechar preços
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <LineChart className="w-10 h-10 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                Evolução do custo de ingredientes no tempo
                            </h3>
                            <p className="text-gray-600">
                                Acompanhe a evolução de preços e antecipe problemas
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <CheckCircle2 className="w-10 h-10 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                Dashboard com métricas em tempo real
                            </h3>
                            <p className="text-gray-600">
                                Todos os dados importantes num único lugar
                            </p>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center">
                        <Button
                            size="lg"
                            onClick={() => setIsModalOpen(true)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-6 text-xl"
                        >
                            Ver Demonstração (3 minutos)
                        </Button>
                        <p className="text-gray-500 text-sm mt-4">
                            Registo rápido • Sem cartão de crédito
                        </p>
                    </div>
                </div>
            </section>

            {/* Video Demo Section - Only shown after registration */}
            {hasRegistered && (
                <>
                    <section id="video-demo" className="py-20 px-6 bg-slate-50">
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
                                Demonstração RCM
                            </h2>

                            {/* Video Placeholder */}
                            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl mb-12">
                                <div className="aspect-video flex items-center justify-center">
                                    <div className="text-center text-white p-8">
                                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 inline-block">
                                            <BarChart3 className="w-20 h-20 mx-auto mb-4 text-orange-500" />
                                            <p className="text-xl font-semibold mb-2">Vídeo de Demonstração</p>
                                            <p className="text-gray-300">
                                                O vídeo será adicionado em breve
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CTA after video */}
                            <div className="bg-white rounded-2xl p-10 shadow-lg text-center">
                                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                                    Quer ver isto aplicado ao seu restaurante?
                                </h3>
                                <p className="text-xl text-gray-600 mb-8">
                                    Agende uma demonstração personalizada ou crie a sua conta agora
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button
                                        size="lg"
                                        onClick={() => {
                                            setShowDemoRequest(true);
                                            setTimeout(() => {
                                                document.getElementById("demo-request")?.scrollIntoView({ behavior: "smooth" });
                                            }, 100);
                                        }}
                                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg"
                                    >
                                        Solicitar demonstração personalizada
                                    </Button>
                                    <Link href="/auth/register">
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="border-2 border-orange-500 text-orange-500 hover:bg-orange-50 px-8 py-6 text-lg"
                                        >
                                            Criar conta
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Demo Request Form Section */}
                    {showDemoRequest && (
                        <section id="demo-request" className="py-20 px-6 bg-white">
                            <DemoRequestForm leadId={leadId} />
                        </section>
                    )}
                </>
            )}

            {/* Lead Capture Modal */}
            <LeadCaptureModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleLeadSubmit}
                isLoading={isLoading}
            />

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <img src="/images/logo-sidebar.png" alt="RCM" className="h-8 w-auto" />
                        <span className="text-xl font-bold text-white">RCM</span>
                    </div>
                    <p className="mb-4">Restaurant Cost Manager - Controlo profissional de custos na restauração</p>
                    <div className="flex justify-center gap-6 text-sm">
                        <Link href="/" className="hover:text-white transition-colors">
                            Início
                        </Link>
                        <Link href="/auth/login" className="hover:text-white transition-colors">
                            Entrar
                        </Link>
                    </div>
                    <div className="mt-8 pt-8 border-t border-gray-800 text-sm">
                        © 2025 RCM. Todos os direitos reservados.
                    </div>
                </div>
            </footer>
        </main>
    );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    BarChart3,
    ChefHat,
    TrendingUp,
    CheckCircle2,
    ArrowRight,
    ShoppingCart,
    AlertTriangle,
    Building2,
    Coffee,
    XCircle,
    Package,
    TrendingDown,
    Receipt,
    DollarSign
} from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/images/logo-login.png" alt="RCM" className="h-10 w-auto" />
                        <span className="text-xl font-bold text-gray-900">RCM</span>
                    </div>
                    <Link href="/auth/login">
                        <Button>Entrar</Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section with Video Background */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                {/* Video Background */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    <source src="/videos/hero-video.mp4" type="video/mp4" />
                </video>

                {/* Dark Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />

                {/* Hero Content */}
                <div className="relative z-10 text-center text-white px-6 max-w-4xl">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                        Controle o custo real das suas receitas e proteja as margens do seu restaurante.
                    </h1>
                    <p className="text-xl md:text-2xl mb-8 text-gray-200">
                        O RCM liga compras, receitas e menus para que saiba exatamente onde ganha dinheiro — e onde o está a perder.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/demo">
                            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg">
                                Ver demonstração
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link href="/auth/login">
                            <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 px-8 py-6 text-lg">
                                Entrar
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
                        <div className="w-1 h-3 bg-white/70 rounded-full" />
                    </div>
                </div>
            </section>

            {/* Para Quem É / Para Quem Não É */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Para quem é o RCM?
                        </h2>
                        <p className="text-xl text-gray-600">
                            Uma ferramenta especializada para operações que valorizam estrutura e controlo
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Para Quem É */}
                        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                                <h3 className="text-2xl font-bold text-gray-900">Indicado para</h3>
                            </div>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <Building2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                                    <span className="text-gray-700">Restaurantes de gama média e média-alta</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <ChefHat className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                                    <span className="text-gray-700">Fine dining</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Building2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                                    <span className="text-gray-700">Hotéis com restauração</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Building2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                                    <span className="text-gray-700">Grupos e operações estruturadas</span>
                                </li>
                            </ul>
                        </div>

                        {/* Para Quem Não É */}
                        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <XCircle className="w-8 h-8 text-red-600" />
                                <h3 className="text-2xl font-bold text-gray-900">Não é indicado para</h3>
                            </div>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <Coffee className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                                    <span className="text-gray-700">Cafés e snack-bars</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                                    <span className="text-gray-700">Restaurantes sem fichas técnicas</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                                    <span className="text-gray-700">Negócios que não querem estruturar processos</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* O Problema Real */}
            <section className="py-20 px-6 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            O problema real
                        </h2>
                        <p className="text-xl text-gray-600">
                            Desafios que gestores de restauração enfrentam diariamente
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl p-6 border-l-4 border-orange-500">
                            <TrendingUp className="w-8 h-8 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Custos descontrolados</h3>
                            <p className="text-gray-600">
                                Preços de ingredientes que sobem sem controlo nem visibilidade
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border-l-4 border-orange-500">
                            <AlertTriangle className="w-8 h-8 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Receitas desatualizadas</h3>
                            <p className="text-gray-600">
                                Fichas técnicas que não refletem os custos reais atuais
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border-l-4 border-orange-500">
                            <TrendingDown className="w-8 h-8 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Margens ocultas</h3>
                            <p className="text-gray-600">
                                Menus aparentemente rentáveis que escondem prejuízo
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border-l-4 border-orange-500">
                            <Receipt className="w-8 h-8 text-orange-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Decisões tardias</h3>
                            <p className="text-gray-600">
                                Reações tomadas tarde demais quando o problema já existe
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* A Solução RCM */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            A solução RCM
                        </h2>
                        <p className="text-2xl text-gray-700 font-semibold mb-8">
                            Um sistema de engenharia de custos, margens e preços para restauração
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-10 text-white">
                        <p className="text-xl mb-8 text-gray-200">
                            O RCM permite-lhe tomar decisões baseadas em factos, não em intuição:
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                                <span className="text-gray-100">Calcular custo real por receita e porção</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                                <span className="text-gray-100">Atualizar automaticamente margens quando os preços mudam</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                                <span className="text-gray-100">Criar menus, combos e eventos com custos reais</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                                <span className="text-gray-100">Receber alertas quando uma receita deixa de ser rentável</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                                <span className="text-gray-100">Apoiar decisões de preço com dados concretos</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                                <span className="text-gray-100">Controlar o CMV de forma profissional</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Como Funciona - 3 Passos */}
            <section className="py-20 px-6 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Como funciona
                        </h2>
                        <p className="text-xl text-gray-600">
                            Três passos para controlar custos e proteger margens
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Passo 1 */}
                        <div className="bg-white rounded-2xl p-8 shadow-lg">
                            <div className="bg-orange-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                <ShoppingCart className="w-8 h-8 text-orange-600" />
                            </div>
                            <div className="text-4xl font-bold text-orange-500 mb-4">1.</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Produtos e Compras</h3>
                            <ul className="space-y-2 text-gray-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Produtos organizados por famílias e unidades</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Importação de faturas (manual ou OCR)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Histórico e evolução de preços</span>
                                </li>
                            </ul>
                        </div>

                        {/* Passo 2 */}
                        <div className="bg-white rounded-2xl p-8 shadow-lg">
                            <div className="bg-orange-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                <ChefHat className="w-8 h-8 text-orange-600" />
                            </div>
                            <div className="text-4xl font-bold text-orange-500 mb-4">2.</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Receitas, Pré-preparos e Combinações</h3>
                            <ul className="space-y-2 text-gray-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Fichas técnicas completas</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Custos totais e por porção</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Pré-preparos reutilizáveis</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Combos e menus de evento</span>
                                </li>
                            </ul>
                        </div>

                        {/* Passo 3 */}
                        <div className="bg-white rounded-2xl p-8 shadow-lg">
                            <div className="bg-orange-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                <BarChart3 className="w-8 h-8 text-orange-600" />
                            </div>
                            <div className="text-4xl font-bold text-orange-500 mb-4">3.</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Margens, Alertas e Decisão</h3>
                            <ul className="space-y-2 text-gray-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>PVP vs custo real</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>CMV por receita, menu ou combo</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Alertas de margens baixas</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    <span>Impacto direto de alterações de preço</span>
                                </li>
                            </ul>

                            {/* Planeamento de Compras */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-orange-600" />
                                    Planeamento de compras sem desperdício
                                </h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Com base nas receitas, menus e eventos planeados, o RCM calcula as quantidades necessárias de cada ingrediente para um determinado período, ajudando a reduzir desperdício, evitar ruturas e comprar apenas o necessário.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* O Que o RCM Não É */}
            <section className="py-20 px-6 bg-slate-100">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl p-10 border-2 border-slate-200">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">
                            O que o RCM não é
                        </h2>
                        <p className="text-lg text-gray-700 mb-6">
                            É importante clarificar o que o RCM não pretende ser:
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                                <XCircle className="w-6 h-6 text-slate-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">Não é um POS</h3>
                                    <p className="text-gray-600">O RCM não fatura nem gere vendas ao balcão</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                                <XCircle className="w-6 h-6 text-slate-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">Não é um ERP</h3>
                                    <p className="text-gray-600">Não gere contabilidade, RH ou faturação geral</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <XCircle className="w-6 h-6 text-slate-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">Não é um sistema de stock em tempo real</h3>
                                    <p className="text-gray-600">Gere inventários periódicos, não rastreamento em tempo real</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-gray-700">
                                <strong className="text-blue-900">O RCM é uma ferramenta especializada</strong> em engenharia de custos e margens para restauração. Faz uma coisa — e fá-la bem.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Onboarding */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Onboarding
                        </h2>
                        <p className="text-xl text-gray-600">
                            Como começar com o RCM de forma estruturada
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-10 border-2 border-blue-200">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Transparência total</h3>
                            <p className="text-lg text-gray-700 leading-relaxed">
                                O RCM não é um sistema "ligar e usar". É necessário criar receitas, validar preços e estruturar a informação.
                                Mas o valor é claro e mensurável.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-xl p-6">
                                <h4 className="font-bold text-gray-900 mb-3">Onboarding faseado</h4>
                                <p className="text-gray-600">
                                    Acompanhamento passo a passo na configuração inicial e criação das primeiras receitas
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-6">
                                <h4 className="font-bold text-gray-900 mb-3">Valor progressivo</h4>
                                <p className="text-gray-600">
                                    Com 5 a 10 receitas bem estruturadas já começa a ver resultados concretos
                                </p>
                            </div>
                        </div>

                        <div className="bg-white/50 rounded-lg p-6 border border-blue-300">
                            <p className="text-gray-800 font-semibold">
                                ✓ Sem minimizar o esforço • Com total segurança • Resultados claros e mensuráveis
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* O que é o RCM */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
                        O que é o RCM?
                    </h2>
                    <div className="bg-slate-50 rounded-2xl p-10 border border-slate-200">
                        <p className="text-lg text-gray-800 leading-relaxed mb-6">
                            O RCM (Restaurant Cost Manager) é um software especializado em controlo de custos, CMV e margens para restaurantes, hotéis e operações de restauração estruturadas.
                        </p>
                        <p className="text-lg text-gray-800 leading-relaxed">
                            O sistema permite calcular o custo real de cada receita, atualizar margens quando os preços mudam e apoiar decisões de preço com dados concretos.
                        </p>
                    </div>
                </div>
            </section>

            {/* Planos e Preços */}
            <section className="py-20 px-6 bg-gray-50">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Planos e preços
                    </h2>
                    <p className="text-xl text-gray-600 mb-12">
                        Investimento claro e transparente
                    </p>

                    <div className="bg-white border-2 border-slate-300 rounded-2xl p-10 max-w-lg mx-auto shadow-xl">
                        <h3 className="text-3xl font-bold text-gray-900 mb-6">Plano Base</h3>
                        <div className="mb-8">
                            <div className="flex items-baseline justify-center mb-2">
                                <span className="text-5xl font-bold text-gray-900">129€</span>
                                <span className="text-xl text-gray-600 ml-2">/mês</span>
                            </div>
                        </div>

                        <div className="text-left mb-8">
                            <h4 className="font-bold text-gray-900 mb-4 text-center">Inclui:</h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Produtos e receitas ilimitadas</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Pré-preparos e combinações</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Menus e combos com cálculo automático de CMV</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Alertas de preços e margens</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Inventários periódicos</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Análise de custos fixos</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Acesso Web + Mobile (iOS e Android)</span>
                                </li>
                            </ul>
                        </div>

                        <div className="border-t pt-6 mb-6">
                            <h4 className="font-bold text-gray-900 mb-3">Serviços adicionais disponíveis:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Onboarding profissional dedicado</li>
                                <li>• Acompanhamento mensal personalizado</li>
                                <li>• Integrações com fornecedores e POS</li>
                                <li>• Gestão multi-unidade</li>
                            </ul>
                        </div>

                        <Button size="lg" className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6">
                            Solicitar demonstração
                        </Button>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
                        Perguntas Frequentes
                    </h2>

                    <div className="space-y-8">
                        {/* Question 1 */}
                        <div className="border-b border-gray-200 pb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                O RCM é um POS?
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                Não. O RCM não faz vendas nem faturação. É um sistema especializado em custos, CMV e margens.
                            </p>
                        </div>

                        {/* Question 2 */}
                        <div className="border-b border-gray-200 pb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                O RCM substitui o meu ERP ou software de contabilidade?
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                Não. O RCM complementa esses sistemas, focando-se exclusivamente na rentabilidade das receitas.
                            </p>
                        </div>

                        {/* Question 3 */}
                        <div className="border-b border-gray-200 pb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Preciso ter fichas técnicas para usar o RCM?
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                Não inicialmente. O onboarding ajuda a criar e estruturar as primeiras fichas técnicas.
                            </p>
                        </div>

                        {/* Question 4 */}
                        <div className="border-b border-gray-200 pb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Quanto tempo demora a ver resultados?
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                Com 5 a 10 receitas bem estruturadas já é possível identificar problemas de margem e oportunidades de correção.
                            </p>
                        </div>

                        {/* Question 5 */}
                        <div className="border-b border-gray-200 pb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                O RCM serve para restaurantes pequenos?
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                O RCM é mais indicado para operações que valorizam controlo, estrutura e decisão baseada em dados.
                            </p>
                        </div>

                        {/* Question 6 */}
                        <div className="border-b border-gray-200 pb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                O planeamento de compras é automático?
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                Sim, com base nas receitas, menus ou eventos definidos no sistema.
                            </p>
                        </div>

                        {/* Question 7 */}
                        <div className="pb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Existe versão mobile?
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                Sim. O RCM está disponível em web e aplicação mobile (iOS e Android).
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20 px-6 bg-gradient-to-br from-orange-500 to-red-600 text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Quer saber se os seus pratos estão realmente a dar lucro?
                    </h2>
                    <p className="text-xl mb-8 text-white/90">
                        Descubra como o RCM pode ajudar a proteger as margens do seu restaurante
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/demo">
                            <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-6 text-lg">
                                Ver demonstração
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link href="/auth/login">
                            <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
                                Entrar
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <img src="/images/logo-sidebar.png" alt="RCM" className="h-8 w-auto" />
                        <span className="text-xl font-bold text-white">RCM</span>
                    </div>
                    <p className="mb-4">Restaurant Cost Manager - Controlo profissional de custos na restauração</p>
                    <div className="flex justify-center gap-6 text-sm">
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

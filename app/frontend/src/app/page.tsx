import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    BarChart3,
    ChefHat,
    LineChart,
    Package,
    TrendingUp,
    CheckCircle2,
    ArrowRight,
    ShoppingCart,
    Users
} from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/images/logo.png" alt="RCM" className="h-10 w-auto" />
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
                        Controle o Custo Real das Suas Receitas e Menu de Forma <span className="text-orange-500">Simples e Eficaz</span>
                    </h1>
                    <p className="text-xl md:text-2xl mb-8 text-gray-200">
                        Transforme dados de compras, receitas e vendas em CMVs precisos e em insights inteligentes
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/auth/register">
                            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg">
                                Experimente Grátis
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

            {/* Features Grid */}
            <section className="py-20 px-6 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Controle o CMV em 3 passos simples
                        </h2>
                        <p className="text-xl text-gray-600">
                            Tudo o que precisa para gerir custos de forma profissional
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="bg-orange-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                <ShoppingCart className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Registe Compras</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Adicione faturas manualmente, via OCR ou integração com fornecedores.
                                Todos os preços atualizados automaticamente.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="bg-orange-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                <ChefHat className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Crie Receitas</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Monte suas fichas técnicas com ingredientes, quantidades e passos.
                                O CMV é calculado em tempo real.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="bg-orange-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                <BarChart3 className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Analise Resultados</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Dashboard com métricas de custo, margens e alertas inteligentes.
                                Tome decisões baseadas em dados reais.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-4xl font-bold text-gray-900 mb-6">
                                Veja como funciona em 2 minutos
                            </h2>
                            <div className="space-y-4">
                                {[
                                    "Gestão completa de produtos e fornecedores",
                                    "Fichas técnicas detalhadas com rentabilidade",
                                    "Menu com PVP e margens calculadas automaticamente",
                                    "Controlo de stock teórico vs real",
                                    "Alertas AI quando custos sobem",
                                    "Relatórios de vendas e performance"
                                ].map((benefit, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                                        <span className="text-lg text-gray-700">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-8 text-white">
                            <div className="aspect-video bg-white/10 rounded-xl flex items-center justify-center mb-6">
                                <Package className="w-24 h-24 text-white/50" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Demo Interativa</h3>
                            <p className="text-white/90 mb-6">
                                Experimente todas as funcionalidades gratuitamente por 14 dias
                            </p>
                            <Link href="/auth/register">
                                <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 w-full">
                                    Começar Agora
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 px-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-5xl font-bold text-orange-500 mb-2">30%</div>
                            <div className="text-gray-300">Redução média de custos</div>
                        </div>
                        <div>
                            <div className="text-5xl font-bold text-orange-500 mb-2">2h</div>
                            <div className="text-gray-300">Poupadas por semana</div>
                        </div>
                        <div>
                            <div className="text-5xl font-bold text-orange-500 mb-2">500+</div>
                            <div className="text-gray-300">Restaurantes ativos</div>
                        </div>
                        <div>
                            <div className="text-5xl font-bold text-orange-500 mb-2">4.9★</div>
                            <div className="text-gray-300">Avaliação média</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Teaser */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Planos acessíveis e transparentes
                    </h2>
                    <p className="text-xl text-gray-600 mb-12">
                        Escolha o plano ideal para o seu restaurante
                    </p>

                    <div className="bg-white border-2 border-orange-500 rounded-2xl p-8 max-w-sm mx-auto shadow-xl">
                        <div className="text-sm font-semibold text-orange-600 mb-2">MAIS POPULAR</div>
                        <h3 className="text-3xl font-bold text-gray-900 mb-4">Profissional</h3>
                        <div className="mb-6">
                            <span className="text-5xl font-bold text-gray-900">€29</span>
                            <span className="text-gray-600">/mês</span>
                        </div>
                        <ul className="text-left space-y-3 mb-8">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Produtos e receitas ilimitadas</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Gestão de menu completa</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Alertas AI inteligentes</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Suporte prioritário</span>
                            </li>
                        </ul>
                        <Link href="/auth/register">
                            <Button size="lg" className="w-full bg-orange-500 hover:bg-orange-600">
                                Começar Agora
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20 px-6 bg-gradient-to-br from-orange-500 to-red-600 text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Pronto para reduzir custos e aumentar lucros?
                    </h2>
                    <p className="text-xl mb-8 text-white/90">
                        Junte-se a centenas de restaurantes que já controlam seus custos de forma eficaz
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/auth/register">
                            <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-6 text-lg">
                                Experimente 14 dias grátis
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <img src="/images/logo.png" alt="RCM" className="h-8 w-auto" />
                        <span className="text-xl font-bold text-white">RCM</span>
                    </div>
                    <p className="mb-4">Restaurant Cost Manager - Controle Total dos Seus Custos</p>
                    <div className="flex justify-center gap-6 text-sm">
                        <Link href="/auth/login" className="hover:text-white transition-colors">
                            Entrar
                        </Link>
                        <Link href="/auth/register" className="hover:text-white transition-colors">
                            Registar
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductTemplate {
    nome: string;
    subfamilia_codigo: string;
    unidade: string;
}

export default function OnboardingPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [seedJobId, setSeedJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [templates, setTemplates] = useState<ProductTemplate[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [isSeeding, setIsSeeding] = useState(false);

    // Initial check and fetch templates
    useEffect(() => {
        const init = async () => {
            try {
                // Check if already seeded
                const checkRes = await fetchClient('/onboarding/check');
                if (checkRes.seeded) {
                    // Already seeded, maybe just show dashboard button or go to step 2?
                    // For now, let's assume if they land here and it's seeded, they might want to add products or go to dashboard
                    // Let's just go to step 2 directly if seeded?
                    // But we want to ensure families exist.
                }

                // Fetch templates
                const tplRes = await fetchClient('/onboarding/templates');
                setTemplates(tplRes.products || []);
                // Select all by default
                setSelectedIndices(tplRes.products.map((_: any, i: number) => i));

                setIsLoading(false);
            } catch (error) {
                console.error('Failed to init onboarding', error);
                toast({ title: 'Erro', description: 'Falha ao carregar dados de configuração', variant: 'destructive' });
            }
        };
        init();
    }, []);

    const startSeeding = async (includeProducts: boolean, shouldRedirect: boolean) => {
        setIsSeeding(true);
        try {
            const res = await fetchClient('/onboarding/seed', {
                method: 'POST',
                body: JSON.stringify({
                    includeProducts,
                    productIds: includeProducts ? selectedIndices : []
                })
            });

            if (res.jobId) {
                setSeedJobId(res.jobId);
                pollStatus(res.jobId, shouldRedirect);
            }
        } catch (error) {
            console.error('Seeding failed', error);
            setIsSeeding(false);
            toast({ title: 'Erro', description: 'Falha ao iniciar configuração', variant: 'destructive' });
        }
    };

    const pollStatus = async (jobId: string, shouldRedirect: boolean) => {
        const interval = setInterval(async () => {
            try {
                const status = await fetchClient(`/onboarding/status/${jobId}`);

                if (status.progress) {
                    setProgress(status.progress as number);
                }

                if (status.status === 'completed') {
                    clearInterval(interval);
                    setProgress(100);
                    setIsSeeding(false);
                    if (shouldRedirect) {
                        setTimeout(() => {
                            router.push('/dashboard');
                        }, 1000);
                    }
                } else if (status.status === 'failed') {
                    clearInterval(interval);
                    setIsSeeding(false);
                    toast({ title: 'Erro', description: 'Erro na configuração automática: ' + status.error, variant: 'destructive' });
                }
            } catch (e) {
                console.error(e);
            }
        }, 1000);
    };

    const handleNextStep = () => {
        // Step 1: Confirm start -> triggers structure seeding (and maybe products if selected?)
        // Wait, current design: 
        // Step 1: "Welcome, let's setup". Button "Start".
        // Step 2: "Select Products". Button "Finish".

        if (step === 1) {
            // Just move to step 2 to select products. 
            // We can trigger structure seeding in background NOW to save time?
            // User said: "Passa na mesma a familia e subfamilia para o worker... Os produtos escolhidos podem ser apresentados por familias.."
            // So YES, triggers structure seeding now.
            startSeeding(false, false); // Seed structure only, NO REDIRECT
            setStep(2);
        } else if (step === 2) {
            // "Finish" -> Seed products
            // Since we already triggered structure in step 1, we might need to wait or queue another job?
            // "seed-initial-data" job handles structure + products.
            // If we called it in Step 1, it's running.
            // If we call it AGAIN in Step 2 with products, it will check existing families (idempotent) and then add products.
            // Perfect.
            startSeeding(true, true); // Seed products, THEN REDIRECT
            setStep(3); // Loading screen
        }
    };

    const toggleProduct = (index: number) => {
        setSelectedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Configuração Inicial</CardTitle>
                    <CardDescription>Vamos preparar o Restaurante Cost Manager para si</CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 && (
                        <div className="space-y-6 text-center py-8">
                            <div className="mx-auto bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-10 h-10 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-semibold">Bem-vindo!</h3>
                            <p className="text-slate-600 max-w-md mx-auto">
                                Para começar, vamos criar a estrutura de Famílias e Subfamílias padrão (Carnes, Peixes, Legumes, etc.) para organizar o seu stock.
                            </p>
                            <Button size="lg" onClick={handleNextStep} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">
                                Começar Configuração <ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Adicionar Produtos Iniciais?</h3>
                                    <p className="text-sm text-slate-500">Selecione os produtos que já quer ter criados.</p>
                                </div>
                                <div className="text-sm font-medium text-orange-600">
                                    {selectedIndices.length} selecionados
                                </div>
                            </div>

                            <div className="h-96 overflow-y-auto border rounded-md p-2 space-y-2 bg-white">
                                {templates.map((prod, idx) => (
                                    <div key={idx} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded border-b last:border-0 cursor-pointer" onClick={() => toggleProduct(idx)}>
                                        <Checkbox
                                            id={`prod-${idx}`}
                                            checked={selectedIndices.includes(idx)}
                                            onChange={() => toggleProduct(idx)}
                                        />
                                        <div className="flex-1">
                                            <Label htmlFor={`prod-${idx}`} className="font-medium cursor-pointer">{prod.nome}</Label>
                                            <p className="text-xs text-slate-500">{prod.subfamilia_codigo} • {prod.unidade}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => requestAnimationFrame(() => setSelectedIndices([]))}>Limpar Seleção</Button>
                                <Button onClick={handleNextStep} className="bg-orange-500 hover:bg-orange-600">
                                    Concluir e Ir para Dashboard
                                </Button>
                            </div>
                            <p className="text-xs text-center text-slate-400 mt-2">O processo continuará em segundo plano.</p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 text-center py-8">
                            <h3 className="text-lg font-semibold mb-2">A preparar o seu ambiente...</h3>
                            <Progress value={progress} className="w-full h-3" />
                            <p className="text-sm text-slate-500 mt-2">{progress < 100 ? 'A criar registos...' : 'Tudo pronto!'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

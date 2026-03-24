import React, { useState, useEffect } from "react";
import { fetchClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductTemplate {
    nome: string;
    subfamilia_codigo: string;
    unidade: string;
    vendavel?: boolean;
}

interface ImportFromCatalogModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: () => void;
}

export function ImportFromCatalogModal({ open, onOpenChange, onComplete }: ImportFromCatalogModalProps) {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<ProductTemplate[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (open) {
            loadTemplates();
        } else {
            // Reset state
            setProgress(0);
            setIsSeeding(false);
        }
    }, [open]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const tplRes = await fetchClient('/onboarding/templates');
            setTemplates(tplRes.products || []);
            // Select all by default
            setSelectedIndices((tplRes.products || []).map((_: any, i: number) => i));
        } catch (error) {
            console.error('Failed to load templates', error);
            toast({ title: 'Erro', description: 'Não foi possível carregar a lista base', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleProduct = (index: number) => {
        setSelectedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const startImport = async () => {
        if (selectedIndices.length === 0) return;

        setIsSeeding(true);
        setProgress(5);

        try {
            const res = await fetchClient('/onboarding/seed', {
                method: 'POST',
                body: JSON.stringify({
                    includeProducts: true,
                    productIds: selectedIndices
                })
            });

            if (res.jobId) {
                pollStatus(res.jobId);
            }
        } catch (error) {
            console.error('Import failed', error);
            setIsSeeding(false);
            toast({ title: 'Erro', description: 'Ocorreu um erro ao iniciar a importação', variant: 'destructive' });
        }
    };

    const pollStatus = async (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                const status = await fetchClient(`/onboarding/status/${jobId}`);

                if (status.progress) {
                    setProgress(status.progress as number);
                }

                if (status.status === 'completed') {
                    clearInterval(interval);
                    setProgress(100);

                    setTimeout(() => {
                        toast({ title: 'Sucesso', description: 'Produtos importados com sucesso!' });
                        onComplete();
                        onOpenChange(false);
                    }, 500);
                } else if (status.status === 'failed') {
                    clearInterval(interval);
                    setIsSeeding(false);
                    toast({ title: 'Erro', description: 'A importação falhou: ' + status.error, variant: 'destructive' });
                }
            } catch (e) {
                console.error(e);
            }
        }, 1000);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => (!isSeeding && onOpenChange(o))}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-orange-500" />
                        Importar do Catálogo Padrão
                    </DialogTitle>
                    <DialogDescription>
                        Selecione as mercadorias base para criar automaticamente no seu stock.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-2" />
                        <p className="text-sm text-gray-500">A carregar catálogo base...</p>
                    </div>
                ) : isSeeding ? (
                    <div className="py-8 space-y-4">
                        <h3 className="text-center font-medium">A importar produtos...</h3>
                        <Progress value={progress} className="w-full h-3" />
                        <p className="text-xs text-center text-gray-500">{progress < 100 ? 'Este processo pode demorar alguns segundos' : 'Quase pronto...'}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700">Produtos Disponíveis</span>
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                                {selectedIndices.length} selecionados
                            </span>
                        </div>

                        <div className="border rounded-md overflow-hidden max-h-[350px] overflow-y-auto bg-gray-50">
                            {templates.map((prod, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 p-3 hover:bg-white border-b last:border-0 cursor-pointer transition-colors"
                                    onClick={() => toggleProduct(idx)}
                                >
                                    <Checkbox
                                        id={`import-prod-${idx}`}
                                        checked={selectedIndices.includes(idx)}
                                        onChange={() => toggleProduct(idx)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <Label htmlFor={`import-prod-${idx}`} className="font-medium text-gray-900 cursor-pointer block truncate">
                                            {prod.nome}
                                        </Label>
                                        <p className="text-xs text-gray-500">Código Familiar: {prod.subfamilia_codigo} • Und: {prod.unidade}</p>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    Nenhum produto base encontrado.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIndices([])}
                                disabled={selectedIndices.length === 0}
                            >
                                Limpar Seleção
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIndices(templates.map((_, i) => i))}
                                disabled={selectedIndices.length === templates.length}
                            >
                                Selecionar Todos
                            </Button>
                        </div>
                    </div>
                )}

                {!isSeeding && (
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSeeding}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-orange-500 hover:bg-orange-600 shadow-sm"
                            onClick={startImport}
                            disabled={isSeeding || selectedIndices.length === 0 || isLoading}
                        >
                            Importar Selecionados
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

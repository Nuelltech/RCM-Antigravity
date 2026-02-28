'use client';

import { fetchClient } from '@/lib/api';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, AlertCircle, Loader2, CheckCircle, FileText, XCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/AppLayout';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UploadSalesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [salesImportId, setSalesImportId] = useState<number | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]); // Single file for sales reports
            setError(null);
            setSuccess(false);
            setProgress(0);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
        },
        maxFiles: 1,
        multiple: false
    });

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 10, 90));
            }, 200);

            const data = await fetchClient('/vendas/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            setSalesImportId(data.id);
            setSuccess(true);

            toast({
                title: "Sucesso",
                description: "Relatório de vendas enviado com sucesso. A processar...",
                variant: "default"
            });

            // Redirect after 2 seconds
            setTimeout(() => {
                router.push(`/sales/importacoes`);
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao fazer upload do relatório');
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        setError(null);
        setSuccess(false);
        setProgress(0);
    };

    return (
        <AppLayout>
            <div className="container mx-auto p-6 max-w-4xl">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/sales')}
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    <h1 className="text-3xl font-bold">Importar Relatório de Vendas</h1>
                    <p className="text-muted-foreground">
                        Upload de Z-Reports, relatórios POS ou exports de vendas (PDF/Imagem)
                    </p>
                </div>

                {/* Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Carregar Ficheiro</CardTitle>
                        <CardDescription>
                            Formatos suportados: PDF, JPG, PNG
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Dropzone */}
                        {!file && !success && (
                            <div
                                {...getRootProps()}
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                                    isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                )}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Upload className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-medium">
                                            {isDragActive
                                                ? "Largue o ficheiro aqui..."
                                                : "Arraste e largue o relatório, ou clique para selecionar"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            PDF, JPG ou PNG (até 10MB)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Selected File */}
                        {file && !success && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-8 w-8 text-primary" />
                                        <div>
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={removeFile}
                                        disabled={uploading}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Upload Button */}
                                <Button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="w-full"
                                    size="lg"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            A processar...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Importar Relatório
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Progress */}
                        {uploading && progress > 0 && (
                            <div className="mt-4">
                                <Progress value={progress} className="h-2" />
                                <p className="text-sm text-muted-foreground mt-2 text-center">
                                    {progress}% concluído
                                </p>
                            </div>
                        )}



                        {/* Error */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Como funciona?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium text-xs">
                                1
                            </div>
                            <p><strong>Upload:</strong> Carregue o relatório de vendas (Z-Report, export POS)</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium text-xs">
                                2
                            </div>
                            <p><strong>Processamento IA:</strong> O sistema extrai automaticamente a data, totais, IVA e itens vendidos</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium text-xs">
                                3
                            </div>
                            <p><strong>Matching:</strong> Os itens são automaticamente associados ao menu (ou pode fazer manualmente)</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium text-xs">
                                4
                            </div>
                            <p><strong>Aprovação:</strong> Reveja e aprove para criar os registos de vendas no dashboard</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

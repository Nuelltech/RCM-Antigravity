'use client';

import { fetchClient } from '@/lib/api';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File, AlertCircle, Loader2, CheckCircle, FileText, XCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/AppLayout';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UploadInvoicePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [invoiceId, setInvoiceId] = useState<number | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
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

            const data = await fetchClient('/invoices/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            setInvoiceId(data.id);
            setSuccess(true);

            // Redirect after 2 seconds
            setTimeout(() => {
                router.push(`/invoices/${data.id}`);
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer upload da fatura');
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    // ... rest of the component

    const resetForm = () => {
        setFile(null);
        setError(null);
        setSuccess(false);
        setProgress(0);
        setInvoiceId(null);
    };

    return (
        <AppLayout>
            <div className="container mx-auto p-6 max-w-3xl">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/invoices')}
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    <h1 className="text-3xl font-bold">Importar Fatura</h1>
                    <p className="text-muted-foreground">
                        Faça upload de uma fatura de fornecedor (PDF ou imagem)
                    </p>
                </div>

                {/* Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upload de Ficheiro</CardTitle>
                        <CardDescription>
                            Formatos aceites: PDF, JPG, PNG, WEBP (máx. 10MB)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Drag & Drop Zone */}
                        {!file && !success && (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragActive
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted-foreground/25 hover:border-primary/50'
                                    }`}
                            >
                                <input {...getInputProps()} id="file-upload" />
                                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-lg font-medium mb-2">
                                    Arraste e solte a fatura aqui
                                </p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    ou clique para selecionar
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const fileInput = document.getElementById('file-upload');
                                        if (fileInput) fileInput.click();
                                    }}
                                >
                                    Selecionar Ficheiro
                                </Button>
                            </div>
                        )}

                        {/* Selected File */}
                        {file && !success && (
                            <div className="border rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-10 w-10 text-primary" />
                                        <div>
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    {!uploading && (
                                        <Button variant="ghost" size="sm" onClick={resetForm}>
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Progress */}
                                {uploading && (
                                    <div className="mt-4 space-y-2">
                                        <Progress value={progress} />
                                        <p className="text-sm text-center text-muted-foreground">
                                            {progress < 100
                                                ? 'Fazendo upload e processando...'
                                                : 'Processamento concluído!'}
                                        </p>
                                    </div>
                                )}

                                {/* Upload Button */}
                                {!uploading && (
                                    <Button
                                        className="w-full mt-4"
                                        onClick={handleUpload}
                                        size="lg"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Importar Fatura
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <Alert className="border-green-500 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    <p className="font-medium">Fatura importada com sucesso!</p>
                                    <p className="text-sm mt-1">
                                        A fatura está sendo processada. Redirecionando para revisão...
                                    </p>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Error Message */}
                        {error && (
                            <Alert variant="destructive">
                                <XCircle className="h-4 w-4" />
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
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                1
                            </div>
                            <div>
                                <p className="font-medium">Upload</p>
                                <p className="text-muted-foreground">
                                    Faça upload da fatura em PDF ou imagem
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                2
                            </div>
                            <div>
                                <p className="font-medium">Processamento Automático</p>
                                <p className="text-muted-foreground">
                                    OCR extrai texto, identifica fornecedor, produtos e valores
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                3
                            </div>
                            <div>
                                <p className="font-medium">Matching de Produtos</p>
                                <p className="text-muted-foreground">
                                    Sistema associa automaticamente produtos da fatura ao catálogo
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                4
                            </div>
                            <div>
                                <p className="font-medium">Revisão e Aprovação</p>
                                <p className="text-muted-foreground">
                                    Revise os dados, confirme matches e aprove para criar a compra
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

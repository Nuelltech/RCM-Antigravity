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
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [invoiceId, setInvoiceId] = useState<number | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFiles(acceptedFiles); // Replace current selection
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
            'image/png': ['.png'],
            'image/webp': ['.webp']
        },
        maxFiles: 10,
        multiple: true
    });

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            const formData = new FormData();

            // Append all files with same field name "file" (or "files", backend accepts array via iteration)
            files.forEach(file => {
                formData.append('file', file);
            });

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

            const msg = files.length > 1
                ? 'Faturas unificadas e enviadas com sucesso.'
                : 'Fatura enviada com sucesso.';

            toast({
                title: "Sucesso",
                description: msg,
                variant: "default"
            });

            // Redirect after 2 seconds
            setTimeout(() => {
                // If backend returns a new ID (merged PDF), go to it
                router.push(`/invoices/${data.id}`);
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao fazer upload da fatura');
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const resetForm = () => {
        setFiles([]);
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
                        Faça upload de uma fatura de fornecedor (PDF ou imagem).
                        Suporta múltiplas fotos (serão unificadas).
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
                        {files.length === 0 && !success && (
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
                                    Arraste e solte o(s) ficheiro(s) aqui
                                </p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Pode selecionar várias páginas para uma mesma fatura
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
                                    Selecionar Ficheiro(s)
                                </Button>
                            </div>
                        )}

                        {/* Selected Files List */}
                        {files.length > 0 && !success && (
                            <div className="space-y-3">
                                {files.map((file, idx) => (
                                    <div key={idx} className="border rounded-lg p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded">
                                                <FileText className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        {!uploading && (
                                            <Button variant="ghost" size="sm" onClick={() => removeFile(idx)}>
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}

                                {/* Actions */}
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" onClick={resetForm} disabled={uploading}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleUpload} disabled={uploading}>
                                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {uploading ? 'A enviar...' : files.length > 1 ? `Importar ${files.length} Páginas` : 'Importar Fatura'}
                                    </Button>

                                </div>

                                {/* Progress */}
                                {uploading && (
                                    <div className="mt-4 space-y-2">
                                        <Progress value={progress} />
                                        <p className="text-sm text-center text-muted-foreground">
                                            {progress < 100
                                                ? 'A unificar e enviar ficheiros...'
                                                : 'Processamento concluído!'}
                                        </p>
                                    </div>
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

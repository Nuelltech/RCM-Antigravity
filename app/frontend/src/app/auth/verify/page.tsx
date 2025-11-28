'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetchClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const verifySchema = z.object({
    email: z.string().email('Email inválido'),
    code: z.string().length(6, 'O código deve ter 6 dígitos'),
});

type VerifyInput = z.infer<typeof verifySchema>;

function VerifyPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<VerifyInput>({
        resolver: zodResolver(verifySchema),
    });

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setValue('email', emailParam);
        }
    }, [searchParams, setValue]);

    const onSubmit = async (data: VerifyInput) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await fetchClient('/auth/verify', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            setSuccessMessage('Email verificado com sucesso! Redirecionando para login...');
            setTimeout(() => {
                router.push('/auth/login?verified=true');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Código inválido ou expirado');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Verificar Email</CardTitle>
                    <CardDescription>Insira o código de 6 dígitos enviado para o seu email</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {successMessage && (
                            <Alert className="bg-green-50 text-green-700 border-green-200">
                                <AlertDescription>{successMessage}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register('email')} readOnly={!!searchParams.get('email')} />
                            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="code">Código de Verificação</Label>
                            <Input
                                id="code"
                                {...register('code')}
                                maxLength={6}
                                placeholder="123456"
                                className="text-center text-lg tracking-widest"
                            />
                            {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'A verificar...' : 'Verificar Conta'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-slate-600">
                        Não recebeu o código? <button type="button" className="text-blue-600 hover:underline">Reenviar</button>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">A carregar...</div>}>
            <VerifyPageContent />
        </Suspense>
    );
}

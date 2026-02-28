'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const registerSchema = z.object({
    nome_restaurante: z.string().min(3, 'Nome do restaurante deve ter pelo menos 3 caracteres'),
    nif: z.string().min(9, 'NIF deve ter 9 dígitos').max(9, 'NIF deve ter 9 dígitos'),
    morada: z.string().min(5, 'Morada deve ter pelo menos 5 caracteres'),
    telefone: z.string().min(9, 'Telefone deve ter 9 dígitos').optional(), // Optional for now to avoid breaking but encouraged
    nome_usuario: z.string().min(3, 'Seu nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    slug: z.string().optional(),
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterInput) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchClient('/auth/register', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            // If user already exists, we don't need verification. Redirect to login.
            if (response && response.loginRequired) {
                router.push('/auth/login?message=Restaurant added to your account. Please login with your existing credentials.');
            } else {
                // New user, verification email sent
                router.push(`/auth/verify?email=${encodeURIComponent(data.email)}`);
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao registar');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Registar Restaurante</CardTitle>
                    <CardDescription>Crie sua conta e comece a gerir seu restaurante</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="nome_restaurante">Nome do Restaurante</Label>
                            <Input id="nome_restaurante" {...register('nome_restaurante')} />
                            {errors.nome_restaurante && <p className="text-sm text-red-500">{errors.nome_restaurante.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nif">NIF</Label>
                                <Input id="nif" {...register('nif')} maxLength={9} />
                                {errors.nif && <p className="text-sm text-red-500">{errors.nif.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telefone">Telefone</Label>
                                <Input id="telefone" {...register('telefone')} maxLength={9} />
                                {errors.telefone && <p className="text-sm text-red-500">{errors.telefone.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug (Opcional)</Label>
                            <Input id="slug" {...register('slug')} placeholder="ex: meu-restaurante" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="morada">Morada</Label>
                            <Input id="morada" {...register('morada')} />
                            {errors.morada && <p className="text-sm text-red-500">{errors.morada.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nome_usuario">Seu Nome</Label>
                            <Input id="nome_usuario" {...register('nome_usuario')} />
                            {errors.nome_usuario && <p className="text-sm text-red-500">{errors.nome_usuario.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register('email')} />
                            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input id="password" type="password" {...register('password')} />
                            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'A registar...' : 'Criar Conta'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-slate-600">
                        Já tem uma conta? <Link href="/auth/login" className="text-blue-600 hover:underline">Entrar</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

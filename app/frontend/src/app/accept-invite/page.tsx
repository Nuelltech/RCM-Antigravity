'use client';

import { fetchClient } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Lock, UserCheck } from 'lucide-react';

interface InviteData {
    userInfo: {
        nome: string;
        email: string;
    };
    tenantInfo: {
        nome_restaurante: string;
        role: string;
    };
    hasPassword?: boolean;
}

export default function AcceptInvitePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [validating, setValidating] = useState(true);
    const [inviteData, setInviteData] = useState<InviteData | null>(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            setValidating(false);
            return;
        }

        async function validateToken() {
            try {
                // Should potentially not use auth headers here as user likely not logged in?
                // But fetchClient doesn't harm if no token in localStorage.
                const data = await fetchClient(`/users/validate-invite-token/${token}`);
                setInviteData(data);
            } catch (err) {
                setError('Convite inválido ou expirado');
            } finally {
                setValidating(false);
            }
        }

        validateToken();
    }, [token]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        const isPasswordRequired = !inviteData?.hasPassword;

        // Validation - Password required for new users
        if (isPasswordRequired && (!password || password.length < 6)) {
            setError('Deve definir uma password com no mínimo 6 caracteres');
            return;
        }

        // Validation - Password length if provided (for existing users)
        if (password && password.length < 6) {
            setError('A password deve ter no mínimo 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('As passwords não coincidem');
            return;
        }

        if (!token) {
            setError('Token de convite inválido');
            return;
        }

        setLoading(true);

        try {
            await fetchClient('/users/accept-invite', {
                method: 'POST',
                body: JSON.stringify({
                    token,
                    // Only send password if provided
                    password: password || undefined,
                }),
            });

            setSuccess(true);
            setTimeout(() => {
                router.push('/auth/login');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Erro ao ativar conta. O convite pode ter expirado.');
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <div className="min-h-screen grid lg:grid-cols-2">
                <div className="hidden lg:block relative bg-slate-900">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                </div>
                <div className="flex items-center justify-center p-8">
                    <Card className="w-full max-w-md p-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">Link Inválido</h1>
                            <p className="text-slate-600">
                                O link de convite é inválido ou está incompleto.
                            </p>
                            <Button className="w-full" variant="outline" onClick={() => router.push('/auth/login')}>
                                Voltar ao Login
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (validating) {
        return (
            <div className="min-h-screen grid lg:grid-cols-2">
                <div className="hidden lg:block relative bg-slate-900">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                </div>
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            </div>
        );
    }

    // Determine if password is required based on API response
    const showPasswordOptional = inviteData?.hasPassword;

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="hidden lg:block relative bg-slate-900">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                <div className="absolute top-12 left-12">
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                            <span className="text-2xl font-bold">RCM</span>
                        </div>
                        <span className="text-lg font-medium opacity-90">Restaurante Cost Manager</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center p-8 bg-slate-50">
                <Card className="w-full max-w-md p-8 shadow-xl bg-white border-slate-200/60">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="flex flex-col items-center text-center space-y-6 py-8">
                            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-slate-900">Conta Ativada!</h1>
                                <p className="text-slate-600">
                                    O seu convite foi aceite com sucesso.
                                    <br />
                                    A redirecionar para o login...
                                </p>
                            </div>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2 ring-4 ring-indigo-50/50">
                                <UserCheck className="h-8 w-8" />
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-slate-900">Aceitar Convite</h1>
                                <p className="text-slate-600">
                                    Olá <span className="font-semibold text-slate-900">{inviteData?.userInfo?.nome}</span>!
                                </p>
                                <p className="text-slate-600 text-sm">
                                    Foi convidado para <span className="font-semibold text-slate-900">{inviteData?.tenantInfo?.nome_restaurante}</span> como
                                    <span className="font-medium bg-slate-100 px-2 py-0.5 rounded mx-1 text-slate-800">{inviteData?.tenantInfo?.role}</span>
                                </p>
                            </div>

                            {inviteData?.hasPassword && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2 text-left w-full">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>
                                        Já tem uma conta ativa. Pode escolher manter a sua password atual (deixe em branco) ou definir uma nova.
                                    </span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="w-full space-y-4 text-left pt-2">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">
                                            {showPasswordOptional ? 'Nova Password (opcional)' : 'Defina a sua Password'}
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder={showPasswordOptional ? "Deixe em branco para manter atual" : "Mínimo 6 caracteres"}
                                                className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirmar Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="Confirme a password"
                                                className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 font-medium mt-6 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            <span>A processar...</span>
                                        </div>
                                    ) : (
                                        'Aceitar Convite'
                                    )}
                                </Button>
                            </form>

                            <p className="text-xs text-slate-500 mt-4">
                                Após aceitar, poderá trocar entre restaurantes na TopBar.
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

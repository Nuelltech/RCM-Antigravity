'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <AppLayout>
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="text-center max-w-md">
                    <div className="flex justify-center mb-6">
                        <div className="rounded-full bg-red-100 p-6">
                            <ShieldAlert className="h-16 w-16 text-red-600" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Acesso Negado
                    </h1>

                    <p className="text-gray-600 mb-8">
                        Não tem permissão para aceder a esta página.
                        Se acha que isto é um erro, contacte o administrador do sistema.
                    </p>

                    <div className="flex gap-4 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>

                        <Button
                            onClick={() => router.push('/dashboard')}
                        >
                            Ir para Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

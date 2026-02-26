"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";

const SUCCESS_PATH = "/pagamento/sucesso";

export default function PagamentoSucessoPage() {
    const router = useRouter();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        // Auto-redirect to dashboard after 5 seconds
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push("/dashboard");
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [router]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-6">
                <div className="flex justify-center mb-6">
                    <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Pagamento Confirmado!
                </h1>
                <p className="text-gray-500 mb-6">
                    A sua subscrição foi ativada com sucesso. Bem-vindo ao RCM!
                </p>
                <p className="text-sm text-gray-400">
                    A redirecionar para o dashboard em {countdown}s...
                </p>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="mt-4 text-orange-500 hover:text-orange-600 text-sm font-medium underline"
                >
                    Ir agora →
                </button>
            </div>
        </div>
    );
}

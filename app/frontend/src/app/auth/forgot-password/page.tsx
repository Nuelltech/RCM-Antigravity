"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchClient } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schema for Step 1: Request Code
const requestSchema = z.object({
    email: z.string().email("Email inválido"),
    newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

type RequestForm = z.infer<typeof requestSchema>;

// Schema for Step 2: Verify Code
const verifySchema = z.object({
    code: z.string().length(6, "O código deve ter 6 dígitos"),
});

type VerifyForm = z.infer<typeof verifySchema>;

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Form 1: Request Code
    const {
        register: registerRequest,
        handleSubmit: handleSubmitRequest,
        formState: { errors: errorsRequest },
    } = useForm<RequestForm>({
        resolver: zodResolver(requestSchema),
    });

    // Form 2: Verify Code
    const {
        register: registerVerify,
        handleSubmit: handleSubmitVerify,
        formState: { errors: errorsVerify },
    } = useForm<VerifyForm>({
        resolver: zodResolver(verifySchema),
    });

    const onRequestSubmit = async (data: RequestForm) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await fetchClient("/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email: data.email }),
            });

            setEmail(data.email);
            setNewPassword(data.newPassword);
            setStep(2);
            setSuccess("Código de verificação enviado para o seu email.");
        } catch (err: any) {
            setError(err.message || "Falha ao enviar código.");
        } finally {
            setLoading(false);
        }
    };

    const onVerifySubmit = async (data: VerifyForm) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await fetchClient("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    code: data.code,
                    newPassword,
                }),
            });

            setSuccess("Senha alterada com sucesso! A redirecionar...");
            setTimeout(() => {
                router.push("/auth/login");
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Falha ao redefinir senha.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Left Side - Image (Same as Login) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-100 to-gray-200 items-center justify-center p-12">
                <div className="w-full h-full flex items-center justify-center">
                    <img
                        src="/images/prato-login.png"
                        alt="RCM"
                        className="w-full h-full object-contain drop-shadow-2xl opacity-80"
                    />
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start mb-6">
                            <img src="/images/logo-login.png" alt="RCM" className="h-16 w-auto" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Recuperar Senha
                        </h1>
                        <p className="text-gray-600">
                            {step === 1
                                ? "Insira seu email e a nova senha desejada."
                                : "Insira o código enviado para o seu email."}
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {success && (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleSubmitRequest(onRequestSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="h-12"
                                    {...registerRequest("email")}
                                />
                                {errorsRequest.email && <p className="text-sm text-red-500">{errorsRequest.email.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-12"
                                    {...registerRequest("newPassword")}
                                />
                                {errorsRequest.newPassword && <p className="text-sm text-red-500">{errorsRequest.newPassword.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-12"
                                    {...registerRequest("confirmPassword")}
                                />
                                {errorsRequest.confirmPassword && <p className="text-sm text-red-500">{errorsRequest.confirmPassword.message}</p>}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                                disabled={loading}
                            >
                                {loading ? "A enviar..." : "Enviar Código de Verificação"}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitVerify(onVerifySubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Código de Verificação</label>
                                <Input
                                    type="text"
                                    placeholder="123456"
                                    className="h-12 text-center text-lg tracking-widest"
                                    maxLength={6}
                                    {...registerVerify("code")}
                                />
                                {errorsVerify.code && <p className="text-sm text-red-500">{errorsVerify.code.message}</p>}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                                disabled={loading}
                            >
                                {loading ? "A verificar..." : "Confirmar Alteração"}
                            </Button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-sm text-gray-600 hover:text-gray-900"
                            >
                                Voltar
                            </button>
                        </form>
                    )}

                    <div className="text-center text-sm text-gray-600">
                        <Link href="/auth/login" className="font-medium text-orange-600 hover:text-orange-700">
                            Voltar ao Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

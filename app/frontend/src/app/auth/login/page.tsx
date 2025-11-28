"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchClient } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
    email: z.string().min(1, "Email ou nome de utilizador é obrigatório"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    useEffect(() => {
        if (searchParams.get('registered') === 'true') {
            setSuccess('Registo efetuado com sucesso! Verifique o seu email para ativar a conta.');
        } else if (searchParams.get('verified') === 'true') {
            setSuccess('Email verificado com sucesso! Pode agora fazer login.');
        }
    }, [searchParams]);

    const onSubmit = async (data: LoginForm) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetchClient("/auth/login", {
                method: "POST",
                body: JSON.stringify(data),
            });

            if (response.token) {
                localStorage.setItem("token", response.token);

                // Save tenantId from user data
                if (response.user && response.user.tenant_id) {
                    localStorage.setItem("tenantId", response.user.tenant_id.toString());
                }

                router.push("/dashboard");
            } else {
                setError("Login falhou: Token não recebido");
            }
        } catch (err: any) {
            setError(err.message || "Falha ao fazer login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Left Side - Image */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-100 to-gray-200 items-center justify-center p-12">
                <div className="max-w-md">
                    <img
                        src="/images/prato-login.png"
                        alt="RCM - Restaurant Cost Manager"
                        className="w-full h-auto drop-shadow-2xl"
                    />
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo and Title */}
                    <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
                            <img src="/images/logo.png" alt="RCM" className="h-12 w-auto" />
                            <span className="text-2xl font-bold text-gray-900">RCM</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Acesse sua conta
                        </h1>
                        <p className="text-gray-600">
                            Bem-vindo de volta! Insira seus dados abaixo.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Email ou Nome de Utilizador
                            </label>
                            <Input
                                type="text"
                                placeholder="seu@email.com"
                                className="h-12 text-base"
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-700">
                                    Senha
                                </label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-sm font-medium text-orange-600 hover:text-orange-700"
                                >
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="h-12 text-base"
                                {...register("password")}
                            />
                            {errors.password && (
                                <p className="text-sm text-red-500">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold"
                            disabled={loading}
                        >
                            {loading ? "A entrar..." : "Entrar"}
                        </Button>

                        {/* Register Link */}
                        <div className="text-center text-sm text-gray-600">
                            Novo na RCM?{" "}
                            <Link
                                href="/auth/register"
                                className="font-medium text-orange-600 hover:text-orange-700"
                            >
                                Crie uma conta
                            </Link>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="pt-8 text-center text-xs text-gray-500">
                        © 2025 RCM. Todos os direitos reservados.
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">A carregar...</div>}>
            <LoginPageContent />
        </Suspense>
    );
}

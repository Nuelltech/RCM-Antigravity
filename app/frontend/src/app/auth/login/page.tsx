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
import { wakeUpBackend } from "@/lib/wakeup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TenantSelector } from "@/components/TenantSelector";

const loginSchema = z.object({
    email: z.string().min(1, "Email ou nome de utilizador é obrigatório"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface Tenant {
    id: number;
    nome_restaurante: string;
    slug: string;
    role: string;
}

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showTenantSelector, setShowTenantSelector] = useState(false);
    const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
    const [tempLoginData, setTempLoginData] = useState<any>(null);

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

    useEffect(() => {
        wakeUpBackend();
    }, []);

    const onSubmit = async (data: LoginForm) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetchClient("/auth/login", {
                method: "POST",
                body: JSON.stringify(data),
            });

            if (response.token && response.tenants) {
                // If multiple tenants, show selector
                if (response.tenants.length > 1) {
                    setAvailableTenants(response.tenants);
                    setTempLoginData(response);
                    setShowTenantSelector(true);
                    setLoading(false);
                } else {
                    // Single tenant - proceed directly
                    completLogin(response);
                }
            } else {
                setError("Login falhou: Token não recebido");
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || "Falha ao fazer login");
            setLoading(false);
        }
    };

    const handleTenantSelect = async (tenantId: number) => {
        setLoading(true);
        try {
            // Call switch-tenant to get token for selected tenant
            const response = await fetchClient("/auth/switch-tenant", {
                method: "POST",
                body: JSON.stringify({ tenantId }),
                headers: {
                    Authorization: `Bearer ${tempLoginData.token}`,
                },
            });

            completLogin(response);
        } catch (err: any) {
            setError(err.message || "Falha ao selecionar restaurante");
            setLoading(false);
        }
    };

    const completLogin = (response: any) => {
        localStorage.setItem("token", response.access_token || response.token);

        // Save user data
        if (response.user && response.user.tenant_id) {
            localStorage.setItem("userId", response.user.id.toString());
            localStorage.setItem("tenantId", response.user.tenant_id.toString());
            localStorage.setItem("userName", response.user.nome || "Utilizador");
            localStorage.setItem("userEmail", response.user.email || "");
            localStorage.setItem("userRole", response.user.role || "operador");
        }

        // Save restaurant name
        if (response.tenant) {
            localStorage.setItem("restaurantName", response.tenant.nome_restaurante || "Meu Restaurante");
        }

        // Save tenants list for switcher
        if (response.tenants) {
            localStorage.setItem("userTenants", JSON.stringify(response.tenants));
        } else if (tempLoginData && tempLoginData.tenants) {
            localStorage.setItem("userTenants", JSON.stringify(tempLoginData.tenants));
        }

        // Dispatch custom event to notify components (e.g., Sidebar)
        window.dispatchEvent(new Event("userRoleUpdated"));
        console.log("[Login] Dispatched userRoleUpdated event, role:", response.user?.role);

        // Redirect based on user role
        // Backend now returns English roles, but we keep Portuguese cases for safety/legacy
        const userRole = response.user?.role || "operator";

        // CHECK ONBOARDING STATUS
        // If the backend says it's not seeded (isSeeded === false) and user is Owner/Admin, go to onboarding
        if (response.isSeeded === false && (userRole === 'admin' || userRole === 'owner')) {
            router.push('/onboarding');
            return;
        }

        let redirectPath = "/dashboard"; // Default for admin/manager

        switch (userRole) {
            case "admin":
            case "owner":
            case "manager":
            case "gestor":  // Legacy Portuguese
                redirectPath = "/dashboard";
                break;
            case "operator":
            case "operador": // Legacy Portuguese
                redirectPath = "/recipes";
                break;
            case "viewer":
            case "visualizador": // Legacy Portuguese
                redirectPath = "/menu";
                break;
            default:
                redirectPath = "/recipes";
        }

        router.push(redirectPath);
    };

    if (showTenantSelector) {
        return (
            <div className="flex min-h-screen bg-gray-50 items-center justify-center p-8">
                <TenantSelector
                    tenants={availableTenants}
                    onSelect={handleTenantSelect}
                    loading={loading}
                />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Left Side - Image */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-100 to-gray-200 items-center justify-center p-12">
                <div className="w-full h-full flex items-center justify-center">
                    <img
                        src="/images/prato-login.png"
                        alt="RCM - Restaurant Cost Manager"
                        className="w-full h-full object-contain drop-shadow-2xl"
                    />
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start mb-6">
                            <img src="/images/logo-login.png" alt="RCM" className="h-16 w-auto" />
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

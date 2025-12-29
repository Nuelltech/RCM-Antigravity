"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useInternalAuth } from "@/contexts/InternalAuthContext";

export default function InternalLoginPage() {
    const router = useRouter();
    const { login } = useInternalAuth();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            await login(formData.email, formData.password);
            router.push("/internal/dashboard");
        } catch (err: any) {
            setError(err.message || "Falha no login. Verifique as credenciais.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="w-full max-w-md p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <img src="/images/logo-login.png" alt="RCM" className="h-12 w-auto" />
                        <h1 className="text-3xl font-bold text-white">RCM Internal</h1>
                    </div>
                    <p className="text-slate-400">Acesso à equipa interna</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                        Login
                    </h2>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={isLoading}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none disabled:bg-gray-100"
                                placeholder="seu.email@rcm.internal"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                disabled={isLoading}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none disabled:bg-gray-100"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg disabled:opacity-70"
                        >
                            {isLoading ? "A entrar..." : "Entrar"}
                        </Button>
                    </form>

                    {/* Test Credentials Info */}
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600 font-medium mb-2">Credenciais de teste:</p>
                        <div className="text-xs text-slate-500 space-y-1">
                            <p>Admin: admin@rcm.internal / admin123</p>
                            <p>Marketing: marketing@rcm.internal / marketing123</p>
                            <p>Sales: sales@rcm.internal / sales123</p>
                            <p>Support: support@rcm.internal / support123</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-400 text-sm mt-6">
                    © 2024 RCM - Restaurante Cost Manager
                </p>
            </div>
        </div>
    );
}

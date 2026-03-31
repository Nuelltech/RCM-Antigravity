"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchClient } from "@/lib/api";

const PUBLIC_PATHS = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/accept-invite",
    "/pagamento",
    "/pagamento/sucesso",
];

const AUTH_CACHE_KEY = "auth_validated";
const AUTH_TOKEN_KEY = "auth_validated_token";
// Cache válido por 30 minutos (em ms) — evita chamadas à API em cada navegação
const AUTH_CACHE_DURATION = 30 * 60 * 1000;

function isAuthCacheValid(token: string): boolean {
    try {
        const cachedToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
        const cachedAt = sessionStorage.getItem(AUTH_CACHE_KEY);
        if (!cachedToken || !cachedAt) return false;
        if (cachedToken !== token) return false; // token mudou → re-validar
        const age = Date.now() - parseInt(cachedAt, 10);
        return age < AUTH_CACHE_DURATION;
    } catch {
        return false;
    }
}

function setAuthCache(token: string) {
    try {
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        sessionStorage.setItem(AUTH_CACHE_KEY, Date.now().toString());
    } catch {
        // sessionStorage indisponível (modo privado extremo)
    }
}

function clearAuthCache() {
    try {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_CACHE_KEY);
    } catch { /* ignore */ }
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);
    // Controla se já validamos nesta montagem do componente
    const hasValidated = useRef(false);

    useEffect(() => {
        // Só valida uma vez por montagem do AuthGuard (evita re-validar em cada pathname change)
        if (hasValidated.current) {
            setIsLoading(false);
            return;
        }

        const checkAuth = async () => {
            // Allow access to public paths — sem validação
            if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/accept-invite")) {
                hasValidated.current = true;
                setIsLoading(false);
                return;
            }

            // Internal routes têm sistema de auth próprio
            if (pathname.startsWith("/internal")) {
                hasValidated.current = true;
                setIsLoading(false);
                return;
            }

            // Demo page é pública
            if (pathname === "/demo") {
                hasValidated.current = true;
                setIsLoading(false);
                return;
            }

            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/auth/login");
                return;
            }

            // ✅ PERFORMANCE FIX: Se o token já foi validado recentemente nesta sessão,
            // não re-validar via API. Elimina o spinner em cada navegação.
            if (isAuthCacheValid(token)) {
                console.log("[AuthGuard] Token válido (cache sessionStorage). Skipping API call.");
                hasValidated.current = true;
                setIsLoading(false);
                return;
            }

            // Cache miss → validar com o backend (apenas primeira vez ou após expirar)
            try {
                console.warn(`[AuthGuard] Validating token via API: ${token.substring(0, 10)}...`);
                const response = await fetchClient('/auth/validate');

                if (response && response.isValid) {
                    console.warn("[AuthGuard] Token valid. Caching result.");

                    // Guardar no cache para as próximas navegações
                    setAuthCache(token);

                    // Self-repair: repor dados de sessão em falta
                    if (!localStorage.getItem("userId") || !localStorage.getItem("tenantId")) {
                        console.warn("[AuthGuard] Repairing session from validation data");
                        localStorage.setItem("userId", response.userId.toString());
                        localStorage.setItem("userEmail", response.email);
                        localStorage.setItem("tenantId", response.tenantId.toString());
                        localStorage.setItem("userRole", response.role);
                        if (!localStorage.getItem("userName")) localStorage.setItem("userName", "Utilizador");
                        if (!localStorage.getItem("restaurantName")) localStorage.setItem("restaurantName", "Meu Restaurante");
                        window.dispatchEvent(new Event("userRoleUpdated"));
                    }

                    hasValidated.current = true;
                    setIsLoading(false);
                } else {
                    throw new Error('Invalid token');
                }
            } catch (error) {
                console.error("[AuthGuard] Token inválido ou erro de rede:", error);
                clearAuthCache();
                localStorage.removeItem("token");
                localStorage.removeItem("tenantId");
                localStorage.removeItem("userName");
                localStorage.removeItem("userEmail");
                router.push("/auth/login");
            }
        };

        checkAuth();
        // ✅ PERFORMANCE FIX: Removemos `pathname` das dependências.
        // O AuthGuard só precisa de validar uma vez por montagem do componente,
        // não em cada mudança de URL (que causava o spinner em cada navegação).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Limpar o cache de autenticação — chamar no logout para forçar re-validação no próximo login
 */
export function invalidateAuthCache() {
    clearAuthCache();
}

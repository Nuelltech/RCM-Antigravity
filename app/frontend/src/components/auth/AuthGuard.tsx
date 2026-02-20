"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { API_URL, fetchClient } from "@/lib/api";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/auth/forgot-password", "/accept-invite"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            console.log("AuthGuard: Pathname is", pathname);
            // Allow access to public paths
            if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/accept-invite")) {
                setIsLoading(false);
                return;
            }

            // Allow access to internal routes (separate auth system)
            if (pathname.startsWith("/internal")) {
                setIsLoading(false);
                return;
            }

            // Allow demo page
            if (pathname === "/demo") {
                setIsLoading(false);
                return;
            }

            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/auth/login");
                return;
            }

            // Validate token with backend
            try {
                const tokenStart = token.substring(0, 10) + '...';
                console.warn(`[AuthGuard] Validating token: ${tokenStart}`);

                const response = await fetchClient('/auth/validate');
                console.warn("[AuthGuard] Validation response:", JSON.stringify(response));

                if (response && response.isValid) {
                    console.warn("[AuthGuard] Token valid. Allowing access.");

                    // Self-repair: If localStorage is missing critical user data but token is valid, restore it
                    if (!localStorage.getItem("userId") || !localStorage.getItem("tenantId")) {
                        console.warn("[AuthGuard] repairing session from validation data");
                        localStorage.setItem("userId", response.userId.toString());
                        localStorage.setItem("userEmail", response.email);
                        localStorage.setItem("tenantId", response.tenantId.toString());
                        localStorage.setItem("userRole", response.role);
                        // Default names if missing
                        if (!localStorage.getItem("userName")) localStorage.setItem("userName", "Utilizador");
                        if (!localStorage.getItem("restaurantName")) localStorage.setItem("restaurantName", "Meu Restaurante");

                        window.dispatchEvent(new Event("userRoleUpdated"));
                    }

                    setIsLoading(false);
                } else {
                    console.error("[AuthGuard] Token invalid (isValid false). Redirecting to login. Response:", response);
                    throw new Error('Invalid token');
                }
            } catch (error) {
                // Token is invalid or expired, or network error
                console.error("[AuthGuard] CRITICAL ERROR validating token:", error);
                localStorage.removeItem("token");
                localStorage.removeItem("tenantId");
                localStorage.removeItem("userName");
                localStorage.removeItem("userEmail");
                console.warn("[AuthGuard] Redirecting to /auth/login due to error.");
                router.push("/auth/login");
            }
        };

        checkAuth();
    }, [pathname, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return <>{children}</>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/auth/forgot-password"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            // Allow access to public paths
            if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/")) {
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
                const response = await fetch(`${API_URL}/auth/validate`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    // Token is invalid or expired
                    localStorage.removeItem("token");
                    localStorage.removeItem("tenantId");
                    localStorage.removeItem("userName");
                    localStorage.removeItem("userEmail");
                    router.push("/auth/login");
                    return;
                }

                // Token is valid
                setIsLoading(false);
            } catch (error) {
                // Network error - allow access to avoid blocking users
                // In production, you might want to handle this differently
                console.error("Error validating token:", error);
                setIsLoading(false);
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

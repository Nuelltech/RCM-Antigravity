"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInternalAuth } from "@/contexts/InternalAuthContext";
import { UserRole } from "@/lib/roles";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole | UserRole[];
    requiredPermission?: string;
}

export default function ProtectedRoute({ children, requiredRole, requiredPermission }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, hasRole, checkPermission } = useInternalAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push("/login");
                return;
            }

            // Role Check
            if (requiredRole && !hasRole(requiredRole)) {
                router.push("/dashboard?error=unauthorized"); // Or a dedicated 403 page
                return;
            }

            // Permission Check
            if (requiredPermission && !checkPermission(requiredPermission)) {
                router.push("/dashboard?error=unauthorized");
                return;
            }
        }
    }, [isAuthenticated, isLoading, router, requiredRole, requiredPermission, hasRole, checkPermission]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}

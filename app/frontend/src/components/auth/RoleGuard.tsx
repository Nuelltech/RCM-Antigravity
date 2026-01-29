"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser, UserRole } from "@/hooks/useUser";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    redirectTo?: string;
}

/**
 * RoleGuard - Protects routes based on user role
 * 
 * @param allowedRoles - Array of roles that can access this route
 * @param redirectTo - Where to redirect if user doesn't have required role (default: based on role)
 */
export function RoleGuard({ children, allowedRoles, redirectTo }: RoleGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading, hasRole } = useUser();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            // Not logged in - redirect to login
            router.push("/auth/login");
            return;
        }

        if (!hasRole(allowedRoles)) {
            // User doesn't have required role - redirect based on their role
            const destination = redirectTo || getDefaultRouteForRole(user.role);

            // Only redirect if not already on the destination
            if (pathname !== destination) {
                console.warn(`[RBAC] User role "${user.role}" not allowed on "${pathname}". Redirecting to "${destination}"`);
                router.push(destination);
            }
        }
    }, [user, loading, pathname, router, allowedRoles, redirectTo, hasRole]);

    // Show loading while checking permissions
    if (loading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    // Check if user has required role
    if (!hasRole(allowedRoles)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    // User has required role - render children
    return <>{children}</>;
}

/**
 * Get the default route a user should land on based on their role
 */
function getDefaultRouteForRole(role: UserRole): string {
    switch (role) {
        case "owner":
        case "admin":
        case "manager":
            return "/dashboard";
        case "operador":
            return "/recipes"; // Operators go to recipes
        case "visualizador":
            return "/menu"; // Viewers go to menu
        default:
            return "/recipes";
    }
}

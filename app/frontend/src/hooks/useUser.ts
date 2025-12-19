"use client";

import { useState, useEffect } from "react";

export type UserRole = "admin" | "manager" | "operador" | "visualizador";

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    tenantId: string;
    restaurantName: string;
}

/**
 * Normalize role from backend (Portuguese) to frontend (English)
 * Backend uses: admin, gestor, operador, visualizador
 * Frontend uses: admin, manager, operador, visualizador
 */
function normalizeRole(role: string | null): UserRole {
    if (!role) return "operador";

    // Map Portuguese "gestor" to English "manager"
    if (role === "gestor") return "manager";

    // Validate and return as UserRole
    const validRoles: UserRole[] = ["admin", "manager", "operador", "visualizador"];
    return validRoles.includes(role as UserRole) ? (role as UserRole) : "operador";
}

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = () => {
            try {
                const userId = localStorage.getItem("userId");
                const userName = localStorage.getItem("userName");
                const userEmail = localStorage.getItem("userEmail");
                const userRoleRaw = localStorage.getItem("userRole");
                const tenantId = localStorage.getItem("tenantId");
                const restaurantName = localStorage.getItem("restaurantName");

                if (userId && userRoleRaw && tenantId) {
                    // Normalize role (gestor → manager)
                    const userRole = normalizeRole(userRoleRaw);

                    setUser({
                        id: userId,
                        name: userName || "Utilizador",
                        email: userEmail || "",
                        role: userRole,
                        tenantId: tenantId,
                        restaurantName: restaurantName || "Meu Restaurante",
                    });
                }
            } catch (error) {
                console.error("Error loading user from localStorage:", error);
            } finally {
                setLoading(false);
            }
        };

        loadUser();

        // Listen for storage changes (multi-tab support)
        window.addEventListener("storage", loadUser);
        return () => window.removeEventListener("storage", loadUser);
    }, []);

    const hasRole = (requiredRoles: UserRole[]) => {
        if (!user) return false;
        return requiredRoles.includes(user.role);
    };

    const isAdmin = user?.role === "admin";
    const isManager = user?.role === "manager" || user?.role === "admin";
    const canManageTeam = user?.role === "admin";
    const canEditProducts = user?.role !== "visualizador";
    const canViewFinancials = user?.role === "admin" || user?.role === "manager";

    return {
        user,
        loading,
        hasRole,
        isAdmin,
        isManager,
        canManageTeam,
        canEditProducts,
        canViewFinancials,
    };
}

// Export helper for use outside hook
export { normalizeRole };

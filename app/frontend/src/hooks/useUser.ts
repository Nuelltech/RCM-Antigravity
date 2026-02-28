"use client";

import { useState, useEffect } from "react";

export type UserRole = "owner" | "admin" | "manager" | "operator" | "viewer";

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    tenantId: string;
    restaurantName: string;
}

/**
 * Normalize role from backend (Portuguese/Mixed) to frontend (English)
 * Backend now standardizes on: admin, manager, operator, viewer
 * But we keep mapping for legacy/safety:
 * gestor -> manager
 * operador -> operator
 * visualizador -> viewer
 */
function normalizeRole(role: string | null): UserRole {
    if (!role) return "operator";

    // Map Portuguese to English
    if (role === "gestor") return "manager";
    if (role === "operador") return "operator";
    if (role === "visualizador") return "viewer";

    // Validate and return as UserRole
    const validRoles: UserRole[] = ["owner", "admin", "manager", "operator", "viewer"];
    return validRoles.includes(role as UserRole) ? (role as UserRole) : "operator";
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

                // Debug logs
                console.warn("[useUser] Loading user from storage:", { userId, userRoleRaw, tenantId });

                if (userId && userRoleRaw && tenantId) {
                    // Normalize role (gestor → manager)
                    const userRole = normalizeRole(userRoleRaw);
                    console.warn(`[useUser] Normalized role: ${userRoleRaw} -> ${userRole}`);

                    // Normalize roles (backend uses Portuguese 'gestor', frontend uses 'manager')
                    // The normalizeRole function already handles this mapping.
                    // The following lines are redundant and syntactically incorrect in this context.
                    // const role = user.role === 'gestor' ? 'manager' : (user.role as UserRole);
                    // setUser({ ...user, role: role });

                    setUser({
                        id: userId,
                        name: userName || "Utilizador",
                        email: userEmail || "",
                        role: userRole,
                        tenantId: tenantId,
                        restaurantName: restaurantName || "Meu Restaurante",
                    });
                } else {
                    console.warn("[useUser] Missing required fields in localStorage. User set to null.");
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
        // Listen for same-tab updates (login, profile updates)
        window.addEventListener("userRoleUpdated", loadUser);

        return () => {
            window.removeEventListener("storage", loadUser);
            window.removeEventListener("userRoleUpdated", loadUser);
        };
    }, []);

    const hasRole = (requiredRoles: UserRole[]) => {
        if (!user) return false;
        // Owner has access to everything
        if (user.role === 'owner') return true;
        return requiredRoles.includes(user.role);
    };

    const isAdmin = user?.role === "admin" || user?.role === "owner";
    const isManager = user?.role === "manager" || user?.role === "admin" || user?.role === "owner";
    const canManageTeam = user?.role === "admin" || user?.role === "owner";
    const canEditProducts = user?.role !== "viewer";
    const canViewFinancials = user?.role === "admin" || user?.role === "manager" || user?.role === "owner";

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

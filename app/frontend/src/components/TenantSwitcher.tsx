"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchClient } from "@/lib/api";
import { normalizeRole } from "@/hooks/useUser";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown } from "lucide-react";

interface Tenant {
    id: number;
    nome_restaurante: string;
    slug: string;
    role: string;
}

/**
 * Get the default route for a role
 */
function getDefaultRouteForRole(role: string): string {
    const normalizedRole = normalizeRole(role);

    // normalizedRole already converted "gestor" → "manager"
    switch (normalizedRole) {
        case "admin":
        case "manager":  // includes converted "gestor"
            return "/dashboard";
        case "operador":
            return "/recipes";
        case "visualizador":
            return "/menu";
        default:
            return "/recipes";
    }
}

export function TenantSwitcher() {
    const router = useRouter();
    const [currentTenantName, setCurrentTenantName] = useState("Carregando...");
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Get current tenant name from localStorage
        const tenantName = localStorage.getItem("restaurantName");
        if (tenantName) {
            setCurrentTenantName(tenantName);
        }

        // Load available tenants (would come from auth context in production)
        // For now, we'll fetch from a dedicated endpoint or store in localStorage during login
        const tenantsData = localStorage.getItem("userTenants");
        if (tenantsData) {
            try {
                setTenants(JSON.parse(tenantsData));
            } catch (e) {
                console.error("Failed to parse tenants data");
            }
        }
    }, []);

    const handleSwitch = async (tenantId: number) => {
        setLoading(true);
        try {
            const response = await fetchClient("/auth/switch-tenant", {
                method: "POST",
                body: JSON.stringify({ tenantId }),
            });

            if (response.access_token) {
                // Update token
                localStorage.setItem("token", response.access_token);

                // Update user/tenant data
                localStorage.setItem("userId", response.user.id.toString());
                localStorage.setItem("tenantId", response.tenant.id.toString());
                localStorage.setItem("userName", response.user.nome);
                localStorage.setItem("userEmail", response.user.email);
                localStorage.setItem("userRole", response.user.role);
                localStorage.setItem("restaurantName", response.tenant.nome_restaurante);

                // Notify components about role update (e.g., Sidebar)
                window.dispatchEvent(new Event("userRoleUpdated"));

                // Determine where to redirect based on new role
                const redirectPath = getDefaultRouteForRole(response.user.role);

                console.log(`[Tenant Switch] Switched to tenant ${response.tenant.nome_restaurante}, role: ${response.user.role}, redirecting to: ${redirectPath}`);

                // Navigate to appropriate page for the new role
                window.location.href = redirectPath;
            }
        } catch (error: any) {
            console.error("Failed to switch tenant:", error);
            alert("Erro ao trocar de restaurante: " + (error.message || "Erro desconhecido"));
        } finally {
            setLoading(false);
        }
    };

    // Don't show if only one tenant
    if (tenants.length <= 1) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
                    disabled={loading}
                >
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="hidden md:inline text-sm font-medium text-gray-700">
                        {currentTenantName}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                    Restaurantes Disponíveis
                </div>
                {tenants.map((tenant) => (
                    <DropdownMenuItem
                        key={tenant.id}
                        onClick={() => handleSwitch(tenant.id)}
                        className="flex flex-col items-start py-2 cursor-pointer"
                    >
                        <div className="font-medium text-gray-900">{tenant.nome_restaurante}</div>
                        <div className="text-xs text-gray-500">
                            @{tenant.slug} · {tenant.role}
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

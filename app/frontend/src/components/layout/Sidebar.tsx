"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Package,
    ChefHat,
    Package2,
    PackageOpen,
    MenuSquare,
    ShoppingCart,
    Warehouse,
    BarChart3,
    Building2,
    Bell,
    PieChart,
    Calculator,
    FileText,
    Users,
    TrendingUp
} from "lucide-react";
import { Permission, hasPermission, getCurrentUserRole } from "@/lib/permissions";

interface MenuItem {
    name: string;
    href: string;
    icon: any;
    permission?: Permission; // Optional - if not set, visible to all
}

const menuItems: MenuItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "DASHBOARD_STATS" },
    { name: "Alertas", href: "/alerts", icon: Bell, permission: "ALERTS_VIEW" },
    { name: "Vendas", href: "/sales", icon: BarChart3, permission: "SALES_VIEW" },
    { name: "Importar Vendas", href: "/sales/importacoes", icon: BarChart3, permission: "SALES_VIEW" },
    { name: "Produtos", href: "/products", icon: Package, permission: "PRODUCTS_VIEW" },
    { name: "Receitas", href: "/recipes", icon: ChefHat, permission: "RECIPES_VIEW" },
    { name: "Combos", href: "/combos", icon: Package2, permission: "COMBOS_VIEW" },
    { name: "Formatos de Venda", href: "/template-formatos-venda", icon: PackageOpen, permission: "PRODUCTS_VIEW" },
    { name: "Menu", href: "/menu", icon: MenuSquare, permission: "MENUS_VIEW" },
    { name: "Menu Engineering", href: "/menu-analysis", icon: TrendingUp, permission: "MENUS_VIEW" },
    { name: "Compras", href: "/purchases", icon: ShoppingCart, permission: "PURCHASES_VIEW" },
    { name: "Calculadora", href: "/purchases/calculator", icon: Calculator, permission: "CALCULATOR_VIEW" },
    { name: "Importar Faturas", href: "/invoices", icon: FileText, permission: "INVOICES_IMPORT" },
    { name: "Inventário", href: "/inventory", icon: Warehouse, permission: "INVENTORY_VIEW" },
    { name: "Consumos", href: "/consumos", icon: PieChart, permission: "INVENTORY_VIEW" },
    { name: "Dados do Restaurante", href: "/dados-restaurante", icon: Building2, permission: "SETTINGS_VIEW" },
    { name: "Utilizadores", href: "/users", icon: Users, permission: "USERS_VIEW" },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        // Function to update user role
        const updateUserRole = () => {
            const role = getCurrentUserRole();
            console.log("[Sidebar] Updating user role:", role);
            setUserRole(role);
        };

        // Get user role on mount
        updateUserRole();

        // Listen for storage changes (including from same window)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "userRole" || e.key === null) {
                console.log("[Sidebar] Storage changed, refreshing role");
                updateUserRole();
            }
        };

        // Listen for custom event (for same-window updates)
        const handleUserRoleUpdate = () => {
            console.log("[Sidebar] Custom event triggered, refreshing role");
            updateUserRole();
            setRefreshKey(prev => prev + 1); // Force re-render
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("userRoleUpdated", handleUserRoleUpdate);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("userRoleUpdated", handleUserRoleUpdate);
        };
    }, []);

    // Filter menu items based on permissions
    const visibleMenuItems = menuItems.filter(item => {
        // If no permission required, show to everyone
        if (!item.permission) return true;

        // Check if user has permission
        return hasPermission(userRole, item.permission);
    });

    return (
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-800 bg-[#0f172a] transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
            <div className="flex h-full flex-col">
                {/* Logo and Title */}
                <div className="flex h-16 items-center border-b border-slate-800 px-6">
                    <div className="flex items-center">
                        <img
                            src="/images/logo-sidebar.png"
                            alt="RCM Logo"
                            className="h-10 w-auto"
                        />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {visibleMenuItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                                    ? "bg-orange-600 text-white"
                                    : "text-gray-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Logo */}
                <div className="border-t border-slate-800 p-4">
                    <div className="flex items-center justify-center">
                        <img
                            src="/images/logo-sidebar.png"
                            alt="RCM Logo"
                            className="h-12 w-auto"
                        />
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-400">
                        RCM
                    </p>
                </div>
            </div>
        </aside>
    );
}


"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    Calculator
} from "lucide-react";

const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Alertas", href: "/alerts", icon: Bell },
    { name: "Vendas", href: "/sales", icon: BarChart3 },
    { name: "Produtos", href: "/products", icon: Package },
    { name: "Receitas", href: "/recipes", icon: ChefHat },
    { name: "Combos", href: "/combos", icon: Package2 },
    { name: "Formatos de Venda", href: "/template-formatos-venda", icon: PackageOpen },
    { name: "Menu", href: "/menu", icon: MenuSquare },
    { name: "Compras", href: "/purchases", icon: ShoppingCart },
    { name: "Calculadora", href: "/purchases/calculator", icon: Calculator },
    { name: "Inventário", href: "/inventory", icon: Warehouse },
    { name: "Consumos", href: "/consumos", icon: PieChart },
    { name: "Dados do Restaurante", href: "/dados-restaurante", icon: Building2 },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

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
                    {menuItems.map((item) => {
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
                        Restaurant Cost Manager
                    </p>
                </div>
            </div>
        </aside>
    );
}


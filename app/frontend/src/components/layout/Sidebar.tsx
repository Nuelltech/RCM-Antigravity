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
    BarChart3
} from "lucide-react";

const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Vendas", href: "/sales", icon: BarChart3 },
    { name: "Produtos", href: "/products", icon: Package },
    { name: "Receitas", href: "/recipes", icon: ChefHat },
    { name: "Combos", href: "/combos", icon: Package2 },
    { name: "Formatos de Venda", href: "/formatos-venda", icon: PackageOpen },
    { name: "Menu", href: "/menu", icon: MenuSquare },
    { name: "Compras", href: "/purchases", icon: ShoppingCart },
    { name: "Inventário", href: "/inventory", icon: Warehouse },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
            <div className="flex h-full flex-col">
                {/* Logo and Title */}
                <div className="flex h-16 items-center border-b px-6">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                            <span className="text-sm font-bold text-white">R</span>
                        </div>
                        <span className="text-lg font-semibold">RCM</span>
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
                                    ? "bg-orange-50 text-orange-600"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Logo */}
                <div className="border-t p-4">
                    <div className="flex items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                            <span className="text-lg font-bold text-white">R</span>
                        </div>
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-500">
                        Restaurant Cost Manager
                    </p>
                </div>
            </div>
        </aside>
    );
}

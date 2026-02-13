"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { getIcon } from "@/lib/iconMap";
import { fetchClient } from "@/lib/api";

interface NavigationItem {
    key: string;
    name: string;
    href: string;
    icon: string;
    group: string | null;
    isLocked: boolean;
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [menuItems, setMenuItems] = useState<NavigationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMenuItems() {
            try {
                const data = await fetchClient('/navigation/items');
                setMenuItems(data?.items || []);
                setError(null);
            } catch (err) {
                console.error('Error fetching navigation items:', err);
                setError('Failed to load menu');
            } finally {
                setLoading(false);
            }
        }

        fetchMenuItems();

        // Listen for role/subscription changes that might affect menu
        const handleUserRoleUpdate = () => {
            fetchMenuItems();
        };

        window.addEventListener("userRoleUpdated", handleUserRoleUpdate);
        window.addEventListener("storage", handleUserRoleUpdate);

        return () => {
            window.removeEventListener("userRoleUpdated", handleUserRoleUpdate);
            window.removeEventListener("storage", handleUserRoleUpdate);
        };
    }, []);

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
                    {loading && (
                        <div className="px-3 py-2 text-sm text-gray-400">
                            Carregando menu...
                        </div>
                    )}

                    {error && (
                        <div className="px-3 py-2 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {!loading && !error && menuItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = getIcon(item.icon);

                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${item.isLocked
                                    ? "text-gray-500 opacity-60"
                                    : isActive
                                        ? "bg-orange-600 text-white"
                                        : "text-gray-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                title={item.isLocked ? `Disponível no plano superior - Upgrade necessário` : undefined}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="flex-1">{item.name}</span>
                                {item.isLocked && <Lock className="h-4 w-4 text-orange-400" />}
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

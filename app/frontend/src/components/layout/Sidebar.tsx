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

const NAV_CACHE_KEY = "nav_items_cache";
const NAV_CACHE_TTL = 5 * 60 * 1000; // 5 minutos em ms

function getNavCache(): NavigationItem[] | null {
    try {
        const raw = sessionStorage.getItem(NAV_CACHE_KEY);
        if (!raw) return null;
        const { items, cachedAt } = JSON.parse(raw);
        if (Date.now() - cachedAt > NAV_CACHE_TTL) {
            sessionStorage.removeItem(NAV_CACHE_KEY);
            return null;
        }
        return items;
    } catch {
        return null;
    }
}

function setNavCache(items: NavigationItem[]) {
    try {
        sessionStorage.setItem(NAV_CACHE_KEY, JSON.stringify({ items, cachedAt: Date.now() }));
    } catch { /* ignore */ }
}

function clearNavCache() {
    try {
        sessionStorage.removeItem(NAV_CACHE_KEY);
    } catch { /* ignore */ }
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    // ✅ PERFORMANCE FIX: Inicializar com cache do sessionStorage.
    // Se houver cache válido, o menu aparece IMEDIATAMENTE sem spinner.
    const cachedItems = getNavCache();
    const [menuItems, setMenuItems] = useState<NavigationItem[]>(cachedItems || []);
    const [loading, setLoading] = useState(cachedItems === null); // só mostra loading se não há cache
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMenuItems(forceRefresh = false) {
            // Se não é forceRefresh, verificar cache primeiro
            if (!forceRefresh) {
                const cached = getNavCache();
                if (cached) {
                    setMenuItems(cached);
                    setLoading(false);
                    return;
                }
            }

            // Cache miss ou refresh forçado → chamar API
            try {
                const data = await fetchClient('/navigation/items');
                const items = data?.items || [];
                setMenuItems(items);
                setNavCache(items); // guardar no cache
                setError(null);
            } catch (err) {
                console.error('Error fetching navigation items:', err);
                setError('Failed to load menu');
            } finally {
                setLoading(false);
            }
        }

        // Na montagem, buscar apenas se não há cache
        if (!getNavCache()) {
            fetchMenuItems();
        } else {
            setLoading(false);
        }

        // Quando role ou subscription muda → limpar cache e recarregar
        const handleUserRoleUpdate = () => {
            clearNavCache();
            fetchMenuItems(true);
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

                        if (item.isLocked) {
                            return (
                                <div
                                    key={item.key}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-gray-500 opacity-60 cursor-not-allowed"
                                    title="Disponível no plano superior - Upgrade necessário"
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="flex-1">{item.name}</span>
                                    <Lock className="h-4 w-4 text-orange-400" />
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                                    ? "bg-orange-600 text-white"
                                    : "text-gray-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="flex-1">{item.name}</span>
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

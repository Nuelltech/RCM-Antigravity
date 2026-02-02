"use client";

import { useInternalAuth } from "@/contexts/InternalAuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, LineChart, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function InternalLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useInternalAuth();
    const pathname = usePathname();

    const navigation = [
        { name: "Dashboard", href: "/internal/dashboard", icon: LayoutDashboard },
        { name: "Leads", href: "/internal/leads", icon: Users },
        { name: "Analytics", href: "/internal/analytics", icon: LineChart },
        { name: "Settings", href: "/internal/settings", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <img src="/images/logo-login.png" alt="RCM" className="h-8 w-auto" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">RCM Internal</h1>
                            <p className="text-xs text-slate-500">Admin Dashboard</p>
                        </div>
                    </div>

                    {/* User Info & Logout */}
                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                <p className="text-xs text-slate-500">{user.role}</p>
                            </div>
                        )}
                        <Button
                            onClick={logout}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-64px)]">
                    <nav className="p-4 space-y-2">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? "bg-orange-50 text-orange-600 font-medium"
                                        : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

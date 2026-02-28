"use client";

import { useInternalAuth } from "@/contexts/InternalAuthContext";
import { useRouter } from "next/navigation";
import { Home, Users, Building2, LayoutDashboard, LogOut, Menu, X, Activity, Headset, Shield } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { UserRole } from "@/lib/roles";

interface LayoutProps {
    children: React.ReactNode;
}

export default function InternalLayout({ children }: LayoutProps) {
    const { user, logout, hasRole } = useInternalAuth();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.SALES_SUPPORT, UserRole.SALES] },
        { name: "Leads", href: "/leads", icon: Users, roles: [UserRole.ADMIN, UserRole.SALES] },
        { name: "Users", href: "/users", icon: Users, roles: [UserRole.ADMIN] },
        { name: "Roles", href: "/settings/roles", icon: Shield, roles: [UserRole.ADMIN] },
        { name: "System", href: "/system", icon: Activity, roles: [UserRole.ADMIN, UserRole.SALES_SUPPORT] },
        { name: "Support", href: "/support/tenants", icon: Headset, roles: [UserRole.ADMIN, UserRole.SALES_SUPPORT] },
    ];

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-screen transition-transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    } w-64 bg-slate-900`}
            >
                <div className="h-full flex flex-col">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">R</span>
                            </div>
                            <div>
                                <h1 className="text-white font-bold text-lg">RCM</h1>
                                <p className="text-xs text-slate-400">Internal Portal</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {navigation.map((item) => {
                            // Filter logic
                            // Normalize role to ensure case-insensitive comparison
                            const userRole = (user?.role || '').toUpperCase();
                            // We need to compare with the Enum values which are typically uppercase
                            const allowedRoles = item.roles.map(r => r.toUpperCase());

                            if (!allowedRoles.includes(userRole)) {
                                return null;
                            }

                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-slate-300 hover:bg-slate-800 hover:text-white"
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Info */}
                    <div className="p-4 border-t border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`transition-all ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
                {/* Top Bar */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
                            </div>
                            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}

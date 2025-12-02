"use client";

import { useRouter } from "next/navigation";
import { Menu, Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
    onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("tenantId");
        router.push("/auth/login");
    };

    // Get user info from localStorage or context
    const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') || 'Utilizador' : 'Utilizador';
    const restaurantName = typeof window !== 'undefined' ? localStorage.getItem('restaurantName') || 'Meu Restaurante' : 'Meu Restaurante';

    return (
        <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b bg-white lg:left-64">
            <div className="flex h-full items-center justify-between px-4 lg:px-6">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <h1 className="text-lg font-semibold text-gray-900">{restaurantName}</h1>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
                        <Bell className="h-5 w-5" />
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
                    </button>

                    {/* User Info */}
                    <div className="flex items-center gap-3 border-l pl-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                            <User className="h-4 w-4" />
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium text-gray-900">{userName}</p>
                            <p className="text-xs text-gray-500">{typeof window !== 'undefined' ? localStorage.getItem('userEmail') || 'utilizador@rcm.com' : 'utilizador@rcm.com'}</p>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="gap-2 text-gray-600 hover:text-red-600"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden md:inline">Sair</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}

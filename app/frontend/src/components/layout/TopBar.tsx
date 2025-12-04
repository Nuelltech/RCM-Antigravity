"use client";

import { useRouter } from "next/navigation";
import { Menu, Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface TopBarProps {
    onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    const router = useRouter();
    const [userName, setUserName] = useState('Utilizador');
    const [userEmail, setUserEmail] = useState('utilizador@rcm.com');
    const [restaurantName, setRestaurantName] = useState('Meu Restaurante');

    useEffect(() => {
        // Load user data only on client side
        setUserName(localStorage.getItem('userName') || 'Utilizador');
        setUserEmail(localStorage.getItem('userEmail') || 'utilizador@rcm.com');
        setRestaurantName(localStorage.getItem('restaurantName') || 'Meu Restaurante');
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("tenantId");
        router.push("/auth/login");
    };

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
                            <p className="text-xs text-gray-500">{userEmail}</p>
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

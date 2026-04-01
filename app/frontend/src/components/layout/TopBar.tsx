"use client";

import { useRouter } from "next/navigation";
import { Menu, Bell, LogOut, User, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { useState, useEffect, useRef } from "react";
import { useSystemActivity } from "@/hooks/use-system-activity";
import { Progress } from "@/components/ui/progress";

interface TopBarProps {
    onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    const router = useRouter();
    const [userName, setUserName] = useState('Utilizador');
    const [userEmail, setUserEmail] = useState('utilizador@rcm.com');
    const [restaurantName, setRestaurantName] = useState('Meu Restaurante');
    const [showActivityPopover, setShowActivityPopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    const { jobs, hasActiveJobs, recentlyCompleted } = useSystemActivity();

    const updateState = () => {
        setUserName(localStorage.getItem('userName') || 'Utilizador');
        setUserEmail(localStorage.getItem('userEmail') || 'utilizador@rcm.com');
        setRestaurantName(localStorage.getItem('restaurantName') || 'Meu Restaurante');
    };

    useEffect(() => {
        updateState();
        window.addEventListener('storage', updateState);
        window.addEventListener('userRoleUpdated', updateState);
        window.addEventListener('tenantUpdated', updateState);
        return () => {
            window.removeEventListener('storage', updateState);
            window.removeEventListener('userRoleUpdated', updateState);
            window.removeEventListener('tenantUpdated', updateState);
        };
    }, []);

    // Close popover on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setShowActivityPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("tenantId");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userRole");
        localStorage.removeItem("restaurantName");
        try {
            sessionStorage.removeItem("auth_validated");
            sessionStorage.removeItem("auth_validated_token");
            sessionStorage.removeItem("nav_items_cache");
            sessionStorage.removeItem("subscription_features_cache");
            Object.keys(sessionStorage)
                .filter(k => k.startsWith("onboarding_seeded_"))
                .forEach(k => sessionStorage.removeItem(k));
        } catch { /* ignore */ }
        router.push("/auth/login");
    };

    const showIndicator = hasActiveJobs || recentlyCompleted;

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
                <div className="flex items-center gap-2">
                    {/* Tenant Switcher */}
                    <TenantSwitcher />

                    {/* System Activity Indicator */}
                    {showIndicator && (
                        <div ref={popoverRef} className="relative">
                            <button
                                onClick={() => setShowActivityPopover(v => !v)}
                                className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                                    hasActiveJobs
                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                }`}
                                title={hasActiveJobs ? 'Recálculo em curso' : 'Recálculo concluído'}
                            >
                                {hasActiveJobs ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline">
                                    {hasActiveJobs ? 'A atualizar...' : 'Atualizado'}
                                </span>
                                {hasActiveJobs && jobs.length > 0 && (
                                    <span className="ml-0.5 tabular-nums">
                                        {Math.round(jobs[0].progress)}%
                                    </span>
                                )}
                            </button>

                            {/* Popover */}
                            {showActivityPopover && (
                                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border bg-white shadow-lg z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b bg-gray-50">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Atividade do Sistema
                                        </p>
                                    </div>
                                    {hasActiveJobs ? (
                                        <div className="divide-y">
                                            {jobs.map(job => (
                                                <div key={job.id} className="px-4 py-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <RefreshCw className="h-3.5 w-3.5 text-amber-500 animate-spin flex-shrink-0" />
                                                            <span className="text-sm font-medium text-gray-800">
                                                                Recalculando margens
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-semibold text-amber-600 tabular-nums">
                                                            {Math.round(job.progress)}%
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={job.progress}
                                                        className="h-1.5 bg-amber-100"
                                                    />
                                                    <p className="text-[11px] text-gray-400">
                                                        Iniciado às {new Date(job.started_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                                        {job.fatura_id ? ` · Fatura #${job.fatura_id}` : ''}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-4 flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">
                                                    Recálculo concluído
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Todos os preços e margens estão atualizados.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notifications */}
                    <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
                        <Bell className="h-5 w-5" />
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
                    </button>

                    {/* User Info */}
                    <button
                        onClick={() => router.push('/profile')}
                        className="flex items-center gap-3 border-l pl-4 hover:bg-gray-50 rounded-lg transition-colors p-2 -m-2"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                            <User className="h-4 w-4" />
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-gray-900">{userName}</p>
                            <p className="text-xs text-gray-500">{userEmail}</p>
                        </div>
                    </button>

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

'use client';

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useInvoiceNotifications } from "@/hooks/use-invoice-notifications";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { startPolling } = useInvoiceNotifications();

    // Start global notification polling when app mounts
    useEffect(() => {
        startPolling();
    }, [startPolling]);

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} />

            <main className={`transition-all duration-300 pt-16 ${isMobileMenuOpen ? 'lg:ml-64' : 'lg:ml-64'} ml-0`}>
                <div className="p-4 lg:p-8 overflow-x-hidden">
                    {children}
                </div>
            </main>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}

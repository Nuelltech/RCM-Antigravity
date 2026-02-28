'use client';

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useInvoiceNotifications } from "@/hooks/use-invoice-notifications";

interface AppLayoutProps {
    children: React.ReactNode;
}

import { TrialBanner } from "./TrialBanner";

export function AppLayout({ children }: AppLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
                <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} />
                <div className="pt-16 flex-1 flex flex-col">
                    <TrialBanner />
                    <div className="p-4 lg:p-8 overflow-x-hidden flex-1">
                        {children}
                    </div>
                </div>
            </div>

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

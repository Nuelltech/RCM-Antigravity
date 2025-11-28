"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <TopBar />
            <main className="ml-64 pt-16">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInternalAuth } from "@/contexts/InternalAuthContext";

export default function InternalProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useInternalAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/internal/login");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    <p className="mt-4 text-slate-600">A carregar...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}

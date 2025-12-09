"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/auth/forgot-password"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = () => {
            // Allow access to public paths
            if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/")) {
                setIsLoading(false);
                return;
            }

            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/auth/login");
            } else {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [pathname, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return <>{children}</>;
}

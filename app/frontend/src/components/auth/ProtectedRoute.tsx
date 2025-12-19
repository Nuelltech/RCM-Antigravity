'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Permission, hasPermission, getCurrentUserRole } from '@/lib/permissions';

interface ProtectedRouteProps {
    children: React.ReactNode;
    permission: Permission;
    fallbackUrl?: string;
}

/**
 * Component to protect routes based on permissions
 * Redirects to unauthorized page if user lacks permission
 */
export function ProtectedRoute({
    children,
    permission,
    fallbackUrl = '/unauthorized'
}: ProtectedRouteProps) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const role = getCurrentUserRole();

        if (!hasPermission(role, permission)) {
            router.push(fallbackUrl);
            return;
        }

        setIsAuthorized(true);
        setIsLoading(false);
    }, [permission, fallbackUrl, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">A verificar permissões...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return <>{children}</>;
}

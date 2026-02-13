"use client";

import { RoleGuard } from '@/components/auth/RoleGuard';

export default function SubscriptionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RoleGuard allowedRoles={['admin']}>
            {children}
        </RoleGuard>
    );
}

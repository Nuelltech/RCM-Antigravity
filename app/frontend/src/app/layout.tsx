import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthGuard } from "@/components/auth/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "RCM",
    description: "SaaS Multi-Tenant for Restaurant Management",
    icons: {
        icon: '/images/logo-sidebar.png',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthGuard>{children}</AuthGuard>
            </body>
        </html>
    );
}

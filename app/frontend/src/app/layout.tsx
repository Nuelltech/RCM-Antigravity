import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "RCM - Restaurant Cost Manager | Controlo de CMV e Margens",
    description: "O RCM ajuda restaurantes e hotéis a controlar custos reais, CMV e margens por receita. Saiba onde ganha e perde dinheiro e tome decisões baseadas em dados.",
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
                <AuthGuard>
                    <SubscriptionProvider>
                        {children}
                    </SubscriptionProvider>
                </AuthGuard>
                <Toaster />
            </body>
        </html>
    );
}

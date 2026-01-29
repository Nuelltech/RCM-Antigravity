import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { InternalAuthProvider } from "@/contexts/InternalAuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "RCM Internal Portal",
    description: "Internal administration portal for RCM team",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt">
            <body className={inter.className}>
                <InternalAuthProvider>
                    {children}
                    <Toaster position="top-right" />
                </InternalAuthProvider>
            </body>
        </html>
    );
}

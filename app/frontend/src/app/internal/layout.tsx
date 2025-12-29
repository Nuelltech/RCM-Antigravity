import { InternalAuthProvider } from "@/contexts/InternalAuthContext";

export default function InternalRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <InternalAuthProvider>
            {children}
        </InternalAuthProvider>
    );
}

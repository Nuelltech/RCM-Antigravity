import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-4xl font-bold mb-8">Restaurante Cost Manager</h1>
            <p className="text-xl mb-8 text-center max-w-2xl">
                Control your costs, manage inventory, and boost profitability with AI-powered insights.
            </p>
            <div className="flex gap-4">
                <Link href="/auth/login">
                    <Button size="lg">Login</Button>
                </Link>
                <Link href="/auth/register">
                    <Button variant="outline" size="lg">Register Restaurant</Button>
                </Link>
            </div>
        </main>
    );
}

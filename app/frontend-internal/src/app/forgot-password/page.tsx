"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";


export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Using public endpoint, no auth header needed but apiRequest usually handles it
            // We'll use fetch directly or apiRequest if it handles public
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/internal/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!response.ok) throw new Error('Request failed');

            setIsSuccess(true);
        } catch (err) {
            // We verify don't show specific errors for security usually, 
            // but for internal tools, showing "Network Error" is okay.
            // On success true, we show success message.
            setIsSuccess(true); // Don't block UI if backend fails silently or not
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 w-full absolute top-0 left-0" />

                <div className="p-8">
                    <div className="mb-6 text-center">
                        <Link href="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-orange-600 mb-6 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back to Login
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Recovery Password</h1>
                        <p className="text-slate-600 mt-2 text-sm">
                            Enter your email to receive recovery instructions.
                        </p>
                    </div>

                    {isSuccess ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Check your inbox</h3>
                            <p className="text-slate-600 text-sm mb-6">
                                If an account exists for <strong>{email}</strong>, we've sent instructions to reset your password.
                            </p>
                            <Link href="/login" className="block w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all text-center">
                                Return to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                        placeholder="user@nuelltech.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Send Instructions"
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

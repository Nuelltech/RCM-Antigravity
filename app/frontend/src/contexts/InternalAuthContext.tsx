"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { internalAuthService, InternalUser } from '@/services/internal-auth.service';

interface InternalAuthContextType {
    user: InternalUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const InternalAuthContext = createContext<InternalAuthContextType | undefined>(undefined);

export function InternalAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<InternalUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const initAuth = async () => {
            const token = internalAuthService.getToken();
            if (token) {
                try {
                    const userData = await internalAuthService.getMe();
                    setUser(userData);
                } catch (error) {
                    // Token is invalid, clean up
                    internalAuthService.logout();
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await internalAuthService.login({ email, password });
        setUser(response.user);
    };

    const logout = () => {
        setUser(null);
        internalAuthService.logout();
    };

    const refreshUser = async () => {
        const userData = await internalAuthService.getMe();
        setUser(userData);
    };

    return (
        <InternalAuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </InternalAuthContext.Provider>
    );
}

export function useInternalAuth() {
    const context = useContext(InternalAuthContext);
    if (context === undefined) {
        throw new Error('useInternalAuth must be used within InternalAuthProvider');
    }
    return context;
}

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './auth';
import { View, ActivityIndicator, Text } from 'react-native';
import { theme } from '../ui/theme';

export function useProtectedRoute() {
    const { isAuthenticated, isLoading, user } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
            console.log('[ProtectedRoute] Loading session...');
            return; // Wait for session check
        }

        const inAuthGroup = segments[0] === '(auth)';
        console.log('[ProtectedRoute] Auth check:', {
            isAuthenticated,
            segments,
            inAuthGroup,
            hasUser: !!user
        });

        if (!isAuthenticated && !inAuthGroup) {
            // Redirect to login if not authenticated and trying to access protected routes
            console.log('[ProtectedRoute] Redirecting to login - not authenticated');
            router.replace('/(auth)/login');
        } else if (isAuthenticated && inAuthGroup) {
            // Redirect to dashboard if authenticated and on login screen
            console.log('[ProtectedRoute] Redirecting to dashboard - already authenticated');
            router.replace('/(tabs)/dashboard');
        }
    }, [isAuthenticated, isLoading, segments]);

    return { isLoading };
}

export function ProtectedRouteWrapper({ children }: { children: React.ReactNode }) {
    const { isLoading } = useProtectedRoute();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.backgroundDark }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ color: theme.colors.textLight, marginTop: 16 }}>A verificar sessão...</Text>
            </View>
        );
    }

    return <>{children}</>;
}

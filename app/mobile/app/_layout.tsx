
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { View, Text } from 'react-native';

// Import global CSS for NativeWind
import '../global.css';

export default function RootLayout() {
    const { isAuthenticated, isLoading, checkSession } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        checkSession();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (isAuthenticated && (inAuthGroup || segments.length === 0)) {
            // User is signed in but on auth screen OR at root -> redirect to tabs
            router.replace('/(tabs)/dashboard');
        } else if (!isAuthenticated && !inAuthGroup) {
            // User is not signed in and not on auth screen -> redirect to login
            router.replace('/(auth)/login');
        }
    }, [isAuthenticated, segments, isLoading]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-slate-900">
                <Text className="text-white">Loading...</Text>
            </View>
        );
    }

    return <Slot />;
}

import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { wakeup } from '../lib/api';

export default function Index() {
    const { isAuthenticated, isLoading } = useAuth();

    const [isWakingUp, setIsWakingUp] = useState(true);
    const [wakeupAttempt, setWakeupAttempt] = useState(0);

    useEffect(() => {
        const init = async () => {
            if (isAuthenticated) {
                // If authenticated, we still might want to check connectivity briefly
                // But for now let's trust the token and let dashboard load (which will retry if needed)
                // Actually, if backend is cold, dashboard will hang loading data.
                // Better to wakeup first.
                checkBackend();
            } else if (!isLoading) {
                // Not authenticated and not loading auth -> go to login
                setIsWakingUp(false);
            }
        };
        init();
    }, [isAuthenticated, isLoading]);

    const checkBackend = async () => {
        try {
            const awake = await wakeup();
            if (awake) {
                setIsWakingUp(false);
            } else {
                // If wakeup failed even after retries (managed in wakeup/api), 
                // we might want to show a retry button or just proceed and let page error out.
                // Let's retry nicely a few times or show error.
                if (wakeupAttempt < 1) {
                    setWakeupAttempt(prev => prev + 1);
                    checkBackend(); // Retry once more
                } else {
                    setIsWakingUp(false); // Give up and let router proceed (likely to dashboard or login)
                }
            }
        } catch (e) {
            setIsWakingUp(false);
        }
    };

    if (isLoading || isWakingUp) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
                <Image
                    source={require('../assets/images/RCM_Short_logo_1000_Laranja-cutout_1x1.png')}
                    style={{ width: 120, height: 120, marginBottom: 24 }}
                    resizeMode="contain"
                />
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={{ color: 'white', marginTop: 20, fontSize: 16 }}>Loading...</Text>
                {wakeupAttempt > 0 && (
                    <Text style={{ color: '#94a3b8', marginTop: 10, fontSize: 12 }}>A acordar servidor...</Text>
                )}
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/dashboard" />;
    }

    return <Redirect href="/(auth)/login" />;
}

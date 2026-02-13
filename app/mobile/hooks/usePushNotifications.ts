
import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ApiService } from '../services/api.service';
import { useAuth } from '../lib/auth';
import { router } from 'expo-router';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        // DEBUG ALERT
        alert(`Push Status: ${finalStatus}`);

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            alert('Failed to get permissions!');
            return;
        }

        // Project ID from app.json
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        // DEBUG ALERT
        if (!projectId) alert('Project ID Missing!');

        try {
            token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;
            // DEBUG ALERT
            alert(`Token Got: ${token?.substring(0, 10)}...`);
        } catch (e: any) {
            console.error("Error getting push token:", e);
            alert(`Error Token: ${e.message}`);
        }
    } else {
        alert('Must use physical device for Push Notifications');
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export const usePushNotifications = () => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;

        registerForPushNotificationsAsync().then(token => {
            setExpoPushToken(token);
            if (token) {
                // Send token to backend
                // We need to implement this method in ApiService or call axios directly
                // Assuming ApiService has generic support or we extend it
                // For now, let's assume we need to extend ApiService or use axios from it
                console.log("Got push token:", token);
                // Call backend
                ApiService.registerPushToken(token).catch(console.error);
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response:', response);
            const data = response.notification.request.content.data;

            if (data?.type === 'INVOICE_REPORT_READY' && data?.invoiceId) {
                router.push({
                    pathname: '/financial/invoices/report',
                    params: { invoiceId: data.invoiceId.toString() }
                });
            }
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [isAuthenticated]);

    return {
        expoPushToken,
        notification
    };
};

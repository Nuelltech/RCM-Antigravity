/**
 * Notification Service
 * Centralizes all notification logic (local and push)
 * 
 * Usage:
 *   await NotificationService.setup();
 *   await NotificationService.sendLocal('Título', 'Mensagem');
 *   const token = await NotificationService.getPushToken();
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class NotificationService {
    /**
     * Setup notification handler (call once at app startup)
     */
    static async setup() {
        // Configure how notifications are displayed when app is in foreground
        await Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });

        // Request permissions on iOS
        if (Platform.OS === 'ios') {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Notification permissions not granted');
            }
        }
    }

    /**
     * Send a local notification immediately
     */
    static async sendLocal(title: string, body: string, data?: any) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data || {},
            },
            trigger: null, // null = immediate
        });
    }

    /**
     * Schedule a notification for later
     */
    static async scheduleNotification(
        title: string,
        body: string,
        triggerDate: Date,
        data?: any
    ) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data || {},
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        });
    }

    /**
     * Get push notification token (for registering with backend)
     */
    static async getPushToken() {
        try {
            const { data: token } = await Notifications.getExpoPushTokenAsync();
            return token;
        } catch (error) {
            console.error('Failed to get push token:', error);
            return null;
        }
    }

    /**
     * Cancel all scheduled notifications
     */
    static async cancelAll() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }

    /**
     * Listen for notification received while app is in foreground
     */
    static addNotificationReceivedListener(callback: (notification: any) => void) {
        return Notifications.addNotificationReceivedListener(callback);
    }

    /**
     * Listen for notification tapped/clicked
     */
    static addNotificationResponseReceivedListener(callback: (response: any) => void) {
        return Notifications.addNotificationResponseReceivedListener(callback);
    }

    /**
     * Notification presets for common use cases
     */
    static async notifyInvoiceProcessed(invoiceId: number) {
        await this.sendLocal(
            'Fatura Processada',
            'A fatura foi processada e está pronta para revisão.',
            { type: 'invoice', invoiceId }
        );
    }

    static async notifyCriticalAlert(message: string) {
        await this.sendLocal(
            '⚠️ Alerta Crítico',
            message,
            { type: 'critical_alert' }
        );
    }

    static async notifyInventoryClosed(sessionName: string) {
        await this.sendLocal(
            'Inventário Concluído',
            `O inventário "${sessionName}" foi fechado com sucesso.`,
            { type: 'inventory' }
        );
    }
}

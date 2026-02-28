import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../core/database';

export class NotificationService {
    private expo: Expo;

    constructor() {
        this.expo = new Expo();
    }

    /**
     * Send push notification to a user
     */
    async sendToUser(userId: number, title: string, body: string, data?: any) {
        // Find all active sessions for the user that have a push token
        const sessions = await prisma.session.findMany({
            where: {
                user_id: userId,
                push_token: { not: null },
                revoked: false,
                expires_at: { gt: new Date() }
            },
            select: { push_token: true }
        });

        const tokens = sessions
            .map(s => s.push_token)
            .filter(token => token && Expo.isExpoPushToken(token)) as string[];

        if (tokens.length === 0) {
            console.log(`[Notification] No valid push tokens found for user ${userId}`);
            return;
        }

        // Deduplicate tokens
        const uniqueTokens = [...new Set(tokens)];

        const messages: ExpoPushMessage[] = uniqueTokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data,
        }));

        const chunks = this.expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('[Notification] Error sending chunks', error);
            }
        }

        console.log(`[Notification] Sent ${uniqueTokens.length} notifications to user ${userId}`);
    }
}

export const notificationService = new NotificationService();

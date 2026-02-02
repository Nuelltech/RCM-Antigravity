import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export class BiometricService {
    static async isAvailable(): Promise<boolean> {
        if (Platform.OS === 'web') return false;

        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            return hasHardware && isEnrolled;
        } catch (e) {
            console.error('[Biometric] Availability check failed', e);
            return false;
        }
    }

    static async authenticate(reason: string = 'Login to RCM'): Promise<boolean> {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: reason,
                fallbackLabel: 'Use Password',
            });
            return result.success;
        } catch (e) {
            console.error('[Biometric] Authentication failed', e);
            return false;
        }
    }

    static async saveCredentials(email: string, token: string, user: any): Promise<void> {
        if (Platform.OS === 'web') return;

        try {
            const data = JSON.stringify({ email, token, user });
            await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, data);
        } catch (e) {
            console.error('[Biometric] Failed to save credentials', e);
        }
    }

    static async getCredentials(): Promise<{ email: string, token: string, user: any } | null> {
        if (Platform.OS === 'web') return null;

        try {
            const data = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.error('[Biometric] Failed to get credentials', e);
            return null;
        }
    }

    static async clearCredentials(): Promise<void> {
        if (Platform.OS === 'web') return;
        await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    }
}

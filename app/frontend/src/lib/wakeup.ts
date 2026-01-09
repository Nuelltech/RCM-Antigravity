/**
 * Backend Wake-up Service
 * 
 * Sends a ping to the backend to prevent cold start on login page
 */

// Client-side: Always use relative path to use proxy
const BACKEND_URL = '';

const PING_ENDPOINT = '/api/health';

/**
 * Ping the backend to wake it up from hibernation
 */
export async function wakeUpBackend(): Promise<void> {
    try {
        console.log('[Wake-up] Pinging backend to prevent cold start...');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

        await fetch(`${BACKEND_URL}${PING_ENDPOINT}`, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeout);
        console.log('[Wake-up] Backend is awake!');
    } catch (error) {
        // Silently fail - backend might already be awake or user is offline
        console.log('[Wake-up] Ping failed (backend might already be awake)');
    }
}

/**
 * Start periodic pinging to keep backend alive
 * Only use this if you want to keep the backend always warm (costs apply)
 */
export function startKeepAlive(intervalMinutes: number = 10): () => void {
    console.log(`[Wake-up] Starting keep-alive ping every ${intervalMinutes} minutes`);

    const interval = setInterval(() => {
        wakeUpBackend();
    }, intervalMinutes * 60 * 1000);

    // Return cleanup function
    return () => {
        clearInterval(interval);
        console.log('[Wake-up] Keep-alive stopped');
    };
}

const getBaseUrl = () => {
    // Client-side browser
    if (typeof window !== 'undefined') {
        // In production, use direct backend URL (no proxy on Vercel)
        // In development/codespaces, use proxy to avoid CORS
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (apiUrl && !apiUrl.includes('localhost')) {
            // Production: Direct call to backend
            let url = apiUrl;
            if (!url.endsWith('/api')) {
                url = url.replace(/\/$/, '') + '/api';
            }
            return url;
        }

        // Development: Use Next.js proxy
        return '/api';
    }

    // Server-side: Use environment variable or default to localhost backend
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    // Ensure URL ends with /api
    if (!url.endsWith('/api')) {
        url = url.replace(/\/$/, '') + '/api';
    }
    return url;
};

export const API_URL = getBaseUrl();


export async function fetchClient(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        ...(options.headers as Record<string, string>),
    };

    // If body is FormData, let the browser set Content-Type header (needed for boundary)
    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    // If no body is provided, remove Content-Type (prevents "Body cannot be empty" error in Fastify)
    if (!options.body) {
        delete headers['Content-Type'];
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        cache: 'no-store',
        headers,
    });

    if (response.status === 401) {
        if (typeof window !== 'undefined') {
            console.error(`[API] 401 Unauthorized accessing ${endpoint}. Redirecting to login.`);
            const keysToRemove = ['token', 'user', 'userId', 'userName', 'userEmail', 'userRole', 'tenantId', 'restaurantName'];
            keysToRemove.forEach(key => localStorage.removeItem(key));
            window.location.href = '/auth/login';
        }
        throw new Error('Session expired');
    }

    // 402 = subscription required / expired / suspended / cancelled
    if (response.status === 402) {
        if (typeof window !== 'undefined') {
            const body = await response.json().catch(() => ({}));
            const code = body?.code || '';
            console.warn(`[API] 402 Subscription issue (${code}) on ${endpoint}. Redirecting to subscription page.`);

            // Route to appropriate page based on the specific error code:
            // - ACCOUNT_SUSPENDED = payment failure → payment page
            // - ACCOUNT_CANCELLED = intentional cancel → resubscribe page
            // - anything else → subscription management page
            const redirectMap: Record<string, string> = {
                'ACCOUNT_SUSPENDED': '/pagamento',
                'ACCOUNT_CANCELLED': '/settings/subscription',
                'PAYMENT_OVERDUE': '/pagamento',
                'TRIAL_EXPIRED': '/settings/subscription',
            };
            const redirectTo = body?.redirectTo || redirectMap[code] || '/settings/subscription';

            // Avoid redirect loop if already on the target page
            const alreadyThere = ['/settings/subscription', '/pagamento'].some(
                p => window.location.pathname.startsWith(p)
            );
            if (!alreadyThere) {
                window.location.href = redirectTo;
            }
        }
        const errBody = await response.json().catch(() => ({ message: 'Subscription required' }));
        throw new Error(errBody.message || 'Subscription required');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.message || error.error || 'Request failed');
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

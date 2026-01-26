// API Client Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface RequestOptions extends RequestInit {
    body?: any;
}

async function fetchClient(endpoint: string, options: RequestOptions = {}) {
    // Remove trailing slash from base URL and leading slash from endpoint to avoid double slashes
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const config: RequestInit = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

export async function fetchWithAuth(endpoint: string, options: RequestOptions = {}) {
    const token = localStorage.getItem('internal_token');

    return fetchClient(endpoint, {
        ...options,
        headers: {
            ...options.headers,
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });
}

export default fetchClient;

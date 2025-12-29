import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { login, authHeaders, BASE_URL } from '../utils/auth.js';

// Custom metrics for dashboard
const dashboardResponseTime = new Trend('dashboard_response_time', true);
const cacheHitRate = new Rate('cache_hits');
const errorRate = new Rate('errors');
const requestCounter = new Counter('requests_total');

// Test configuration - Simulate multiple users hitting dashboard repeatedly
export const options = {
    stages: [
        { duration: '30s', target: 5 },  // Ramp up to 5 users
        { duration: '1m', target: 10 },  // Ramp up to 10 users  
        { duration: '2m', target: 10 },  // Stay at 10 users
        { duration: '30s', target: 0 },  // Ramp down
    ],
    thresholds: {
        'dashboard_response_time': ['p(95)<200', 'p(99)<500'], // With cache should be fast!
        'http_req_failed': ['rate<0.01'],
        'errors': ['rate<0.01'],
    },
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const TEST_USER = {
    email: __ENV.TEST_USER_EMAIL || 'admin@test.com',
    password: __ENV.TEST_USER_PASSWORD || 'Admin123!',
};

let authToken = null;

export function setup() {
    console.log('🚀 Dashboard Cache Performance Test');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log(`👤 User: ${TEST_USER.email}`);
    console.log('⏱️  Testing dashboard with Redis caching...\n');

    authToken = login(TEST_USER.email, TEST_USER.password);

    if (!authToken) {
        throw new Error('Failed to authenticate');
    }

    console.log('✅ Authentication successful\n');

    return { token: authToken };
}

export default function (data) {
    const token = data.token;
    const headers = authHeaders(token);

    requestCounter.add(1);

    // Test dashboard endpoint repeatedly
    const startTime = new Date().getTime();
    const response = http.get(`${BASE_URL}/api/dashboard/stats`, { headers });
    const endTime = new Date().getTime();

    const responseTime = endTime - startTime;

    // Check if response is successful
    const success = check(response, {
        'Dashboard status 200': (r) => r.status === 200,
        'Dashboard has data': (r) => {
            try {
                const json = r.json();
                return json.vendasMes !== undefined && json.topItems !== undefined;
            } catch (e) {
                return false;
            }
        },
    });

    if (!success) {
        errorRate.add(1);
    }

    // Record response time
    dashboardResponseTime.add(response.timings.duration);

    // Try to detect cache hits from response time patterns
    // Cache hits should be significantly faster (< 50ms typically)
    if (response.timings.duration < 50) {
        cacheHitRate.add(1);
    } else {
        cacheHitRate.add(0);
    }

    // Short sleep to simulate real user behavior
    sleep(Math.random() * 2 + 1); // Random 1-3 seconds
}

export function teardown(data) {
    console.log('\n✅ Dashboard cache test completed');
    console.log('📊 Check results above for cache effectiveness');
}

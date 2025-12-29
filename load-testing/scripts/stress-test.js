import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const errors = new Counter('errors');
const dashboardResponseTime = new Trend('dashboard_response_time');
const menuResponseTime = new Trend('menu_response_time');
const successRate = new Rate('success_rate');

// Progressive Stress Test - Find the breaking point
// Progressively increases load: 50 → 100 → 150 → 200 → 250 VUs
export const options = {
    stages: [
        // Warmup
        { duration: '30s', target: 20 },

        // Progressive load increase
        { duration: '1m', target: 50 },   // Baseline from morning-rush
        { duration: '30s', target: 50 },  // Hold

        { duration: '1m', target: 100 },  // Double the load
        { duration: '1m', target: 100 },  // Hold - observe

        { duration: '1m', target: 150 },  // 3x baseline
        { duration: '1m', target: 150 },  // Hold - observe

        { duration: '1m', target: 200 },  // 4x baseline
        { duration: '1m', target: 200 },  // Hold - observe

        { duration: '1m', target: 250 },  // 5x baseline - likely breaking point
        { duration: '1m', target: 250 },  // Hold - observe

        // Cool down
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        'http_req_duration': ['p(95)<1000', 'p(99)<2000'], // Relaxed for stress test
        'http_req_failed': ['rate<0.05'], // Allow 5% failures under extreme load
        'errors': ['rate<0.05'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const PASSWORD = 'LoadTest123!';

// Use load test users
const tenants = [
    { slug: 'test-pequeno', userStart: 1, userEnd: 34 },
    { slug: 'test-medio', userStart: 35, userEnd: 68 },
    { slug: 'test-grande', userStart: 69, userEnd: 102 },
];

const users = [];
for (const tenant of tenants) {
    for (let i = tenant.userStart; i <= tenant.userEnd; i++) {
        users.push({
            email: `loadtest${i}@${tenant.slug}.com`,
            password: PASSWORD,
        });
    }
}

console.log(`🎯 Stress Test: ${users.length} users available`);

function login(user) {
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    if (check(res, {
        'login successful': (r) => r.status === 200,
    })) {
        return res.json('token');
    }

    errors.add(1);
    return null;
}

export default function () {
    const user = users[Math.floor(Math.random() * users.length)];
    const token = login(user);

    if (!token) {
        sleep(1);
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    // Focus on the most common and heavy endpoints
    // 40% Dashboard (cached - should be fast)
    // 30% Menu (reported as slow - needs investigation)
    // 20% Products
    // 10% Recipes

    const rand = Math.random();
    let endpoint = '';

    if (rand < 0.4) {
        // Dashboard
        const start = new Date();
        const res = http.get(`${BASE_URL}/api/dashboard/stats`, { headers });
        const duration = new Date() - start;

        const success = check(res, {
            '[Stress] Dashboard': (r) => r.status === 200,
        });

        if (success) {
            dashboardResponseTime.add(duration);
            successRate.add(1);
        } else {
            errors.add(1);
            successRate.add(0);
        }

        sleep(1);

    } else if (rand < 0.7) {
        // Menu (slow endpoint - focus here)
        const start = new Date();
        const res = http.get(`${BASE_URL}/api/menu`, { headers });
        const duration = new Date() - start;

        const success = check(res, {
            '[Stress] Menu': (r) => r.status === 200,
        });

        if (success) {
            menuResponseTime.add(duration);
            successRate.add(1);
        } else {
            errors.add(1);
            successRate.add(0);
        }

        sleep(1);

    } else if (rand < 0.9) {
        // Products
        const res = http.get(`${BASE_URL}/api/products?page=1&limit=20`, { headers });
        check(res, {
            '[Stress] Products': (r) => r.status === 200,
        }) ? successRate.add(1) : errors.add(1);

        sleep(0.5);

    } else {
        // Recipes
        const res = http.get(`${BASE_URL}/api/recipes?page=1&limit=20`, { headers });
        check(res, {
            '[Stress] Recipes': (r) => r.status === 200,
        }) ? successRate.add(1) : errors.add(1);

        sleep(0.5);
    }

    sleep(Math.random() * 2); // Random think time
}

export function handleSummary(data) {
    const maxVUs = data.metrics.vus_max.values.max;
    const totalReqs = data.metrics.http_reqs.values.count;
    const failRate = data.metrics.http_req_failed.values.rate * 100;
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const p99 = data.metrics.http_req_duration.values['p(99)'];

    console.log('');
    console.log('🔥 Stress Test Summary');
    console.log('========================================');
    console.log(`Peak VUs: ${maxVUs}`);
    console.log(`Total Requests: ${totalReqs}`);
    console.log(`Failure Rate: ${failRate.toFixed(2)}%`);
    console.log('');
    console.log('Response Times (All Endpoints):');
    console.log(`  p95: ${p95}ms`);
    console.log(`  p99: ${p99}ms`);
    console.log('');

    // Determine breaking point
    if (failRate < 1 && p95 < 1000) {
        console.log(`✅ System STABLE at ${maxVUs} VUs`);
    } else if (failRate < 5 && p95 < 2000) {
        console.log(`⚠️  System DEGRADED at ${maxVUs} VUs (acceptable)`);
    } else {
        console.log(`❌ System BREAKING at ${maxVUs} VUs`);
        console.log(`   → Breaking point likely between ${Math.floor(maxVUs * 0.7)} and ${maxVUs} VUs`);
    }

    // Dashboard performance
    if (data.metrics.dashboard_response_time) {
        const dashP95 = data.metrics.dashboard_response_time.values['p(95)'];
        console.log('');
        console.log('Dashboard Performance:');
        console.log(`  p95: ${dashP95}ms ${dashP95 < 200 ? '✅' : dashP95 < 500 ? '⚠️' : '❌'}`);
    }

    // Menu performance
    if (data.metrics.menu_response_time) {
        const menuP95 = data.metrics.menu_response_time.values['p(95)'];
        console.log('');
        console.log('Menu Performance:');
        console.log(`  p95: ${menuP95}ms ${menuP95 < 200 ? '✅' : menuP95 < 500 ? '⚠️' : '❌'}`);
    }

    return {
        'stdout': '',
    };
}

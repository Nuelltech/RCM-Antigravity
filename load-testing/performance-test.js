/**
 * Simple Dashboard Performance Test
 * Tests the /api/dashboard/stats endpoint with and without cache
 * Run: node performance-test.js
 */

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_USER = {
    email: process.env.TEST_EMAIL || 'user1@test-pequeno.com',
    password: process.env.TEST_PASSWORD || 'LoadTest123!',
};

const NUM_REQUESTS = 20; // Number of requests to test
const CONCURRENT_REQUESTS = 5; // Number of concurrent requests

// Parse URL
const isHttps = API_URL.startsWith('https');
const client = isHttps ? https : http;

/**
 * Make HTTP request
 */
function request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_URL}${path}`);
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };

        const req = client.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: body ? JSON.parse(body) : null,
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: body,
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Login and get token
 */
async function login() {
    console.log(`🔐 Logging in as ${TEST_USER.email}...`);
    try {
        const response = await request('POST', '/api/auth/login', {
            email: TEST_USER.email,
            password: TEST_USER.password,
        });

        if (response.status !== 200) {
            throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
        }

        console.log('✅ Login successful\n');
        return response.data.token;
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        throw error;
    }
}

/**
 * Test dashboard endpoint once
 */
async function testDashboard(token) {
    const start = Date.now();
    try {
        const response = await request('GET', '/api/dashboard/stats', null, {
            'Authorization': `Bearer ${token}`,
        });

        const duration = Date.now() - start;

        if (response.status !== 200) {
            throw new Error(`Dashboard request failed: ${response.status}`);
        }

        return {
            success: true,
            duration,
            dataSize: JSON.stringify(response.data).length,
            hasCacheHeader: response.headers['x-cache-hit'] !== undefined,
            cacheHit: response.headers['x-cache-hit'] === 'true',
        };
    } catch (error) {
        const duration = Date.now() - start;
        return {
            success: false,
            duration,
            error: error.message,
        };
    }
}

/**
 * Run performance test
 */
async function runTest() {
    console.log('🚀 Dashboard Performance Test\n');
    console.log(`📍 Target: ${API_URL}`);
    console.log(`📊 Requests: ${NUM_REQUESTS}`);
    console.log(`⚡ Concurrent: ${CONCURRENT_REQUESTS}\n`);

    // Login
    const token = await login();

    // Results
    const results = [];
    let successCount = 0;
    let failCount = 0;
    let cacheHitCount = 0;
    let cacheMissCount = 0;

    // Test function
    const runBatch = async () => {
        const batchPromises = [];
        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            batchPromises.push(testDashboard(token));
        }
        return await Promise.all(batchPromises);
    };

    // Run tests in batches
    console.log('⏳ Running tests...\n');
    const numBatches = Math.ceil(NUM_REQUESTS / CONCURRENT_REQUESTS);

    for (let batch = 0; batch < numBatches; batch++) {
        const batchResults = await runBatch();
        results.push(...batchResults);

        // Count successes/failures
        batchResults.forEach(r => {
            if (r.success) {
                successCount++;
                if (r.cacheHit) cacheHitCount++;
                else cacheMissCount++;
            } else {
                failCount++;
            }
        });

        // Progress
        const completed = Math.min((batch + 1) * CONCURRENT_REQUESTS, NUM_REQUESTS);
        process.stdout.write(`\r✓ Completed ${completed}/${NUM_REQUESTS} requests`);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n\n📊 Results:\n');

    // Calculate statistics
    const successfulResults = results.filter(r => r.success);
    const durations = successfulResults.map(r => r.duration);

    if (durations.length === 0) {
        console.log('❌ No successful requests!');
        return;
    }

    durations.sort((a, b) => a - b);

    const min = durations[0];
    const max = durations[durations.length - 1];
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const median = durations[Math.floor(durations.length / 2)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    console.log('Response Times:');
    console.log(`  Min:     ${min}ms`);
    console.log(`  Avg:     ${avg.toFixed(2)}ms`);
    console.log(`  Median:  ${median}ms`);
    console.log(`  P95:     ${p95}ms`);
    console.log(`  P99:     ${p99}ms`);
    console.log(`  Max:     ${max}ms`);

    console.log(`\nSuccess Rate: ${successCount}/${NUM_REQUESTS} (${(successCount / NUM_REQUESTS * 100).toFixed(1)}%)`);

    if (cacheHitCount > 0 || cacheMissCount > 0) {
        console.log(`\nCache Performance:`);
        console.log(`  Hits:   ${cacheHitCount}`);
        console.log(`  Misses: ${cacheMissCount}`);
        console.log(`  Rate:   ${(cacheHitCount / (cacheHitCount + cacheMissCount) * 100).toFixed(1)}%`);

        // Calculate cache hit/miss response times
        const cacheHitDurations = successfulResults.filter(r => r.cacheHit).map(r => r.duration);
        const cacheMissDurations = successfulResults.filter(r => !r.cacheHit).map(r => r.duration);

        if (cacheHitDurations.length > 0) {
            const avgCacheHit = cacheHitDurations.reduce((sum, d) => sum + d, 0) / cacheHitDurations.length;
            console.log(`  Avg Cache Hit:  ${avgCacheHit.toFixed(2)}ms`);
        }

        if (cacheMissDurations.length > 0) {
            const avgCacheMiss = cacheMissDurations.reduce((sum, d) => sum + d, 0) / cacheMissDurations.length;
            console.log(`  Avg Cache Miss: ${avgCacheMiss.toFixed(2)}ms`);
        }
    }

    console.log('\n✅ Test completed!\n');

    // Performance verdict
    if (p95 < 100) {
        console.log('🎉 EXCELLENT! P95 < 100ms - Cache is working great!');
    } else if (p95 < 500) {
        console.log('✅ GOOD! P95 < 500ms - Acceptable performance');
    } else if (p95 < 1000) {
        console.log('⚠️  OK. P95 < 1s - Could be better');
    } else {
        console.log('❌ SLOW! P95 > 1s - Performance issues detected');
    }
}

// Run the test
runTest().catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});

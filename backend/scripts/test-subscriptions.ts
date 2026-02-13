/**
 * Script de teste para endpoints de subscrições
 * 
 * Usage:
 *   tsx scripts/test-subscriptions.ts
 * 
 * Ou com credenciais customizadas:
 *   EMAIL=admin@example.com PASSWORD=senha tsx scripts/test-subscriptions.ts
 */

const BASE_URL = process.env.BASE_URL || 'https://bug-free-tribble-x54g7r7qv9q92xjv-3001.app.github.dev';
const EMAIL = process.env.EMAIL || 'owner@demo.com';
const PASSWORD = process.env.PASSWORD || 'password123';

interface TestResult {
    endpoint: string;
    status: 'PASS' | 'FAIL';
    statusCode?: number;
    data?: any;
    error?: string;
}

const results: TestResult[] = [];

async function login(): Promise<string | null> {
    try {
        console.log(`🔐 Logging in as ${EMAIL}...`);
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (!response.ok) {
            console.error('❌ Login failed:', response.statusText);
            return null;
        }

        const data = await response.json();
        console.log('✅ Login successful!\n');
        return data.token;
    } catch (error: any) {
        console.error('❌ Login error:', error.message);
        return null;
    }
}

async function testEndpoint(
    name: string,
    path: string,
    token: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
): Promise<void> {
    try {
        console.log(`\n📡 Testing: ${name}`);
        console.log(`   ${method} ${path}`);

        const options: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        if (body && method === 'POST') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${BASE_URL}${path}`, options);
        const data = await response.json();

        if (response.ok) {
            console.log(`   ✅ Status: ${response.status}`);
            console.log(`   📦 Response:`, JSON.stringify(data, null, 2).split('\n').map(l => `      ${l}`).join('\n'));

            results.push({
                endpoint: name,
                status: 'PASS',
                statusCode: response.status,
                data
            });
        } else {
            console.log(`   ⚠️  Status: ${response.status}`);
            console.log(`   📦 Response:`, JSON.stringify(data, null, 2).split('\n').map(l => `      ${l}`).join('\n'));

            results.push({
                endpoint: name,
                status: 'FAIL',
                statusCode: response.status,
                error: data.message || data.error
            });
        }
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
            endpoint: name,
            status: 'FAIL',
            error: error.message
        });
    }
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  🧪 RCM Subscriptions System - Test Suite           ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // 1. Login
    const token = await login();
    if (!token) {
        console.error('\n❌ Cannot proceed without authentication token');
        process.exit(1);
    }

    // 2. Test all subscription endpoints
    await testEndpoint(
        'Get Available Plans',
        '/api/subscriptions/plans',
        token
    );

    await testEndpoint(
        'Get Current Subscription',
        '/api/subscriptions/current',
        token
    );

    await testEndpoint(
        'Get Subscription Status',
        '/api/subscriptions/status',
        token
    );

    await testEndpoint(
        'Get My Features',
        '/api/subscriptions/features',
        token
    );

    await testEndpoint(
        'Check Feature Access (sales)',
        '/api/subscriptions/check-feature',
        token,
        'POST',
        { feature: 'sales' }
    );

    await testEndpoint(
        'Check Feature Access (inventory)',
        '/api/subscriptions/check-feature',
        token,
        'POST',
        { feature: 'inventory' }
    );

    await testEndpoint(
        'Get Billing History',
        '/api/subscriptions/billing-history',
        token
    );

    // 3. Test subscription guard (optional - will fail if no file)
    console.log('\n\n╔══════════════════════════════════════════════════════╗');
    console.log('║  🔒 Testing Subscription Guard                       ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    console.log('📝 Note: Guard test requires file upload - skipping for now');
    console.log('   To test manually: Try POST /api/vendas/upload with a PDF');
    console.log('   Expected: 403 if tenant lacks "sales" feature\n');

    // 4. Summary
    console.log('\n\n╔══════════════════════════════════════════════════════╗');
    console.log('║  📊 Test Summary                                     ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total:  ${results.length}\n`);

    if (failed > 0) {
        console.log('Failed tests:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  - ${r.endpoint}: ${r.error || `HTTP ${r.statusCode}`}`);
        });
    }

    console.log('\n✨ Test run completed!\n');
}

main();

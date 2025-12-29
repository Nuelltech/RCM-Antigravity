import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { login, authHeaders, BASE_URL } from '../utils/auth.js';

// Custom metrics
const apiResponseTime = new Trend('api_response_time', true);
const errorRate = new Rate('errors');
const requestCounter = new Counter('requests_total');

// Configuração do teste baseline
export const options = {
    vus: 1, // 1 utilizador virtual
    duration: '5m', // 5 minutos
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
        http_req_failed: ['rate<0.01'], // < 1% erro
        errors: ['rate<0.01'],
    },
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// Configuração de teste
const TEST_USER = {
    email: __ENV.TEST_USER_EMAIL || 'admin@test.com',
    password: __ENV.TEST_USER_PASSWORD || 'Admin123!',
};

let authToken = null;

export function setup() {
    console.log('🚀 Iniciando Baseline Test...');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log(`👤 User: ${TEST_USER.email}`);

    // Login inicial
    authToken = login(TEST_USER.email, TEST_USER.password);

    if (!authToken) {
        throw new Error('Failed to authenticate user for baseline test');
    }

    console.log('✅ Authentication successful');

    return { token: authToken };
}

export default function (data) {
    const token = data.token;
    const headers = authHeaders(token);

    requestCounter.add(1);

    // 1. Dashboard Stats
    let response = http.get(`${BASE_URL}/api/dashboard/stats`, { headers });
    check(response, {
        'GET /dashboard/stats - status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    apiResponseTime.add(response.timings.duration);

    sleep(1);

    // 2. Listar produtos (paginado)
    response = http.get(`${BASE_URL}/api/products?page=1&limit=20`, { headers });
    check(response, {
        'GET /products - status 200': (r) => r.status === 200,
        'GET /products - has data': (r) => r.json() !== undefined,
    }) || errorRate.add(1);
    apiResponseTime.add(response.timings.duration);

    sleep(1);

    // 3. Listar receitas (paginado)
    response = http.get(`${BASE_URL}/api/recipes?page=1&limit=20`, { headers });
    check(response, {
        'GET /recipes - status 200': (r) => r.status === 200,
        'GET /recipes - has data': (r) => r.json() !== undefined,
    }) || errorRate.add(1);
    apiResponseTime.add(response.timings.duration);

    sleep(1);

    // 4. Pesquisar produtos
    response = http.get(`${BASE_URL}/api/products?search=test&page=1&limit=10`, { headers });
    check(response, {
        'GET /products (search) - status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    apiResponseTime.add(response.timings.duration);

    sleep(2);
}

export function teardown(data) {
    console.log('✅ Baseline test completed');
}

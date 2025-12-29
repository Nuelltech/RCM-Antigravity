// Utilitários de autenticação para testes k6
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

/**
 * Autentica um utilizador e retorna o token JWT
 * @param {string} email 
 * @param {string} password 
 * @returns {string|null} JWT token ou null se falhar
 */
export function login(email, password) {
    const response = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
            email: email,
            password: password
        }),
        {
            headers: { 'Content-Type': 'application/json' }
        }
    );

    const success = check(response, {
        'login successful': (r) => r.status === 200,
        'token received': (r) => r.json('token') !== undefined
    });

    if (success) {
        const body = response.json();
        return body.token;
    }

    console.error(`Login failed for ${email}: ${response.status} ${response.body}`);
    return null;
}

/**
 * Cria headers de autenticação com token JWT
 * @param {string} token 
 * @returns {object} Headers object
 */
export function authHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Verifica se utilizador está autenticado
 * @param {string} token 
 * @returns {boolean}
 */
export function verifyAuth(token) {
    const response = http.get(
        `${BASE_URL}/api/auth/me`,
        {
            headers: authHeaders(token)
        }
    );

    return check(response, {
        'auth valid': (r) => r.status === 200
    });
}

export { BASE_URL };

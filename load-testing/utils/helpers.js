// Helpers gerais para testes k6
import { sleep } from 'k6';

/**
 * Gera um delay aleatório entre min e max segundos
 * @param {number} min 
 * @param {number} max 
 */
export function randomSleep(min = 1, max = 3) {
    const duration = Math.random() * (max - min) + min;
    sleep(duration);
}

/**
 * Seleciona um item aleatório de um array
 * @param {Array} array 
 * @returns {*}
 */
export function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Gera um timestamp para nome de ficheiro
 * @returns {string}
 */
export function getTimestamp() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Formata duração em ms para string legível
 * @param {number} ms 
 * @returns {string}
 */
export function formatDuration(ms) {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
}

/**
 * Gera parâmetros de paginação aleatórios
 * @returns {object}
 */
export function randomPagination() {
    const pages = [1, 2, 3, 4, 5];
    const limits = [10, 20, 50];

    return {
        page: randomItem(pages),
        limit: randomItem(limits)
    };
}

/**
 * Gera filtros de pesquisa comuns
 * @returns {object}
 */
export function randomSearchFilters() {
    const searches = ['', 'carne', 'peixe', 'legumes', 'frango', 'arroz'];
    const orders = ['nome', 'preco', 'familia'];
    const directions = ['asc', 'desc'];

    return {
        search: randomItem(searches),
        orderBy: randomItem(orders),
        orderDirection: randomItem(directions)
    };
}

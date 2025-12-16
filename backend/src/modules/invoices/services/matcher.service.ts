import Fuse from 'fuse.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProductMatch {
    produtoId: number;
    variacaoId?: number;
    produtoNome: string;
    variacaoNome?: string;
    confianca: number; // 0-100
    matchReason: string;
}

export interface MatchingHistoryEntry {
    descricaoFatura: string;
    fornecedorNome?: string;
    produtoId: number;
    variacaoId?: number;
}

export class ProductMatcherService {
    /**
     * Find best product match for invoice line description
     */
    async findMatch(
        descricao: string,
        tenantId: number,
        fornecedorNome?: string
    ): Promise<ProductMatch | null> {
        // 1. Check matching history first (highest confidence)
        const historyMatch = await this.findHistoryMatch(descricao, tenantId, fornecedorNome);
        if (historyMatch) {
            return historyMatch;
        }

        // 2. Try exact name match
        const exactMatch = await this.findExactMatch(descricao, tenantId);
        if (exactMatch) {
            return exactMatch;
        }

        // 3. Try fuzzy match
        const fuzzyMatch = await this.findFuzzyMatch(descricao, tenantId);
        if (fuzzyMatch && fuzzyMatch.confianca >= 60) {
            return fuzzyMatch;
        }

        return null;
    }

    /**
     * Find match from historical confirmations
     */
    private async findHistoryMatch(
        descricao: string,
        tenantId: number,
        fornecedorNome?: string
    ): Promise<ProductMatch | null> {
        // Normalize description for comparison
        const normalizedDesc = this.normalizeText(descricao);

        // Find historical matches
        const history = await prisma.matchingHistorico.findMany({
            where: {
                tenant_id: tenantId,
                ...(fornecedorNome && { fornecedor_nome: fornecedorNome })
            },
            include: {
                produto: true,
                variacao: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Find exact match in history
        for (const entry of history) {
            const normalizedHistory = this.normalizeText(entry.descricao_fatura);

            if (normalizedHistory === normalizedDesc) {
                return {
                    produtoId: entry.produto_id,
                    variacaoId: entry.variacao_id || undefined,
                    produtoNome: entry.produto.nome,
                    variacaoNome: entry.variacao?.tipo_unidade_compra, // Using tipo_unidade_compra instead of nome
                    confianca: 95,
                    matchReason: 'Historical exact match'
                };
            }
        }

        // Find similar match in history (fuzzy)
        const fuse = new Fuse(history, {
            keys: ['descricao_fatura'],
            threshold: 0.2,
            includeScore: true
        });

        const results = fuse.search(descricao);

        if (results.length > 0 && results[0].score! < 0.2) {
            const match = results[0].item;
            return {
                produtoId: match.produto_id,
                variacaoId: match.variacao_id || undefined,
                produtoNome: match.produto.nome,
                variacaoNome: match.variacao?.tipo_unidade_compra, // Using tipo_unidade_compra instead of nome
                confianca: 85,
                matchReason: 'Historical fuzzy match'
            };
        }

        return null;
    }

    /**
     * Find exact name match
     */
    private async findExactMatch(
        descricao: string,
        tenantId: number
    ): Promise<ProductMatch | null> {
        const normalizedDesc = this.normalizeText(descricao);

        // Try to find product by name (case insensitive comparison)
        const produto = await prisma.produto.findFirst({
            where: {
                tenant_id: tenantId,
                nome: {
                    equals: descricao
                }
            }
        });

        if (produto) {
            return {
                produtoId: produto.id,
                produtoNome: produto.nome,
                confianca: 90,
                matchReason: 'Exact name match'
            };
        }

        return null;
    }

    /**
     * Find fuzzy match using Fuse.js
     */
    private async findFuzzyMatch(
        descricao: string,
        tenantId: number
    ): Promise<ProductMatch | null> {
        // Get all products for tenant
        const produtos = await prisma.produto.findMany({
            where: {
                tenant_id: tenantId
            },
            select: {
                id: true,
                nome: true,
                codigo_interno: true  // Using codigo_interno instead of codigo
            }
        });

        if (produtos.length === 0) {
            return null;
        }

        // Configure Fuse for fuzzy search
        const fuse = new Fuse(produtos, {
            keys: [
                { name: 'nome', weight: 0.7 },
                { name: 'codigo_interno', weight: 0.3 }  // Using codigo_interno
            ],
            threshold: 0.4,
            includeScore: true,
            minMatchCharLength: 3
        });

        // Search
        const results = fuse.search(descricao);

        if (results.length === 0) {
            return null;
        }

        // Get best match
        const bestMatch = results[0];
        const score = bestMatch.score || 0;

        // Convert Fuse score (0 = perfect, 1 = worst) to confidence (0-100)
        const confianca = Math.round((1 - score) * 100);

        return {
            produtoId: bestMatch.item.id,
            produtoNome: bestMatch.item.nome,
            confianca,
            matchReason: `Fuzzy match (score: ${score.toFixed(2)})`
        };
    }

    /**
     * Save confirmed match to history
     */
    async saveMatchToHistory(
        descricao: string,
        produtoId: number,
        variacaoId: number | null,
        tenantId: number,
        userId: number,
        fornecedorNome?: string,
        confiancaInicial?: number
    ): Promise<void> {
        await prisma.matchingHistorico.create({
            data: {
                tenant_id: tenantId,
                descricao_fatura: descricao,
                fornecedor_nome: fornecedorNome,
                produto_id: produtoId,
                variacao_id: variacaoId,
                confianca_inicial: confiancaInicial,
                confirmado_por: userId
            }
        });
    }

    /**
     * Normalize text for comparison
     */
    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    /**
     * Get matching suggestions for manual review
        */
    async getSuggestions(
        descricao: string,
        tenantId: number,
        limit: number = 10
    ): Promise<ProductMatch[]> {
        const produtos = await prisma.produto.findMany({
            where: {
                tenant_id: tenantId,
                ativo: true  // Only active products
            },
            select: {
                id: true,
                nome: true,
                codigo_interno: true
            },
            orderBy: {
                id: 'desc'  // Newer products first (but scoring will override)
            }
        });

        // Normalize and tokenize search text
        const normalizedSearch = this.normalizeText(descricao);
        const searchTokens = normalizedSearch.split(' ').filter(t => t.length >= 3);

        // Score each product
        const scored = produtos.map(produto => {
            const normalizedNome = this.normalizeText(produto.nome);
            const normalizedCodigo = this.normalizeText(produto.codigo_interno || '');

            // Calculate score based on token matching
            let score = 0;
            let matchedTokens = 0;

            // Check each search token
            for (const token of searchTokens) {
                // Exact token match in nome
                if (normalizedNome.includes(token)) {
                    score += 50;
                    matchedTokens++;
                }
                // Partial match in nome (at least 70% overlap)
                else if (token.length >= 4) {
                    const substring = token.substring(0, Math.floor(token.length * 0.7));
                    if (normalizedNome.includes(substring)) {
                        score += 25;
                        matchedTokens++;
                    }
                }

                // Match in codigo_interno
                if (normalizedCodigo.includes(token)) {
                    score += 30;
                }
            }

            // Bonus if multiple tokens matched
            if (matchedTokens > 1) {
                score += matchedTokens * 10;
            }

            // Bonus if nome is short and matches (less noise)
            if (normalizedNome.length < 20 && matchedTokens > 0) {
                score += 20;
            }

            return {
                produto,
                score: Math.min(score, 100)  // Cap at 100
            };
        });

        // Filter and sort by score
        const results = scored
            .filter(item => item.score >= 60)  // Minimum 60% confidence (increased from 40%)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return results.map(result => ({
            produtoId: result.produto.id,
            produtoNome: result.produto.nome,
            confianca: result.score,
            matchReason: result.score >= 80 ? 'Strong match' : 'Possible match'
        }));
    }
}

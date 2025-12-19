import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { prisma } from '../../core/database';

/**
 * Purchases Dashboard Routes
 * Provides analytics and insights for purchase data
 */
export async function purchasesDashboardRoutes(app: FastifyInstance) {

    // ============================================================================
    // GET /api/purchases/dashboard
    // Returns summary stats, trends, top products, top suppliers, category breakdown
    // ============================================================================
    app.withTypeProvider<ZodTypeProvider>().get('/dashboard', {
        schema: {
            querystring: z.object({
                startDate: z.string(),
                endDate: z.string(),
                page: z.string().optional().default('1'),
                pageSize: z.string().optional().default('10'),
            }),
            tags: ['Purchases Dashboard'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Querystring: { startDate: string; endDate: string; page?: string; pageSize?: string } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { startDate, endDate, page = '1', pageSize = '10' } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);

        // Calculate previous month for comparison
        const monthDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const prevStart = new Date(start);
        prevStart.setDate(prevStart.getDate() - monthDiff);
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);

        // Fetch all purchase items in date range with relations
        const purchaseItems = await prisma.compraItem.findMany({
            where: {
                tenant_id: req.tenantId,
                compraFatura: {
                    data_fatura: {
                        gte: start,
                        lte: end,
                    },
                },
            },
            include: {
                variacao: {
                    include: {
                        produto: {
                            include: {
                                subfamilia: {
                                    include: {
                                        familia: true,
                                    },
                                },
                            },
                        },
                    },
                },
                compraFatura: true,
            },
            orderBy: {
                compraFatura: {
                    data_fatura: 'asc'
                }
            },
        });

        // Fetch previous period for comparison
        const prevPurchaseItems = await prisma.compraItem.findMany({
            where: {
                tenant_id: req.tenantId,
                compraFatura: {
                    data_fatura: {
                        gte: prevStart,
                        lte: prevEnd,
                    },
                },
            },
            select: {
                preco_total: true,
            },
        });

        // ========== SUMMARY ==========
        const totalSpent = purchaseItems.reduce((sum, p) => sum + Number(p.preco_total), 0);
        const totalPurchases = purchaseItems.length;
        const prevTotalSpent = prevPurchaseItems.reduce((sum, p) => sum + Number(p.preco_total), 0);
        const vsLastMonth = prevTotalSpent > 0
            ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100
            : 0;

        // Top product by spending
        const productMap = new Map<number, { id: number; name: string; total: number }>();
        purchaseItems.forEach((p) => {
            if (!p.variacao) return;
            const prodId = p.variacao.produto_id;
            const existing = productMap.get(prodId) || {
                id: prodId,
                name: p.variacao.produto.nome,
                total: 0,
            };
            existing.total += Number(p.preco_total);
            productMap.set(prodId, existing);
        });

        const topProduct = Array.from(productMap.values()).sort((a, b) => b.total - a.total)[0] || null;

        // ========== TRENDS (by day) ==========
        const supplierMap = new Map<string, { name: string; total: number; invoiceIds: Set<number> }>();
        purchaseItems.forEach((p) => {
            const suppName = p.compraFatura.fornecedor_nome || 'Unknown';
            const existing = supplierMap.get(suppName) || {
                name: suppName,
                total: 0,
                invoiceIds: new Set<number>(),
            };
            existing.total += Number(p.preco_total);
            existing.invoiceIds.add(p.compra_fatura_id);
            supplierMap.set(suppName, existing);
        });

        // ========== ALL PRODUCTS (with pagination and sparklines) ==========
        const allProducts = Array.from(new Set(purchaseItems.filter(p => p.variacao).map((p) => p.variacao!.produto_id)))
            .map((id) => {
                const prod = purchaseItems.find((p) => p.variacao?.produto_id === id)!.variacao!.produto;
                const prodPurchases = purchaseItems.filter(
                    (p) => p.variacao?.produto_id === prod.id
                );
                const priceHistory = prodPurchases.map((p) => ({
                    date: p.compraFatura.data_fatura.toISOString().split('T')[0],
                    price: Number(p.preco_unitario),
                }));
                const total = prodPurchases.reduce((sum, p) => sum + Number(p.preco_total), 0);
                const quantity = prodPurchases.reduce((sum, p) => sum + Number(p.quantidade), 0);
                return {
                    id: prod.id,
                    name: prod.nome,
                    totalSpent: total,
                    quantity,
                    percentage: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
                    priceHistory,
                };
            })
            .sort((a, b) => b.totalSpent - a.totalSpent);

        // Paginate products
        const totalProducts = allProducts.length;
        const totalPages = Math.ceil(totalProducts / pageSizeNum);
        const startIndex = (pageNum - 1) * pageSizeNum;
        const paginatedProducts = allProducts.slice(startIndex, startIndex + pageSizeNum);

        // ========== TOP 5 SUPPLIERS ==========
        const topSuppliers = Array.from(supplierMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map((s) => ({
                name: s.name,
                totalSpent: s.total,
                percentage: totalSpent > 0 ? (s.total / totalSpent) * 100 : 0,
                invoicesCount: s.invoiceIds.size,
            }));

        // ========== CATEGORY BREAKDOWN ==========
        const categoryMap = new Map<string, { name: string; total: number }>();
        purchaseItems.forEach((p) => {
            if (!p.variacao) return;
            const catName = p.variacao.produto.subfamilia?.familia?.nome || 'Sem Categoria';
            const existing = categoryMap.get(catName) || {
                name: catName,
                total: 0,
            };
            existing.total += Number(p.preco_total);
            categoryMap.set(catName, existing);
        });

        // Get all categories sorted
        const allCategories = Array.from(categoryMap.values())
            .map((cat) => ({
                category: cat.name,
                totalSpent: cat.total,
                percentage: totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0,
            }))
            .sort((a, b) => b.totalSpent - a.totalSpent);

        // For chart: Top 5 + "Restantes"
        const top5Categories = allCategories.slice(0, 5);
        const restCategories = allCategories.slice(5);
        const restTotal = restCategories.reduce((sum, cat) => sum + cat.totalSpent, 0);

        const categoriesForChart = [...top5Categories];
        if (restTotal > 0) {
            categoriesForChart.push({
                category: 'Restantes',
                totalSpent: restTotal,
                percentage: totalSpent > 0 ? (restTotal / totalSpent) * 100 : 0,
            });
        }

        // ========== DAILY TREND ==========
        const dailyMap = new Map<string, number>();
        purchaseItems.forEach((p) => {
            const dateKey = p.compraFatura.data_fatura.toISOString().split('T')[0];
            dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + Number(p.preco_total));
        });

        const dailyTrend = Array.from(dailyMap.entries())
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Count unique invoices
        const uniqueInvoices = new Set(purchaseItems.map(p => p.compra_fatura_id));

        // Get invoices list (all invoices in period)
        const invoices = await prisma.compraFatura.findMany({
            where: {
                tenant_id: req.tenantId,
                data_fatura: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
                // Removed validado filter - show all invoices
            },
            include: {
                faturaImportacao: true  // Include to check if partial approval
            },
            orderBy: {
                data_fatura: 'desc'
            },
            take: 20, // Limit to 20 most recent
        });

        // Count items per invoice
        const invoicesWithCounts = await Promise.all(
            invoices.map(async (invoice) => {
                const itemsCount = await prisma.compraItem.count({
                    where: {
                        compra_fatura_id: invoice.id,
                        tenant_id: req.tenantId
                    }
                });

                // Determine status: check if partial approval from source
                let status = 'pending';
                if (invoice.faturaImportacao?.status === 'approved_partial') {
                    status = 'partial';
                } else if (invoice.validado) {
                    status = 'approved';
                }

                return {
                    id: invoice.id,
                    numero_fatura: invoice.numero_fatura,
                    fornecedor: invoice.fornecedor_nome,
                    data_fatura: invoice.data_fatura,
                    total: parseFloat(invoice.total_com_iva.toString()),
                    status: status,
                    items_count: itemsCount,
                    fatura_importacao_id: invoice.fatura_importacao_id
                };
            })
        );

        return {
            summary: {
                totalSpent,
                totalPurchases,
                totalInvoices: uniqueInvoices.size,
                vsLastMonth,
                topProduct: topProduct ? {
                    id: topProduct.id,
                    name: topProduct.name,
                    totalSpent: topProduct.total,
                } : null,
            },
            trend: dailyTrend,
            products: {
                items: paginatedProducts,
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    totalItems: totalProducts,
                    totalPages,
                },
            },
            topSuppliers,
            byCategory: {
                chart: categoriesForChart,
                all: allCategories,
            },
            invoices: invoicesWithCounts,
        };
    });

    // ============================================================================
    // GET /api/purchases/product/:productId/analysis
    // Returns detailed analysis for a specific product (6 months history + insights)
    // ============================================================================
    app.withTypeProvider<ZodTypeProvider>().get('/product/:productId/analysis', {
        schema: {
            params: z.object({
                productId: z.string().transform(Number),
            }),
            querystring: z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            }),
            tags: ['Purchases Dashboard'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{
        Params: { productId: number };
        Querystring: { startDate?: string; endDate?: string };
    }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { productId } = req.params;
        const { startDate, endDate } = req.query;

        // Get product details
        const product = await prisma.produto.findFirst({
            where: {
                id: productId,
                tenant_id: req.tenantId,
            },
        });

        if (!product) {
            return reply.status(404).send({ error: 'Product not found' });
        }

        // Calculate 6 months ago from now
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Get all purchase items for this product (last 6 months)
        const allPurchaseItems = await prisma.compraItem.findMany({
            where: {
                tenant_id: req.tenantId,
                variacao: {
                    produto_id: productId,
                },
                compraFatura: {
                    data_fatura: {
                        gte: sixMonthsAgo,
                    },
                },
            },
            include: {
                variacao: true,
                compraFatura: true,
            },
            orderBy: {
                compraFatura: {
                    data_fatura: 'asc'
                }
            },
        });

        if (allPurchaseItems.length === 0) {
            return {
                product: {
                    id: product.id,
                    name: product.nome,
                },
                statistics: {
                    avgPrice: 0,
                    minPrice: 0,
                    maxPrice: 0,
                    priceVariation: 0,
                    lastPurchaseDate: null,
                },
                priceEvolution: [],
                purchaseHistory: [],
                supplierComparison: [],
                insights: [],
                filteredPeriod: null,
            };
        }

        // Calculate statistics
        const prices = allPurchaseItems.map((p) => Number(p.preco_unitario));
        const avgPrice = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceVariation = avgPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

        // Price evolution (all purchases for chart)
        const priceEvolution = allPurchaseItems.map((p) => ({
            date: p.compraFatura.data_fatura.toISOString().split('T')[0],
            price: Number(p.preco_unitario),
            quantity: Number(p.quantidade),
            supplier: p.compraFatura.fornecedor_nome,
        }));

        // Purchase history (filtered by period if provided)
        let filteredItems = allPurchaseItems;
        let filteredPeriodInfo = null;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            filteredItems = allPurchaseItems.filter(p =>
                p.compraFatura.data_fatura >= start && p.compraFatura.data_fatura <= end
            );

            filteredPeriodInfo = {
                startDate,
                endDate,
                purchaseCount: filteredItems.length,
                totalSpent: filteredItems.reduce((sum, p) => sum + Number(p.preco_total), 0),
            };
        }

        const purchaseHistory = filteredItems.map((p) => ({
            date: p.compraFatura.data_fatura.toISOString().split('T')[0],
            supplier: p.compraFatura.fornecedor_nome,
            quantity: Number(p.quantidade),
            unitPrice: Number(p.preco_unitario),
            total: Number(p.preco_total),
            variation: p.variacao?.tipo_unidade_compra || '',
        }));

        // Supplier comparison (from all 6 months data)
        const supplierMap = new Map<string, { total: number; count: number; avgPrice: number; lastPrice: number }>();
        allPurchaseItems.forEach((p) => {
            const suppName = p.compraFatura.fornecedor_nome;
            const existing = supplierMap.get(suppName) || {
                total: 0,
                count: 0,
                avgPrice: 0,
                lastPrice: 0,
            };
            existing.total += Number(p.preco_total);
            existing.count += 1;
            existing.lastPrice = Number(p.preco_unitario); // Will be overwritten, last one wins
            supplierMap.set(suppName, existing);
        });

        const supplierComparison = Array.from(supplierMap.entries())
            .map(([name, data]) => ({
                name,
                avgPrice: data.total / data.count,
                lastPrice: data.lastPrice,
                purchaseCount: data.count,
                totalSpent: data.total,
            }))
            .sort((a, b) => a.avgPrice - b.avgPrice); // Best price first

        // Generate insights
        const insights: string[] = [];

        // Price change insight
        if (Math.abs(priceChange) > 10) {
            const direction = priceChange > 0 ? 'aumentou' : 'diminuiu';
            insights.push(`⚠️ Preço ${direction} ${Math.abs(priceChange).toFixed(1)}% nos últimos 6 meses`);
        }

        // Best supplier insight
        if (supplierComparison.length > 1) {
            const bestSupplier = supplierComparison[0];
            insights.push(`✅ "${bestSupplier.name}" tem o melhor preço médio: €${bestSupplier.avgPrice.toFixed(2)}`);
        }

        // Price volatility insight
        if (priceVariation > 20) {
            insights.push(`📊 Alta variação de preço (${priceVariation.toFixed(1)}%) - considere negociar contrato fixo`);
        }

        // Recent purchase insight
        const daysSinceLastPurchase = Math.floor(
            (now.getTime() - allPurchaseItems[allPurchaseItems.length - 1].compraFatura.data_fatura.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastPurchase > 30) {
            insights.push(`📅 Última compra há ${daysSinceLastPurchase} dias - produto pode estar em falta`);
        }

        return {
            product: {
                id: product.id,
                name: product.nome,
            },
            statistics: {
                avgPrice,
                minPrice,
                maxPrice,
                priceVariation,
                priceChange,
                lastPurchaseDate: allPurchaseItems[allPurchaseItems.length - 1].compraFatura.data_fatura.toISOString().split('T')[0],
            },
            priceEvolution,
            purchaseHistory,
            supplierComparison,
            insights,
            filteredPeriod: filteredPeriodInfo,
        };
    });

    // ============================================================================
    // GET /api/purchases/product/:productId
    // Returns detailed purchase history for a specific product (legacy endpoint)
    // ============================================================================
    app.withTypeProvider<ZodTypeProvider>().get('/product/:productId', {
        schema: {
            params: z.object({
                productId: z.string().transform(Number),
            }),
            querystring: z.object({
                startDate: z.string(),
                endDate: z.string(),
            }),
            tags: ['Purchases Dashboard'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{
        Params: { productId: number };
        Querystring: { startDate: string; endDate: string };
    }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { productId } = req.params;
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Get product details
        const product = await prisma.produto.findFirst({
            where: {
                id: productId,
                tenant_id: req.tenantId,
            },
        });

        if (!product) {
            return reply.status(404).send({ error: 'Product not found' });
        }

        // Get all purchase items for this product
        const purchaseItems = await prisma.compraItem.findMany({
            where: {
                tenant_id: req.tenantId,
                variacao: {
                    produto_id: productId,
                },
                compraFatura: {
                    data_fatura: {
                        gte: start,
                        lte: end,
                    },
                },
            },
            include: {
                variacao: true,
                compraFatura: true,
            },
            orderBy: {
                compraFatura: {
                    data_fatura: 'asc'
                }
            },
        });

        if (purchaseItems.length === 0) {
            return {
                product: {
                    id: product.id,
                    name: product.nome,
                    totalSpent: 0,
                    totalQuantity: 0,
                    avgPrice: 0,
                    minPrice: 0,
                    maxPrice: 0,
                    priceVolatility: 0,
                    priceChange: 0,
                },
                priceEvolution: [],
                purchases: [],
                suppliers: [],
                peakPurchase: null,
            };
        }

        // Calculate stats
        const totalSpent = purchaseItems.reduce((sum: number, p) => sum + Number(p.preco_total), 0);
        const totalQuantity = purchaseItems.reduce((sum: number, p) => sum + Number(p.quantidade), 0);
        const prices = purchaseItems.map((p) => Number(p.preco_unitario));
        const avgPrice = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceVolatility = ((maxPrice - minPrice) / avgPrice) * 100;

        const priceEvolution = purchaseItems.map((p) => ({
            date: p.compraFatura.data_fatura.toISOString().split('T')[0],
            price: Number(p.preco_unitario),
            quantity: Number(p.quantidade),
        }));

        const purchasesList = purchaseItems.map((p) => ({
            date: p.compraFatura.data_fatura.toISOString().split('T')[0],
            supplier: p.compraFatura.fornecedor_nome,
            quantity: Number(p.quantidade),
            unitPrice: Number(p.preco_unitario),
            total: Number(p.preco_total),
            variation: p.variacao?.tipo_unidade_compra || '',
        }));

        const firstPrice = Number(purchaseItems[0].preco_unitario);
        const lastPrice = Number(purchaseItems[purchaseItems.length - 1].preco_unitario);
        const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

        // Supplier breakdown
        const supplierMap = new Map<string, number>();
        purchaseItems.forEach((p) => {
            const suppName = p.compraFatura.fornecedor_nome;
            supplierMap.set(suppName, (supplierMap.get(suppName) || 0) + Number(p.preco_total));
        });

        const suppliers = Array.from(supplierMap.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total);

        const peakPurchase = purchaseItems.find((p) => Number(p.preco_unitario) === maxPrice);

        return {
            product: {
                id: product.id,
                name: product.nome,
                totalSpent,
                totalQuantity,
                avgPrice,
                minPrice,
                maxPrice,
                priceVolatility,
                priceChange,
            },
            priceEvolution,
            purchases: purchasesList,
            suppliers,
            peakPurchase: peakPurchase ? {
                date: peakPurchase.compraFatura.data_fatura.toISOString().split('T')[0],
                supplier: peakPurchase.compraFatura.fornecedor_nome,
                price: Number(peakPurchase.preco_unitario),
                quantity: Number(peakPurchase.quantidade),
            } : null,
        };
    });
}

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface TenantOverview {
    id: number;
    nome_restaurante: string;
    email_contacto: string | null;
    telefone: string | null;
    plan: string;
    status: string | null;
    ativo: boolean;
    created_at: Date;
    last_access: Date | null;
    payment_status: 'ok' | 'overdue' | 'trial';
}

export interface TenantHealth {
    products_count: number;
    recipes_count: number;
    users_count: number;
    invoices: {
        total: number;
        success: number;
        error: number;
        pending: number;
    };
    sales: {
        total: number;
        success: number;
        error: number;
        pending: number;
    };
    storage_used_mb: number;
    storage_limit_mb: number;
    last_activity: Date | null;
}

export interface TenantError {
    id: bigint;
    timestamp: Date;
    level: string;
    source: string;
    message: string;
    endpoint: string | null;
    metadata: any;
}

export interface InvoiceFilters {
    status?: 'success' | 'error' | 'pending' | 'rejected';
    page: number;
    limit: number;
}

export interface SalesFilters {
    status?: 'success' | 'error' | 'pending' | 'rejected';
    page: number;
    limit: number;
}

class InternalTenantsService {
    // -------------------------------------------------------------------------
    // List All Tenants (for support dashboard)
    // -------------------------------------------------------------------------
    async getAllTenants() {
        const tenants = await prisma.tenant.findMany({
            select: {
                id: true,
                nome_restaurante: true,
                email_contacto: true,
                plano: true,
                status: true,
                ativo: true,
                createdAt: true,
                _count: {
                    select: {
                        userTenants: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit to 100 tenants
        });

        return tenants.map((t) => ({
            id: t.id,
            nome: t.nome_restaurante,
            email: t.email_contacto,
            plano: t.plano,
            status: t.status || 'active',
            users_count: t._count.userTenants,
            created_at: t.createdAt,
            ativo: t.ativo,
        }));
    }

    // -------------------------------------------------------------------------
    // Tenant Overview (leve, dados diretos da DB)
    // -------------------------------------------------------------------------
    async getTenantOverview(tenantId: number): Promise<TenantOverview> {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                nome_restaurante: true,
                email_contacto: true,
                telefone: true,
                plano: true,
                status: true,
                ativo: true,
                createdAt: true,
                data_expiracao_plano: true,
            },
        });

        if (!tenant) {
            throw new Error('Tenant not found');
        }

        // Get last access from sessions
        const lastSession = await prisma.session.findFirst({
            where: { tenant_id: tenantId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });

        // Determine payment status
        let payment_status: 'ok' | 'overdue' | 'trial' = 'ok';
        if (tenant.status === 'trial') {
            payment_status = 'trial';
        } else if (tenant.status === 'payment_overdue') {
            payment_status = 'overdue';
        }

        return {
            id: tenant.id,
            nome_restaurante: tenant.nome_restaurante,
            email_contacto: tenant.email_contacto,
            telefone: tenant.telefone,
            plan: tenant.plano,
            status: tenant.status,
            ativo: tenant.ativo,
            created_at: tenant.createdAt,
            last_access: lastSession?.createdAt || null,
            payment_status,
        };
    }

    // -------------------------------------------------------------------------
    // Tenant Health (CACHE: usa Redis, worker calcula background)
    // -------------------------------------------------------------------------
    async getTenantHealth(tenantId: number): Promise<TenantHealth> {
        const cacheKey = `tenant:health:${tenantId}`;

        // Try to get from cache
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Cache miss - calculate now (in production, this should be done by worker)
        const health = await this.calculateTenantHealth(tenantId);

        // Cache for 5 minutes
        await redis.setex(cacheKey, 300, JSON.stringify(health));

        return health;
    }

    private async calculateTenantHealth(tenantId: number): Promise<TenantHealth> {
        const [
            products_count,
            recipes_count,
            users_count,
            invoices_stats,
            sales_stats,
            tenant_limits,
        ] = await Promise.all([
            prisma.produto.count({ where: { tenant_id: tenantId, ativo: true } }),
            prisma.receita.count({ where: { tenant_id: tenantId, ativa: true } }),
            prisma.userTenant.count({ where: { tenant_id: tenantId, ativo: true } }),
            this.getInvoiceStats(tenantId),
            this.getSalesStats(tenantId),
            prisma.tenantLimits.findUnique({ where: { tenant_id: tenantId } }),
        ]);

        // Get last activity from audit log or sessions
        const lastActivity = await prisma.auditLog.findFirst({
            where: { tenant_id: tenantId },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true },
        });

        return {
            products_count,
            recipes_count,
            users_count,
            invoices: invoices_stats,
            sales: sales_stats,
            storage_used_mb: tenant_limits?.storage_usado_mb || 0,
            storage_limit_mb: tenant_limits?.max_storage_mb || 1000,
            last_activity: lastActivity?.timestamp || null,
        };
    }

    private async getInvoiceStats(tenantId: number) {
        const invoices = await prisma.faturaImportacao.groupBy({
            by: ['status'],
            where: { tenant_id: tenantId },
            _count: true,
        });

        const stats = {
            total: 0,
            success: 0,
            error: 0,
            pending: 0,
        };

        invoices.forEach((item) => {
            stats.total += item._count;
            if (item.status === 'imported') stats.success += item._count;
            else if (item.status === 'error') stats.error += item._count;
            else if (item.status === 'reviewing' || item.status === 'pending') stats.pending += item._count;
        });

        return stats;
    }

    private async getSalesStats(tenantId: number) {
        const sales = await prisma.vendaImportacao.groupBy({
            by: ['status'],
            where: { tenant_id: tenantId },
            _count: true,
        });

        const stats = {
            total: 0,
            success: 0,
            error: 0,
            pending: 0,
        };

        sales.forEach((item) => {
            stats.total += item._count;
            if (item.status === 'imported') stats.success += item._count;
            else if (item.status === 'error') stats.error += item._count;
            else if (item.status === 'reviewing' || item.status === 'pending') stats.pending += item._count;
        });

        return stats;
    }

    // -------------------------------------------------------------------------
    // Recent Errors (MONITORING DB: usa ErrorLog)
    // -------------------------------------------------------------------------
    async getRecentErrors(tenantId: number, days: number = 7): Promise<TenantError[]> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const errors = await prisma.errorLog.findMany({
            where: {
                tenant_id: tenantId,
                timestamp: { gte: since },
            },
            orderBy: { timestamp: 'desc' },
            take: 20,
            select: {
                id: true,
                timestamp: true,
                level: true,
                source: true,
                message: true,
                endpoint: true,
                metadata: true,
            },
        });

        return errors;
    }

    // -------------------------------------------------------------------------
    // Invoices & Sales (Paginação obrigatória)
    // -------------------------------------------------------------------------
    async getTenantInvoices(tenantId: number, filters: InvoiceFilters) {
        const { status, page, limit } = filters;
        const skip = (page - 1) * limit;

        const where: any = { tenant_id: tenantId };
        if (status) {
            where.status = status;
        }

        const [invoices, total] = await Promise.all([
            prisma.faturaImportacao.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    ficheiro_url: true,
                    status: true,
                    createdAt: true,
                    processado_em: true,
                    fornecedor_nome: true,
                    total_com_iva: true,
                },
            }),
            prisma.faturaImportacao.count({ where }),
        ]);

        return {
            data: invoices,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        };
    }

    async getInvoiceDetails(tenantId: number, invoiceId: number) {
        const invoice = await prisma.faturaImportacao.findFirst({
            where: {
                id: invoiceId,
                tenant_id: tenantId,
            },
        });

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        return invoice;
    }

    async getTenantSales(tenantId: number, filters: SalesFilters) {
        const { status, page, limit } = filters;
        const skip = (page - 1) * limit;

        const where: any = { tenant_id: tenantId };
        if (status) {
            where.status = status;
        }

        const [sales, total] = await Promise.all([
            prisma.vendaImportacao.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    ficheiro_url: true,
                    status: true,
                    createdAt: true,
                    processado_em: true,
                },
            }),
            prisma.vendaImportacao.count({ where }),
        ]);

        return {
            data: sales,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        };
    }

    async getSalesDetails(tenantId: number, salesId: number) {
        const sales = await prisma.vendaImportacao.findFirst({
            where: {
                id: salesId,
                tenant_id: tenantId,
            },
        });

        if (!sales) {
            throw new Error('Sales not found');
        }

        return sales;
    }

    // -------------------------------------------------------------------------
    // Reprocessing (ASYNC: enfileira worker)
    // -------------------------------------------------------------------------
    async reprocessInvoice(tenantId: number, invoiceId: number) {
        // TODO: Enqueue worker job
        // For now, just return queued status
        return {
            status: 'queued',
            jobId: `invoice-reprocess-${invoiceId}-${Date.now()}`,
            message: 'Invoice reprocessing queued',
        };
    }

    async reprocessSales(tenantId: number, salesId: number) {
        // TODO: Enqueue worker job
        return {
            status: 'queued',
            jobId: `sales-reprocess-${salesId}-${Date.now()}`,
            message: 'Sales reprocessing queued',
        };
    }

    // -------------------------------------------------------------------------
    // Products, Recipes, Users (com limites)
    // -------------------------------------------------------------------------
    async getTenantProducts(tenantId: number, limit: number = 100) {
        return prisma.produto.findMany({
            where: { tenant_id: tenantId },
            take: limit,
            select: {
                id: true,
                nome: true,
                unidade_medida: true,
                ativo: true,
                subfamilia: { select: { nome: true } },
            },
        });
    }

    async getTenantRecipes(tenantId: number, limit: number = 50) {
        return prisma.receita.findMany({
            where: { tenant_id: tenantId },
            take: limit,
            select: {
                id: true,
                nome: true,
                tipo: true,
                custo_por_porcao: true,
                ativa: true,
            },
        });
    }

    async getTenantUsers(tenantId: number) {
        const userTenants = await prisma.userTenant.findMany({
            where: { tenant_id: tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        ultimo_login: true,
                    },
                },
            },
        });

        return userTenants.map((ut) => ({
            ...ut.user,
            role: ut.role,
            ativo: ut.ativo,
        }));
    }

    // -------------------------------------------------------------------------
    // Timeline (CACHE: limita a 50 eventos)
    // -------------------------------------------------------------------------
    async getTenantTimeline(tenantId: number) {
        const cacheKey = `tenant:timeline:${tenantId}`;

        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const events = await prisma.tenantEvent.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'desc' },
            take: 50,
        });

        await redis.setex(cacheKey, 300, JSON.stringify(events));

        return events;
    }

    // -------------------------------------------------------------------------
    // Actions (leves)
    // -------------------------------------------------------------------------
    async clearTenantCache(tenantId: number) {
        // Clear all cache keys for this tenant
        const pattern = `tenant:*:${tenantId}`;
        const keys = await redis.keys(pattern);

        if (keys.length > 0) {
            await redis.del(...keys);
        }

        return { status: 'queued', message: `Cleared ${keys.length} cache keys` };
    }

    async addTenantNote(tenantId: number, internalUserId: string, content: string) {
        return prisma.tenantNote.create({
            data: {
                tenant_id: tenantId,
                internal_user_id: internalUserId,
                content,
            },
        });
    }

    async suspendTenant(tenantId: number, reason: string) {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                status: 'suspended',
                suspended_at: new Date(),
                suspension_reason: reason,
            },
        });

        // Create event
        await prisma.tenantEvent.create({
            data: {
                tenant_id: tenantId,
                event_type: 'suspended',
                description: `Tenant suspended: ${reason}`,
                metadata_json: JSON.stringify({ reason }),
            },
        });
    }

    async activateTenant(tenantId: number) {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                status: 'active',
                suspended_at: null,
                suspension_reason: null,
            },
        });

        // Create event
        await prisma.tenantEvent.create({
            data: {
                tenant_id: tenantId,
                event_type: 'reactivated',
                description: 'Tenant reactivated',
            },
        });
    }
}

export const internalTenantsService = new InternalTenantsService();

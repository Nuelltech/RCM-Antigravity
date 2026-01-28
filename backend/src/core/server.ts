
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { env } from './env';
import { tenantMiddleware } from './middleware';

// Import routes
import { authRoutes } from '../modules/auth/auth.routes';
import { tenantRoutes } from '../modules/tenants/tenants.module';
import { productRoutes } from '../modules/produtos/produtos.module';
import { recipeRoutes } from '../modules/receitas/receitas.module';
import { purchaseRoutes } from '../modules/compras/compras.module';
import { menuRoutes } from '../modules/menu/menu.module';
import { inventoryRoutes } from '../modules/inventario/inventario.module';
import { salesRoutes } from '../modules/vendas/vendas.module';
import { integrationRoutes } from '../modules/integracoes/integracoes.module';
import { aiRoutes } from '../modules/ai/ai.module';
import { comboRoutes } from '../modules/combos/combos.module';
import { formatosVendaRoutes } from '../modules/formatos-venda/formatos-venda.module';
import { templateFormatoVendaRoutes } from '../modules/template-formatos-venda/template-formatos-venda.module';
import { templateVariacaoCompraRoutes } from '../modules/template-variacoes-compra/template-variacoes-compra.module';
import { dashboardRoutes } from '../modules/dashboard/dashboard.module';
// import { variacoesProdutoRoutes } from '../modules/variacoes-produto/variacoes-produto.module';
import { dadosRestauranteRoutes } from '../modules/dados-restaurante/dados-restaurante.module';
import { alertsRoutes } from '../modules/alerts/alerts.module';
import { consumosRoutes } from '../modules/consumos/consumos.module';
import { invoicesRoutes } from '../modules/invoices/invoices.module';
import { usersRoutes } from '../modules/users/users.routes';
import { purchasesDashboardRoutes } from '../modules/purchases-dashboard/purchases-dashboard.module';
import { menuAnalysisRoutes } from '../modules/menu-analysis/menu-analysis.module';
// import { leadsRoutes } from '../modules/leads/leads.routes';

const server = Fastify({
    logger: true,
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

async function main() {
    await server.register(cors, {
        origin: (origin, cb) => {
            // Allow requests without origin header (health checks, same-origin, internal requests)
            if (!origin) {
                cb(null, true);
                return;
            }

            // In production, whitelist specific domains
            if (env.NODE_ENV === 'production') {
                const allowedOrigins = [
                    // Production domains
                    'https://rcm-app.com',
                    'https://www.rcm-app.com',
                    // Vercel preview deployments
                    /\.vercel\.app$/,
                    // Render backend
                    /\.onrender\.com$/,
                    // GitHub Codespaces (Broad Allow)
                    /app\.github\.dev/,
                    /github\.dev/,
                    // Mobile App & Localhost
                    'null',
                    'file://',
                    'http://localhost',
                    'http://10.0.2.2', // Android Emulator
                    'http://localhost:8081'
                ];

                const isAllowed = allowedOrigins.some(pattern =>
                    typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
                );

                if (isAllowed) {
                    cb(null, true);
                } else {
                    cb(new Error('Not allowed by CORS'), false);
                }
            } else {
                // In development, allow all origins
                cb(null, true);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
        exposedHeaders: ['Content-Type', 'Authorization'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });

    await server.register(jwt, {
        secret: env.JWT_SECRET,
    });

    await server.register(swagger, {
        openapi: {
            info: {
                title: 'RCM API',
                description: 'RCM API',
                version: '1.0.0',
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
        },
    });

    await server.register(swaggerUi, {
        routePrefix: '/documentation',
    });

    // Register static file serving
    // Served at /uploads/* -> maps to ../../uploads/* (root/backend/uploads)
    const { default: fastifyStatic } = await import('@fastify/static');
    const path = await import('path');

    server.register(fastifyStatic, {
        root: path.join(__dirname, '../../uploads'),
        prefix: '/uploads/',
        decorateReply: false // Avoid conflict if multiple static registers
    });


    // Public routes (NO AUTH REQUIRED) - must be registered BEFORE auth middleware
    // server.register(leadsRoutes, { prefix: '/api/public' });

    // Internal auth routes (NO CUSTOMER AUTH REQUIRED)
    const { internalAuthRoutes } = await import('../modules/internal-auth/internal-auth.routes');
    server.register(internalAuthRoutes, { prefix: '/api/internal/auth' });

    // Internal users management (REQUIRES INTERNAL AUTH - ADMIN)
    const { internalUsersRoutes } = await import('../modules/internal-users/internal-users.routes');
    server.register(internalUsersRoutes, { prefix: '/api/internal/users' });

    // Internal roles management (REQUIRES INTERNAL AUTH - ADMIN)
    const { internalRolesRoutes } = await import('../modules/internal-roles/internal-roles.routes');
    server.register(internalRolesRoutes, { prefix: '/api/internal/roles' });

    // Internal leads management routes (REQUIRES INTERNAL AUTH)
    // Fixed leads service schema fields 
    const { internalLeadsRoutes } = await import('../modules/leads/internal-leads.routes');
    server.register(internalLeadsRoutes, { prefix: '/api/internal' });

    // Internal dashboard stats (REQUIRES INTERNAL AUTH)
    const { dashboardStatsRoutes } = await import('../modules/dashboard-stats/dashboard-stats.routes');
    server.register(dashboardStatsRoutes, { prefix: '/api/internal/dashboard' });


    // Internal system health (REQUIRES INTERNAL AUTH)
    const { systemHealthRoutes } = await import('../modules/system-health/system-health.routes');
    server.register(systemHealthRoutes, { prefix: '/api/internal/health' });

    // Internal tenants management (REQUIRES INTERNAL AUTH)
    const { internalTenantsModule } = await import('../modules/internal-tenants/internal-tenants.module');
    server.register(internalTenantsModule);


    // Health Check & Root Route (NO AUTH REQUIRED - must be BEFORE middleware)
    server.get('/health', async () => {
        return { status: 'ok', timestamp: new Date() };
    });

    // Silently handle favicon requests to prevent 404 errors
    server.get('/favicon.ico', async (req, reply) => {
        reply.code(204).send();
    });

    server.get('/', async () => {
        return {
            name: 'RCM API',
            version: '1.0.0',
            status: 'running',
            documentation: '/documentation'
        };
    });

    server.get('/api/health', async () => {
        return { status: 'ok', timestamp: new Date() };
    });


    // Global Middleware (applies to ALL routes registered AFTER this point)

    // Performance Tracker (Phase 4)
    server.addHook('onRequest', async (req, reply) => {
        const { performanceTracker } = await import('./middleware/performance-tracker');
        await performanceTracker(req, reply);
    });

    server.addHook('onRequest', async (req, reply) => {
        const { authMiddleware } = await import('./middleware');
        await authMiddleware(req, reply);
    });
    server.addHook('onRequest', tenantMiddleware);

    // Global Error Logger (Phase 4)
    server.setErrorHandler(async (error, req, reply) => {
        const { errorLogger } = await import('./middleware/error-logger');
        await errorLogger(error, req, reply);
    });

    // Register Modules
    server.register(authRoutes, { prefix: '/api/auth' });
    server.register(tenantRoutes, { prefix: '/api/tenants' });
    server.register(productRoutes, { prefix: '/api/products' });
    server.register(recipeRoutes, { prefix: '/api/recipes' });
    server.register(purchaseRoutes, { prefix: '/api/purchases' });
    server.register(menuRoutes, { prefix: '/api/menu' });
    server.register(inventoryRoutes, { prefix: '/api/inventory' });
    server.register(salesRoutes, { prefix: '/api/vendas' });
    server.register(integrationRoutes, { prefix: '/api/integrations' });
    server.register(aiRoutes, { prefix: '/api/ai' });
    server.register(comboRoutes, { prefix: '/api/combos' });
    server.register(formatosVendaRoutes, { prefix: '/api/formatos-venda' });
    server.register(templateFormatoVendaRoutes, { prefix: '/api' });
    server.register(templateVariacaoCompraRoutes, { prefix: '/api' });
    server.register(dashboardRoutes, { prefix: '/api/dashboard' });
    // server.register(variacoesProdutoRoutes, { prefix: '/api/variacoes-produto' });
    server.register(dadosRestauranteRoutes, { prefix: '/api/dados-restaurante' });
    server.register(alertsRoutes, { prefix: '/api/alerts' });
    server.register(consumosRoutes, { prefix: '/api' });
    server.register(invoicesRoutes, { prefix: '/api/invoices' });
    server.register(usersRoutes, { prefix: '/api/users' });
    server.register(purchasesDashboardRoutes, { prefix: '/api/purchases' });  // Dashboard analytics
    server.register(menuAnalysisRoutes, { prefix: '/api/menu' });  // Menu Engineering Analysis



    try {
        await server.listen({ port: parseInt(env.PORT), host: '0.0.0.0' });
        console.log(`Server running on port ${env.PORT}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

main();

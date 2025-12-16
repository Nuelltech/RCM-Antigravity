
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
import { variacoesProdutoRoutes } from '../modules/variacoes-produto/variacoes-produto.module';
import { dadosRestauranteRoutes } from '../modules/dados-restaurante/dados-restaurante.module';
import { alertsRoutes } from '../modules/alerts/alerts.module';
import { consumosRoutes } from '../modules/consumos/consumos.module';
import { invoicesRoutes } from '../modules/invoices/invoices.module';

const server = Fastify({
    logger: true,
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

async function main() {
    await server.register(cors, {
        origin: env.NODE_ENV === 'production'
            ? [
                /\.vercel\.app$/,  // Vercel deployments
                /\.onrender\.com$/, // Render deployments
                'https://rcm-frontend.vercel.app', // Production frontend
                'https://rcm.net', // Custom domain
                'https://www.rcm.net', // Custom domain www
            ]
            : true, // Allow all origins in development
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

    // Global Middleware
    server.addHook('onRequest', async (req, reply) => {
        const { authMiddleware } = await import('./middleware');
        await authMiddleware(req, reply);
    });
    server.addHook('onRequest', tenantMiddleware);

    // Health Check
    server.get('/health', async () => {
        return { status: 'ok', timestamp: new Date() };
    });

    // Root Route
    server.get('/', async () => {
        return {
            name: 'RCM API',
            version: '1.0.0',
            status: 'running',
            documentation: '/documentation'
        };
    });

    // Register Modules
    server.register(authRoutes, { prefix: '/api/auth' });
    server.register(tenantRoutes, { prefix: '/api/tenants' });
    server.register(productRoutes, { prefix: '/api/products' });
    server.register(recipeRoutes, { prefix: '/api/recipes' });
    server.register(purchaseRoutes, { prefix: '/api/purchases' });
    server.register(menuRoutes, { prefix: '/api/menu' });
    server.register(inventoryRoutes, { prefix: '/api/inventory' });
    server.register(salesRoutes, { prefix: '/api/sales' });
    server.register(integrationRoutes, { prefix: '/api/integrations' });
    server.register(aiRoutes, { prefix: '/api/ai' });
    server.register(comboRoutes, { prefix: '/api/combos' });
    server.register(formatosVendaRoutes, { prefix: '/api/formatos-venda' });
    server.register(templateFormatoVendaRoutes, { prefix: '/api' });
    server.register(templateVariacaoCompraRoutes, { prefix: '/api' });
    server.register(dashboardRoutes, { prefix: '/api/dashboard' });
    server.register(variacoesProdutoRoutes, { prefix: '/api/variacoes-produto' });
    server.register(dadosRestauranteRoutes, { prefix: '/api/dados-restaurante' });
    server.register(alertsRoutes, { prefix: '/api/alerts' });
    server.register(consumosRoutes, { prefix: '/api' });
    server.register(invoicesRoutes, { prefix: '/api/invoices' });



    try {
        await server.listen({ port: parseInt(env.PORT), host: '0.0.0.0' });
        console.log(`Server running on port ${env.PORT}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

main();

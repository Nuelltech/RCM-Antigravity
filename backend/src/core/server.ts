
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { env } from './env';
import { tenantMiddleware } from './middleware/tenant';

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

const server = Fastify({
    logger: true,
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

async function main() {
    await server.register(cors, {
        origin: '*', // Adjust for production
    });

    await server.register(jwt, {
        secret: env.JWT_SECRET,
    });

    await server.register(swagger, {
        openapi: {
            info: {
                title: 'RCM API',
                description: 'Restaurante Cost Manager API',
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
    server.addHook('onRequest', tenantMiddleware);

    // Health Check
    server.get('/health', async () => {
        return { status: 'ok', timestamp: new Date() };
    });

    // Register Modules
    server.register(authRoutes, { prefix: '/api/v1/auth' });
    server.register(tenantRoutes, { prefix: '/api/v1/tenants' });
    server.register(productRoutes, { prefix: '/api/v1/products' });
    server.register(recipeRoutes, { prefix: '/api/v1/recipes' });
    server.register(purchaseRoutes, { prefix: '/api/v1/purchases' });
    server.register(menuRoutes, { prefix: '/api/v1/menu' });
    server.register(inventoryRoutes, { prefix: '/api/v1/inventory' });
    server.register(salesRoutes, { prefix: '/api/v1/sales' });
    server.register(integrationRoutes, { prefix: '/api/v1/integrations' });
    server.register(aiRoutes, { prefix: '/api/v1/ai' });

    try {
        await server.listen({ port: parseInt(env.PORT), host: '0.0.0.0' });
        console.log(`Server running on port ${env.PORT}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

main();

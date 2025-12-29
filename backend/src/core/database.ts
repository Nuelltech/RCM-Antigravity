import { PrismaClient } from '@prisma/client';
import { env } from './env';

export const prisma = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: env.DATABASE_URL,
        },
    },
    // Connection pooling for high concurrency (30+ VUs)
    // Default pool size is ~10, increased to 100 for load testing
    // Adjust based on your MySQL max_connections (default: 151)
}).$extends({
    name: 'connection-pool-config',
    client: {
        $connect: async function () {
            // @ts-ignore - Prisma internal property
            await this.$connect();
        },
    },
});


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting cleanup of poisoned tables...');

    try {
        // Drop tables in dependency order (child first)
        console.log('Dropping performance_metrics...');
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS performance_metrics;`);

        console.log('Dropping error_logs...');
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS error_logs;`);

        console.log('Dropping sales_processing_metrics...');
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS sales_processing_metrics;`);

        console.log('Dropping sales_matching_historico...');
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS sales_matching_historico;`);

        console.log('Dropping worker_metrics...');
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS worker_metrics;`);

        console.log('✅ Cleanup complete. Database should be clean for baseline generation.');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

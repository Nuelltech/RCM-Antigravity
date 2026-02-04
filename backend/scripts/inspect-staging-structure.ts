
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectStructure() {
    console.log('🔍 Inspecting Database Structure...');

    try {
        const columns = await prisma.$queryRaw`
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `;

        console.log(JSON.stringify(columns, null, 2));
    } catch (error) {
        console.error('Error inspecting structure:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectStructure();

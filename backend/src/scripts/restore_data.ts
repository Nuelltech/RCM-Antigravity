
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Order is critical for Foreign Keys!
const modelsOrder = [
    'tenant',
    'user',
    'tenantLimits', // Depends on tenant
    'familia',      // Depends on tenant
    'subfamilia',   // Depends on familia
    'produto',      // Depends on subfamilia
    'variacaoProduto', // Depends on produto
    'receita',      // Concrete recipes
    'ingredienteReceita', // Link tables
    'etapaReceita',
    'menuItem',
    'venda',
    // ... add others as needed, keeping safe order
    // These likely failed backup but we include them just in case
    'fornecedor',
    'compra',
    'faturaImportacao',
    'compraFatura',
    'dadosRestaurante',
    'custoEstrutura'
];

async function restore() {
    const backupsBaseDir = path.join(__dirname, '../backups/json');

    if (!fs.existsSync(backupsBaseDir)) {
        console.error(`❌ Backups directory not found: ${backupsBaseDir}`);
        return;
    }

    // Find latest backup folder
    const folders = fs.readdirSync(backupsBaseDir)
        .filter(f => fs.statSync(path.join(backupsBaseDir, f)).isDirectory())
        .sort()
        .reverse();

    if (folders.length === 0) {
        console.error("❌ No backup folders found.");
        return;
    }

    const latestBackup = folders[0];
    const backupDir = path.join(backupsBaseDir, latestBackup);

    console.log(`🚀 Restoring from: ${latestBackup}`);
    console.log(`Database URL: ${process.env.DATABASE_URL?.split('@')[1]}`);

    // Disable FK checks to allow flexibility or do it in strict order?
    // Distributed databases/Prisma don't always support disabling FK easily.
    // We will try strict order insertion.

    for (const model of modelsOrder) {
        const filePath = path.join(backupDir, `${model}.json`);

        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ File not found for ${model}, skipping.`);
            continue;
        }

        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(fileContent);

            if (!Array.isArray(data) || data.length === 0) {
                console.log(`ℹ️ ${model}: No data to restore.`);
                continue;
            }

            console.log(`♻️ Restoring ${model} (${data.length} records)...`);

            // We use createMany for speed, or create if strictly needed
            // Note: skipDuplicates might help if partial data exists
            // @ts-ignore
            await prisma[model].createMany({
                data: data,
                skipDuplicates: true
            });

        } catch (error) {
            console.error(`❌ Error restoring ${model}:`, error);
            // Don't stop process, try next table
        }
    }

    console.log('✅ Restore completed!');
}

restore()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

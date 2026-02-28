
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Full Staging Data Restoration from SQL Dump...');

    const dumpPath = path.join(__dirname, '../backups/habimark_RCM_STAGING_16_02_2026.sql');

    if (!fs.existsSync(dumpPath)) {
        console.error(`❌ Dump file not found at: ${dumpPath}`);
        process.exit(1);
    }

    console.log(`✓ Found dump file: ${dumpPath}`);

    // Read file
    const sqlContent = fs.readFileSync(dumpPath, 'utf-8');

    // Split into statements
    // NOTE: This simple split might break if data contains ";\n" inside strings, but standard mysqldump usually puts newline after ; for statements.
    // Enhanced split: Look for ";\n" or ";\r\n" specifically at end of lines.
    const statements = sqlContent
        .split(/;\r?\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`✓ Parsed ${statements.length} SQL statements.\n`);

    // Disable FK checks
    console.log('🔒 Disabling Foreign Key Checks...');
    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);

    let successCount = 0;
    let failCount = 0;

    // Tables strictly to restore (INSERTs only)
    // We skip CREATE TABLE, DROP TABLE, etc.
    // list includes tables we know we want
    const tablesToRestore = [
        'dados_restaurante',
        'familias',
        'subfamilias',
        'fornecedores',
        'custos_estrutura',
        'custos_estrutura_historico',
        'alertas_ai',
        'produtos',
        'receitas',
        'ingredientes_receita',
        'etapas_receita',
        'menu',
        'faturas_importacao',
        'faturas_linhas_importacao',
        'matching_historico',
        'sales_matching_historico',
        'vendas', // if present
        'inventarios', // if present
        'compras', // if present
        'feature_catalog',
        'formatos_venda',
        'historico_precos'
    ];

    for (const statement of statements) {
        // Clean up statement: remove leading comments
        const cleanStatement = statement
            .split('\n')
            .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('/*'))
            .join('\n')
            .trim();

        if (!cleanStatement) continue;

        // More robust regex for identifying table names
        // Matches: INSERT INTO `tableName` or INSERT INTO tableName
        const tableNameMatch = cleanStatement.match(/INSERT\s+INTO\s+[`"]?([a-zA-Z0-9_]+)[`"]?/i);

        if (tableNameMatch) {
            const tableName = tableNameMatch[1];

            if (tablesToRestore.includes(tableName)) {
                try {
                    // Execute raw
                    await prisma.$executeRawUnsafe(cleanStatement);
                    process.stdout.write('.'); // progress indicator
                    successCount++;
                } catch (e: any) {
                    // Ignore "Duplicate entry" errors if we are re-running
                    if (e.message.includes('Duplicate entry')) {
                        // console.warn(`  ⚠️ Skipped duplicate in ${tableName}`);
                    } else {
                        console.error(`\n❌ Error inserting into ${tableName}: ${e.message.substring(0, 100)}...`);
                        failCount++;
                    }
                }
            } else {
                // Optional: Log skipped tables for debugging (verbose)
                // console.log(`Skipped table: ${tableName}`);
            }
        }
    }

    // Re-enable FK checks
    console.log('\n\n🔓 Re-enabling Foreign Key Checks...');
    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);

    console.log(`\n✅ Restoration Complete!`);
    console.log(`   Success: ${successCount} statements`);
    console.log(`   Failed:  ${failCount} statements`);

    // Verify some counts
    const productCount = await prisma.produto.count();
    const recipeCount = await prisma.receita.count();
    const menuCount = await prisma.menuItem.count();

    console.log(`\n📊 Current Database Stats:`);
    console.log(`   Products: ${productCount}`);
    console.log(`   Recipes:  ${recipeCount}`);
    console.log(`   Menu Items: ${menuCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

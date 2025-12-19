
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const models = [
    'tenant',
    'user',
    'userTenant',
    'session',
    'twoFactorBackupCode',
    'passwordReset',
    'tenantLimits',
    'auditLog',
    'familia',
    'subfamilia',
    'produto',
    'variacaoProduto',
    'templateVariacaoCompra',
    'formatoVenda',
    'templateFormatoVenda',
    'historicoPreco',
    'fornecedor',
    'compra',
    'compraTemporaria',
    'compraFatura',
    'compraItem',
    'receita',
    'ingredienteReceita',
    'etapaReceita',
    'menuItem',
    'venda',
    'localizacao',
    'listaCalculadora',
    'sessaoInventario',
    'itemInventario',
    'stockTeorico',
    'alertaAi',
    'conversaAi',
    'integracao',
    'mapeamentoPos',
    'combo',
    'comboItem',
    'comboCategoria',
    'comboCategoriaOpcao',
    'dadosRestaurante',
    'custoEstrutura',
    'faturaImportacao',
    'faturaLinhaImportacao',
    'matchingHistorico',
    'invoiceTemplate'
];

async function backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups/json', timestamp);

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`🚀 Starting JSON Backup to: ${backupDir}`);
    console.log(`Database URL in use: ${process.env.DATABASE_URL?.split('@')[1]}`); // Mask credentials

    for (const model of models) {
        try {
            // Check if model exists in prisma client instance to avoid runtime errors
            // @ts-ignore
            if (!prisma[model]) {
                console.warn(`⚠️ Model '${model}' not found in Prisma Client. Skipping.`);
                continue;
            }

            // @ts-ignore
            const count = await prisma[model].count();
            console.log(`📦 Backing up ${model} (${count} records)...`);

            // @ts-ignore
            const data = await prisma[model].findMany();

            const filePath = path.join(backupDir, `${model}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        } catch (error) {
            console.error(`❌ Error backing up ${model}:`, error);
        }
    }

    console.log('✅ Backup completed!');
}

backup()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

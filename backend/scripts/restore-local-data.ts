
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting data restoration from snapshot...');

    const backupPath = path.join(__dirname, 'backup-local-snapshot.json');
    if (!fs.existsSync(backupPath)) {
        console.error('❌ Backup file not found!');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    // Disable Foreign Key Checks to allow inserting in any order (or ensure we insert in order)
    // For safety/simplicity in Prisma, we'll try to insert in dependency order.

    // 1. Core
    console.log(`📥 Restoring ${data.users?.length || 0} Users...`);
    if (data.users?.length) await prisma.user.createMany({ data: data.users, skipDuplicates: true });

    console.log(`📥 Restoring ${data.tenants?.length || 0} Tenants...`);
    if (data.tenants?.length) await prisma.tenant.createMany({ data: data.tenants, skipDuplicates: true });

    console.log(`📥 Restoring UserTenants...`);
    if (data.userTenants?.length) await prisma.userTenant.createMany({ data: data.userTenants, skipDuplicates: true });

    // 2. Products Hierarchy
    console.log(`📥 Restoring Families & Subfamilies...`);
    if (data.familias?.length) await prisma.familia.createMany({ data: data.familias, skipDuplicates: true });
    if (data.subfamilias?.length) await prisma.subfamilia.createMany({ data: data.subfamilias, skipDuplicates: true });

    // 3. Products
    console.log(`📥 Restoring Products...`);
    if (data.produtos?.length) await prisma.produto.createMany({ data: data.produtos, skipDuplicates: true });

    console.log(`📥 Restoring Variations...`);
    if (data.variacoes?.length) await prisma.variacaoProduto.createMany({ data: data.variacoes, skipDuplicates: true });

    // 4. Recipes
    console.log(`📥 Restoring Recipes...`);
    if (data.receitas?.length) await prisma.receita.createMany({ data: data.receitas, skipDuplicates: true });

    console.log(`📥 Restoring Recipe Ingredients...`);
    if (data.ingredientesReceita?.length) await prisma.ingredienteReceita.createMany({ data: data.ingredientesReceita, skipDuplicates: true });

    // 5. Menu
    console.log(`📥 Restoring Menu Items...`);
    if (data.menuItems?.length) await prisma.menuItem.createMany({ data: data.menuItems, skipDuplicates: true });

    // 6. Suppliers & Others
    console.log(`📥 Restoring Suppliers...`);
    if (data.fornecedores?.length) await prisma.fornecedor.createMany({ data: data.fornecedores, skipDuplicates: true });

    console.log(`📥 Restoring Purchases...`);
    if (data.compras?.length) await prisma.compra.createMany({ data: data.compras, skipDuplicates: true });

    console.log(`📥 Restoring Sales (Vendas)...`);
    if (data.vendas?.length) await prisma.venda.createMany({ data: data.vendas, skipDuplicates: true });

    console.log('✅ Restoration complete! Your data is safe.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

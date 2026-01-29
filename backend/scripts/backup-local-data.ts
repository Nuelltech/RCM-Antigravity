
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting full local backup...');

    const backupData: any = {};

    // 1. Core
    console.log('📦 Backing up Users & Tenants...');
    backupData.users = await prisma.user.findMany();
    backupData.tenants = await prisma.tenant.findMany();
    backupData.userTenants = await prisma.userTenant.findMany();

    // 2. Products Hierarchy
    console.log('📦 Backing up Families & Subfamilies...');
    backupData.familias = await prisma.familia.findMany();
    backupData.subfamilias = await prisma.subfamilia.findMany();

    // 3. Products & Recipes
    console.log('📦 Backing up Products, Variations & Recipes...');
    backupData.produtos = await prisma.produto.findMany();
    backupData.variacoes = await prisma.variacaoProduto.findMany();
    backupData.receitas = await prisma.receita.findMany();
    backupData.ingredientesReceita = await prisma.ingredienteReceita.findMany();

    // 4. Menu & Sales
    console.log('📦 Backing up Menu & Sales...');
    backupData.menuItems = await prisma.menuItem.findMany();

    // Back up Vendas - Careful with large datasets in prod, but for local "playground" data it's fine
    backupData.vendas = await prisma.venda.findMany();

    // 5. Suppliers & Buys
    console.log('📦 Backing up Suppliers & Purchases...');
    backupData.fornecedores = await prisma.fornecedor.findMany();
    backupData.compras = await prisma.compra.findMany();
    backupData.compraItens = await prisma.compraItem.findMany();

    // Save to file
    const backupPath = path.join(__dirname, 'backup-local-snapshot.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup saved successfully to: ${backupPath}`);
    console.log(`📊 Stats: ${backupData.produtos.length} products, ${backupData.vendas.length} sales, ${backupData.menuItems.length} menu items.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

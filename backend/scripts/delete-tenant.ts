
import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
    try {
        console.log('--- Tenant Deletion Tool ---');
        console.log('Use this tool to completely remove a tenant and all its data.');

        const input = await askQuestion('Enter Tenant Slug or ID to delete: ');

        if (!input) {
            console.log('No input provided. Exiting.');
            process.exit(0);
        }

        let tenant;
        if (!isNaN(Number(input))) {
            tenant = await prisma.tenant.findUnique({ where: { id: Number(input) } });
        } else {
            tenant = await prisma.tenant.findUnique({ where: { slug: input } });
        }

        if (!tenant) {
            console.error(`Tenant not found with identifier: ${input}`);
            process.exit(1);
        }

        console.log(`\n!!! WARNING !!!`);
        console.log(`You are about to DELETE tenant: ${tenant.nome_restaurante} (ID: ${tenant.id}, Slug: ${tenant.slug})`);
        console.log(`This will delete ALL data associated with this tenant, including:`);
        console.log(`- Products, Recipes, Menus`);
        console.log(`- Sales, Purchases, Invoices`);
        console.log(`- Users associations (Users themselves will remain if linked to other tenants)`);
        console.log(`\nThere is NO UNDO.`);

        const confirmation = await askQuestion('Type "DELETE" to confirm: ');

        if (confirmation !== 'DELETE') {
            console.log('Confirmation failed. Aborted.');
            process.exit(0);
        }

        console.log('\nStarting deletion process...');

        await prisma.$transaction(async (tx) => {
            const tenantId = tenant.id;

            // 1. Logs & Metrics
            console.log('Deleting logs...');
            await tx.auditLog.deleteMany({ where: { tenant_id: tenantId } });
            await tx.errorLog.deleteMany({ where: { tenant_id: tenantId } });
            await tx.integrationLogItem.deleteMany({ where: { log: { tenant_id: tenantId } } });
            await tx.integrationLog.deleteMany({ where: { tenant_id: tenantId } });
            // performance_metrics, worker_metrics (if linked) - tenant_id is optional there
            await tx.performanceMetric.deleteMany({ where: { tenant_id: tenantId } });

            // 2. Billing & Subscription
            console.log('Deleting billing data...');
            // TenantAddon, PaymentHistory linked to TenantSubscription
            // TenantSubscription linked to Tenant
            // We probably need to delete PaymentHistory first
            const sub = await tx.tenantSubscription.findUnique({ where: { tenant_id: tenantId } });
            if (sub) {
                await tx.paymentHistory.deleteMany({ where: { subscription_id: sub.id } });
                await tx.tenantAddon.deleteMany({ where: { tenant_id: tenantId } });
                await tx.tenantSubscription.delete({ where: { id: sub.id } });
            }

            // 3. Operational Data (Inventory, Sales, etc)
            console.log('Deleting operational data...');
            await tx.sessaoInventario.deleteMany({ where: { tenant_id: tenantId } }); // Cascade items? itemsInventario has tenant_id too
            await tx.itemInventario.deleteMany({ where: { tenant_id: tenantId } });
            await tx.stockTeorico.deleteMany({ where: { tenant_id: tenantId } });

            // Sales
            await tx.vendaLinhaImportacao.deleteMany({ where: { tenant_id: tenantId } });
            await tx.vendaImportacao.deleteMany({ where: { tenant_id: tenantId } });

            await tx.venda.deleteMany({ where: { tenant_id: tenantId } });

            // 4. Catalog & Core
            console.log('Deleting catalog...');
            await tx.comboItem.deleteMany({ where: { tenant_id: tenantId } });
            await tx.comboCategoriaOpcao.deleteMany({ where: { tenant_id: tenantId } });
            await tx.comboCategoria.deleteMany({ where: { tenant_id: tenantId } });
            await tx.combo.deleteMany({ where: { tenant_id: tenantId } });

            await tx.menuItem.deleteMany({ where: { tenant_id: tenantId } });

            await tx.ingredienteReceita.deleteMany({ where: { tenant_id: tenantId } });
            await tx.etapaReceita.deleteMany({ where: { tenant_id: tenantId } });
            await tx.receita.deleteMany({ where: { tenant_id: tenantId } });

            // Purchases
            await tx.compraItem.deleteMany({ where: { tenant_id: tenantId } });
            await tx.compraTemporaria.deleteMany({ where: { tenant_id: tenantId } });
            await tx.compraFatura.deleteMany({ where: { tenant_id: tenantId } });
            await tx.compra.deleteMany({ where: { tenant_id: tenantId } });

            // Products
            await tx.variacaoProduto.deleteMany({ where: { tenant_id: tenantId } });
            await tx.produto.deleteMany({ where: { tenant_id: tenantId } });

            // Families
            await tx.subfamilia.deleteMany({ where: { tenant_id: tenantId } });
            await tx.familia.deleteMany({ where: { tenant_id: tenantId } });

            // Others
            await tx.fornecedor.deleteMany({ where: { tenant_id: tenantId } });
            await tx.localizacao.deleteMany({ where: { tenant_id: tenantId } });
            await tx.custoEstruturaHistorico.deleteMany({ where: { tenant_id: tenantId } });
            await tx.custoEstrutura.deleteMany({ where: { tenant_id: tenantId } });
            await tx.dadosRestaurante.deleteMany({ where: { tenant_id: tenantId } });

            // 5. Access
            console.log('Deleting access...');
            await tx.userTenant.deleteMany({ where: { tenant_id: tenantId } });
            await tx.session.deleteMany({ where: { tenant_id: tenantId } });

            // 6. Tenant
            console.log('Deleting tenant record...');
            await tx.tenant.delete({ where: { id: tenantId } });
        });

        console.log('✅ Tenant successfully deleted.');

    } catch (error) {
        console.error('❌ Error deleting tenant:', error);
    } finally {
        await prisma.$disconnect();
        rl.close();
        process.exit(0);
    }
}

main();

import { prisma } from '../src/core/database';

async function checkData() {
    console.log('📊 Verificando dados na base de dados...\n');
    console.log('='.repeat(60));

    try {
        // Core data
        const tenants = await prisma.tenant.count();
        const users = await prisma.user.count();
        const userTenants = await prisma.userTenant.count();
        const internalUsers = await prisma.internalUser.count();

        console.log('\n🏢 DADOS CORE:');
        console.log(`  Tenants: ${tenants}`);
        console.log(`  Users: ${users}`);
        console.log(`  UserTenants: ${userTenants}`);
        console.log(`  Internal Users: ${internalUsers}`);

        // Product data
        const familias = await prisma.familia.count();
        const subfamilias = await prisma.subfamilia.count();
        const produtos = await prisma.produto.count();
        const variacoes = await prisma.variacaoProduto.count();

        console.log('\n📦 PRODUTOS:');
        console.log(`  Famílias: ${familias}`);
        console.log(`  Subfamílias: ${subfamilias}`);
        console.log(`  Produtos: ${produtos}`);
        console.log(`  Variações de Compra: ${variacoes}`);

        // Recipe & Menu data
        const receitas = await prisma.receita.count();
        const ingredientes = await prisma.ingredienteReceita.count();
        const etapas = await prisma.etapaReceita.count();
        const menuItems = await prisma.menuItem.count();

        console.log('\n🍳 RECEITAS & MENU:');
        console.log(`  Receitas: ${receitas}`);
        console.log(`  Ingredientes: ${ingredientes}`);
        console.log(`  Etapas: ${etapas}`);
        console.log(`  Menu Items: ${menuItems}`);

        // Combos
        const combos = await prisma.combo.count();
        const comboCategorias = await prisma.comboCategoria.count();
        const comboItens = await prisma.comboItem.count();

        console.log('\n🍔 COMBOS:');
        console.log(`  Combos: ${combos}`);
        console.log(`  Categorias: ${comboCategorias}`);
        console.log(`  Itens: ${comboItens}`);

        // Sales formats
        const formatosVenda = await prisma.formatoVenda.count();
        const templateFormatos = await prisma.templateFormatoVenda.count();

        console.log('\n💰 FORMATOS DE VENDA:');
        console.log(`  Formatos: ${formatosVenda}`);
        console.log(`  Templates: ${templateFormatos}`);

        // Purchases & Suppliers
        const fornecedores = await prisma.fornecedor.count();
        const compras = await prisma.compra.count();
        const comprasFaturas = await prisma.compraFatura.count();

        console.log('\n🛒 COMPRAS:');
        console.log(`  Fornecedores: ${fornecedores}`);
        console.log(`  Compras: ${compras}`);
        console.log(`  Faturas: ${comprasFaturas}`);

        // Leads (Phase 1)
        const leads = await prisma.lead.count();
        const demoRequests = await prisma.demoRequest.count();

        console.log('\n📈 LEADS (Phase 1):');
        console.log(`  Leads: ${leads}`);
        console.log(`  Demo Requests: ${demoRequests}`);

        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Verificação concluída!\n');

    } catch (error: any) {
        console.error('❌ Erro:', error.message);
    }
}

checkData()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

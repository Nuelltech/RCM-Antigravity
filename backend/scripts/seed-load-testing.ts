import { prisma } from '../src/core/database';
import bcrypt from 'bcryptjs';

// Simple helpers for random data without external dependencies
const randomName = (prefix: string, index: number) => `${prefix}-${index}-${Math.random().toString(36).substring(7)}`;
const randomEmail = (prefix: string, index: number) => `${prefix}${index}@test.com`;
const randomPrice = (min: number, max: number) => Number((Math.random() * (max - min) + min).toFixed(2));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Script para popular base de dados com volume realista para testes de carga
 * Cria múltiplos tenants com diferentes perfis (pequeno, médio, grande)
 */

// Configuração dos perfis de tenant
const TENANT_PROFILES = {
    pequeno: {
        users: 5,
        produtos: 200,
        receitas: 50,
        fornecedores: 10,
        faturas: 100,
    },
    medio: {
        users: 20,
        produtos: 1000,
        receitas: 200,
        fornecedores: 30,
        faturas: 500,
    },
    grande: {
        users: 50,
        produtos: 5000,
        receitas: 1000,
        fornecedores: 100,
        faturas: 2000,
    },
};

async function createTenant(slug: string, profile: keyof typeof TENANT_PROFILES) {
    console.log(`\n🏢 Creating tenant: ${slug} (${profile})`);

    const config = TENANT_PROFILES[profile];
    const passwordHash = await bcrypt.hash('LoadTest123!', 10);

    // 1. Create tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug },
        update: {},
        create: {
            nome_restaurante: `${slug.replace('test-', '').toUpperCase()} Test Restaurant`,
            slug,
            plano: 'enterprise',
        },
    });

    console.log(`✅ Tenant created: ${tenant.nome_restaurante}`);

    // 2. Create users
    console.log(`👥 Creating ${config.users} users...`);
    const users = [];

    for (let i = 0; i < config.users; i++) {
        const email = `user${i + 1}@${slug}.com`;

        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                nome: randomName('User', i),
                email,
                password_hash: passwordHash,
                email_verificado: true,
            },
        });

        await prisma.userTenant.upsert({
            where: {
                user_id_tenant_id: {
                    user_id: user.id,
                    tenant_id: tenant.id,
                },
            },
            update: {},
            create: {
                user_id: user.id,
                tenant_id: tenant.id,
                role: i === 0 ? 'owner' : 'user',
                ativo: true,
                activated_at: new Date(),
            },
        });

        users.push(user);
    }

    console.log(`✅ ${users.length} users created`);

    // 3. Create families and subfamilies (usar existentes)
    const families = await prisma.familia.findMany({
        where: { tenant_id: tenant.id },
    });

    let familia_id = families[0]?.id;
    let subfamilia_id: number;

    if (!familia_id) {
        // Criar family genérica se não existir
        const familia = await prisma.familia.create({
            data: {
                tenant_id: tenant.id,
                nome: 'Produtos Gerais',
                codigo: 'GEN',
            },
        });
        familia_id = familia.id;

        // Criar subfamilia genérica
        const subfamilia = await prisma.subfamilia.create({
            data: {
                tenant_id: tenant.id,
                familia_id: familia.id,
                nome: 'Geral',
                codigo: 'GER',
            },
        });
        subfamilia_id = subfamilia.id;
    } else {
        // Buscar primeira subfamilia existente
        const subfamilia = await prisma.subfamilia.findFirst({
            where: { tenant_id: tenant.id, familia_id },
        });

        if (!subfamilia) {
            // Criar subfamilia se não existir
            const newSubfamilia = await prisma.subfamilia.create({
                data: {
                    tenant_id: tenant.id,
                    familia_id,
                    nome: 'Geral',
                    codigo: 'GER',
                },
            });
            subfamilia_id = newSubfamilia.id;
        } else {
            subfamilia_id = subfamilia.id;
        }
    }

    // 4. Create fornecedores
    console.log(`🏭 Creating ${config.fornecedores} suppliers...`);
    const fornecedores = [];

    for (let i = 0; i < config.fornecedores; i++) {
        const nome = randomName('Supplier', i);
        const fornecedor = await prisma.fornecedor.create({
            data: {
                tenant_id: tenant.id,
                nome: nome,
                nome_normalize: nome.toLowerCase(),
                nif: String(randomInt(100000000, 999999999)),
                telefone: `+351 ${randomInt(200000000, 299999999)}`,
                email: randomEmail('supplier', i),
            },
        });
        fornecedores.push(fornecedor);
    }

    console.log(`✅ ${fornecedores.length} suppliers created`);

    // 5. Create produtos
    console.log(`📦 Creating ${config.produtos} products...`);
    const produtos = [];

    for (let i = 0; i < config.produtos; i++) {
        const produto = await prisma.produto.create({
            data: {
                tenant_id: tenant.id,
                subfamilia_id,
                nome: randomName('Product', i),
                codigo_interno: `PROD-${i + 1}`,
                unidade_medida: randomElement(['KG', 'L', 'Unidade']),
            },
        });
        produtos.push(produto);

        // Progress indicator
        if ((i + 1) % 100 === 0) {
            console.log(`  ... ${i + 1}/${config.produtos} produtos created`);
        }
    }

    console.log(`✅ ${produtos.length} products created`);

    // 6. Create receitas
    console.log(`🍽️ Creating ${config.receitas} recipes...`);

    for (let i = 0; i < config.receitas; i++) {
        const numIngredientes = randomInt(3, 10);
        const selectedProdutos = produtos.sort(() => 0.5 - Math.random()).slice(0, numIngredientes);

        const receita = await prisma.receita.create({
            data: {
                tenant_id: tenant.id,
                nome: randomName('Recipe', i),
                tipo: 'Final',
                descricao: `Test recipe ${i}`,
                categoria: randomElement(['entrada', 'prato_principal', 'sobremesa', 'bebida']),
                tempo_preparacao: randomInt(10, 120),
                numero_porcoes: randomInt(1, 10),
                custo_total: 0, // Will calculate
                ingredientes: {
                    create: selectedProdutos.map((produto: any) => ({
                        tenant_id: tenant.id,
                        produto_id: produto.id,
                        quantidade_bruta: Number((Math.random() * 1.9 + 0.1).toFixed(1)),
                        unidade: produto.unidade_medida,
                    })),
                },
            },
        });

        // Progress indicator
        if ((i + 1) % 50 === 0) {
            console.log(`  ... ${i + 1}/${config.receitas} recipes created`);
        }
    }

    console.log(`✅ ${config.receitas} recipes created`);

    // 7. Final summary
    console.log(`\n✨ Tenant ${slug} completed:`);
    console.log(`   Users: ${config.users}`);
    console.log(`   Products: ${config.produtos}`);
    console.log(`   Recipes: ${config.receitas}`);
    console.log(`   Suppliers: ${config.fornecedores}`);
}

async function main() {
    console.log('🚀 Starting load testing data seed...\n');

    try {
        // Create 3 tenant profiles
        await createTenant('test-pequeno', 'pequeno');
        await createTenant('test-medio', 'medio');
        await createTenant('test-grande', 'grande');

        console.log('\n✅ Load testing seed completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   - 3 tenants created (pequeno, medio, grande)');
        console.log('   - 75 total users');
        console.log('   - 6,200 total products');
        console.log('   - 1,250 total recipes');
    } catch (error) {
        console.error('❌ Error during seed:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

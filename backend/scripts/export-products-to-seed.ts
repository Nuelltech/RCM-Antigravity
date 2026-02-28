import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

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
        console.log('--- Export Products to Seed Format ---');

        const slug = await askQuestion('Enter Source Tenant Slug (e.g. "demo"): ');
        if (!slug) {
            console.error('Tenant Slug is required.');
            process.exit(1);
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (!tenant) {
            console.error(`Tenant not found: ${slug}`);
            process.exit(1);
        }

        console.log(`Found Tenant: ${tenant.nome_restaurante} (${tenant.id})`);

        // Fetch products with subfamily and variations
        const products = await prisma.produto.findMany({
            where: {
                tenant_id: tenant.id,
                ativo: true // Only export active products
            },
            include: {
                subfamilia: true,
                variacoes: {
                    where: { ativo: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1 // Get latest variation for price
                }
            },
            orderBy: {
                subfamilia: {
                    codigo: 'asc'
                }
            }
        });

        console.log(`Found ${products.length} products.`);

        const seedProducts: any[] = [];

        for (const p of products) {
            const variacao = p.variacoes[0];
            const purchasePrice = variacao ? Number(variacao.preco_compra) : 0;

            // Map to seed format
            seedProducts.push({
                nome: p.nome,
                subfamilia_codigo: p.subfamilia.codigo,
                unidade: p.unidade_medida,
                vendavel: p.vendavel,
                preco_compra: purchasePrice > 0 ? purchasePrice : undefined
            });
        }

        // Print output
        console.log('\n--- Generated Seed Data ---\n');
        console.log('export const DEFAULT_PRODUCTS = [');

        // Group by subfamily for readability
        let currentSub = '';
        for (const p of seedProducts) {
            if (p.subfamilia_codigo !== currentSub) {
                console.log(`    // ${p.subfamilia_codigo}`);
                currentSub = p.subfamilia_codigo;
            }

            const priceStr = p.preco_compra ? `, preco_compra: ${p.preco_compra}` : '';
            const vendavelStr = p.vendavel ? `, vendavel: true` : '';

            console.log(`    { nome: '${p.nome.replace(/'/g, "\\'")}', subfamilia_codigo: '${p.subfamilia_codigo}', unidade: '${p.unidade}' as const${vendavelStr}${priceStr} },`);
        }

        console.log('];');
        console.log('\n---------------------------\n');
        console.log(`Total exported: ${seedProducts.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
        rl.close();
    }
}

main();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Debugging Formatos Venda fetch...\n');

    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error('❌ No tenant found');
    }
    console.log(`🏢 Tenant ID: ${tenant.id}`);

    try {
        console.log('🔄 Fetching formats...');
        const formats = await prisma.formatoVenda.findMany({
            where: {
                tenant_id: tenant.id,
                data_fim_vigencia: null,
            },
            include: {
                produto: true,
                variacao_origem: true,
            },
            orderBy: [
                { produto_id: 'asc' },
                { ordem_exibicao: 'asc' },
            ],
        });

        console.log(`✅ Success! Found ${formats.length} formats.`);

        // Check for potential serialization issues (e.g. BigInt)
        console.log('🔄 Attempting JSON serialization...');
        const json = JSON.stringify(formats, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );
        console.log('✅ Serialization successful.');

    } catch (error: any) {
        console.error('❌ Error fetching formats:', error);
        if (error.meta) {
            console.error('📝 Prisma Error Meta:', error.meta);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

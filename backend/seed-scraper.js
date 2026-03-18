const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('A injetar o Scraper do Makro PT na base de dados...');

    const makro = await prisma.scraperConfig.upsert({
        where: { slug: 'makro-pt' },
        update: {},
        create: {
            nome: 'Makro PT',
            slug: 'makro-pt',
            base_url: 'https://www.makro.pt',
            ativo: true,
            intervalo_horas: 24,
            configuracao: {
                // Preenche com credenciais válidas do Makro PT mais tarde se necessário no admin
                email: '',
                password: ''
            }
        }
    });

    console.log('✅ Scraper Makro PT registado com sucesso:', makro);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

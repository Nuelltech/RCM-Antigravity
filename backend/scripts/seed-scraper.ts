import { PrismaClient } from '@prisma/client';

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
                // Makro não obriga a login nos endpoints de view que testámos
                email: '',
                password: ''
            }
        }
    });

    console.log('✅ Scraper Makro PT registado com sucesso:', makro);

    // Adiciona mock data de uma corrida anterior só para o painel não ficar vazio no primeiro visual
    await prisma.scraperRun.create({
        data: {
            scraper_id: makro.id,
            status: 'success',
            produtos_novos: 1250,
            erros: 0,
            iniciado_em: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ontem
            terminado_em: new Date(Date.now() - 23 * 60 * 60 * 1000)
        }
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

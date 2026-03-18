import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const config = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0",
        "Cookie": "dwanonymous_7882ca5140f167f0071099a82fa62772=acc4NTeR9AUdcHRK65NahsnXxy; sid=C04hl8LZOiTUZ4nn74pxJP9PlNnIpDLz0Dg; __cq_dnt=1; dw_dnt=1; dwsid=CgV3EE42cHbAB3E_c13MUP4Ewl5ES3ihxFgBB6jBRlPIjrK22PWkoYtgyKrvZ7IDQK1I1ERaOFNGCHwFl6otZg==; BVBRANDID=31bde139-1a54-42a4-9893-5a07376f9ecd; BVBRANDSID=0387e2b4-677d-4e62-b979-1916836dd25b"
    };

    const scraper = await prisma.scraperConfig.findFirst({
        where: { slug: 'pingo-doce' }
    });

    if (scraper) {
        await prisma.scraperConfig.update({
            where: { id: scraper.id },
            data: {
                configuracao: JSON.stringify(config)
            }
        });
        console.log("✅ Configuração (Cookies) injetada com sucesso no Scraper do Pingo Doce!");
    } else {
        console.log("❌ Scraper pingo-doce não encontrado.");
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

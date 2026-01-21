// Script para desativar templates ruins
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupBadTemplates() {
    console.log('🧹 LIMPEZA: Desativando templates ruins...\n');

    // 1. Desativar templates com 0% taxa sucesso
    const result1 = await prisma.invoiceTemplate.updateMany({
        where: {
            is_active: true,
            times_used: { gte: 1 },
            times_successful: 0
        },
        data: {
            is_active: false
        }
    });

    console.log(`✅ Desativados ${result1.count} templates com 0% taxa sucesso`);

    // 2. Desativar template lixo específico
    const result2 = await prisma.invoiceTemplate.updateMany({
        where: {
            id: 28,
            is_active: true
        },
        data: {
            is_active: false
        }
    });

    if (result2.count > 0) {
        console.log(`✅ Desativado template #28 (lixo Tesseract)`);
    }

    // 3. Mostrar templates que continuam ativos
    const activeTemplates = await prisma.invoiceTemplate.findMany({
        where: { is_active: true },
        include: {
            fornecedor: {
                select: {
                    nome: true
                }
            }
        },
        orderBy: { confidence_score: 'desc' }
    });

    console.log(`\n📊 Templates ativos restantes: ${activeTemplates.length}\n`);

    if (activeTemplates.length > 0) {
        console.table(activeTemplates.map(t => ({
            'ID': t.id,
            'Fornecedor': t.fornecedor?.nome?.substring(0, 20),
            'Confiança': `${t.confidence_score.toFixed(0)}%`,
            'Taxa': t.times_used > 0 ? `${((t.times_successful / t.times_used) * 100).toFixed(0)}%` : 'N/A'
        })));
    }

    await prisma.$disconnect();
    console.log('\n✅ Limpeza concluída!');
}

cleanupBadTemplates()
    .catch(console.error)
    .finally(() => process.exit(0));

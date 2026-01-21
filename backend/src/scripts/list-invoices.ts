/**
 * Script to analyze imported invoices
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeInvoices() {
    try {
        console.log('\n📄 FATURAS IMPORTADAS - Análise Completa\n');
        console.log('='.repeat(120));

        // Get all invoices with supplier info
        const invoices = await prisma.faturaImportacao.findMany({
            include: {
                fornecedorRel: {
                    select: {
                        nome: true,
                        nif: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (invoices.length === 0) {
            console.log('\n❌ Nenhuma fatura importada encontrada.\n');
            return;
        }

        console.log(`\n✅ Total de faturas: ${invoices.length}\n`);

        // Group by status
        const byStatus: Record<string, number> = {};
        const bySupplier: Record<string, number> = {};

        invoices.forEach(inv => {
            byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
            const supplierKey = inv.fornecedorRel?.nome || inv.fornecedor_nome || 'Desconhecido';
            bySupplier[supplierKey] = (bySupplier[supplierKey] || 0) + 1;
        });

        // Status breakdown
        console.log('📊 POR STATUS:');
        Object.entries(byStatus).forEach(([status, count]) => {
            const emoji = status === 'approved' ? '✅' :
                status === 'error' ? '❌' :
                    status === 'reviewing' ? '🔍' :
                        status === 'pending' ? '⏳' : '❓';
            console.log(`   ${emoji} ${status}: ${count} faturas`);
        });

        // Supplier breakdown
        console.log('\n🏢 POR FORNECEDOR:');
        Object.entries(bySupplier)
            .sort((a, b) => b[1] - a[1])
            .forEach(([supplier, count]) => {
                console.log(`   • ${supplier}: ${count} faturas`);
            });

        // Detailed list
        console.log('\n📋 DETALHES DAS FATURAS:\n');

        invoices.forEach((inv, index) => {
            const statusEmoji = inv.status === 'approved' ? '✅' :
                inv.status === 'error' ? '❌' :
                    inv.status === 'reviewing' ? '🔍' :
                        inv.status === 'pending' ? '⏳' : '❓';

            console.log(`${index + 1}. ${statusEmoji} Fatura #${inv.id} - ${inv.numero_fatura || 'N/A'}`);
            console.log(`   Fornecedor: ${inv.fornecedorRel?.nome || inv.fornecedor_nome || 'Desconhecido'} (NIF: ${inv.fornecedorRel?.nif || inv.fornecedor_nif || 'N/A'})`);
            console.log(`   Status: ${inv.status}`);
            console.log(`   Data: ${inv.data_fatura ? new Date(inv.data_fatura).toISOString().split('T')[0] : 'N/A'}`);
            console.log(`   Total: €${inv.total_com_iva ? Number(inv.total_com_iva).toFixed(2) : 'N/A'}`);
            console.log(`   Ficheiro: ${inv.ficheiro_nome}`);
            console.log(`   Criado: ${inv.createdAt.toISOString().split('T')[0]}`);

            if (inv.erro_mensagem) {
                console.log(`   ❌ Erro: ${inv.erro_mensagem.substring(0, 80)}...`);
            }

            if (inv.processado_em) {
                console.log(`   Processado em: ${inv.processado_em.toISOString().split('T')[0]}`);
            }

            console.log('');
        });

        // OCR Stats
        console.log('='.repeat(120));
        console.log('\n🔍 ESTATÍSTICAS OCR:\n');

        const withOCR = invoices.filter(inv => inv.ocr_texto_bruto && inv.ocr_texto_bruto.length > 0);
        const avgOCRLength = withOCR.length > 0
            ? withOCR.reduce((sum, inv) => sum + (inv.ocr_texto_bruto?.length || 0), 0) / withOCR.length
            : 0;

        console.log(`   Faturas com OCR: ${withOCR.length}/${invoices.length}`);
        console.log(`   Comprimento médio OCR: ${Math.round(avgOCRLength)} caracteres`);

        // Processing success rate
        const approved = invoices.filter(inv => inv.status === 'approved').length;
        const errors = invoices.filter(inv => inv.status === 'error').length;
        const successRate = invoices.length > 0 ? (approved / invoices.length * 100).toFixed(1) : '0.0';

        console.log(`\n📈 Taxa de Sucesso: ${successRate}% (${approved} aprovadas de ${invoices.length})`);
        console.log(`   Erros: ${errors} (${(errors / invoices.length * 100).toFixed(1)}%)`);

        console.log('');

    } catch (error) {
        console.error('❌ Error querying invoices:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

analyzeInvoices()
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });

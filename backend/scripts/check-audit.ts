// Script para verificar audit metrics e templates (FILTRADO - só dados novos)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🎯 MARCO TEMPORAL: Só analisar dados após fatura #71
const BASELINE_INVOICE_ID = 71;
const BASELINE_DATE = new Date('2026-01-19T15:00:00Z');

async function checkAuditAndTemplates() {
    console.log('='.repeat(80));
    console.log(`📊 AUDIT METRICS - Faturas >= #${BASELINE_INVOICE_ID} (após validação)`);
    console.log('='.repeat(80));

    const metrics = await prisma.invoiceProcessingMetrics.findMany({
        where: {
            invoice_id: { gte: BASELINE_INVOICE_ID }
        },
        orderBy: { created_at: 'desc' },
        include: {
            invoice: {
                select: {
                    id: true,
                    fornecedor_nome: true,
                    numero_fatura: true,
                    status: true
                }
            }
        }
    });

    if (metrics.length === 0) {
        console.log('⚠️  Nenhuma métrica encontrada após baseline');
    } else {
        console.table(metrics.map((m: any) => ({
            'Invoice ID': m.invoice_id,
            'Fornecedor': m.invoice?.fornecedor_nome?.substring(0, 20),
            'Método': m.parsing_method,
            'Template ID': m.template_id || 'N/A',
            'Score': m.template_score ? `${m.template_score.toFixed(1)}%` : 'N/A',
            'Duração (ms)': m.total_duration_ms,
            'Linhas': m.line_items_extracted,
            'Sucesso': m.success ? '✅' : '❌',
            'Modelo Gemini': m.gemini_model_used || '⚠️ NULL',
            'Tentativas': m.gemini_attempts
        })));

        // Estatísticas
        const total = metrics.length;
        const successful = metrics.filter((m: any) => m.success).length;
        const avgDuration = Math.round(metrics.reduce((sum: number, m: any) => sum + m.total_duration_ms, 0) / total);

        console.log('\n📈 ESTATÍSTICAS:');
        console.log(`  Total processado: ${total}`);
        console.log(`  Sucesso: ${successful}/${total} (${((successful / total) * 100).toFixed(1)}%)`);
        console.log(`  Duração média: ${avgDuration}ms (${(avgDuration / 1000).toFixed(1)}s)`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEMPLATES - Só templates ATIVOS');
    console.log('='.repeat(80));

    const templates = await prisma.invoiceTemplate.findMany({
        where: { is_active: true },
        orderBy: { confidence_score: 'desc' },
        include: {
            fornecedor: {
                select: {
                    id: true,
                    nome: true,
                    nif: true
                }
            }
        }
    });

    if (templates.length === 0) {
        console.log('⚠️  Nenhum template ativo encontrado!');
    } else {
        console.table(templates.map((t: any) => ({
            'ID': t.id,
            'Fornecedor': t.fornecedor?.nome?.substring(0, 25),
            'NIF': t.fornecedor?.nif || '⚠️ NULL',
            'Nome': t.template_name?.substring(0, 30),
            'Versão': t.template_version,
            'Confiança': `${t.confidence_score.toFixed(1)}%`,
            'Usado': t.times_used,
            'Sucesso': t.times_successful,
            'Taxa': t.times_used > 0 ? `${((t.times_successful / t.times_used) * 100).toFixed(1)}%` : 'N/A',
            'Última vez': t.updatedAt.toISOString().split('T')[0]
        })));

        console.log(`\n📊 Total templates ativos: ${templates.length}`);
        const goodTemplates = templates.filter((t: any) => t.times_used > 0 && (t.times_successful / t.times_used) >= 0.8);
        console.log(`✅ Templates bons (>80% taxa): ${goodTemplates.length}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🗑️  TEMPLATES DESATIVADOS (lixo)');
    console.log('='.repeat(80));

    const inactiveTemplates = await prisma.invoiceTemplate.findMany({
        where: { is_active: false },
        orderBy: { updatedAt: 'desc' },
        take: 5
    });

    if (inactiveTemplates.length === 0) {
        console.log('✨ Nenhum template desativado');
    } else {
        console.table(inactiveTemplates.map((t: any) => ({
            'ID': t.id,
            'Nome': t.template_name?.substring(0, 40),
            'Motivo': t.times_used > 0 && t.times_successful === 0 ? '❌ 0% taxa' : '⚠️ Manual'
        })));
    }

    console.log('\n' + '='.repeat(80));
    console.log('📄 FATURA #73 - Detalhes');
    console.log('='.repeat(80));

    const invoice73 = await prisma.faturaImportacao.findUnique({
        where: { id: 73 },
        include: {
            linhas: {
                orderBy: { linha_numero: 'asc' }
            }
        }
    });

    if (!invoice73) {
        console.log('⚠️  Fatura #73 não encontrada');
    } else {
        console.log(`Fornecedor: ${invoice73.fornecedor_nome}`);
        console.log(`NIF: ${invoice73.fornecedor_nif}`);
        console.log(`Nº Fatura: ${invoice73.numero_fatura}`);
        console.log(`Data: ${invoice73.data_fatura}`);
        console.log(`Total s/ IVA: ${invoice73.total_sem_iva}€`);
        console.log(`Total IVA: ${invoice73.total_iva}€`);
        console.log(`Total c/ IVA: ${invoice73.total_com_iva}€`);
        console.log(`Status: ${invoice73.status}`);
        console.log(`Linhas: ${invoice73.linhas.length}`);

        if (invoice73.linhas.length > 0) {
            console.log('\nLinhas:');
            console.table(invoice73.linhas.map((line: any) => ({
                '#': line.linha_numero,
                'Descrição': line.descricao_original,
                'Qtd': line.quantidade,
                'Un': line.unidade,
                'Preço': `${line.preco_unitario}€`,
                'Total': `${line.preco_total}€`
            })));
        }
    }

    await prisma.$disconnect();
}

checkAuditAndTemplates()
    .catch(console.error)
    .finally(() => process.exit(0));

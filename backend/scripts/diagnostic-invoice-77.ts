// Diagnóstico completo: Fatura #77 + Template Dream Plus
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnostic() {
    console.log('='.repeat(80));
    console.log('DIAGNÓSTICO FATURA #77 + TEMPLATE DREAM PLUS');
    console.log('='.repeat(80));

    // 1. FATURA #77 - HEADER
    const invoice = await prisma.faturaImportacao.findUnique({
        where: { id: 77 },
        include: {
            linhas: {
                orderBy: { linha_numero: 'asc' }
            }
        }
    });

    if (!invoice) {
        console.log('❌ Fatura #77 não encontrada!');
        return;
    }

    console.log('\n📄 FATURA #77 - HEADER');
    console.log(`Fornecedor: ${invoice.fornecedor_nome}`);
    console.log(`NIF: ${invoice.fornecedor_nif}`);
    console.log(`Nº Fatura: ${invoice.numero_fatura}`);
    console.log(`Data: ${invoice.data_fatura?.toISOString().split('T')[0]}`);
    console.log(`Total s/ IVA: ${invoice.total_sem_iva}€`);
    console.log(`Total c/ IVA: ${invoice.total_com_iva}€`);
    console.log(`Status: ${invoice.status}`);
    console.log(`Método: ${invoice.metodo_processamento}`);

    // 2. LINHAS COM ANÁLISE DESCONTO
    console.log('\n📊 LINHAS DA FATURA (Análise Desconto)');
    console.log('─'.repeat(80));

    let sumPrecoTotal = 0;
    let sumCalculated = 0;

    invoice.linhas.forEach((line: any) => {
        const calculated = line.quantidade * line.preco_unitario;
        const diff = line.preco_total - calculated;
        const discountPct = ((calculated - line.preco_total) / calculated * 100);

        sumPrecoTotal += parseFloat(line.preco_total || 0);
        sumCalculated += calculated;

        console.log(`\nLinha ${line.linha_numero}: ${line.descricao_original?.substring(0, 40)}`);
        console.log(`  Quantidade: ${line.quantidade} ${line.unidade}`);
        console.log(`  Preço Unit Guardado: ${line.preco_unitario}€`);
        console.log(`  Preço Total: ${line.preco_total}€`);
        console.log(`  Calculado (qtd × preço): ${calculated.toFixed(2)}€`);
        console.log(`  Diferença: ${diff.toFixed(2)}€`);
        console.log(`  Desconto Implícito: ${discountPct.toFixed(1)}%`);

        if (Math.abs(discountPct) > 1) {
            console.log(`  ⚠️  DESCONTO DETECTADO! Preço original seria ~${(line.preco_total / line.quantidade / (1 - discountPct / 100)).toFixed(2)}€`);
        }
    });

    console.log('\n' + '='.repeat(80));
    console.log('TOTAIS:');
    console.log(`  Σ(precoTotal): ${sumPrecoTotal.toFixed(2)}€`);
    console.log(`  Σ(qtd × preço guardado): ${sumCalculated.toFixed(2)}€`);
    console.log(`  Header totalSemIva: ${invoice.total_sem_iva}€`);
    console.log(`  Desconto Total: ${(sumCalculated - sumPrecoTotal).toFixed(2)}€`);

    // 3. FORNECEDOR
    const supplier = await prisma.fornecedor.findFirst({
        where: {
            OR: [
                { nif: '506006794' },
                { nome: { contains: 'Dream Plus' } }
            ]
        }
    });

    console.log('\n' + '='.repeat(80));
    console.log('🏢 FORNECEDOR DREAM PLUS');
    if (supplier) {
        console.log(`ID: ${supplier.id}`);
        console.log(`Nome: ${supplier.nome}`);
        console.log(`NIF: ${supplier.nif}`);
        console.log(`Ativo: ${supplier.is_active ? 'Sim' : 'Não'}`);
    } else {
        console.log('❌ Fornecedor não encontrado!');
    }

    // 4. TEMPLATES
    const templates = await prisma.invoiceTemplate.findMany({
        where: {
            fornecedor: {
                OR: [
                    { nif: '506006794' },
                    { nome: { contains: 'Dream Plus' } }
                ]
            }
        },
        include: {
            fornecedor: {
                select: {
                    nome: true,
                    nif: true
                }
            }
        },
        orderBy: { created_at: 'desc' }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`📋 TEMPLATES DREAM PLUS (${templates.length} encontrados)`);

    templates.forEach((tpl: any) => {
        console.log(`\nTemplate #${tpl.id}: ${tpl.template_name}`);
        console.log(`  Versão: ${tpl.template_version}`);
        console.log(`  Confiança: ${tpl.confidence_score.toFixed(1)}%`);
        console.log(`  Usado: ${tpl.times_used}x`);
        console.log(`  Sucesso: ${tpl.times_successful}x`);
        console.log(`  Taxa: ${tpl.times_used > 0 ? ((tpl.times_successful / tpl.times_used) * 100).toFixed(1) : 'N/A'}%`);
        console.log(`  Ativo: ${tpl.is_active ? 'Sim' : 'Não'}`);
        console.log(`  Criado: ${tpl.created_at.toISOString()}`);
    });

    // 5. ÚLTIMO TEMPLATE - DETALHES
    if (templates.length > 0) {
        const latest = templates[0];
        console.log('\n' + '='.repeat(80));
        console.log(`🔍 ÚLTIMO TEMPLATE - CONFIGURAÇÃO DETALHADA (#${latest.id})`);
        console.log(`\nFingerprint:`);
        console.log(JSON.stringify(JSON.parse(latest.fingerprint), null, 2));

        if (latest.zones_config) {
            console.log(`\nZones Config:`);
            console.log(JSON.stringify(JSON.parse(latest.zones_config), null, 2));
        }
    }

    // 6. MÉTRICAS
    const metrics = await prisma.invoiceProcessingMetrics.findMany({
        where: { invoice_id: 77 },
        orderBy: { created_at: 'desc' }
    });

    console.log('\n' + '='.repeat(80));
    console.log('📈 MÉTRICAS PROCESSAMENTO #77');
    metrics.forEach((m: any) => {
        console.log(`\nMétrica ID ${m.id}:`);
        console.log(`  Método: ${m.parsing_method}`);
        console.log(`  Template: ${m.template_id || 'N/A'}`);
        console.log(`  Score: ${m.template_score?.toFixed(1) || 'N/A'}%`);
        console.log(`  Duração: ${m.total_duration_ms}ms`);
        console.log(`  Tentativas Gemini: ${m.gemini_attempts}`);
        console.log(`  Linhas: ${m.line_items_extracted}`);
        console.log(`  Sucesso: ${m.success ? 'Sim' : 'Não'}`);
    });

    await prisma.$disconnect();
}

diagnostic().catch(console.error);

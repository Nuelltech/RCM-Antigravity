// Quick check: What did Gemini actually extract for invoice #75?
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInvoice75() {
    const invoice = await prisma.faturaImportacao.findUnique({
        where: { id: 75 },
        include: {
            linhas: {
                orderBy: { linha_numero: 'asc' }
            }
        }
    });

    if (!invoice) {
        console.log('Invoice #75 not found');
        return;
    }

    console.log('='.repeat(80));
    console.log('INVOICE #75 - RAW DATA FROM DATABASE');
    console.log('='.repeat(80));
    console.log(`Fornecedor: ${invoice.fornecedor_nome}`);
    console.log(`NIF: ${invoice.fornecedor_nif}`);
    console.log(`Total: ${invoice.total_com_iva}€`);
    console.log(`\nLine Items (${invoice.linhas.length}):\n`);

    invoice.linhas.forEach((line: any) => {
        console.log(`Line ${line.linha_numero}:`);
        console.log(`  Desc: ${line.descricao_original}`);
        console.log(`  Qtd: ${line.quantidade} ${line.unidade}`);
        console.log(`  Preço Unit: ${line.preco_unitario}€`);
        console.log(`  Total: ${line.preco_total}€`);
        console.log(`  Calc: ${line.quantidade} × ${line.preco_unitario} = ${(line.quantidade * line.preco_unitario).toFixed(2)}€`);
        console.log('');
    });

    const sumTotal = invoice.linhas.reduce((sum: number, line: any) => sum + parseFloat(line.preco_total || 0), 0);
    const sumCalc = invoice.linhas.reduce((sum: number, line: any) => sum + (line.quantidade * line.preco_unitario), 0);

    console.log('='.repeat(80));
    console.log(`Sum of precoTotal: ${sumTotal.toFixed(2)}€`);
    console.log(`Sum of (qtd × preço): ${sumCalc.toFixed(2)}€`);
    console.log(`Invoice totalSemIva: ${invoice.total_sem_iva}€`);
    console.log('='.repeat(80));

    await prisma.$disconnect();
}

checkInvoice75().catch(console.error);

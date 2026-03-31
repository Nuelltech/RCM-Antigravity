import { PrismaClient } from '@prisma/client';
import { recalculationService } from '../src/modules/produtos/recalculation.service';

const prisma = new PrismaClient();

async function testRecalculation() {
    console.log("Starting test...");
    
    // We are testing Coca Cola, the product ID from the logs is 79
    const produtoId = 79;
    
    console.log(`Checking FormatoVenda for produtoId: ${produtoId}`);
    
    const formatos = await prisma.formatoVenda.findMany({
        where: { produto_id: produtoId }
    });
    
    console.log(`Found ${formatos.length} formatos:`, formatos);
    
    
    console.log(`\nChecking Preco Unitario for produtoId: ${produtoId}`);
    // Acess private method using any
    const precoUnitario = await (recalculationService as any).getPrecoUnitarioAtual(produtoId);
    console.log(`Preco Unitario Atual: ${precoUnitario}`);
    
    console.log("\nRunning recalculation...");
    const result = await recalculationService.recalculateAfterPriceChange(produtoId);
    
    console.log("Recalculation result:", result);
    
    console.log("Test finished.");
    process.exit(0);
}

testRecalculation().catch(e => {
    console.error(e);
    process.exit(1);
});

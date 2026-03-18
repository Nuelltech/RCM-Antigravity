import * as fs from 'fs';

const dumpFile = 'dump-pingodoce-1786-page1.html';

if (!fs.existsSync(dumpFile)) {
    console.log(`[ERRO] Ficheiro ${dumpFile} não encontrado!`);
    process.exit(1);
}

const html = fs.readFileSync(dumpFile, 'utf-8');

console.log("============== ANÁLISE DO DUMP ==============");
const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
console.log("Título da Página:", titleMatch ? titleMatch[1].trim() : "N/A");

const scriptMatches = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
if (scriptMatches) {
    console.log(`\nEncontradas ${scriptMatches.length} tags <script>. Procurando por dados JSON/Estado (ex: window.__INITIAL_STATE__)...`);

    scriptMatches.forEach((scriptTag, index) => {
        if (scriptTag.includes('product') || scriptTag.includes('price') || scriptTag.length > 5000) {
            console.log(`\n--- Script Tag #${index + 1} (Tamanho: ${scriptTag.length} bytes) ---`);
            // Se for muito grande, imprime só o início e uma busca por 'price'
            if (scriptTag.length > 500) {
                console.log(scriptTag.substring(0, 200) + " [...]");
                const priceIdx = scriptTag.indexOf('price');
                if (priceIdx !== -1) {
                    console.log(`    [Encontrado "price" no índice ${priceIdx}]:`,
                        scriptTag.substring(Math.max(0, priceIdx - 50), priceIdx + 50));
                }
            } else {
                console.log(scriptTag);
            }
        }
    });
} else {
    console.log("\nNenhuma tag <script> encontrada.");
}

console.log("=============================================");

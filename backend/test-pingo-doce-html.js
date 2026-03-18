const fetch = require('node-fetch');
const fs = require('fs');

async function testPingoDoceHTML() {
    try {
        console.log("A extrair HTML puro da Categoria Talho (1786)...");

        const url = 'https://www.pingodoce.pt/produtos/talho/';

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (!res.ok) {
            console.log("HTTP HTML Fetch Error: " + res.status);
            return;
        }

        const html = await res.text();
        fs.writeFileSync('pingo-doce-talho-dump.html', html);
        console.log("✅ HTML com " + html.length + " bytes guardado em pingo-doce-talho-dump.html para análise do assistente.");

    } catch (e) {
        console.error(e);
    }
}

testPingoDoceHTML();

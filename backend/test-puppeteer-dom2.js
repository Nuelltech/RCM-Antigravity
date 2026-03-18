const puppeteer = require('puppeteer');

async function debugDOM() {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    console.log("Navigating to Laticinios...");
    try {
        await page.goto("https://www.pingodoce.pt/montra/categoria/laticinios-e-ovos?page=1", {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Simular Human Scroll
        await page.evaluate(() => { window.scrollBy(0, window.innerHeight); });
        await new Promise(r => setTimeout(r, 4000));
        await page.evaluate(() => { window.scrollBy(0, window.innerHeight); });
        await new Promise(r => setTimeout(r, 4000));

        console.log("Evaluating DOM...");

        // Vamos extrair excertos de HTML que contenham €
        const htmlDump = await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            let findings = [];

            // Procurar elementos folha (sem filhos) que contenham €
            for (const el of allElements) {
                if (el.children.length === 0 && el.textContent && el.textContent.includes('€')) {
                    // Extrair o seu pai mais proximo que pareça um container de produto (subindo até 4 niveis)
                    let container = el;
                    for (let i = 0; i < 4; i++) {
                        if (container.parentElement) container = container.parentElement;
                    }

                    // Guardar o HTML desse pai para analisarmos as classes exatas do Pingo Doce
                    // Limitar a string para o ecrã não rebentar
                    let htmlStr = container.outerHTML;
                    if (htmlStr && htmlStr.length < 2000 && findings.length < 2) {
                        findings.push(htmlStr);
                    }
                }
            }
            return findings;
        });

        console.log(`Found ${htmlDump.length} containers with price!`);
        console.log("--- HTML SAMPLE 1 ---");
        console.log(htmlDump[0]);
        console.log("--- HTML SAMPLE 2 ---");
        console.log(htmlDump[1]);

    } catch (e) {
        console.log("Error:", e.message);
    } finally {
        await browser.close();
    }
}

debugDOM();

const puppeteer = require('puppeteer');

async function testDOM() {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
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

        // Esperar um pouco pelo JS
        await new Promise(r => setTimeout(r, 3000));

        // Aceitar cookies se existir
        try {
            await page.evaluate(() => {
                const cookieBtn = document.querySelector('#onetrust-accept-btn-handler');
                if (cookieBtn) cookieBtn.click();
            });
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) { }

        console.log("Evaluating DOM for products...");
        const products = await page.evaluate(() => {
            // Demandware normalmente usa .product-tile, .product, .product-item
            const tiles = Array.from(document.querySelectorAll('.js-product-tile, .product-tile, [data-pid]'));

            return tiles.map(tile => {
                const nameEl = tile.querySelector('.js-product-name, .product-name, .link');
                const priceEl = tile.querySelector('.sales .value, .price, .sales-price'); // Demandware default classes
                const unitEl = tile.querySelector('.unit, .price-unit');

                return {
                    nome: nameEl ? nameEl.innerText.trim() : 'Unknown',
                    preco: priceEl ? priceEl.innerText.trim() : '0',
                    pid: tile.getAttribute('data-pid')
                };
            });
        });

        console.log(`Found ${products.length} products in DOM!`);
        console.log("First 5 products:");
        console.log(products.slice(0, 5));

    } catch (e) {
        console.log("Error:", e.message);
    } finally {
        await browser.close();
    }
}

testDOM();

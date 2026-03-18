const puppeteer = require('puppeteer');

async function testNetwork() {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    page.on('response', async (res) => {
        const req = res.request();
        if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
            const url = res.url();
            console.log(`[NETWORK] ${req.method()} ${url.split('?')[0]}`);
        }
    });

    console.log("Navigating to Laticinios...");
    try {
        await page.goto("https://mercadao.pt/store/pingo-doce/category/laticinios-e-ovos", {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 4000));

        const text = await page.evaluate(() => document.body.innerText);
        console.log("=== DOM TEXT ===");
        console.log(text.slice(0, 500));
        console.log("================");

    } catch (e) {
        console.log("Error:", e.message);
    } finally {
        await browser.close();
    }
}

testNetwork();

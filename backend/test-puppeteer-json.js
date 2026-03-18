const puppeteer = require('puppeteer');

async function testPureJSON() {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    console.log("Navigating to Mercadao root to get cookies/CF clearance...");
    try {
        await page.goto("https://mercadao.pt", { waitUntil: 'networkidle2', timeout: 30000 });

        console.log("Injecting fetch request directly to the API in the browser...");

        const data = await page.evaluate(async () => {
            const res = await fetch("https://mercadao.pt/api/catalogues/6107d28d72939a003ff6bfeb/categories?category=root", {
                headers: {
                    "Accept": "application/json, text/plain, */*",
                    "X-Requested-With": "XMLHttpRequest"
                }
            });
            return await res.json();
        });

        console.log("SUCCESS! Got Categories JSON Array. Length:", data.length);
        console.log("Sample:", data.slice(0, 3).map(c => c.name));

    } catch (e) {
        console.log("Error:", e.message);
    } finally {
        await browser.close();
    }
}

testPureJSON();

const puppeteer = require('puppeteer');

async function testPuppeteer() {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set natural user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    console.log("Navigating to Mercadao API...");
    try {
        const response = await page.goto("https://mercadao.pt/api/catalogues/6107d28d72939a003ff6bfeb/categories?category=root", {
            waitUntil: 'networkidle0'
        });

        console.log("Status:", response.status());
        const bodyHandle = await page.$('body');
        const text = await page.evaluate(body => body.innerText, bodyHandle);
        console.log("Body preview:");
        console.log(text.slice(0, 300));
        await bodyHandle.dispose();
    } catch (e) {
        console.log("Error:", e.message);
    } finally {
        await browser.close();
    }
}

testPuppeteer();

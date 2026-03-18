const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
puppeteer.addExtra(require('puppeteer-extra-plugin-stealth')());

async function doStealthHit() {
    console.log("Launching Puppeteer Stealth...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();

    // Deceive Datadome & CF
    await page.setViewport({ width: 1366, height: 768 });

    page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('bazaarvoice.com') && url.includes('products.json') && res.request().method() === 'GET') {
            try {
                const data = await res.json();
                const items = data.Results || data.results || data.products || [];
                const itemsArray = Array.isArray(items) ? items : Object.values(items);
                console.log(`[BAZAAR_API_HIT] Found ${itemsArray.length} items! First:`, itemsArray[0]?.Name || itemsArray[0]?.name);
            } catch (e) { }
        }
    });

    try {
        console.log("Navigating directly to Category URL: https://www.pingodoce.pt/montra/categoria/laticinios-e-ovos");
        await page.goto("https://www.pingodoce.pt/montra/categoria/laticinios-e-ovos", { waitUntil: 'networkidle2', timeout: 50000 });

        await page.evaluate(() => { window.scrollBy(0, window.innerHeight); });
        await new Promise(r => setTimeout(r, 6000));

        console.log("Done checking.");
    } catch (e) {
        console.log("Err:", e.message);
    } finally {
        await browser.close();
    }
}

doStealthHit();

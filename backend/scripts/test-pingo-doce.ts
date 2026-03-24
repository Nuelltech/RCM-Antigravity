import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function run() {
    console.log("Starting test...");
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    page.on('response', async res => {
        const url = res.url();
        if (url.includes('.json') || url.includes('/api/') || url.includes('graphql')) {
            console.log('Possible API Response:', url);
        }
    });

    console.log("Navigating to talho...");
    await page.goto('https://www.pingodoce.pt/home/produtos/talho?', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("Saving HTML...");
    const html = await page.content();
    fs.writeFileSync('pingo-doce-test.html', html);

    console.log('Done');
    await browser.close();
}

run().catch(console.error);

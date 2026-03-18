const fetch = require('node-fetch');

async function testApi() {
    const urlsToTest = [
        "https://www.pingodoce.pt/api/v2/categories",
        "https://www.pingodoce.pt/api/v2/products",
        "https://res.pingodoce.pt/api/v2/categories"
    ];

    for (const url of urlsToTest) {
        console.log(`\nTesting: ${url}`);
        try {
            const res = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json"
                }
            });
            console.log(`Status: ${res.status}`);
            const text = await res.text();
            console.log(`Preview: ${text.slice(0, 100)}...`);
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

testApi();

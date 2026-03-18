import fetch from 'node-fetch';

async function run() {
    const url = 'https://mercadao.pt/api/catalogues/6107d28d72939a003ff6bfeb/products?categoryId=1802&page=1';
    console.log("Fetching: " + url);
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body excerpt:");
    console.log(text.substring(0, 500));
}

run().catch(console.error);

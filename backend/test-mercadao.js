const https = require('https');

function testEndpoint() {
    console.log("A testar a API do Mercadão...");
    const options = {
        hostname: 'mercadao.pt',
        path: '/api/catalogues/6107d28d72939a003ff6bfeb/products?categories=6107d31f72939a003ff6c1ee&limit=20&offset=0',
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://mercadao.pt/store/pingo-doce',
            'Origin': 'https://mercadao.pt'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`CONTENT-TYPE: ${res.headers['content-type']}`);

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (data.startsWith('<')) {
                console.log("Recebido HTML! Primeiros 300 caracteres:");
                console.log(data.substring(0, 300));
            } else {
                console.log("Recebido possível JSON! Tamanho:", data.length);
                console.log(data.substring(0, 300));
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problema com o pedido: ${e.message}`);
    });

    req.end();
}

testEndpoint();

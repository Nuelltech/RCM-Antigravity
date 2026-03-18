const https = require('https');
const urls = [
    'https://rcm-staging.onrender.com/health',
    'https://rcm-nuelltech.onrender.com/health',
    'https://rcm-backend.onrender.com/health'
];

urls.forEach(url => {
    const req = https.get(url, (res) => {
        console.log(`${url}: ${res.statusCode}`);
        if (res.statusCode !== 200) {
            res.on('data', (d) => {
                process.stdout.write(d);
            });
        }
    }).on('error', (e) => {
        console.log(`${url}: Error ${e.message}`);
    });
});

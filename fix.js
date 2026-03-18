const fs = require('fs');
const path = 'e:/Nuelltech/Restaurante Cost Manager/RCM/Gemini/antigravity/app/frontend-internal/src/app/scrapers/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed backslashes in page.tsx.");

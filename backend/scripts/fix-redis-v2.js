const fs = require('fs');
const path = require('path');

const workersDir = path.join(__dirname, '../src/workers');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        if (!file.endsWith('.worker.ts') && file !== 'index.ts') return;
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        let changed = false;

        // Make sure env is imported
        if (!content.includes("import { env }")) {
            content = `import { env } from '../core/env';\n` + content;
            changed = true;
        }

        // Replace `connection: redisConnection as any` with `connection: new Redis(env.REDIS_URL, redisOptions)`
        if (content.includes("connection: redisConnection")) {
            content = content.replace(/connection:\s*redisConnection\s*(?:as\s*any)?,/g, "connection: new Redis(env.REDIS_URL, redisOptions) as any,");
            changed = true;
        }
        
        if (content.includes("connection: redis as any")) {
            content = content.replace(/connection:\s*redis\s*as\s*any,/g, "connection: new Redis(env.REDIS_URL, redisOptions) as any,");
            changed = true;
        }

        // If 'Redis' is missing from import
        if (!content.includes("import Redis from")) {
            content = `import Redis from 'ioredis';\n` + content;
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Un-deadlocked ${file}`);
        }
    });
}

processDir(workersDir);
console.log('Done reverting workers to dedicated connections');

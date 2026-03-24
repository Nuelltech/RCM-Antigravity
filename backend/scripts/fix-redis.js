const fs = require('fs');
const path = require('path');

const workersDir = path.join(__dirname, '../src/workers');
const queuesDir = path.join(__dirname, '../src/queues');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        if (!file.endsWith('.ts')) return;
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        let changed = false;
        
        // Ensure { redis } is imported from core/redis
        if (!content.includes("import { redis }") && !content.includes("import { redis,")) {
            // Replace { redisOptions } with { redisOptions, redis }
            content = content.replace(/import\s+{\s*redisOptions\s*}\s+from\s+['"]..\/core\/redis['"];/, "import { redisOptions, redis } from '../core/redis';");
            // Or add it if not found
            if (!content.includes("redis } from '../core/redis'")) {
               content = `import { redis } from '../core/redis';\n` + content;
            }
            changed = true;
        }

        // Replace `new Redis(env.REDIS_URL, redisOptions)` with `redis`
        content = content.replace(/new\s+Redis\([^)]+\)/g, "redis");
        
        if (changed || content.includes('redis')) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${file}`);
        }
    });
}

processDir(workersDir);
processDir(queuesDir);
console.log('Done refactoring Redis connections.');

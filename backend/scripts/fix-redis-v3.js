const fs = require('fs');
const path = require('path');

const workersDir = path.join(__dirname, '..', 'src', 'workers');

function applySharedConnection() {
    const files = fs.readdirSync(workersDir).filter(f => f.endsWith('.worker.ts'));
    let changed = 0;

    for (const file of files) {
        const filePath = path.join(workersDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        const revertRegex = /connection:\s*new Redis\(env\.REDIS_URL,\s*redisOptions\)\s*as\s*any\s*,/g;

        if (revertRegex.test(content)) {
            content = content.replace(revertRegex, "connection: redis,\n        sharedConnection: true,");

            // Ensure import { redis } exists if not already there
            if (!content.includes('import { redis }') && !content.includes('import { redisOptions, redis }') && !content.includes('import { redis, redisOptions }')) {
                // Find where to insert
                const envImportIndex = content.indexOf(`import { env } from '../core/env';`);
                if (envImportIndex !== -1) {
                    content = content.replace(
                        `import { env } from '../core/env';`,
                        `import { env } from '../core/env';\nimport { redis } from '../core/redis';`
                    );
                }
            }

            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Applied sharedConnection to ${file}`);
            changed++;
        }
    }

    console.log(`Done optimizing ${changed} workers with sharedConnection.`);
}

applySharedConnection();

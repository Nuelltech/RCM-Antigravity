const fs = require('fs');
const path = require('path');

const workersDir = path.join(__dirname, '..', 'src', 'workers');

function revertToNewRedis() {
    const files = fs.readdirSync(workersDir).filter(f => f.endsWith('.worker.ts'));
    let changed = 0;

    for (const file of files) {
        const filePath = path.join(workersDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace `connection: redis as any,` with `connection: new Redis(env.REDIS_URL, redisOptions),`
        const regex = /connection:\s*redis(?: as any)?\s*,/g;

        if (regex.test(content)) {
            // Ensure env and redisOptions are imported if missing
            if (!content.includes("env.REDIS_URL")) {
                console.log(`Skipping ${file} - missing env.REDIS_URL`);
                continue;
            }
            content = content.replace(regex, "connection: new Redis(env.REDIS_URL, redisOptions),");
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Reverted 'connection: new Redis' in ${file}`);
            changed++;
        }
    }

    console.log(`Done reverting ${changed} workers.`);
}

revertToNewRedis();

const fs = require('fs');
const path = require('path');

const workersDir = path.join(__dirname, '..', 'src', 'workers');

function applyAsAny() {
    const files = fs.readdirSync(workersDir).filter(f => f.endsWith('.worker.ts'));
    let changed = 0;

    for (const file of files) {
        const filePath = path.join(workersDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace `connection: redis,` with `connection: redis as any,`
        // Make sure not to replace if it already has `as any`
        const regex = /connection:\s*redis,/g;

        if (regex.test(content)) {
            content = content.replace(regex, "connection: redis as any,");
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Applied 'as any' to ${file}`);
            changed++;
        }
    }

    console.log(`Done fixing ${changed} workers.`);
}

applyAsAny();

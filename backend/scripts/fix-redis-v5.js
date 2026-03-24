const fs = require('fs');
const path = require('path');

const workersDir = path.join(__dirname, '..', 'src', 'workers');

function removeSharedConnection() {
    const files = fs.readdirSync(workersDir).filter(f => f.endsWith('.worker.ts'));
    let changed = 0;

    for (const file of files) {
        const filePath = path.join(workersDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Remove `sharedConnection: true,`
        const regex = /sharedConnection:\s*true,\n?\s*/g;

        if (regex.test(content)) {
            content = content.replace(regex, "");
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Removed 'sharedConnection: true' from ${file}`);
            changed++;
        }
    }

    console.log(`Done fixing ${changed} workers.`);
}

removeSharedConnection();

const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, '../app/frontend/src');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.tsx') && !file.endsWith('.test.tsx')) {
                arrayOfFiles.push(path.join(__dirname, "../", path.relative(__dirname, dirPath + "/" + file)));
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles(dirPath);

let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Check if file uses type="number" inside an Input component
    // Note: Some are <Input ... type="number"
    // Some are <Input type="number"
    // We only want to replace ones that we know are `<Input` components

    let originalContent = content;

    // Simple approach: we know where they are. Let's just find `type="number"` and replace `<Input ... type="number"` with `<DecimalInput`
    // Regex to match `<Input ` followed by anything up to `>` containing `type="number"`
    const regex = /<Input([^>]*)type="number"([^>]*)>/g;

    if (regex.test(content)) {
        content = content.replace(regex, '<DecimalInput$1$2>');

        // Ensure DecimalInput is imported
        if (!content.includes('import { DecimalInput }')) {
            content = content.replace(
                /import \{ Input \} from "@\/components\/ui\/input";?/g,
                'import { Input } from "@/components/ui/input";\nimport { DecimalInput } from "@/components/ui/decimal-input";'
            );
        }

        fs.writeFileSync(file, content);
        modifiedCount++;
        console.log(`Updated: ${file}`);
    } else if (content.includes('type="number"')) {
        // Fallback for multiline components
        // e.g. <Input \n ... \n type="number"
        // Let's do a more generic regex that matches `<Input` up to `/>` or `>`
        const multiLineRegex = /<Input\s+([^>]*?)type="number"([^>]*?)(\/?>)/g;
        if (multiLineRegex.test(content)) {
            content = content.replace(multiLineRegex, '<DecimalInput $1 $2 $3');

            // Ensure DecimalInput is imported
            if (!content.includes('import { DecimalInput }')) {
                content = content.replace(
                    /import \{ Input \} from "@\/components\/ui\/input";?/g,
                    'import { Input } from "@/components/ui/input";\nimport { DecimalInput } from "@/components/ui/decimal-input";'
                );
            }

            fs.writeFileSync(file, content);
            modifiedCount++;
            console.log(`Updated (Multiline): ${file}`);
        }
    }
});

console.log(`\nModified ${modifiedCount} files.`);

#!/usr/bin/env node

/**
 * Move searchResults div inside .search container for proper dropdown positioning
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_ROOT = path.join(__dirname, '../../');
const SKIP_DIRS = ['assets', 'scripts', 'node_modules', '.git', '99_Attachments', 'backup'];

let processed = 0;
let updated = 0;

function fixSearchStructure(content) {
    // Pattern: <div class="search"><input.../>\n    </div>\n    <div id="searchResults"...
    const pattern = /(<div class="search">)(<input[^>]+>)\s*<\/div>\s*(<div id="searchResults"[^>]*><\/div>)/g;

    if (!pattern.test(content)) {
        return { modified: false, content };
    }

    const newContent = content.replace(
        pattern,
        `$1\n        $2\n        $3\n    </div>`
    );

    return { modified: true, content: newContent };
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = fixSearchStructure(content);

        if (result.modified) {
            fs.writeFileSync(filePath, result.content, 'utf8');
            console.log(`  ✅ Fixed: ${path.relative(SITE_ROOT, filePath)}`);
            updated++;
        }

    } catch (err) {
        console.error(`  ❌ Error: ${filePath}:`, err.message);
    }
}

function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (SKIP_DIRS.includes(item)) continue;
            processDirectory(fullPath);
        } else if (stat.isFile() && item.endsWith('.html')) {
            processed++;
            processFile(fullPath);
        }
    }
}

console.log('🔧 Moving searchResults inside .search container...\n');

processDirectory(SITE_ROOT);

console.log('\n' + '='.repeat(60));
console.log(`📊 Summary:`);
console.log(`  Processed: ${processed} files`);
console.log(`  Updated:   ${updated} files`);
console.log('='.repeat(60));
console.log('\n✨ Done! Search results will now dropdown from the input field.');

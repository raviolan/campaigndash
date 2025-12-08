#!/usr/bin/env node

/**
 * Add enhanced-todo.css to all HTML files
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

function addEnhancedTodoCSS(content) {
    // Check if already has enhanced-todo.css
    if (content.includes('enhanced-todo.css')) {
        return { modified: false, content };
    }

    // Find enhanced-features.css and add enhanced-todo.css after it
    const pattern = /(<link rel="stylesheet" href="\/assets\/enhanced-features\.css[^>]*>)/;

    if (!pattern.test(content)) {
        return { modified: false, content };
    }

    const newContent = content.replace(
        pattern,
        '$1\n    <link rel="stylesheet" href="/assets/enhanced-todo.css" />'
    );

    return { modified: true, content: newContent };
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = addEnhancedTodoCSS(content);

        if (result.modified) {
            fs.writeFileSync(filePath, result.content, 'utf8');
            console.log(`  ✅ Updated: ${path.relative(SITE_ROOT, filePath)}`);
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

console.log('🎨 Adding enhanced-todo.css to HTML files...\n');

processDirectory(SITE_ROOT);

console.log('\n' + '='.repeat(60));
console.log(`📊 Summary:`);
console.log(`  Processed: ${processed} files`);
console.log(`  Updated:   ${updated} files`);
console.log('='.repeat(60));
console.log('\n✨ Done! To-do lists now have enhanced styling.');

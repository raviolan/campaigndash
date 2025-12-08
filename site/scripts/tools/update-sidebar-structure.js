#!/usr/bin/env node

/**
 * One-time script to update navFav from <ul> to <div> in all HTML files
 * Changes: <ul id="navFav" class="nav-list"></ul> → <div id="navFav"></div>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_ROOT = path.join(__dirname, '../../');

// Skip these directories
const SKIP_DIRS = ['assets', 'scripts', 'node_modules', '.git', '99_Attachments', 'backup'];

let processed = 0;
let updated = 0;
let skipped = 0;

/**
 * Update sidebar structure in HTML content
 */
function updateSidebarStructure(content) {
    // Replace <ul id="navFav" class="nav-list"></ul> with <div id="navFav"></div>
    const oldPattern = /<ul id="navFav" class="nav-list"><\/ul>/g;
    const newReplacement = '<div id="navFav"></div>';

    if (content.includes('<ul id="navFav" class="nav-list">')) {
        return content.replace(oldPattern, newReplacement);
    }

    return null; // No change needed
}

/**
 * Process a single HTML file
 */
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const modified = updateSidebarStructure(content);

        if (modified === null) {
            skipped++;
            return;
        }

        // Write back
        fs.writeFileSync(filePath, modified, 'utf8');
        console.log(`  ✅ Updated: ${path.relative(SITE_ROOT, filePath)}`);
        updated++;

    } catch (err) {
        console.error(`  ❌ Error processing ${filePath}:`, err.message);
    }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
            // Skip certain directories
            if (SKIP_DIRS.includes(item.name)) {
                continue;
            }
            processDirectory(fullPath);
        } else if (item.isFile() && item.name.endsWith('.html')) {
            processed++;
            processFile(fullPath);
        }
    }
}

// Run the script
console.log('🔄 Updating sidebar structure in all HTML files...\n');
processDirectory(SITE_ROOT);

console.log('\n📊 Summary:');
console.log(`  Processed: ${processed} files`);
console.log(`  Updated: ${updated} files`);
console.log(`  Skipped: ${skipped} files (already updated)`);
console.log('\n✅ Done!');

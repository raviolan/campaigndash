#!/usr/bin/env node

/**
 * Rebuild search-index.json from existing HTML files
 * Extracts titles, headings, and tags from HTML
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_ROOT = path.join(__dirname, '../../');
const SKIP_DIRS = ['assets', 'scripts', 'node_modules', '.git', '99_Attachments', 'backup'];
const SKIP_FILES = ['graph.html', 'session.html', '2025-12-04.html'];

const searchIndex = [];

/**
 * Extract data from HTML content
 */
function extractData(content, filePath) {
    const relPath = path.relative(SITE_ROOT, filePath).replace(/\\/g, '/');

    // Extract title
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/ \| Campaign Site$/, '').trim() : path.basename(filePath, '.html');

    // Extract headings (h1, h2, h3)
    const headings = [];
    const headingRegex = /<h[123][^>]*>(.*?)<\/h[123]>/gi;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
        const heading = match[1]
            .replace(/<[^>]+>/g, '') // Remove HTML tags
            .replace(/&[^;]+;/g, ' ') // Remove HTML entities
            .trim();
        if (heading && heading !== title) {
            headings.push(heading);
        }
    }

    // Extract tags from site-tags component
    const tags = [];
    const tagsMatch = content.match(/<site-tags tags="([^"]+)"/);
    if (tagsMatch) {
        tags.push(...tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean));
    }

    return {
        id: relPath,
        title,
        headings: headings.slice(0, 10), // Limit to first 10 headings
        tags
    };
}

/**
 * Process a single HTML file
 */
function processFile(filePath) {
    try {
        const filename = path.basename(filePath);
        if (SKIP_FILES.includes(filename)) {
            return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const data = extractData(content, filePath);

        if (data.title && data.title !== 'Campaign Site') {
            searchIndex.push(data);
            console.log(`  ✅ Indexed: ${data.title} (${data.headings.length} headings, ${data.tags.length} tags)`);
        }

    } catch (err) {
        console.error(`  ❌ Error processing ${filePath}:`, err.message);
    }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (SKIP_DIRS.includes(item)) {
                continue;
            }
            processDirectory(fullPath);
        } else if (stat.isFile() && item.endsWith('.html')) {
            processFile(fullPath);
        }
    }
}

// Main execution
console.log('🔍 Rebuilding search index from HTML files...\n');

processDirectory(SITE_ROOT);

// Write search index
const searchIndexPath = path.join(SITE_ROOT, 'search-index.json');
fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2), 'utf8');

console.log('\n' + '='.repeat(60));
console.log(`📊 Summary:`);
console.log(`  Indexed: ${searchIndex.length} pages`);
console.log(`  Total headings: ${searchIndex.reduce((sum, item) => sum + item.headings.length, 0)}`);
console.log(`  Total tags: ${searchIndex.reduce((sum, item) => sum + item.tags.length, 0)}`);
console.log('='.repeat(60));
console.log(`\n✨ Search index rebuilt: ${searchIndexPath}`);
console.log(`\nTest it:`);
console.log(`  1. npm run serve`);
console.log(`  2. Press Cmd-K and search`);
console.log(`  3. See preview text under results`);

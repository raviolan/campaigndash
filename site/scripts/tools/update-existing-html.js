#!/usr/bin/env node

/**
 * One-time script to inject enhanced features into existing HTML files
 * Adds keyboard-nav.js, recent-pages.js, and enhanced-features.css to all HTML pages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_ROOT = path.join(__dirname, '../../');
const CACHE_BUST = Date.now();

// What we need to inject
const CSS_LINK = `<link rel="stylesheet" href="/assets/enhanced-features.css?v=${CACHE_BUST}" />`;
const KEYBOARD_SCRIPT = `<script src="/assets/keyboard-nav.js?v=${CACHE_BUST}"></script>`;
const RECENT_SCRIPT = `<script src="/assets/recent-pages.js?v=${CACHE_BUST}"></script>`;

// Skip these directories
const SKIP_DIRS = ['assets', 'scripts', 'node_modules', '.git', '99_Attachments', 'tags', 'backup'];

let processed = 0;
let updated = 0;
let skipped = 0;

/**
 * Check if file already has the enhanced features
 */
function hasEnhancedFeatures(content) {
    return content.includes('keyboard-nav.js') &&
        content.includes('recent-pages.js') &&
        content.includes('enhanced-features.css');
}

/**
 * Inject scripts and CSS into HTML content
 */
function injectEnhancements(content) {
    let modified = content;

    // Inject CSS in <head> before closing </head>
    if (!content.includes('enhanced-features.css')) {
        modified = modified.replace('</head>', `  ${CSS_LINK}\n</head>`);
    }

    // Inject scripts before closing </body>
    // Find the position before site.js or before </body>
    if (!content.includes('keyboard-nav.js')) {
        // Try to inject before site.js for proper load order
        if (content.includes('<script src="/assets/site.js')) {
            modified = modified.replace(
                '<script src="/assets/site.js',
                `${KEYBOARD_SCRIPT}\n  ${RECENT_SCRIPT}\n  <script src="/assets/site.js`
            );
        } else {
            // Fallback: inject before </body>
            modified = modified.replace('</body>', `  ${KEYBOARD_SCRIPT}\n  ${RECENT_SCRIPT}\n</body>`);
        }
    }

    return modified;
}

/**
 * Process a single HTML file
 */
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Skip if already has enhancements
        if (hasEnhancedFeatures(content)) {
            console.log(`  ⏭️  Already enhanced: ${path.relative(SITE_ROOT, filePath)}`);
            skipped++;
            return;
        }

        // Inject enhancements
        const modified = injectEnhancements(content);

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
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Skip excluded directories
            if (SKIP_DIRS.includes(item)) {
                continue;
            }
            processDirectory(fullPath);
        } else if (stat.isFile() && item.endsWith('.html')) {
            processed++;
            processFile(fullPath);
        }
    }
}

// Main execution
console.log('🔧 Updating existing HTML files with enhanced features...\n');
console.log(`Injecting:`);
console.log(`  - ${CSS_LINK}`);
console.log(`  - ${KEYBOARD_SCRIPT}`);
console.log(`  - ${RECENT_SCRIPT}\n`);

processDirectory(SITE_ROOT);

console.log('\n' + '='.repeat(60));
console.log(`📊 Summary:`);
console.log(`  Processed: ${processed} files`);
console.log(`  Updated:   ${updated} files`);
console.log(`  Skipped:   ${skipped} files (already enhanced)`);
console.log('='.repeat(60));

if (updated > 0) {
    console.log('\n✨ Done! Try these shortcuts:');
    console.log('  - Cmd/Ctrl-K: Search');
    console.log('  - Cmd/Ctrl-H: Recent pages');
    console.log('  - Cmd/Ctrl-B: Bookmark page');
    console.log('  - Arrow keys: Navigate search results');
    console.log('\nSee ENHANCED-FEATURES.md for full documentation.');
}

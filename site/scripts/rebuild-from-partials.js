#!/usr/bin/env node

/**
 * Rebuild all HTML files using partials as single source of truth
 * Extracts page-specific content and wraps it with global templates
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_ROOT = path.join(__dirname, '../');
const PARTIALS_DIR = path.join(SITE_ROOT, 'assets/partials');
const VERSION = Date.now();

const SKIP_DIRS = ['assets', 'scripts', 'node_modules', '.git', 'backup'];

let processed = 0;
let updated = 0;
let errors = 0;

console.log('Starting rebuild script...');
console.log('SITE_ROOT:', SITE_ROOT);
console.log('PARTIALS_DIR:', PARTIALS_DIR);

// Load all partials
console.log('Loading partials...');
const partials = {
    layout: fs.readFileSync(path.join(PARTIALS_DIR, 'layout.html'), 'utf8'),
    header: fs.readFileSync(path.join(PARTIALS_DIR, 'header.html'), 'utf8'),
    sidebar: fs.readFileSync(path.join(PARTIALS_DIR, 'sidebar.html'), 'utf8'),
    footer: fs.readFileSync(path.join(PARTIALS_DIR, 'footer.html'), 'utf8'),
    right: fs.existsSync(path.join(PARTIALS_DIR, 'right-panel.html'))
        ? fs.readFileSync(path.join(PARTIALS_DIR, 'right-panel.html'), 'utf8')
        : ''
};
console.log('Partials loaded successfully');

/**
 * Extract sections navigation from existing HTML
 */
function extractSections(html) {
    // Match nav-sections ul and everything up to </nav>
    // This ensures we get all nested ul elements
    const match = html.match(/<ul class="nav-sections">([\s\S]*?)<\/ul>\s*<\/nav>/);
    return match ? match[1] : '';
}

/**
 * Extract right panel top content from existing HTML
 */
function extractRightTop(html) {
    const match = html.match(/<div id="drawerTop">([\s\S]*?)<\/div>/);
    return match ? match[1] : '';
}

/**
 * Extract page-specific content from existing HTML
 * Content is everything inside <main class="main"> after breadcrumb
 */
function extractContent(html) {
    const mainMatch = html.match(/<main class="main">([\s\S]*?)<\/main>/);
    if (!mainMatch) {
        throw new Error('Could not find <main class="main"> tag');
    }

    let content = mainMatch[1];

    // Remove breadcrumb div
    content = content.replace(/<div id="breadcrumbText"[^>]*><\/div>/, '').trim();

    return content;
}

/**
 * Extract title from existing HTML
 */
function extractTitle(html) {
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    return titleMatch ? titleMatch[1] : 'Untitled';
}

/**
 * Extract extra scripts if any (like graph.js, session.js)
 */
function extractExtraScripts(html) {
    const scripts = [];
    const scriptMatches = html.matchAll(/<script src="\/assets\/(graph|session|search)\.js[^"]*"><\/script>/g);
    for (const match of scriptMatches) {
        scripts.push(match[0]);
    }
    return scripts.join('\n    ');
}

/**
 * Build complete HTML from partials and content
 */
function buildPage(title, content, sections, rightTop, extraScripts = '') {
    let html = partials.layout;

    // Replace layout placeholders
    html = html.replace('{{TITLE}}', title);
    html = html.replace(/\{\{VERSION\}\}/g, VERSION); // Replace all VERSION occurrences
    html = html.replace('{{HEADER}}', partials.header);
    html = html.replace('{{SIDEBAR}}', partials.sidebar);
    html = html.replace('{{CONTENT}}', content);
    html = html.replace('{{RIGHT}}', partials.right);
    html = html.replace('{{FOOTER}}', partials.footer);
    html = html.replace('{{EXTRA_SCRIPTS}}', extraScripts ? '\n    ' + extraScripts : '');

    // Replace nested placeholders in partials
    html = html.replace('{{SECTIONS}}', sections);
    html = html.replace('{{RIGHT_TOP}}', rightTop);
    
    return html;
}

/**
 * Process a single HTML file
 */
function processFile(filePath) {
    try {
        const originalHtml = fs.readFileSync(filePath, 'utf8');

            // Extract components
            const title = extractTitle(originalHtml);
            const content = extractContent(originalHtml);
            const sections = ''; // Sections are now in sidebar.html partial, not page-specific
            const rightTop = extractRightTop(originalHtml);
            const extraScripts = extractExtraScripts(originalHtml);        // Build new HTML
        const newHtml = buildPage(title, content, sections, rightTop, extraScripts);

        // Write back
        fs.writeFileSync(filePath, newHtml, 'utf8');

        const relativePath = path.relative(SITE_ROOT, filePath);
        console.log(`  ✅ ${relativePath}`);
        updated++;

    } catch (err) {
        const relativePath = path.relative(SITE_ROOT, filePath);
        console.error(`  ❌ ${relativePath}: ${err.message}`);
        errors++;
    }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
    console.log('Processing directory:', dirPath);
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
            if (SKIP_DIRS.includes(item.name)) {
                console.log('  Skipping:', item.name);
                continue;
            }
            console.log('  Entering directory:', item.name);
            processDirectory(fullPath);
        } else if (item.isFile() && item.name.endsWith('.html')) {
            processed++;
            console.log('  Processing file:', item.name);
            processFile(fullPath);
        }
    }
}

// Run the script
console.log('🔄 Rebuilding all HTML files from partials...\n');
console.log('📦 Using partials from:', PARTIALS_DIR);
console.log('📁 Processing root:', SITE_ROOT);
console.log('🆔 Version:', VERSION);
console.log('');

try {
    processDirectory(SITE_ROOT);

    console.log('\n📊 Summary:');
    console.log(`  Processed: ${processed} files`);
    console.log(`  Updated: ${updated} files`);
    if (errors > 0) {
        console.log(`  Errors: ${errors} files`);
    }
    console.log('\n✅ Done! All pages now use shared partials.');
    console.log('💡 Edit files in assets/partials/ to update globally.');

} catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
}

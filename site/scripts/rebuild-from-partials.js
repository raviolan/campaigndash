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
 * Generate sidebar sections from data/nav.json (filesystem-driven)
 */
function generateSectionsHtml() {
    const navPath = path.join(SITE_ROOT, 'data', 'nav.json');
    let config = { sections: [] };
    try {
        config = JSON.parse(fs.readFileSync(navPath, 'utf8'));
    } catch (e) {
        console.warn('[rebuild] nav.json not found or invalid, using empty config');
    }
    const ICONS = {
        pc: 'M4 18l8-14 8 14H4zm8-8l3 6H9l3-6z',
        npc: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zm-11 9c0-3 4-5 7-5s7 2 7 5v2H5v-2z',
        location: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c2.9 0 5.4 2.4 6.5 6H5.5C6.6 6.4 9.1 4 12 4zm0 16c-2.9 0-5.4-2.4-6.5-6h13c-1.1 3.6-3.6 6-6.5 6z',
        arc: 'M12 2a10 10 0 100 20 10 10 0 000-20zm5 5l-3 8-8 3 3-8 8-3zM10 10l-1 2 2-1 1-2-2 1z',
        other: 'M4 4h11l-1 3h6v11H4V4zm2 2v9h12V9h-5l1-3H6z',
        tools: 'M21 14l-5-5 2-2 3 3 2-2-3-3 1-1-2-2-3 3-2-2-2 2 2 2-9 9v4h4l9-9 2 2z',
        dot: 'M12 12a3 3 0 110-6 3 3 0 010 6z'
    };

    function listHtmlFiles(dirAbs, exclude = []) {
        if (!fs.existsSync(dirAbs)) return [];
        return fs.readdirSync(dirAbs)
            .filter(f => f.endsWith('.html') && !exclude.includes(f))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }

    function iconSvg(pathD) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${pathD}"/></svg>`;
    }

    let html = '';

    for (const sec of (config.sections || [])) {
        const folderAbs = path.join(SITE_ROOT, sec.folder);
        if (!fs.existsSync(folderAbs)) continue;

        let inner = '';
        // Exclusions per section
        const exclude = Array.isArray(sec.exclude) ? sec.exclude : [];

        // If the folder has known subsections (e.g., World -> Locations), render them by scanning subfolders
        // Otherwise render flat list of files in the section folder
        const stat = fs.statSync(folderAbs);
        if (stat.isDirectory()) {
            // Render files directly under the folder
            const files = listHtmlFiles(folderAbs, exclude);
            for (const f of files) {
                const title = f.replace(/\.html$/i, '');
                inner += `
                    <li><a class="nav-item" href="/${sec.folder}/${encodeURIComponent(f)}"><span class="nav-icon">•</span><span class="nav-text">${title}</span></a></li>`;
            }

            // Render immediate subfolders as subsections (best-effort generic)
            const subs = fs.readdirSync(folderAbs).filter(n => fs.existsSync(path.join(folderAbs, n)) && fs.statSync(path.join(folderAbs, n)).isDirectory());
            for (const sub of subs) {
                const subAbs = path.join(folderAbs, sub);
                const subFiles = listHtmlFiles(subAbs, exclude);
                if (!subFiles.length) continue;
                inner += `
                    <li class="nav-section">
                        <details class="nav-details ${sec.class}" open>
                            <summary class="nav-label"><span class="nav-icon">${iconSvg(ICONS.dot)}</span><span>${sub}</span></summary>
                            <ul class="nav-list">`;
                for (const f of subFiles) {
                    const title = f.replace(/\.html$/i, '');
                    inner += `
                                <li><a class="nav-item" href="/${sec.folder}/${encodeURIComponent(sub)}/${encodeURIComponent(f)}"><span class="nav-icon">•</span><span class="nav-text">${title}</span></a></li>`;
                }
                inner += `
                            </ul>
                        </details>
                    </li>`;
            }
        }

        if (!inner) continue;

        html += `
            <li class="nav-group">
                <details class="nav-details ${sec.class || sec.className || ''}" open>
                    <summary class="nav-label"><span class="nav-icon">${iconSvg(ICONS[sec.icon] || ICONS.dot)}</span><span>${sec.name}</span></summary>
                    <ul class="nav-list">${inner}
                    </ul>
                </details>
            </li>`;
    }

    return html.trim();
}

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

    // Remove everything from the start up to and including the breadcrumb container
    // This handles nested buttons and divs within the breadcrumb
    const breadcrumbEndMatch = content.match(/<div class="breadcrumb-container">[\s\S]*?<\/button>\s*<\/div>/);
    if (breadcrumbEndMatch) {
        content = content.substring(breadcrumbEndMatch.index + breadcrumbEndMatch[0].length);
    }

    // Fallback: remove old-style breadcrumb divs if any remain
    content = content.replace(/^[\s\S]*?<div id="breadcrumbText"[^>]*><\/div>\s*/, '');

    // Clean up any orphaned tags at the start (buttons, closing divs, etc.)
    content = content.replace(/^(\s*(<\/div>|<button[\s\S]*?<\/button>)\s*)+/, '');

    return content.trim();
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

    // Helper: unescape HTML entities if a partial was previously stored escaped
    function unescapeHtmlIfNeeded(s) {
        if (!s || typeof s !== 'string') return s;
        if (!/&lt;/.test(s)) return s;
        return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }

    // Replace layout placeholders
    html = html.replace('{{TITLE}}', title);
    html = html.replace(/\{\{VERSION\}\}/g, VERSION); // Replace all VERSION occurrences
    html = html.replace('{{HEADER}}', partials.header);
    html = html.replace('{{SIDEBAR}}', partials.sidebar);
    // If content or rightTop were stored escaped in source HTML, unescape them so
    // the injected HTML renders as elements instead of visible markup text.
    content = unescapeHtmlIfNeeded(content);
    rightTop = unescapeHtmlIfNeeded(rightTop);

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
        const sections = generateSectionsHtml();
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

#!/usr/bin/env node
// Patch existing PC/NPC HTML pages to include entity header + avatar using matching assets.
import fs from 'fs';
import path from 'path';

const HERE = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const SITE_DIR = path.resolve(HERE, '..', '..');
const ASSET_DIR = path.join(SITE_DIR, 'assets');
const SKIP_DIRS = new Set(['assets', 'scripts', 'node_modules', '.git']);
const HTML_DIRS = [path.join(SITE_DIR, '03_PCs'), path.join(SITE_DIR, '04_NPCs')];
const OTHER_DIRS = [
    path.join(SITE_DIR, '00_Campaign'),
    path.join(SITE_DIR, '01_Arcs'),
    path.join(SITE_DIR, '02_World'),
    path.join(SITE_DIR, '05_Tools & Tables'),
    path.join(SITE_DIR, "000_today's tools"),
    path.join(SITE_DIR, 'tags'),
    path.join(SITE_DIR, 'web'),
    SITE_DIR // catch root HTML like index.html, graph.html, session.html
];

const SUPPORTED_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

const slugify = (s) => s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');

function collectAssets(kind) {
    const files = fs.readdirSync(ASSET_DIR);
    const map = new Map();
    for (const f of files) {
        const lower = f.toLowerCase();
        for (const ext of SUPPORTED_EXT) {
            if (lower.endsWith(`${kind}${ext}`)) {
                const base = lower.replace(`${kind}${ext}`, ''); // e.g., nyx- or nyx
                const key = slugify(base.replace(/-$/, ''));
                map.set(key, '/assets/' + f);
            }
        }
    }
    return map;
}

function collectHtmlFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectHtmlFiles(full));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
            files.push(full);
        }
    }
    return files;
}

const headers = collectAssets('-header');
const avatars = collectAssets('-avatar');

const chooseHeaderOnly = (baseName) => {
    const variants = [];
    const slug = slugify(baseName);
    variants.push(slug, slug.replace(/-/g, ''), slug.replace(/-/g, '').slice(0));
    variants.push(slugify(baseName.toLowerCase()));
    for (const v of variants) {
        if (headers.has(v)) return headers.get(v);
    }
    return null;
};

function chooseImage(map, baseName) {
    const variants = [];
    const raw = baseName.toLowerCase();
    const slug = slugify(baseName);
    variants.push(slug, slug.replace(/-/g, ''), slug.replace(/-/g, '').slice(0));
    variants.push(slugify(raw));
    for (const v of variants) {
        if (map.has(v)) return map.get(v);
    }
    return null;
}

function extractFirst(content, tag) {
    const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i');
    const m = content.match(re);
    if (!m) return '';
    return m[1].replace(/<[^>]+>/g, '').trim();
}

// Patch non-PC/NPC pages with a page-header if missing (recursive)
for (const baseDir of OTHER_DIRS) {
    const files = collectHtmlFiles(baseDir);
    for (const full of files) {
        let html = fs.readFileSync(full, 'utf8');
        if (html.includes('entity-header')) continue; // already an entity page
        if (html.includes('page-header')) continue; // already has a page header

        const baseName = path.basename(full).replace(/\.html$/i, '');
        const headerImg = chooseHeaderOnly(baseName) || '/assets/ph-header.svg';

        // inject a page header before the first <h1>
        const h1Re = /<h1[^>]*>/i;
        if (h1Re.test(html)) {
            html = html.replace(h1Re, '<div class="page-header" style="--page-header:url(\'' + headerImg + '\')"></div><h1>');
        } else {
            // fallback: inject near top of main content area
            const mainRe = /<main[^>]*>/i;
            if (mainRe.test(html)) {
                html = html.replace(mainRe, match => match + '<div class="page-header" style="--page-header:url(\'' + headerImg + '\')"></div>');
            } else {
                // if no main/h1, skip to avoid corrupting structure
                continue;
            }
        }

        fs.writeFileSync(full, html, 'utf8');
        console.log('Patched page-header', path.relative(SITE_DIR, full), '->', path.basename(headerImg));
    }
}

// Patch PC/NPC entity pages with header + avatar (recursive, though these dirs are flat today)
for (const dir of HTML_DIRS) {
    const files = collectHtmlFiles(dir);
    for (const full of files) {
        let html = fs.readFileSync(full, 'utf8');
        if (html.includes('entity-header')) continue; // already patched

        const baseName = path.basename(full).replace(/\.html$/i, '');
        const title = extractFirst(html, 'h1') || baseName;
        const subtitle = extractFirst(html, 'h2');

        const headerImg = chooseImage(headers, baseName) || '/assets/ph-header.svg';
        const avatarImg = chooseImage(avatars, baseName) || '/assets/ph-avatar.svg';

        const headerBlock = (
            '<section class="entity">'
            + '<div class="entity-header" style="--header:url(\'' + headerImg + '\')">'
            + '<div class="entity-id">'
            + '<div class="entity-avatar"><img src="' + avatarImg + '" alt="' + title + '"></div>'
            + '<div class="entity-meta">'
            + '<div class="entity-name">' + title + '</div>'
            + '<div class="entity-sub">' + subtitle + '</div>'
            + '<div class="entity-badges"></div>'
            + '</div>'
            + '</div>'
            + '</div>'
            + '</section>'
        );

        const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/i;
        const m = html.match(articleRe);
        if (!m) continue;
        const inner = m[1];
        const rebuilt = '<article class="entity-page">' + headerBlock + '<div class="entity-body">' + inner + '</div></article>';
        html = html.replace(articleRe, rebuilt);

        fs.writeFileSync(full, html, 'utf8');
        console.log('Patched', path.relative(SITE_DIR, full), '->', path.basename(headerImg), path.basename(avatarImg));
    }
}

console.log('Done.');
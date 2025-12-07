#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { ensureDir, sha1, readText, writeFile, copyFile, copyDir, loadCache, saveCache } from './lib/io.js';

const args = process.argv.slice(2);
const FLAGS = { concurrency: 1, dryRun: false, debug: false, force: false, noCache: false };
for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run' || a === '--dryrun') FLAGS.dryRun = true;
    else if (a === '--debug') FLAGS.debug = true;
    else if (a === '--force') FLAGS.force = true;
    else if (a === '--no-cache') FLAGS.noCache = true;
    else if (a.startsWith('--concurrency=')) FLAGS.concurrency = Math.max(1, parseInt(a.split('=')[1], 10) || 1);
    else if (a === '--concurrency' && args[i + 1]) { FLAGS.concurrency = Math.max(1, parseInt(args[i + 1], 10) || 1); i++; }
}

const log = (...parts) => console.log('[dm-site]', ...parts);

// Vault root is the parent of this `site` folder (where the markdown lives). Output still writes to `site`.
const VAULT_ROOT = path.resolve(process.cwd(), '..');
const OUT_DIR = path.join(VAULT_ROOT, 'site');
const ASSET_SRC = path.join(VAULT_ROOT, 'web', 'assets');
const PARTIALS_DIR = path.join(OUT_DIR, 'assets', 'partials');
const VERSION = String(Date.now());

const CACHE_PATH = path.join(OUT_DIR, '.buildcache.json');

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'site', '.obsidian']);
const ATTACHMENTS_DIR_NAME = '99_Attachments';
const SUPPORTED_IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const ODD_EXT = new Set(['.canvas', '.textClipping']);

const SHEET_LINKS = new Map(Object.entries({
    'nyx': 'https://www.dndbeyond.com/characters/134359738',
    'oceanus': 'https://www.dndbeyond.com/characters/141409762',
    'odo-kneecapper': 'https://www.dndbeyond.com/characters/134548919',
    'tenebris': 'https://www.dndbeyond.com/characters/140801696',
    'tihildur': 'https://www.dndbeyond.com/characters/134555684',
    'valkrath': 'https://www.dndbeyond.com/characters/134996350',
}));

// IO helpers (ensureDir, sha1, readText, writeFile, copyFile, copyDir, loadCache, saveCache)
// are provided by `site/scripts/lib/io.js` and imported above.

const listFilesRec = (dir) => {
    const res = [];
    const stack = [dir];
    while (stack.length) {
        const d = stack.pop();
        const ents = fs.readdirSync(d, { withFileTypes: true });
        for (const ent of ents) {
            if (ent.name.startsWith('.')) continue;
            const full = path.join(d, ent.name);
            const rel = path.relative(VAULT_ROOT, full);
            if (rel.split(path.sep).some(seg => IGNORE_DIRS.has(seg))) continue;
            if (ent.isDirectory()) stack.push(full); else res.push(full);
        }
    }
    return res;
};

const mdToHtmlPath = (rel) => rel.replace(/\\/g, '/').replace(/\.md$/i, '.html');
const urlFor = (rel) => '/' + mdToHtmlPath(rel).split('/').map(encodeURIComponent).join('/');
const assetUrl = (p) => '/' + p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
const htmlOutPath = (rel) => path.join(OUT_DIR, mdToHtmlPath(rel));
const getTitleFromMd = (md, fallback) => (md.match(/^\s*#\s+(.+)$/m)?.[1]?.trim() || fallback.replace(/\.md$/i, ''));
const extractTags = (md) => { md = md.replace(/```[\s\S]*?```/g, ''); const s = new Set(); const re = /(^|\s)#([\p{L}\p{N}_-]+)/gu; let m; while ((m = re.exec(md))) s.add(m[2]); return [...s]; };
const extractHeadings = (md) => { const hs = []; const re = /^(#{1,6})\s+(.+)$/gm; let m; while ((m = re.exec(md))) hs.push(m[2].trim()); return hs; };
const wikilinkRE = /!?\[\[([^\]]+)\]\]/g;
const parseWikiLinks = (md) => { const out = []; let m; while ((m = wikilinkRE.exec(md))) { const raw = m[1]; const embed = m[0].startsWith('!'); const parts = raw.split('|'); out.push({ target: parts[0].trim(), display: parts[1]?.trim(), embed }); } return out; };

const loadCacheWrapper = () => loadCache(CACHE_PATH, { noCache: FLAGS.noCache });
const saveCacheWrapper = (c) => saveCache(CACHE_PATH, c, { dryRun: FLAGS.dryRun, noCache: FLAGS.noCache });

function svgIcon(name, size = 16) {
    const p = (d) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
    switch (name) {
        case 'home': return p('M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z');
        case 'star': return p('M12 2l3.1 6.3 7 .9-5.1 4.9 1.3 6.9L12 17.8 5.7 21l1.3-6.9L2 9.2l7-.9L12 2z');
        case 'flag': return p('M4 4h11l-1 3h6v11H4V4zm2 2v9h12V9h-5l1-3H6z');
        case 'globe': return p('M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c2.9 0 5.4 2.4 6.5 6H5.5C6.6 6.4 9.1 4 12 4zm0 16c-2.9 0-5.4-2.4-6.5-6h13c-1.1 3.6-3.6 6-6.5 6z');
        case 'compass': return p('M12 2a10 10 0 100 20 10 10 0 000-20zm5 5l-3 8-8 3 3-8 8-3zM10 10l-1 2 2-1 1-2-2 1z');
        case 'users': return p('M16 11a4 4 0 10-8 0 4 4 0 008 0zm-11 9c0-3 4-5 7-5s7 2 7 5v2H5v-2z');
        case 'wizard': return p('M4 18l8-14 8 14H4zm8-8l3 6H9l3-6z');
        case 'tools': return p('M21 14l-5-5 2-2 3 3 2-2-3-3 1-1-2-2-3 3-2-2-2 2 2 2-9 9v4h4l9-9 2 2z');
        case 'dot': return p('M12 12a3 3 0 110-6 3 3 0 010 6z');
        default: return p('');
    }
}

// Load partials once
const headerPartial = fs.readFileSync(path.join(PARTIALS_DIR, 'header.html'), 'utf8');
const sidebarPartialRaw = fs.readFileSync(path.join(PARTIALS_DIR, 'sidebar.html'), 'utf8');
const footerPartial = fs.readFileSync(path.join(PARTIALS_DIR, 'footer.html'), 'utf8');
const layoutPartial = fs.readFileSync(path.join(PARTIALS_DIR, 'layout.html'), 'utf8');

function assembleLayout({ title, content, sidebarSections, rightHtml = '', extraScripts = '' }) {
    // Replace placeholders in sidebar partial
    const sidebarPartial = sidebarPartialRaw.replace('{{SECTIONS}}', sidebarSections);
    return layoutPartial
        .replace(/{{HEADER}}/g, headerPartial)
        .replace(/{{SIDEBAR}}/g, sidebarPartial)
        .replace(/{{FOOTER}}/g, footerPartial)
        .replace(/{{CONTENT}}/g, content)
        .replace(/{{TITLE}}/g, title)
        .replace(/{{RIGHT}}/g, rightHtml)
        .replace(/{{EXTRA_SCRIPTS}}/g, extraScripts)
        .replace(/{{VERSION}}/g, VERSION);
}

async function buildOnce() {
    const cache = loadCacheWrapper();
    const newCache = { notes: {}, assets: {} };

    const allFiles = listFilesRec(VAULT_ROOT);
    const mdFiles = allFiles.filter(f => f.toLowerCase().endsWith('.md'));
    const otherFiles = allFiles.filter(f => !f.toLowerCase().endsWith('.md'));

    const notes = new Map();
    const basenameIndex = new Map();
    for (const abs of mdFiles) {
        const rel = path.relative(VAULT_ROOT, abs).replace(/\\/g, '/');
        const md = readText(abs);
        const title = getTitleFromMd(md, path.basename(rel));
        const tags = extractTags(md);
        const headings = extractHeadings(md);
        const wiki = parseWikiLinks(md);
        notes.set(rel, { rel, abs, md, title, tags, headings, wiki });
        const base = path.basename(rel).replace(/\.md$/i, '');
        if (!basenameIndex.has(base)) basenameIndex.set(base, []);
        basenameIndex.get(base).push(rel);
    }

    const resolveWikiTarget = (fromRel, target) => {
        const norm = target.replace(/\\/g, '/');
        if (norm.includes('/')) {
            const cand1 = norm.endsWith('.md') ? norm : norm + '.md';
            if (notes.has(cand1)) return cand1;
            const baseDir = path.dirname(fromRel).replace(/\\/g, '/');
            const cand2 = (baseDir ? baseDir + '/' : '') + (norm.endsWith('.md') ? norm : norm + '.md');
            if (notes.has(cand2)) return cand2;
        } else {
            const list = basenameIndex.get(norm) || basenameIndex.get(norm.replace(/\.md$/i, ''));
            if (list && list.length === 1) return list[0];
            if (list && list.length > 1) {
                const dir = path.dirname(fromRel).replace(/\\/g, '/');
                const same = list.find((p) => path.dirname(p).replace(/\\/g, '/') === dir);
                if (same) return same;
                return list[0];
            }
            const mdName = norm.endsWith('.md') ? norm : norm + '.md';
            const list2 = basenameIndex.get(mdName.replace(/\.md$/i, ''));
            if (list2 && list2.length) return list2[0];
        }
        return null;
    };

    const edges = [];
    const backlinks = new Map();
    for (const [rel, note] of notes) {
        for (const link of note.wiki) {
            const to = resolveWikiTarget(rel, link.target);
            if (to) {
                edges.push({ source: rel, target: to });
                if (!backlinks.has(to)) backlinks.set(to, new Set());
                backlinks.get(to).add(rel);
            }
        }
    }

    ensureDir(OUT_DIR);
    // copy assets with concurrency
    if (typeof copyDirAsync === 'function') {
        await copyDirAsync(ASSET_SRC, path.join(OUT_DIR, 'assets'), cache, newCache, { concurrency: FLAGS.concurrency, dryRun: FLAGS.dryRun });
    } else {
        copyDir(ASSET_SRC, path.join(OUT_DIR, 'assets'), cache, newCache);
    }

    const nodesArr = [...notes.values()].map(n => ({ id: n.rel, title: n.title, tags: n.tags }));
    const graphData = { nodes: nodesArr, edges };
    writeFile(path.join(OUT_DIR, 'graph.json'), JSON.stringify(graphData, null, 2));
    const searchIndex = nodesArr.map(n => ({ id: n.id, title: n.title, tags: n.tags, headings: notes.get(n.id).headings }));
    writeFile(path.join(OUT_DIR, 'search-index.json'), JSON.stringify(searchIndex));
    writeFile(path.join(OUT_DIR, 'notes.json'), JSON.stringify(nodesArr));

    function buildTree(paths) {
        const root = {};
        for (const rel of paths) {
            const parts = rel.split('/');
            let node = root;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                node._dirs = node._dirs || {};
                node._dirs[part] = node._dirs[part] || {};
                node = node._dirs[part];
            }
            node._files = node._files || [];
            node._files.push(rel);
        }
        return root;
    }
    function folderClass(name) {
        if (/^03_PCs/.test(name)) return 'f-pc';
        if (/^04_NPCs/.test(name)) return 'f-npc';
        if (/^02_World/.test(name)) return 'f-location';
        if (/^01_Arcs/.test(name)) return 'f-arc';
        return 'f-other';
    }
    function friendlyName(name) {
        if (/^03_PCs/.test(name)) return 'Characters';
        if (/^04_NPCs/.test(name)) return 'NPCs';
        if (/^02_World/.test(name)) return 'World';
        if (/^01_Arcs/.test(name)) return 'Arcs';
        if (/^00_/.test(name)) return 'Campaign';
        if (/^05_/.test(name)) return 'Tools';
        return name;
    }
    function renderTreeNode(node, basePath) {
        let html = '';
        const dirs = Object.keys(node._dirs || {}).sort((a, b) => a.localeCompare(b));
        for (const d of dirs) {
            const child = node._dirs[d];
            const cls = folderClass((basePath ? basePath + '/' : '') + d);
            html += '<li><details class="' + cls + '" open><summary>' + d + '</summary><ul>' + renderTreeNode(child, (basePath ? basePath + '/' : '') + d) + '</ul></details></li>';
        }
        const files = (node._files || []).slice().sort((a, b) => a.localeCompare(b));
        for (const f of files) {
            const n = notes.get(f);
            html += '<li><a href="' + urlFor(f) + '" title="' + f + '">' + (n?.title || f) + '</a></li>';
        }
        return html;
    }
    function renderNavTree(node, basePath) {
        let html = '';
        const dirs = Object.keys(node._dirs || {}).sort((a, b) => a.localeCompare(b));
        for (const d of dirs) {
            const child = node._dirs[d];
            const cls = folderClass((basePath ? basePath + '/' : '') + d);
            html += '<li class="nav-section"><details class="nav-details ' + cls + '" open><summary class="nav-label"><span class="nav-icon">' + iconForSection(d) + '</span><span>' + d + '</span></summary><ul class="nav-list">' + renderNavTree(child, (basePath ? basePath + '/' : '') + d) + '</ul></details></li>';
        }
        const files = (node._files || []).slice().sort((a, b) => a.localeCompare(b));
        for (const f of files) {
            const n = notes.get(f);
            html += '<li><a class="nav-item" href="' + urlFor(f) + '"><span class="nav-icon">•</span><span class="nav-text">' + (n?.title || f) + '</span></a></li>';
        }
        return html;
    }
    // Top-level sections
    const treeRoot = buildTree([...notes.keys()]);
    let sections = Object.keys(treeRoot._dirs || {});
    const desiredOrder = ['03_PCs', '04_NPCs', '02_World', '01_Arcs', '00_Campaign', '05_Tools & Tables'];
    sections.sort((a, b) => {
        const ia = desiredOrder.findIndex(x => a.startsWith(x));
        const ib = desiredOrder.findIndex(x => b.startsWith(x));
        const aa = ia < 0 ? 999 : ia; const bb = ib < 0 ? 999 : ib;
        if (aa !== bb) return aa - bb;
        return a.localeCompare(b);
    });
    const sectionsHtml = sections.map(sec => {
        const label = friendlyName(sec);
        const secCls = folderClass(sec);
        return ('<li class="nav-group">'
            + '<details class="nav-details ' + secCls + '" open>'
            + '<summary class="nav-label"><span class="nav-icon">' + iconForSection(sec) + '</span><span>' + label + '</span></summary>'
            + '<div class="nav-mini"><button class="chip nav-only" data-section="' + label + '" title="Show only this section">Only</button><input class="nav-mini-input" data-section="' + label + '" placeholder="Filter section..." /></div>'
            + '<ul class="nav-list">' + renderNavTree(treeRoot._dirs[sec], sec) + '</ul>'
            + '</details>'
            + '</li>');
    }).join('');

    function iconForSection(name) {
        if (/^00_/.test(name)) return svgIcon('flag');
        if (/^01_/.test(name)) return svgIcon('compass');
        if (/^02_/.test(name)) return svgIcon('globe');
        if (/^03_/.test(name)) return svgIcon('wizard');
        if (/^04_/.test(name)) return svgIcon('users');
        if (/^05_/.test(name)) return svgIcon('tools');
        return svgIcon('dot');
    }

    // sidebarHtml is now assembled from partials, sectionsHtml injected

    function mdToHtml(md, fromRel) {
        md = md.replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, function (_m, t) {
            const target = t.trim();
            const attRel = path.join(ATTACHMENTS_DIR_NAME, target).replace(/\\/g, '/');
            return '<img alt="' + target + '" src="' + assetUrl(attRel) + '" />';
        });
        md = md.replace(/\[\[([^\]]+)\]\]/g, function (_m, inside) {
            const parts = inside.split('|'); const target = parts[0].trim(); const display = parts[1]?.trim();
            const resolved = resolveWikiTarget(fromRel, target);
            const href = resolved ? urlFor(resolved) : '#';
            const text = display || parts[0].trim();
            return '<a href="' + href + '" class="wikilink" data-target="' + target + '">' + text + '</a>';
        });
        md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_m, alt, src) {
            if (/^https?:/i.test(src)) return '<img alt="' + alt + '" src="' + src + '" />';
            const p = src.replace(/^\//, '');
            return '<img alt="' + alt + '" src="' + assetUrl(p) + '" />';
        });
        md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_m, text, href) {
            if (/^https?:/i.test(href)) return '<a href="' + href + '">' + text + '</a>';
            const p = href.replace(/^\//, '');
            return '<a href="' + assetUrl(p) + '">' + text + '</a>';
        });
        md = md.replace(/`([^`]+)`/g, '<code>$1</code>');
        md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        md = md.replace(/```([\s\S]*?)```/g, function (_m, code) { return '<pre><code>' + code.replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[s])) + '</code></pre>'; });
        const lines = md.split(/\r?\n/);
        let html = '', inUL = false, inOL = false;
        const close = () => { if (inUL) { html += '</ul>'; inUL = false; } if (inOL) { html += '</ol>'; inOL = false; } };
        for (const line of lines) {
            if (/^\s*$/.test(line)) { html += '\n'; continue; }
            const h = line.match(/^(#{1,6})\s+(.+)$/);
            if (h) { close(); const lvl = h[1].length; html += '\n<h' + lvl + '>' + h[2].trim() + '</h' + lvl + '>'; continue; }
            const lu = line.match(/^\s*[-*]\s+(.+)$/);
            if (lu) { if (!inUL) { close(); html += '<ul>'; inUL = true; } html += '<li>' + lu[1] + '</li>'; continue; }
            const lo = line.match(/^\s*\d+\.\s+(.+)$/);
            if (lo) { if (!inOL) { close(); html += '<ol>'; inOL = true; } html += '<li>' + lo[1] + '</li>'; continue; }
            close(); html += '<p>' + line + '</p>';
        }
        close();
        html = html.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, function (_m, pre, tag) { return pre + '<a class="tag" href="/tags/index.html#' + tag + '">#' + tag + '</a>'; });
        return html;
    }

    // baseTemplate now uses partials
    function baseTemplate(title, content, rightTopHtml = '', extraScripts = '') {
        return assembleLayout({
            title,
            content,
            sidebarSections: sectionsHtml,
            rightHtml: rightTopHtml,
            extraScripts
        });
    }

    const assetExists = (fname) => fs.existsSync(path.join(ASSET_SRC, fname));
    const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/--+/g, '-');
    const findImageFor = (note, kind) => {
        const base = path.basename(note.rel).replace(/\.md$/i, '');
        const slug = slugify(base);
        const compact = slug.replace(/-/g, '');
        const candidates = [slug, compact];
        for (const cand of candidates) {
            for (const ext of SUPPORTED_IMG_EXT) {
                const fname = `${cand}-${kind}${ext}`;
                if (assetExists(fname)) return assetUrl('assets/' + fname);
            }
        }
        return null;
    };

    const subtitleFor = (note, isPC, isNPC) => {
        const lines = note.md.split(/\r?\n/);
        const heading = lines.find(l => /^\s*#{2,3}\s+/.test(l));
        if (heading) return heading.replace(/^\s*#{2,3}\s+/, '').trim();
        const para = lines.find(l => l.trim() && !/^\s*#/.test(l));
        if (para) return para.trim().slice(0, 120);
        if (isPC) return 'Player Character';
        if (isNPC) return 'Non-Player Character';
        return '';
    };

    const badgesFor = (note) => {
        const exclude = new Set(['pc', 'npc', 'planning', 'arc']);
        return note.tags.filter(t => !exclude.has(t));
    };

    let rendered = 0, skipped = 0, copied = 0, skippedAssets = 0;
    for (const note of notes.values()) {
        const mdHash = sha1(Buffer.from(note.md, 'utf8'));
        if (!FLAGS.force && cache.notes && cache.notes[note.rel] === mdHash) {
            skipped++; newCache.notes[note.rel] = mdHash; continue;
        }
        rendered++;
        const isPC = note.tags.includes('pc') || note.rel.startsWith('03_PCs/');
        const isNPC = note.tags.includes('npc') || note.rel.startsWith('04_NPCs/');
        const isEntity = isPC || isNPC;

        const headerImg = findImageFor(note, 'header') || assetUrl('assets/ph-header.svg');
        const avatarImg = isEntity ? (findImageFor(note, 'avatar') || assetUrl('assets/ph-avatar.svg')) : null;
        const subtitle = subtitleFor(note, isPC, isNPC);
        const badges = badgesFor(note);

        let content = '';
        if (isEntity) {
            // Entity pages (PC/NPC) get both header + avatar
            content = '<article class="entity-page">'
                + '<section class="entity">'
                + '<div class="entity-header" style="--header:url(\'' + headerImg + '\')">'
                + '<div class="entity-id">'
                + '<div class="entity-avatar"><img src="' + avatarImg + '" alt="' + note.title + '"></div>'
                + '<div class="entity-meta">'
                + '<div class="entity-name">' + note.title + '</div>'
                + '<div class="entity-sub">' + subtitle + '</div>'
                + '<div class="entity-badges">' + badges.map(t => '<span class="tag">#' + t + '</span>').join('') + '</div>'
                + '</div>'
                + '</div>'
                + '</div>'
                + '</section>'
                + '<div class="entity-body">' + mdToHtml(note.md, note.rel) + '</div>'
                + '</article>';
        } else {
            // All other pages get page header
            content = '<article>'
                + '<div class="page-header" style="--page-header:url(\'' + headerImg + '\')"></div>'
                + '<h1>' + note.title + '</h1>'
                + mdToHtml(note.md, note.rel)
                + '</article>';
        }

        writeFile(htmlOutPath(note.rel), baseTemplate(note.title, content, '', '<script src="/assets/site-note.js?v=' + VERSION + '"></script>'));
        newCache.notes[note.rel] = mdHash;
    }

    // copy other non-md files with a concurrency-limited async pool
    const copyTasks = [];
    for (const f of otherFiles) {
        const rel = path.relative(VAULT_ROOT, f).replace(/\\/g, '/');
        const ext = path.extname(rel).toLowerCase();
        if (SUPPORTED_IMG_EXT.has(ext) || !ODD_EXT.has(ext)) {
            const dst = path.join(OUT_DIR, rel);
            copyTasks.push(async () => { await (typeof copyFileAsync === 'function' ? copyFileAsync(f, dst, rel, cache, newCache, { dryRun: FLAGS.dryRun }) : copyFile(f, dst, rel, cache, newCache)); copied++; });
        }
    }
    if (copyTasks.length) await (typeof runWithPool === 'function' ? runWithPool(copyTasks, FLAGS.concurrency) : Promise.all(copyTasks.map(t => t())));

    const assetKeysSkipped = Object.keys(cache.assets || {}).filter(k => !(k in newCache.assets)).length;
    skippedAssets = assetKeysSkipped;

    const homeHtml = '<section><h1>Campaign Vault</h1><p>A storm-cracked world beyond Saltmarsh</p></section>';
    writeFile(path.join(OUT_DIR, 'index.html'), baseTemplate('Home', homeHtml));

    const tagsHtml = '<h1>Tags</h1><div class="meta">Click a tag to filter.</div><div id="tagList"></div><div id="tagResults"></div>';
    writeFile(path.join(OUT_DIR, 'tags/index.html'), baseTemplate('Tags', tagsHtml, '', '<script src="/assets/site-tags.js?v=' + VERSION + '"></script>'));

    const graphHtml = '<h1>Graph</h1><div class="graph-panel" id="globalGraph"></div>';
    const toolbarPartial = fs.readFileSync(path.join(PARTIALS_DIR, 'toolbar.html'), 'utf8').replace('{{TOOLBAR_EXTRA}}',
        '<span class="chip" data-filter="pc">#pc</span>' +
        '<span class="chip" data-filter="npc">#npc</span>' +
        '<span class="chip" data-filter="location">#location</span>' +
        '<span class="chip" data-filter="arc">#arc/#planning</span>' +
        '<div id="graphPreview" class="card" aria-live="polite" aria-atomic="true"></div>'
    );
    writeFile(path.join(OUT_DIR, 'graph.html'), baseTemplate('Graph', graphHtml, toolbarPartial, '<script src="/assets/graph.js?v=' + VERSION + '"></script>'));

    const cardPartial = fs.readFileSync(path.join(PARTIALS_DIR, 'card.html'), 'utf8');
    const sessionHtml = '<h1>Session Mode</h1>'
        + cardPartial.replace('{{CARD_CONTENT}}', '<label class="sr-only" for="sessionEditor">Session Notes</label>'
            + '<textarea id="sessionEditor" placeholder="Type your quick notes here..." style="width:100%;min-height:40vh;border:1px solid var(--border);background:var(--panel);color:var(--text);border-radius:6px;padding:10px"></textarea>')
        + '<div class="session-grid" id="pinned"></div>'
        + '<h3>Quick Picks</h3><div class="session-grid" id="quick"></div>'
        + '<h3>Dice</h3>'
        + cardPartial.replace('{{CARD_CONTENT}}', '<input id="diceInput" placeholder="e.g. 1d20+5, 4d6kh3" />'
            + '<button id="rollBtn">Roll</button>'
            + '<div id="diceOut" class="meta"></div>');
    const sessionToolbar = fs.readFileSync(path.join(PARTIALS_DIR, 'toolbar.html'), 'utf8').replace('{{TOOLBAR_EXTRA}}',
        '<a class="chip" href="' + urlFor('00_Campaign/00_Campaign Dashboard.md') + '">Campaign Dashboard</a>' +
        '<a class="chip" href="' + urlFor('05_Tools & Tables/Random Encounter Generator.md') + '">Encounters</a>' +
        '<a class="chip" href="' + urlFor('05_Tools & Tables/DM References/02_Campaign Overview and Key points.md') + '">Overview</a>'
    );
    writeFile(path.join(OUT_DIR, 'session.html'), baseTemplate('Session', sessionHtml, sessionToolbar, '<script src="/assets/session.js?v=' + VERSION + '"></script>'));

    saveCacheWrapper(newCache);
    if (FLAGS.debug) log('stats rendered/skipped/copied/assetSkipped:', rendered, skipped, copied, skippedAssets);
    log('Built', notes.size, 'notes ->', OUT_DIR, '(rendered:', rendered, 'skipped:', skipped, 'copied:', copied, 'asset-skipped:', skippedAssets, ')');
}

(async () => { try { await buildOnce(); } catch (err) { console.error('[dm-site] build error', err && err.stack ? err.stack : err); process.exit(1); } })();

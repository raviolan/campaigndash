#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const VAULT_ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(VAULT_ROOT, 'site');
const ASSET_SRC = path.join(VAULT_ROOT, 'web', 'assets');
const VERSION = String(Date.now());

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'site', '.obsidian']);
const ATTACHMENTS_DIR_NAME = '99_Attachments';
const SUPPORTED_IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const ODD_EXT = new Set(['.canvas', '.textClipping']);

// Optional: hardcoded stat sheet links for PCs (single-user setup)
const SHEET_LINKS = new Map(Object.entries({
  // slug -> URL
  'nyx': 'https://www.dndbeyond.com/characters/134359738',
  'oceanus': 'https://www.dndbeyond.com/characters/141409762',
  'odo-kneecapper': 'https://www.dndbeyond.com/characters/134548919',
  'tenebris': 'https://www.dndbeyond.com/characters/140801696',
  'tihildur': 'https://www.dndbeyond.com/characters/134555684',
  'valkrath': 'https://www.dndbeyond.com/characters/134996350',
}));

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const writeFile = (p, c) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, c); };
const copyFile = (src, dest) => { ensureDir(path.dirname(dest)); fs.copyFileSync(src, dest); };
const copyDir = (src, dest) => {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d); else copyFile(s, d);
  }
};

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
const assetUrl = (p) => '/' + p.replace(/\\/g,'/').split('/').map(encodeURIComponent).join('/');
const htmlOutPath = (rel) => path.join(OUT_DIR, mdToHtmlPath(rel));
const readText = (p) => fs.readFileSync(p, 'utf8');
const getTitleFromMd = (md, fallback) => (md.match(/^\s*#\s+(.+)$/m)?.[1]?.trim() || fallback.replace(/\.md$/i, ''));
const extractTags = (md) => { md = md.replace(/```[\s\S]*?```/g, ''); const s = new Set(); const re=/(^|\s)#([\p{L}\p{N}_-]+)/gu; let m; while((m=re.exec(md))) s.add(m[2]); return [...s]; };
const extractHeadings = (md) => { const hs=[]; const re=/^(#{1,6})\s+(.+)$/gm; let m; while((m=re.exec(md))) hs.push(m[2].trim()); return hs; };
const wikilinkRE = /!?\[\[([^\]]+)\]\]/g;
const parseWikiLinks = (md) => { const out=[]; let m; while((m=wikilinkRE.exec(md))){ const raw=m[1]; const embed=m[0].startsWith('!'); const parts=raw.split('|'); out.push({target:parts[0].trim(), display:parts[1]?.trim(), embed}); } return out; };

// Inline SVG icons (fill=currentColor)
function svgIcon(name, size = 16){
  const p = (d) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  switch(name){
    case 'home': return p('M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z');
    case 'clock': return p('M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6l5 3 1-1.7-4-2.3V7z');
    case 'star': return p('M12 2l3.1 6.3 7 .9-5.1 4.9 1.3 6.9L12 17.8 5.7 21l1.3-6.9L2 9.2l7-.9L12 2z');
    case 'star-fill': return p('M12 2l3.1 6.3 7 .9-5.1 4.9 1.3 6.9L12 17.8 5.7 21l1.3-6.9L2 9.2l7-.9L12 2z');
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

function buildOnce(){
  const allFiles = listFilesRec(VAULT_ROOT);
  const mdFiles = allFiles.filter(f=>f.toLowerCase().endsWith('.md'));
  const otherFiles = allFiles.filter(f=>!f.toLowerCase().endsWith('.md'));

  const notes = new Map();
  const basenameIndex = new Map();
  for (const abs of mdFiles) {
    const rel = path.relative(VAULT_ROOT, abs);
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
  copyDir(ASSET_SRC, path.join(OUT_DIR, 'assets'));

  const nodesArr = [...notes.values()].map(n => ({ id: n.rel, title: n.title, tags: n.tags }));
  const graphData = { nodes: nodesArr, edges };
  writeFile(path.join(OUT_DIR, 'graph.json'), JSON.stringify(graphData, null, 2));
  const searchIndex = nodesArr.map(n => ({ id: n.id, title: n.title, tags: n.tags, headings: notes.get(n.id).headings }));
  writeFile(path.join(OUT_DIR, 'search-index.json'), JSON.stringify(searchIndex));
  writeFile(path.join(OUT_DIR, 'notes.json'), JSON.stringify(nodesArr));

  function buildTree(paths){
    const root = {};
    for(const rel of paths){
      const parts = rel.split('/');
      let node = root;
      for(let i=0;i<parts.length-1;i++){
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
  function folderClass(name){
    if(/^03_PCs/.test(name)) return 'f-pc';
    if(/^04_NPCs/.test(name)) return 'f-npc';
    if(/^02_World/.test(name)) return 'f-location';
    if(/^01_Arcs/.test(name)) return 'f-arc';
    return 'f-other';
  }
  function friendlyName(name){
    if(/^03_PCs/.test(name)) return 'Characters';
    if(/^04_NPCs/.test(name)) return 'NPCs';
    if(/^02_World/.test(name)) return 'World';
    if(/^01_Arcs/.test(name)) return 'Arcs';
    if(/^00_/.test(name)) return 'Campaign';
    if(/^05_/.test(name)) return 'Tools';
    return name;
  }
  function renderTreeNode(node, basePath){
    let html = '';
    const dirs = Object.keys(node._dirs||{}).sort((a,b)=>a.localeCompare(b));
    for(const d of dirs){
      const child = node._dirs[d];
      const cls = folderClass((basePath?basePath+'/':'')+d);
      html += '<li><details class="'+cls+'" open><summary>'+d+'</summary><ul>' + renderTreeNode(child, (basePath?basePath+'/':'')+d) + '</ul></details></li>';
    }
    const files = (node._files||[]).slice().sort((a,b)=>a.localeCompare(b));
    for(const f of files){
      const n = notes.get(f);
      html += '<li><a href="' + urlFor(f) + '" title="' + f + '">' + (n?.title || f) + '</a></li>';
    }
    return html;
  }
  const treeRoot = buildTree([...notes.keys()]);
  function renderNavTree(node, basePath){
    let html='';
    const dirs = Object.keys(node._dirs||{}).sort((a,b)=>a.localeCompare(b));
    for(const d of dirs){
      const child = node._dirs[d];
      const cls = folderClass((basePath?basePath+'/':'')+d);
      html += '<li class="nav-section"><details class="nav-details '+cls+'" open><summary class="nav-label"><span class="nav-icon">'+iconForSection(d)+'</span><span>'+d+'</span></summary><ul class="nav-list">' + renderNavTree(child, (basePath?basePath+'/':'')+d) + '</ul></details></li>';
    }
    const files = (node._files||[]).slice().sort((a,b)=>a.localeCompare(b));
    for(const f of files){
      const n = notes.get(f);
      html += '<li><a class="nav-item" href="' + urlFor(f) + '"><span class="nav-icon">•</span><span class="nav-text">' + (n?.title || f) + '</span></a></li>';
    }
    return html;
  }
  // Top-level sections
  let sections = Object.keys(treeRoot._dirs||{});
  const desiredOrder = ['03_PCs','04_NPCs','02_World','01_Arcs','00_Campaign','05_Tools & Tables'];
  sections.sort((a,b)=>{
    const ia = desiredOrder.findIndex(x=>a.startsWith(x));
    const ib = desiredOrder.findIndex(x=>b.startsWith(x));
    const aa = ia<0? 999 : ia; const bb = ib<0? 999 : ib;
    if (aa!==bb) return aa-bb;
    return a.localeCompare(b);
  });
  const sectionsHtml = sections.map(sec => {
    const label = friendlyName(sec);
    const secCls = folderClass(sec);
    return '<li class="nav-group">'
      + '<details class="nav-details '+secCls+'" open>'
      +   '<summary class="nav-label"><span class="nav-icon">'+iconForSection(sec)+'</span><span>'+label+'</span></summary>'
      +   '<div class="nav-mini"><button class="chip nav-only" data-section="'+label+'" title="Show only this section">Only</button><input class="nav-mini-input" data-section="'+label+'" placeholder="Filter section..." /></div>'
      +   '<ul class="nav-list">'+renderNavTree(treeRoot._dirs[sec], sec)+'</ul>'
      + '</details>'
    + '</li>';
  }).join('');

  function iconForSection(name){
    if (/^00_/.test(name)) return svgIcon('flag');
    if (/^01_/.test(name)) return svgIcon('compass');
    if (/^02_/.test(name)) return svgIcon('globe');
    if (/^03_/.test(name)) return svgIcon('wizard');
    if (/^04_/.test(name)) return svgIcon('users');
    if (/^05_/.test(name)) return svgIcon('tools');
    return svgIcon('dot');
  }

  const sidebarHtml = '<div class="drawer" aria-label="Navigation">'
    + '<div class="drawer-handle">'
    + '  <button id="leftDrawerToggle" class="chip" aria-expanded="true" aria-controls="leftDrawer">Nav</button>'
    + '  <button id="leftDrawerPin" class="chip" aria-pressed="true">Pin</button>'
    + '  <button id="leftCollapseExpand" class="chip" title="Collapse/Expand All">Collapse all</button>'
    + '</div>'
    + '<div id="leftDrawer" class="drawer-content">'
    + '  <aside class="sidebar" role="navigation">'
    + '    <div class="campaign-header"><div class="campaign-title">Feywild Adventures</div></div>'
    + '    <nav class="nav">'
    + '      <a class="nav-item nav-dashboard" href="/index.html"><span class="nav-icon">' + svgIcon('home') + '</span><span class="nav-text">Dashboard</span></a>'
    + ''
    + '      <div class="nav-quick"><input id="navQuick" placeholder="Quick nav..."/></div>'
    + ''
    + '      <details class="nav-details" open><summary class="nav-label"><span class="nav-icon">' + svgIcon('star') + '</span><span>Favorites</span></summary><ul id="navFav" class="nav-list"></ul></details>'
    + '      <ul class="nav-sections">'+sectionsHtml+'</ul>'
    + '    </nav>'
    + '  </aside>'
    + '</div>'
    + '</div>';

  function mdToHtml(md, fromRel) {
    md = md.replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, function(_m, t){
      const target = t.trim();
      const attRel = path.join(ATTACHMENTS_DIR_NAME, target).replace(/\\/g, '/');
      return '<img alt="' + target + '" src="' + assetUrl(attRel) + '" />';
    });
    md = md.replace(/\[\[([^\]]+)\]\]/g, function(_m, inside){
      const parts = inside.split('|'); const target = parts[0].trim(); const display = parts[1]?.trim();
      const resolved = resolveWikiTarget(fromRel, target);
      const href = resolved ? urlFor(resolved) : '#';
      const text = display || parts[0].trim();
      return '<a href="' + href + '" class="wikilink" data-target="' + target + '">' + text + '</a>';
    });
    md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(_m, alt, src){
      if(/^https?:/i.test(src)) return '<img alt="'+alt+'" src="'+src+'" />';
      const p = src.replace(/^\//,'');
      return '<img alt="'+alt+'" src="'+assetUrl(p)+'" />';
    });
    md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_m, text, href){
      if(/^https?:/i.test(href)) return '<a href="'+href+'">'+text+'</a>';
      const p = href.replace(/^\//,'');
      return '<a href="'+assetUrl(p)+'">'+text+'</a>';
    });
    md = md.replace(/`([^`]+)`/g, '<code>$1</code>');
    md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    md = md.replace(/```([\s\S]*?)```/g, function(_m, code){ return '<pre><code>' + code.replace(/[&<>]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s])) + '</code></pre>'; });
    const lines = md.split(/\r?\n/);
    let html = '', inUL=false, inOL=false;
    const close = ()=>{ if(inUL){html+='</ul>'; inUL=false;} if(inOL){html+='</ol>'; inOL=false;} };
    for (const line of lines) {
      if (/^\s*$/.test(line)) { html += '\n'; continue; }
      const h = line.match(/^(#{1,6})\s+(.+)$/);
      if (h){ close(); const lvl=h[1].length; html += '\n<h'+lvl+'>'+h[2].trim()+'</h'+lvl+'>'; continue; }
      const lu = line.match(/^\s*[-*]\s+(.+)$/);
      if (lu){ if(!inUL){ close(); html+='<ul>'; inUL=true; } html+='<li>'+lu[1]+'</li>'; continue; }
      const lo = line.match(/^\s*\d+\.\s+(.+)$/);
      if (lo){ if(!inOL){ close(); html+='<ol>'; inOL=true; } html+='<li>'+lo[1]+'</li>'; continue; }
      close(); html += '<p>'+line+'</p>';
    }
    close();
    html = html.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, function(_m, pre, tag){ return pre + '<a class="tag" href="/tags/index.html#'+tag+'">#'+tag+'</a>'; });
    return html;
  }

  const baseTemplate = (title, content, sidebarHtml, rightTopHtml = '', extraScripts='') => (
    '<!doctype html>\n'
    + '<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n'
    + '<title>' + title + '</title>\n<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3E%3Ccircle cx=%278%27 cy=%278%27 r=%277%27 fill=%27%238b5cf6%27/%3E%3C/svg%3E" />\n<link rel="stylesheet" href="/assets/style.css?v='+VERSION+'" />\n<script>window.SITE_BASE="/"</script>\n'
    + '</head>\n<body>\n'
    + '<div class="layout">\n'
    + '  <div class="top">\n'
    + '    <div class="toolbar">\n'
    + '      <a class="chip" href="/index.html">Hembränt</a>\n'
    + '      <a class="chip" href="/graph.html">Graph</a>\n'
    + '      <a class="chip" href="/tags/index.html">Tags</a>\n'
    + '      <a class="chip" href="/session.html">Session</a>\n'
    + '    </div>\n'
    + '    <div class="search"><input id="searchBox" type="search" placeholder="Search titles, headings, #tags (Cmd/Ctrl-K)"/></div>\n'
    + '    <div id="searchResults" class="hovercard"></div>\n'
    + '  </div>\n'
    + '  <aside class="left">' + sidebarHtml + '</aside>\n'
    + '  <main class="main">' + '<div id="breadcrumbText" class="main-breadcrumb meta"></div>' + content + '</main>\n'
    + '  <aside class="right">\n'
    + '    <div class="drawer" aria-label="Tools">\n'
    + '      <div class="drawer-handle">\n'
    + '        <button id="drawerToggle" class="chip" aria-expanded="true" aria-controls="drawerContent">Close</button>\n'
    + '        <button id="drawerPin" class="chip" aria-pressed="true" title="Pin panel"></button>\n'
    + '        <button id="themeToggle" class="chip" title="Toggle Light/Dark">Theme</button>\n'
    + '      </div>\n'
    + '      <div id="drawerContent" class="drawer-content">\n'
    + '        <div id="drawerTop">' + rightTopHtml + '</div>\n'
    + '        <div class="right-split">\n'
    + '        <div id="paneTop" class="pane">\n'
    + '          <div class="pane-body" data-pane="top">\n'
    + '            <div class="card"><h3 style="margin:0">Notepad</h3></div>\n'
    + '            <div class="card"><textarea id="toolNotepad" placeholder="Quick notes..." style="width:100%;min-height:26vh;border:1px solid var(--border);background:var(--panel);color:var(--text);border-radius:6px;padding:10px"></textarea></div>\n'
    + '          </div>\n'
    + '        </div>\n'
    + '        <div class="pane-resizer-h" aria-hidden="true"></div>\n'
    + '        <div id="paneBottom" class="pane">\n'
    + '          <div class="pane-body" data-pane="bottom">\n'
    + '            <div class="card"><h3 style="margin:0">To-Do</h3></div>\n'
    + '            <div id="todoBox" class="card" aria-label="Session To-Do">\n'
    + '              <form id="todoForm" class="todo-form" autocomplete="off">\n'
    + '                <label class="sr-only" for="todoInput">Add a task</label>\n'
    + '                <input id="todoInput" class="todo-input" placeholder="Add a task and press Enter"/>\n'
    + '                <button type="submit" class="todo-add">Add</button>\n'
    + '              </form>\n'
    + '              <div class="todo-actions">\n'
    + '                <button id="todoClearDone" class="chip" title="Hide/Show completed">Hide Completed</button>\n'
    + '              </div>\n'
    + '              <ul id="todoList" class="todo-list" role="list" aria-live="polite"></ul>\n'
    + '            </div>\n'
    + '          </div>\n'
    + '        </div>\n'
    + '        </div>\n'
    + '      </div>\n'
    + '    </div>\n'
    + '  </aside>\n'
    + '  <div class="resizer resizer-left" aria-hidden="true"></div>\n'
    + '  <div class="resizer resizer-right" aria-hidden="true"></div>\n'
    + '</div>\n'
    + '<button id="drawerReveal" class="drawer-tab" aria-label="Show tools">Tools</button>\n'
    + '<script src="/assets/site.js?v='+VERSION+'"></script>\n' + extraScripts + '\n'
    + '</body>\n</html>'
  );

  function findAvatarFor(note){
    const exts = ['.png','.jpg','.jpeg','.webp','.gif','.svg'];
    const title = (note.title || '').trim();
    const lower = title.toLowerCase();
    const slugify = (s) => s
      .toLowerCase()
      .replace(/[’']/g,'')               // drop apostrophes
      .replace(/[^a-z0-9]+/g,'-')         // non-alnum -> '-'
      .replace(/^-+|-+$/g,'');            // trim '-'
    const slug = slugify(title);
    const firstWord = slugify(title.split(/\s+/)[0]||'');
    const nameVariants = Array.from(new Set([
      lower,
      slug,
      firstWord,
      // For names with hyphens or punctuation, also try without dashes
      slug.replace(/-/g,''),
    ].filter(Boolean)));

    const candidates = [];
    for (const base of nameVariants){
      for (const ext of exts){
        // Check attachments
        const attFile = `${base}-avatar${ext}`;
        candidates.push({ abs: path.join(VAULT_ROOT, ATTACHMENTS_DIR_NAME, attFile), url: `/${ATTACHMENTS_DIR_NAME}/${attFile}` });
        // Check web assets (copied to /assets)
        const webFile = `${base}-avatar${ext}`;
        candidates.push({ abs: path.join(ASSET_SRC, webFile), url: `/assets/${webFile}` });
      }
    }
    for (const c of candidates){ if (fs.existsSync(c.abs)) return c.url; }
    return null;
  }

  function findHeaderFor(note){
    const exts = ['.png','.jpg','.jpeg','.webp','.gif','.svg'];
    const title = (note.title || '').trim();
    const slugify = (s) => s
      .toLowerCase()
      .replace(/[’']/g,'')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'');
    const slug = slugify(title);
    const firstWord = slugify(title.split(/\s+/)[0]||'');
    const nameVariants = Array.from(new Set([slug, firstWord, slug.replace(/-/g,''), title.toLowerCase()].filter(Boolean)));
    const candidates = [];
    for (const base of nameVariants){
      for (const ext of exts){
        const attFile = `${base}-header${ext}`;
        candidates.push({ abs: path.join(VAULT_ROOT, ATTACHMENTS_DIR_NAME, attFile), url: `/${ATTACHMENTS_DIR_NAME}/${attFile}` });
        const webFile = `${base}-header${ext}`;
        candidates.push({ abs: path.join(ASSET_SRC, webFile), url: `/assets/${webFile}` });
      }
    }
    for (const c of candidates){ if (fs.existsSync(c.abs)) return c.url; }
    return null;
  }

  const slugify = (s) => s
    .toLowerCase()
    .replace(/[’']/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');

  function getStatSheetLink(note){
    const slug = slugify(note.title||'');
    if (SHEET_LINKS.has(slug)) return SHEET_LINKS.get(slug);
    try {
      const rx = /^(?:\s*(?:Sheet|Stat\s*Sheet|D\s*&\s*D\s*Beyond|DNDBeyond))\s*:\s*(https?:\S+)/gim;
      const m = rx.exec(note.md);
      if (m) return m[1];
    } catch {}
    return '';
  }

  for (const note of notes.values()) {
    const isPC = note.tags.includes('pc') || note.rel.startsWith('03_PCs/');
    const isNPC = note.tags.includes('npc') || note.rel.startsWith('04_NPCs/');

    // Subtitle heuristic: first H2/H3 line (text only), else first non-empty paragraph, else role
    let subtitle = '';
    {
      const lines = note.md.split(/\r?\n/);
      const h = lines.find(l=>/^\s*#{2,3}\s+/.test(l));
      if (h) subtitle = h.replace(/^\s*#{2,3}\s+/, '').trim();
      if (!subtitle) {
        const p = lines.find(l=>l.trim() && !/^\s*#/.test(l));
        if (p) subtitle = p.trim().slice(0,120);
      }
      if (!subtitle) subtitle = isPC ? 'Player Character' : isNPC ? 'Non-Player Character' : '';
    }

    // Images: prefer per-entity avatar/header if present, else placeholders
    const headerImg = findHeaderFor(note) || '/assets/ph-header.svg';
    let avatarImg = findAvatarFor(note) || '/assets/ph-avatar.svg';

    // Badges from tags excluding generic
    const exclude = new Set(['pc','npc','planning','arc']);
    const badgeTags = note.tags.filter(t=>!exclude.has(t));

    // Log missing assets for PC/NPC only if using placeholders
    if ((isPC || isNPC) && avatarImg === '/assets/ph-avatar.svg' && headerImg === '/assets/ph-header.svg') {
      try {
        const sessPath = path.join(VAULT_ROOT, '00_Campaign', '01_Session notes.md');
        ensureDir(path.dirname(sessPath));
        const stamp = new Date().toISOString();
        const line = `\n- ${stamp}: Using placeholders for ${note.title} (${isPC?'PC':'NPC'}) avatar/header.`;
        fs.appendFileSync(sessPath, line);
      } catch {}
    }

    // Build entity sections
    let content = '';
    if (isPC || isNPC) {
      const overviewHtml = '<section id="overview"><h2>Overview</h2>' + mdToHtml(note.md, note.rel) + '</section>';
      const outgoing = (note.wiki||[]).map(l=>({ raw:l.target, to: (function(){
        const norm = l.target; const r = (function(fromRel, target){
          const norm2 = target.replace(/\\/g,'/');
          if (norm2.includes('/')) { const cand1 = norm2.endsWith('.md')? norm2 : norm2 + '.md'; if (notes.has(cand1)) return cand1; const baseDir = path.dirname(note.rel).replace(/\\/g,'/'); const cand2=(baseDir?baseDir+'/':'')+(norm2.endsWith('.md')?norm2:norm2+'.md'); if (notes.has(cand2)) return cand2; }
          else { const list = basenameIndex.get(norm2) || basenameIndex.get(norm2.replace(/\.md$/i,'')); if (list && list.length===1) return list[0]; if (list && list.length>1){ const dir=path.dirname(note.rel).replace(/\\/g,'/'); const same=list.find(p=>path.dirname(p).replace(/\\/g,'/')===dir); if (same) return same; return list[0]; } const mdName = norm2.endsWith('.md')? norm2 : norm2+'.md'; const list2 = basenameIndex.get(mdName.replace(/\.md$/i,'')); if (list2 && list2.length) return list2[0]; }
          return null; })(note.rel, norm); return r; })()})).filter(x=>x.to);
      const connsHtml = '<section id="connections"><h2>Connections</h2>'
        + '<div class="conn"><h3>Links</h3><ul>'
        + (outgoing.map(o=>'<li><a href="'+urlFor(o.to)+'">'+(notes.get(o.to)?.title||o.raw)+'</a></li>').join('') || '<li class="meta">None</li>')
        + '</ul><h3>Backlinks</h3><ul>'
        + ([...(backlinks.get(note.rel)||new Set())].map(rel=>'<li><a href="'+urlFor(rel)+'">'+(notes.get(rel)?.title||rel)+'</a></li>').join('') || '<li class="meta">None</li>')
        + '</ul></div></section>';
      const abilitiesHtml = '<section id="abilities"><h2>Abilities</h2><div class="meta">Add an "Abilities" section in the note to populate.</div></section>';
      const inventoryHtml = '<section id="inventory"><h2>Inventory</h2><div class="meta">Add an "Inventory" section in the note to populate.</div></section>';

      // External character sheet link from mapping or note body
      const sheetLink = getStatSheetLink(note);

      const headerHtml = `
        <section class="entity">
          <div class="entity-header" style="--header:url('${headerImg}')">
            <button class="bookmark-btn" data-rel="${note.rel}" title="Toggle favorite"></button>
            <div class="entity-id">
              <div class="entity-avatar"><img src="${avatarImg}" alt="${note.title}"></div>
              <div class="entity-meta">
                <div class="entity-name">${note.title}</div>
                <div class="entity-sub">${subtitle}</div>
                <div class="entity-badges">${badgeTags.map(t=>`<span class="tag">#${t}</span>`).join('')}</div>
              </div>
            </div>
          </div>
        </section>`;
      const tabsHtml = `
        <nav class="entity-tabs">
          <a href="#overview">Overview</a>
          <a href="#connections">Connections</a>
          <a href="#abilities">Abilities</a>
          <a href="#inventory">Inventory</a>
          ${sheetLink ? `<a class="chip" href="${sheetLink}" target="_blank" rel="noopener">Stat Sheet</a>` : ''}
        </nav>`;

      content = '<article class="entity-page">' + headerHtml + tabsHtml + '<div class="entity-body">'
        + overviewHtml + connsHtml + abilitiesHtml + inventoryHtml + '</div></article>'
        + '<details class="appendix" id="sec-local"><summary>Local Graph</summary><div class="graph-panel" id="localGraph" data-rel="' + note.rel + '"></div></details>'
        + '<details class="appendix" id="sec-backlinks"><summary>Backlinks</summary><div class="backlinks">' + ([...(backlinks.get(note.rel)||new Set())].map(rel=>'<a href="' + urlFor(rel) + '">' + (notes.get(rel)?.title||rel) + '</a>').join('') || '<div class="meta">No backlinks</div>') + '</div></details>';
    } else {
      const appendix = [
        '<details class="appendix" id="sec-local"><summary>Local Graph</summary><div class="graph-panel" id="localGraph" data-rel="' + note.rel + '"></div></details>',
        '<details class="appendix" id="sec-backlinks"><summary>Backlinks</summary><div class="backlinks">' + ([...(backlinks.get(note.rel)||new Set())].map(rel=>'<a href="' + urlFor(rel) + '">' + (notes.get(rel)?.title||rel) + '</a>').join('') || '<div class="meta">No backlinks</div>') + '</div></details>'
      ].join('\n');
      const pageHeader = '<div class="page-header"><button class="bookmark-btn" data-rel="' + note.rel + '" title="Toggle favorite"></button></div>';
      content = pageHeader + '<article><h1>' + note.title + '</h1>' + mdToHtml(note.md, note.rel) + '</article>' + appendix;
    }

    writeFile(htmlOutPath(note.rel), baseTemplate(note.title, content, sidebarHtml, '', '<script src="/assets/site-note.js?v='+VERSION+'"></script>'));
  }

  const warnings = [];
  for (const f of otherFiles) {
    const rel = path.relative(VAULT_ROOT, f).replace(/\\/g, '/');
    const ext = path.extname(rel).toLowerCase();
    if (SUPPORTED_IMG_EXT.has(ext)) copyFile(f, path.join(OUT_DIR, rel));
    else if (ODD_EXT.has(ext)) warnings.push('Skipped odd file: ' + rel);
    else { try { copyFile(f, path.join(OUT_DIR, rel)); } catch(e) { warnings.push('Failed to copy ' + rel + ': ' + e.message); } }
  }

  const dashboardCandidates = [
    '00_Campaign/00_Campaign Dashboard.md',
    '05_Tools & Tables/DM References/02_Campaign Overview and Key points.md'
  ].filter(p => notes.has(p));
  const homeTarget = dashboardCandidates[0] || [...notes.keys()].sort()[0];
  // Home (Start Page) content
  function firstPara(md){
    const lines = md.split(/\r?\n/);
    for(const l of lines){
      if(l.trim() && !/^\s*#/.test(l)) return l.trim();
    }
    return '';
  }
  // Active arc summary from dashboard (simple heuristic)
  let arcSummary = '';
  if (notes.has('00_Campaign/00_Campaign Dashboard.md')){
    const d = notes.get('00_Campaign/00_Campaign Dashboard.md').md;
    const rx = /##\s*Active arcs[\s\S]*?(?:\n-\s*\[\[([^\]]+)\]\][^\n]*\n?)/i;
    const m = d.match(rx);
    if (m) arcSummary = m[1];
  }
  // Featured cards (pick up to 6 interesting notes)
  const pickFeatured = () => {
    const pool = [];
    // Locations
    for (const [rel, n] of notes){ if(rel.startsWith('02_World/Locations/')) pool.push(n); }
    // Factions/threats by name
    ['04_NPCs/Scarlet Brotherhood.md','04_NPCs/Salabaster Shipping.md','04_NPCs/Sahuagin.md','04_NPCs/Kedjou.md'].forEach(rel=>{ if(notes.has(rel)) pool.push(notes.get(rel)); });
    // Arcs
    if (notes.has('01_Arcs/01_Arcs Overview.md')) pool.push(notes.get('01_Arcs/01_Arcs Overview.md'));
    return pool.slice(0,6).map(n=>{
      const blurb = firstPara(n.md).slice(0,180);
      return '<div class="card card-feature">'
        + '<div class="card-img" style="background-image:url(\'/assets/ph-header.svg\')"></div>'
        + '<div class="card-body">'
        + '<div class="card-title">'+n.title+'</div>'
        + '<div class="card-text">'+(blurb||'<span class="meta">No summary</span>')+'</div>'
        + '<a class="chip" href="'+urlFor(n.rel)+'">Open</a>'
        + '</div></div>';
    });
  };
  const cardsHtml = pickFeatured().join('');
  const recentList = [...notes.values()].slice(0,12).map(n=>'<li><a href="' + urlFor(n.rel) + '">' + n.title + '</a></li>').join('');
  const homeHtml = [
    '<section class="home-hero card">',
    ' <div class="home-hero-inner">',
    '  <h1 class="home-title">Campaign Vault</h1>',
    '  <p class="home-tag">A storm-cracked world beyond Saltmarsh</p>',
    '  <p><a class="chip" href="'+urlFor(homeTarget)+'">Open Dashboard</a></p>',
    ' </div>',
    '</section>',
    '<section class="home-arc card">',
    ' <h3>Current Arc</h3>',
    ' <div class="meta">'+(arcSummary||'Set your current arc in the dashboard Active arcs section')+'</div>',
    '</section>',
    '<section class="home-featured">',
    ' <h3>Featured</h3>',
    ' <div class="cards-grid">'+cardsHtml+'</div>',
    '</section>',
    '<section class="home-recent">',
    ' <h3>Recent Notes</h3>',
    ' <ul>'+recentList+'</ul>',
    ' <div class="meta">Build: '+VERSION+'</div>',
    '</section>'
  ].join('\n');
  const home = baseTemplate('Home', homeHtml, sidebarHtml, '');
  writeFile(path.join(OUT_DIR, 'index.html'), home);

  const tagsHtml = '<h1>Tags</h1><div class="meta">Click a tag to filter.</div><div id="tagList"></div><div id="tagResults"></div>';
  writeFile(path.join(OUT_DIR, 'tags/index.html'), baseTemplate('Tags', tagsHtml, sidebarHtml, '', '<script src="/assets/site-tags.js?v='+VERSION+'"></script>'));

  const graphHtml = '<h1>Graph</h1><div class="graph-panel" id="globalGraph"></div>';
  const graphTop = '<div class="toolbar">'
    +   '<span class="chip" data-filter="pc">#pc</span>'
    +   '<span class="chip" data-filter="npc">#npc</span>'
    +   '<span class="chip" data-filter="location">#location</span>'
    +   '<span class="chip" data-filter="arc">#arc/#planning</span>'
    + '</div>'
    + '<div id="graphPreview" class="card" aria-live="polite" aria-atomic="true"></div>';
  writeFile(path.join(OUT_DIR, 'graph.html'), baseTemplate('Graph', graphHtml, sidebarHtml, graphTop, '<script src="/assets/graph.js?v='+VERSION+'"></script>'));

  const sessionHtml = '<h1>Session Mode</h1>'
    + '<div class="card" style="margin-bottom:12px">'
    +   '<label class="sr-only" for="sessionEditor">Session Notes</label>'
    +   '<textarea id="sessionEditor" placeholder="Type your quick notes here..." style="width:100%;min-height:40vh;border:1px solid var(--border);background:var(--panel);color:var(--text);border-radius:6px;padding:10px"></textarea>'
    + '</div>'
    + '<div class="toolbar">'
    + '<a class="chip" href="' + urlFor('00_Campaign/00_Campaign Dashboard.md') + '">Campaign Dashboard</a>'
    + '<a class="chip" href="' + urlFor('05_Tools & Tables/Random Encounter Generator.md') + '">Encounters</a>'
    + '<a class="chip" href="' + urlFor('05_Tools & Tables/DM References/02_Campaign Overview and Key points.md') + '">Overview</a>'
    + '</div>'
    + '<div class="session-grid" id="pinned"></div>'
    + '<h3>Quick Picks</h3><div class="session-grid" id="quick"></div>'
    + '<h3>Dice</h3><div class="card">'
    + '<input id="diceInput" placeholder="e.g. 1d20+5, 4d6kh3" />'
    + '<button id="rollBtn">Roll</button>'
    + '<div id="diceOut" class="meta"></div>'
    + '</div>';
  writeFile(path.join(OUT_DIR, 'session.html'), baseTemplate('Session', sessionHtml, sidebarHtml, '', '<script src="/assets/session.js?v='+VERSION+'"></script>'));

  if (warnings.length) writeFile(path.join(OUT_DIR, 'build-warnings.txt'), warnings.join('\n'));
  console.log('[dm-site] Built ' + notes.size + ' notes -> ' + OUT_DIR);
}

buildOnce();

#!/usr/bin/env node
/**
 * DM Vault Static Site Builder (no external deps)
 * - Reads Markdown notes from current directory (the vault)
 * - Outputs static site to ./site with:
 *   - Mirrored folder structure (.md -> .html)
 *   - Graph data (wikilinks)
 *   - Backlinks and tag index
 *   - Sidebar tree, search index, local/global graph support
 */
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const VAULT_ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(VAULT_ROOT, 'site');

// Config
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'site', '.obsidian']);
const ATTACHMENTS_DIR_NAME = '99_Attachments';
const SUPPORTED_IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const TEXT_EXT = new Set(['.md']);
const ODD_EXT = new Set(['.canvas', '.textClipping']);

const args = new Set(process.argv.slice(2));
const WATCH = args.has('--watch');

// Utilities
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const writeFile = (p, c) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, c); };
const copyFile = (src, dest) => { ensureDir(path.dirname(dest)); fs.copyFileSync(src, dest); };
const listFilesRec = (dir) => {
  /** @type {string[]} */
  const res = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    const ents = fs.readdirSync(d, { withFileTypes: true });
    for (const ent of ents) {
      if (ent.name.startsWith('.')) continue; // hidden
      const full = path.join(d, ent.name);
      const rel = path.relative(VAULT_ROOT, full);
      if (rel.split(path.sep).some((seg) => IGNORE_DIRS.has(seg))) continue;
      if (ent.isDirectory()) {
        stack.push(full);
      } else {
        res.push(full);
      }
    }
  }
  return res;
};

// Basic slug/url mapping: keep folder structure; .md -> .html
const mdToHtmlPath = (relPath) => relPath.replace(/\\/g, '/').replace(/\.md$/i, '.html');
const htmlOutPath = (relPath) => path.join(OUT_DIR, mdToHtmlPath(relPath));

// Parse helpers
const readText = (p) => fs.readFileSync(p, 'utf8');
const getTitleFromMd = (md, fallback) => {
  const m = md.match(/^\s*#\s+(.+)$/m);
  return (m ? m[1].trim() : fallback.replace(/\.md$/i, ''));
};

// Extract tags (#tag) ignoring code blocks
const extractTags = (md) => {
  const tags = new Set();
  const codeFence = /```[\s\S]*?```/g;
  md = md.replace(codeFence, '');
  const re = /(^|\s)#([\p{L}\p{N}_-]+)/gu;
  let m;
  while ((m = re.exec(md))) tags.add(m[2]);
  return [...tags];
};

// Extract headings for search
const extractHeadings = (md) => {
  const hs = [];
  const re = /^(#{1,6})\s+(.+)$/gm;
  let m;
  while ((m = re.exec(md))) hs.push(m[2].trim());
  return hs;
};

// Extract wikilinks [[page]] or [[path/page|Display]] and embeds ![[...]]
const wikilinkRE = /!?\[\[([^\]]+)\]\]/g;
const parseWikiLinks = (md) => {
  /** @type {{target:string, display?:string, embed?:boolean}[]} */
  const links = [];
  let m;
  while ((m = wikilinkRE.exec(md))) {
    const raw = m[1];
    const embed = m[0].startsWith('!');
    const [target, display] = raw.split('|');
    links.push({ target: target.trim(), display: display?.trim(), embed });
  }
  return links;
};

// Build file inventory
const allFiles = listFilesRec(VAULT_ROOT);
const mdFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.md'));
const otherFiles = allFiles.filter((f) => !f.toLowerCase().endsWith('.md'));

// Map: rel -> content/meta
const notes = new Map();
// Basename index for resolving [[Note]] when path omitted
const basenameIndex = new Map(); // name -> array of rel paths

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

// Resolve wikilinks to rel paths
const resolveWikiTarget = (fromRel, target) => {
  // If target has extension or looks like path, try path-based resolution
  const norm = target.replace(/\\/g, '/');
  // If contains '/', treat as path (relative to vault root or current folder?)
  if (norm.includes('/')) {
    // Try exact .md
    const cand1 = norm.endsWith('.md') ? norm : norm + '.md';
    if (notes.has(cand1)) return cand1;
    // Try relative to current note's folder
    const baseDir = path.dirname(fromRel).replace(/\\/g, '/');
    const cand2 = (baseDir ? baseDir + '/' : '') + (norm.endsWith('.md') ? norm : norm + '.md');
    if (notes.has(cand2)) return cand2;
  } else {
    // Basename lookup
    const list = basenameIndex.get(norm) || basenameIndex.get(norm.replace(/\.md$/i, ''));
    if (list && list.length === 1) return list[0];
    if (list && list.length > 1) {
      // Prefer same folder
      const dir = path.dirname(fromRel).replace(/\\/g, '/');
      const same = list.find((p) => path.dirname(p).replace(/\\/g, '/') === dir);
      if (same) return same;
      return list[0];
    }
    // Try adding .md
    const mdName = norm.endsWith('.md') ? norm : norm + '.md';
    const list2 = basenameIndex.get(mdName.replace(/\.md$/i, ''));
    if (list2 && list2.length) return list2[0];
  }
  return null;
};

// Build edges and backlinks
/** @type {{source:string,target:string}[]} */
const edges = [];
const backlinks = new Map(); // targetRel -> Set of sourceRel
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

// Build folder tree for sidebar
const tree = {};
for (const rel of notes.keys()) {
  const parts = rel.split(path.sep);
  let node = tree;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const key = part;
    if (!node[key]) node[key] = { _files: [], _dirs: {} };
    if (i === parts.length - 1) node[key]._files.push(rel);
    node = node[key]._dirs;
  }
}

// Build tag index
const tagIndex = new Map(); // tag -> array of rels
for (const [rel, n] of notes) {
  for (const t of n.tags) {
    if (!tagIndex.has(t)) tagIndex.set(t, []);
    tagIndex.get(t).push(rel);
  }
}

// Write assets
const ASSETS = path.join(OUT_DIR, 'assets');
ensureDir(ASSETS);

// Basic CSS
writeFile(path.join(ASSETS, 'style.css'), `
:root{--bg:#0f1115;--panel:#151821;--text:#e5e7eb;--muted:#9aa3b2;--link:#7cc7ff;--accent:#8b5cf6;--border:#222635}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,Segoe UI,Roboto,Inter,Helvetica,Arial}
a{color:var(--link);text-decoration:none}
a:hover{text-decoration:underline}
.layout{display:grid;grid-template-columns:260px 1fr 300px;grid-template-rows:auto 1fr;grid-template-areas:"top top top" "left main right";height:100vh}
.top{grid-area:top;display:flex;gap:8px;padding:8px 12px;background:var(--panel);border-bottom:1px solid var(--border);align-items:center}
.left{grid-area:left;overflow:auto;border-right:1px solid var(--border);padding:8px}
.main{grid-area:main;overflow:auto;padding:24px}
.right{grid-area:right;overflow:auto;border-left:1px solid var(--border);padding:8px}
.search{flex:1}
.search input{width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--border);background:#0b0d12;color:var(--text)}
.tree ul{list-style:none;padding-left:14px;margin:0}
.tree li{margin:2px 0}
.meta{font-size:12px;color:var(--muted)}
code,pre{background:#0b0d12;border:1px solid var(--border);border-radius:6px}
pre{padding:12px;overflow:auto}
code{padding:2px 4px}
h1,h2,h3,h4{margin-top:1.2em}
.tag{display:inline-block;margin-right:6px;padding:2px 6px;border-radius:12px;background:#1a1f2b;color:#a3b6ff;border:1px solid var(--border);font-size:12px}
.backlinks a{display:block}
.graph-panel{height:260px;border:1px solid var(--border);border-radius:6px;margin:8px 0;background:#0b0d12}
.toolbar{display:flex;gap:8px}
.chip{padding:4px 8px;border:1px solid var(--border);border-radius:12px;background:#10131a;color:var(--muted);cursor:pointer}
.chip.active{background:var(--accent);color:white;border-color:transparent}
.hovercard{position:fixed;pointer-events:none;z-index:1000;background:#111522;border:1px solid var(--border);border-radius:6px;max-width:340px;padding:8px;display:none}
.session-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.card{border:1px solid var(--border);background:var(--panel);padding:10px;border-radius:8px}
.star{cursor:pointer;color:#ffd365}
`);

// Base HTML template
const baseTemplate = (title, content, sidebarHtml, rightHtml, options = {}) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="/assets/style.css" />
  <script>window.SITE_BASE='/'</script>
</head>
<body>
  <div class="layout">
    <div class="top">
      <div class="toolbar">
        <a class="chip" href="/index.html">Home</a>
        <a class="chip" href="/graph.html">Graph</a>
        <a class="chip" href="/tags/index.html">Tags</a>
        <a class="chip" href="/session.html">Session</a>
      </div>
      <div class="search"><input id="searchBox" type="search" placeholder="Search titles, headings, #tags (Cmd/Ctrl-K)"/></div>
      <div id="searchResults" class="hovercard"></div>
    </div>
    <aside class="left">${sidebarHtml}</aside>
    <main class="main">${content}</main>
    <aside class="right">${rightHtml}</aside>
  </div>
  <script src="/assets/site.js"></script>
  ${options.extraScripts || ''}
</body>
</html>`;

// Render sidebar tree
const renderTree = () => {
  // Simplify: list folders/files as links
  const items = [...notes.values()].sort((a,b)=>a.rel.localeCompare(b.rel)).map(n => {
    return `<li><a href="/${mdToHtmlPath(n.rel)}" title="${n.rel}">${n.title}</a></li>`;
  }).join('\n');
  return `<div class="tree"><ul>${items}</ul></div>`;
};

const sidebarHtml = renderTree();

// Minimal Markdown to HTML (headings, lists, code, paragraphs, inline bold/italics/code, links, images)
function mdToHtml(md, fromRel) {
  // Replace images: Obsidian embeds ![[file.ext]] -> <img src>
  md = md.replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (m, t) => {
    const target = t.trim();
    // Attachments often in 99_Attachments; try to resolve exactly there if not found in notes
    const attRel = path.join(ATTACHMENTS_DIR_NAME, target).replace(/\\/g, '/');
    return `<img alt="${target}" src="/${attRel}" />`;
  });
  // Wikilinks [[target|display]]
  md = md.replace(/\[\[([^\]]+)\]\]/g, (m, inside) => {
    const [targetRaw, display] = inside.split('|');
    const target = targetRaw.trim();
    const resolved = resolveWikiTarget(fromRel, target);
    const href = resolved ? '/' + mdToHtmlPath(resolved) : '#';
    const text = (display?.trim()) || targetRaw.trim();
    return `<a href="${href}" class="wikilink" data-target="${target}">${text}</a>`;
  });
  // MD links ![](url) and [](url)
  md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Inline code
  md = md.replace(/`([^`]+)`/g, '<code>$1<\/code>');
  // Bold/italic (simple)
  md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Code fences
  md = md.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${code.replace(/[&<>]/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[s]))}</code></pre>`);
  // Headings and lists
  const lines = md.split(/\r?\n/);
  let html = '';
  let inUL = false, inOL = false;
  const closeLists = () => { if (inUL) { html+='</ul>'; inUL=false;} if (inOL){html+='</ol>'; inOL=false;} };
  for (let i=0;i<lines.length;i++){
    const line = lines[i];
    if (/^\s*$/.test(line)) { html += '\n'; continue; }
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h){ closeLists(); const lvl=h[1].length; html += `\n<h${lvl}>${h[2].trim()}</h${lvl}>`; continue; }
    const lu = line.match(/^\s*[-*]\s+(.+)$/);
    if (lu){ if (!inUL){ closeLists(); html+='<ul>'; inUL=true;} html+=`<li>${lu[1]}</li>`; continue; }
    const lo = line.match(/^\s*\d+\.\s+(.+)$/);
    if (lo){ if (!inOL){ closeLists(); html+='<ol>'; inOL=true;} html+=`<li>${lo[1]}</li>`; continue; }
    // paragraph
    closeLists();
    html += `<p>${line}</p>`;
  }
  closeLists();
  // Hashtags into spans with links to tag page
  html = html.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (m, pre, tag) => `${pre}<a class="tag" href="/tags/index.html#${tag}">#${tag}</a>`);
  return html;
}

// Per-note page builder
const renderNotePage = (note) => {
  const right = `
  <div class="meta">
    <div><strong>Path:</strong> ${note.rel}</div>
    <div><strong>Tags:</strong> ${note.tags.map(t=>`<a class="tag" href="/tags/index.html#${t}">#${t}</a>`).join(' ') || '(none)'} </div>
  </div>
  <div class="graph-panel" id="localGraph" data-rel="${note.rel}"></div>
  <h3>Backlinks</h3>
  <div class="backlinks">${[...(backlinks.get(note.rel)||new Set())].map(rel=>`<a href="/${mdToHtmlPath(rel)}">${notes.get(rel)?.title||rel}</a>`).join('') || '<div class="meta">No backlinks</div>'}</div>
  `;
  const content = `
  <article>
    <h1>${note.title}</h1>
    ${mdToHtml(note.md, note.rel)}
  </article>`;
  return baseTemplate(note.title, content, sidebarHtml, right, { extraScripts: '<script src="/assets/site-note.js"></script>' });
};

// Graph data
const nodesArr = [...notes.values()].map(n => ({ id: n.rel, title: n.title, tags: n.tags }));
const graphData = { nodes: nodesArr, edges };
ensureDir(OUT_DIR);
writeFile(path.join(OUT_DIR, 'graph.json'), JSON.stringify(graphData, null, 2));

// Search index (titles, headings, tags)
const searchIndex = nodesArr.map(n => ({ id: n.id, title: n.title, tags: n.tags, headings: notes.get(n.id).headings }));
writeFile(path.join(OUT_DIR, 'search-index.json'), JSON.stringify(searchIndex));

// Sidebar note list cache
writeFile(path.join(OUT_DIR, 'notes.json'), JSON.stringify(nodesArr));

// Write per-note pages
for (const note of notes.values()) {
  const out = htmlOutPath(note.rel);
  writeFile(out, renderNotePage(note));
}

// Copy attachments and other files
const warnings = [];
for (const f of otherFiles) {
  const rel = path.relative(VAULT_ROOT, f).replace(/\\/g, '/');
  const ext = path.extname(rel).toLowerCase();
  if (SUPPORTED_IMG_EXT.has(ext)) {
    copyFile(f, path.join(OUT_DIR, rel));
  } else if (ODD_EXT.has(ext)) {
    warnings.push(`Skipped odd file: ${rel}`);
  } else {
    // Non-image attachments: copy into site preserving path
    try { copyFile(f, path.join(OUT_DIR, rel)); } catch(e) { warnings.push(`Failed to copy ${rel}: ${e.message}`); }
  }
}

// Index page: redirect to dashboard if exists
const dashboardCandidates = [
  '00_Campaign/00_Campaign Dashboard.md',
  '05_Tools & Tables/DM References/02_Campaign Overview and Key points.md'
].filter(p => notes.has(p));
const homeTarget = dashboardCandidates[0] || [...notes.keys()].sort()[0];
const home = baseTemplate('Home', `
  <h1>Campaign Vault</h1>
  <p>Welcome. Open the dashboard below or use search.</p>
  <p><a class="chip" href="/${mdToHtmlPath(homeTarget)}">Open Dashboard</a></p>
  <h3>Recent Notes</h3>
  <ul>
  ${[...notes.values()].slice(0,30).map(n=>`<li><a href="/${mdToHtmlPath(n.rel)}">${n.title}</a></li>`).join('\n')}
  </ul>
`, sidebarHtml, '<div class="meta">Graph and search available above.</div>');
writeFile(path.join(OUT_DIR, 'index.html'), home);

// Tags page
const tagsHtml = `
  <h1>Tags</h1>
  <div class="meta">Click a tag to filter.</div>
  <div id="tagList"></div>
  <div id="tagResults"></div>
`;
writeFile(path.join(OUT_DIR, 'tags/index.html'), baseTemplate('Tags', tagsHtml, sidebarHtml, '<div class="meta">#tags</div>', { extraScripts:'<script src="/assets/site-tags.js"></script>' }));

// Graph page
const graphHtml = `
  <h1>Graph</h1>
  <div class="toolbar">
    <span class="chip" data-filter="pc">#pc</span>
    <span class="chip" data-filter="npc">#npc</span>
    <span class="chip" data-filter="location">#location</span>
    <span class="chip" data-filter="arc">#arc/#planning</span>
  </div>
  <div class="graph-panel" id="globalGraph"></div>
`;
writeFile(path.join(OUT_DIR, 'graph.html'), baseTemplate('Graph', graphHtml, sidebarHtml, '<div class="meta">Toggle filters to declutter.</div>', { extraScripts:'<script src="/assets/graph.js"></script>' }));

// Session page
const sessionHtml = `
  <h1>Session Mode</h1>
  <div class="toolbar">
    <a class="chip" href="/${mdToHtmlPath('00_Campaign/00_Campaign Dashboard.md')}">Campaign Dashboard</a>
    <a class="chip" href="/${mdToHtmlPath('05_Tools & Tables/Random Encounter Generator.md')}">Encounters</a>
    <a class="chip" href="/${mdToHtmlPath('05_Tools & Tables/DM References/02_Campaign Overview and Key points.md')}">Overview</a>
  </div>
  <div class="session-grid" id="pinned"></div>
  <h3>Quick Picks</h3>
  <div class="session-grid" id="quick"></div>
  <h3>Dice</h3>
  <div class="card">
    <input id="diceInput" placeholder="e.g. 1d20+5, 4d6kh3" />
    <button id="rollBtn">Roll</button>
    <div id="diceOut" class="meta"></div>
  </div>
`;
writeFile(path.join(OUT_DIR, 'session.html'), baseTemplate('Session', sessionHtml, sidebarHtml, '<div class="meta">Pin notes with the star icon on note pages.</div>', { extraScripts:'<script src="/assets/session.js"></script>' }));

// Client JS
writeFile(path.join(ASSETS, 'site.js'), `
// Global search + link preview
const byId = (id) => document.getElementById(id);
const searchBox = byId('searchBox');
const results = byId('searchResults');
let INDEX = []; let NOTES = [];
fetch('/search-index.json').then(r=>r.json()).then(d=>INDEX=d);
fetch('/notes.json').then(r=>r.json()).then(d=>NOTES=d);

const openQuick = (id) => location.href = '/' + id.replace(/\\\\/g,'/').replace(/\\.md$/i,'.html');
function doSearch(q){
  q=q.trim().toLowerCase();
  if(!q){results.style.display='none';return}
  const isTag = q.startsWith('#');
  const term = isTag? q.slice(1): q;
  const out=[];
  for(const it of INDEX){
    const hit = isTag ? it.tags.some(t=>t.toLowerCase().includes(term))
      : (it.title.toLowerCase().includes(term) || it.headings.some(h=>h.toLowerCase().includes(term)));
    if(hit) out.push(it);
    if(out.length>20) break;
  }
  if(!out.length){results.style.display='none';return}
  results.innerHTML = out.map(function(it){
    return '<div><a href="/' + it.id.replace(/\\\\/g,'/').replace(/\\.md$/i,'.html') + '\">' + it.title + '</a> <span class="meta">' + ((it.tags||[]).map(function(t){return '#'+t}).join(' ')) + '</span></div>';
  }).join('');
  results.style.display='block';
}
searchBox?.addEventListener('input', ()=>doSearch(searchBox.value));
document.addEventListener('keydown', (e)=>{
  if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); searchBox?.focus(); }
});

// Hover preview (title only)
const hover = document.createElement('div'); hover.className='hovercard'; document.body.appendChild(hover);
document.body.addEventListener('mousemove', (e)=>{hover.style.left=(e.pageX+12)+'px';hover.style.top=(e.pageY+12)+'px';});
document.body.addEventListener('mouseover', (e)=>{
  const a = e.target.closest('a');
  if(!a||!a.href||!a.pathname.endsWith('.html')){hover.style.display='none';return}
  const id = a.pathname.replace(/^\//,'').replace(/\.html$/i,'.md');
  const n = NOTES.find(n=>n.id===id);
  if(n){ hover.innerHTML = '<strong>'+n.title+'</strong><div class="meta">'+(n.tags||[]).map(t=>'#'+t).join(' ')+'</div>'; hover.style.display='block'; }
});
document.body.addEventListener('mouseout', ()=>{hover.style.display='none'});

// Star pin on note pages
window.togglePin = function(rel){
  const pins = JSON.parse(localStorage.getItem('pins')||'[]');
  const i = pins.indexOf(rel);
  if(i>=0) pins.splice(i,1); else pins.push(rel);
  localStorage.setItem('pins', JSON.stringify(pins));
  const el = document.querySelector('[data-pin]'); if(el) el.textContent = pins.includes(rel)? '★':'☆';
}
`);

// Note-specific JS (local graph + star)
writeFile(path.join(ASSETS, 'site-note.js'), `
// Insert star button next to H1
(function(){
  const h1 = document.querySelector('h1');
  const rel = document.getElementById('localGraph')?.dataset.rel;
  if(h1 && rel){
    const btn = document.createElement('button');
    btn.textContent = (JSON.parse(localStorage.getItem('pins')||'[]').includes(rel)? '★':'☆');
    btn.className='star';
    btn.setAttribute('data-pin','');
    btn.style.marginLeft='8px';
    btn.onclick = ()=> window.togglePin(rel);
    h1.appendChild(btn);
  }
})();

// Local graph (radius 2 neighborhood)
(async function(){
  const root = document.getElementById('localGraph'); if(!root) return;
  const rel = root.dataset.rel;
  const G = await fetch('/graph.json').then(r=>r.json());
  const N = new Map(G.nodes.map(n=>[n.id,n]));
  const adj = new Map();
  for(const e of G.edges){
    if(!adj.has(e.source)) adj.set(e.source, new Set());
    if(!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source).add(e.target);
    adj.get(e.target).add(e.source);
  }
  const visited = new Set([rel]);
  let frontier = [rel];
  for(let d=0; d<2; d++){
    const next=[];
    for(const u of frontier){
      for(const v of (adj.get(u)||[])) if(!visited.has(v)){ visited.add(v); next.push(v); }
    }
    frontier = next;
  }
  const nodes=[...visited].map(id=>N.get(id)).filter(Boolean);
  const edges=G.edges.filter(e=>visited.has(e.source)&&visited.has(e.target));
  renderForceGraph(root, nodes, edges, rel);
})();

function renderForceGraph(container, nodes, edges, focusId){
  const W=container.clientWidth, H=container.clientHeight;
  const canvas = document.createElement('canvas'); canvas.width=W; canvas.height=H; container.innerHTML=''; container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const pos = new Map(nodes.map((n,i)=>[n.id,{x: Math.random()*W, y: Math.random()*H, vx:0, vy:0}]));
  const tagColor = (tags=[])=>{
    if(tags.includes('pc')) return '#22d3ee';
    if(tags.includes('npc')) return '#f472b6';
    if(tags.includes('location')) return '#a3e635';
    if(tags.includes('arc')||tags.includes('planning')) return '#f59e0b';
    return '#7cc7ff';
  };
  function step(){
    // simple force: spring + repulsion + damping
    for(const e of edges){
      const a=pos.get(e.source), b=pos.get(e.target);
      const dx=b.x-a.x, dy=b.y-a.y; const d=Math.hypot(dx,dy)||0.01; const k=0.01*(d-80);
      const fx=k*dx/d, fy=k*dy/d; a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy;
    }
    for(const p of pos.values()){
      for(const q of pos.values()) if(p!==q){ const dx=p.x-q.x, dy=p.y-q.y; const d2=dx*dx+dy*dy; if(d2<1) continue; const f=50/d2; p.vx+=dx*f; p.vy+=dy*f; }
      p.vx*=0.85; p.vy*=0.85; p.x+=p.vx; p.y+=p.vy; p.x=Math.max(10,Math.min(W-10,p.x)); p.y=Math.max(10,Math.min(H-10,p.y));
    }
  }
  function draw(){
    ctx.clearRect(0,0,W,H); ctx.lineWidth=1; ctx.globalAlpha=0.7;
    ctx.strokeStyle='#2a2f3f';
    for(const e of edges){ const a=pos.get(e.source), b=pos.get(e.target); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
    for(const n of nodes){ const p=pos.get(n.id); const r=(n.id===focusId)?5:4; ctx.beginPath(); ctx.fillStyle=tagColor(n.tags); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); }
  }
  let anim; (function loop(){ step(); draw(); anim=requestAnimationFrame(loop); })();
  canvas.addEventListener('click', (e)=>{
    const rect = canvas.getBoundingClientRect(); const x=e.clientX-rect.left, y=e.clientY-rect.top;
    let hit=null; for(const n of nodes){ const p=pos.get(n.id); const d=Math.hypot(p.x-x,p.y-y); if(d<6){ hit=n; break; } }
    if(hit) location.href='/' + hit.id.replace(/\\\\/g,'/').replace(/\\.md$/i,'.html');
  });
}
`);

// Global graph JS (with filters)
writeFile(path.join(ASSETS, 'graph.js'), `
(async function(){
  const root = document.getElementById('globalGraph'); if(!root) return;
  const G = await fetch('/graph.json').then(r=>r.json());
  const chips = document.querySelectorAll('.chip[data-filter]');
  const active = new Set();
  function filtered(){
    if(active.size===0) return G;
    const nodes = G.nodes.filter(n=>{
      if(active.has('pc') && n.tags.includes('pc')) return true;
      if(active.has('npc') && n.tags.includes('npc')) return true;
      if(active.has('location') && n.tags.includes('location')) return true;
      if(active.has('arc') && (n.tags.includes('arc')||n.tags.includes('planning'))) return true;
      return false;
    });
    const ids = new Set(nodes.map(n=>n.id));
    const edges = G.edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
    return {nodes, edges};
  }
  chips.forEach(c=>c.addEventListener('click', ()=>{ c.classList.toggle('active'); const f=c.dataset.filter; if(active.has(f)) active.delete(f); else active.add(f); render(); }));
  function render(){
    const g = filtered();
    renderForceGraph(root, g.nodes, g.edges);
  }
  render();
})();

// reuse force renderer from site-note.js
function renderForceGraph(container, nodes, edges){
  const W=container.clientWidth, H=container.clientHeight;
  const canvas = document.createElement('canvas'); canvas.width=W; canvas.height=H; container.innerHTML=''; container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const pos = new Map(nodes.map((n,i)=>[n.id,{x: Math.random()*W, y: Math.random()*H, vx:0, vy:0}]));
  const tagColor = (tags=[])=>{
    if(tags.includes('pc')) return '#22d3ee';
    if(tags.includes('npc')) return '#f472b6';
    if(tags.includes('location')) return '#a3e635';
    if(tags.includes('arc')||tags.includes('planning')) return '#f59e0b';
    return '#7cc7ff';
  };
  function step(){
    for(const e of edges){ const a=pos.get(e.source), b=pos.get(e.target); const dx=b.x-a.x, dy=b.y-a.y; const d=Math.hypot(dx,dy)||0.01; const k=0.01*(d-90); const fx=k*dx/d, fy=k*dy/d; a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy; }
    for(const p of pos.values()){
      for(const q of pos.values()) if(p!==q){ const dx=p.x-q.x, dy=p.y-q.y; const d2=dx*dx+dy*dy; if(d2<1) continue; const f=45/d2; p.vx+=dx*f; p.vy+=dy*f; }
      p.vx*=0.85; p.vy*=0.85; p.x+=p.vx; p.y+=p.vy; p.x=Math.max(10,Math.min(W-10,p.x)); p.y=Math.max(10,Math.min(H-10,p.y));
    }
  }
  function draw(){
    ctx.clearRect(0,0,W,H); ctx.lineWidth=1; ctx.globalAlpha=0.7; ctx.strokeStyle='#2a2f3f';
    for(const e of edges){ const a=pos.get(e.source), b=pos.get(e.target); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
    for(const n of nodes){ const p=pos.get(n.id); const r=4; ctx.beginPath(); ctx.fillStyle=tagColor(n.tags); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); }
  }
  let anim; (function loop(){ step(); draw(); anim=requestAnimationFrame(loop); })();
  canvas.addEventListener('click', (e)=>{
    const rect = canvas.getBoundingClientRect(); const x=e.clientX-rect.left, y=e.clientY-rect.top;
    let hit=null; for(const n of nodes){ const p=pos.get(n.id); const d=Math.hypot(p.x-x,p.y-y); if(d<6){ hit=n; break; } }
    if(hit) location.href='/' + hit.id.replace(/\\\\/g,'/').replace(/\\.md$/i,'.html');
  });
}
`);

// Tags page script
writeFile(path.join(ASSETS, 'site-tags.js'), `
(async function(){
  const list = document.getElementById('tagList');
  const out = document.getElementById('tagResults');
  const idx = await fetch('/search-index.json').then(r=>r.json());
  const tagSet = new Set(); idx.forEach(it => (it.tags||[]).forEach(t=>tagSet.add(t)));
  const tags = [...tagSet].sort();
  list.innerHTML = tags.map(t=>`<a class="tag" href="#${t}">#${t}</a>`).join(' ');
  function render(tag){
    const hits = idx.filter(it=>it.tags.includes(tag));
    out.innerHTML = `<h3>#${tag}</h3>` + (hits.length? `<ul>`+hits.map(h=>`<li><a href="/${h.id.replace(/\\\\/g,'/').replace(/\\.md$/i,'.html')}">${h.title}</a></li>`).join('')+`</ul>`: '<div class="meta">No notes</div>');
  }
  if(location.hash){ render(location.hash.slice(1)); }
  window.addEventListener('hashchange', ()=>render(location.hash.slice(1)));
})();
`);

// Session page script
writeFile(path.join(ASSETS, 'session.js'), `
(async function(){
  const notes = await fetch('/notes.json').then(r=>r.json());
  const quick = document.getElementById('quick');
  const pinned = document.getElementById('pinned');
  function card(n){ return `<div class=card><a href="/${n.id.replace(/\\\\/g,'/').replace(/\\.md$/i,'.html')}">${n.title}</a><div class=meta>${(n.tags||[]).map(t=>'#'+t).join(' ')}</div></div>` }
  // Quick picks: show Campaign, Arcs, PCs, Locations
  const picks = notes.filter(n=>/^(00_Campaign|01_Arcs|02_World|03_PCs)\//.test(n.id)).slice(0,24);
  quick.innerHTML = picks.map(card).join('');
  // Pinned
  function renderPins(){
    const pins = JSON.parse(localStorage.getItem('pins')||'[]');
    const items = pins.map(id => notes.find(n=>n.id===id)).filter(Boolean);
    pinned.innerHTML = items.length? items.map(card).join('') : '<div class="meta">Pin notes from their pages (star next to title).</div>';
  }
  renderPins();
  // Dice roller
  const I = document.getElementById('diceInput'); const O=document.getElementById('diceOut');
  document.getElementById('rollBtn').onclick = ()=>{ O.textContent = rollDice(I.value||'1d20'); };
})();

function rollDice(expr){
  // Supports: XdY(+/-Z), optional khN/klN keep-high/low
  try{
    const m = expr.replace(/\s+/g,'').match(/(\d*)d(\d+)(kh\d+|kl\d+)?([+-]\d+)?/i);
    if(!m) return 'Invalid';
    const cnt = parseInt(m[1]||'1',10), sides=parseInt(m[2],10);
    const mod = m[4]? parseInt(m[4],10):0; const keep=m[3];
    const rolls = Array.from({length:cnt},()=>1+Math.floor(Math.random()*sides));
    let used = rolls.slice();
    if(keep){
      const k = parseInt(keep.slice(2),10);
      used = rolls.slice().sort((a,b)=>keep.startsWith('kh')? b-a : a-b).slice(0,k);
    }
    const total = used.reduce((a,b)=>a+b,0)+mod;
    return `${expr} => [${rolls.join(', ')}] ${keep?`=> keep [${used.join(', ')}] `:''}${mod? (mod>0?'+':'')+mod : ''}= ${total}`;
  }catch(e){ return 'Error'; }
}
`);

// Done
console.log(`[dm-site] Built ${notes.size} notes -> ${OUT_DIR}`);
if(warnings.length){ console.warn('[dm-site] Warnings:', warnings.join('\n')); writeFile(path.join(OUT_DIR,'build-warnings.txt'), warnings.join('\n')); }

if (WATCH) {
  console.log('[dm-site] Watching for changes... (Ctrl+C to stop)');
  fs.watch(VAULT_ROOT, { recursive: true }, (evt, filename) => {
    if (!filename) return;
    if (filename.startsWith('site') || filename.startsWith('node_modules') || filename.startsWith('.git')) return;
    // naive: rerun full build
    try { process.execPath; } catch {}
    // Re-run self by spawning a new process would complicate; simplest: advise rerun
    // For now: log a hint
    console.log('[dm-site] Change detected. Re-run `npm run build` to refresh.');
  });
}
`);

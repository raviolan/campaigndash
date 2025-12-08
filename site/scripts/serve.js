#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const VAULT_ROOT = path.resolve(process.cwd());
const ROOT = VAULT_ROOT; // Site root is already the cwd
const port = process.env.PORT || 8080;

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp'
};

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}

function isSafeRel(rel, allowHtml = false) {
  if (typeof rel !== 'string') return false;
  const norm = rel.replace(/\\/g, '/');
  if (allowHtml) {
    if (!norm.endsWith('.html')) return false;
  } else {
    if (!norm.endsWith('.md')) return false;
  }
  if (norm.includes('..')) return false;
  // Disallow hidden/system dirs
  if (/(^|\/)\.(git|obsidian)(\/|$)/.test(norm)) return false;
  return true;
}

function updateSidebarNavigation(folder, filename, title) {
  const sidebarPath = path.join(ROOT, 'assets', 'partials', 'sidebar.html');
  let sidebar = fs.readFileSync(sidebarPath, 'utf8');

  // Create the new nav item
  const encodedFilename = filename.split('.html')[0].split('/').map(encodeURIComponent).join('/');
  const navItem = `                <li><a class="nav-item" href="/${folder}/${encodedFilename}.html"><span
                                            class="nav-icon">•</span><span class="nav-text">${title}</span></a></li>`;

  // Find the appropriate section to insert into
  const sectionMap = {
    '03_PCs': 'Characters',
    '04_NPCs': 'NPCs',
    '02_World/Locations': 'Locations',
    '01_Arcs': 'Arcs',
    '05_Tools & Tables/Shops': 'Shops',
    '00_Campaign/03_Sessions': '03_Sessions',
    '05_Tools & Tables': 'Tools'
  };

  const sectionName = sectionMap[folder];
  if (!sectionName) return; // Unknown section

  // Find the nav-list for this section and insert before the closing </ul>
  // Look for the section by finding its summary text, then find its nav-list
  const sectionRegex = new RegExp(`(<summary[^>]*><span[^>]*>[^<]*</span><span>${sectionName}</span></summary>[\\s\\S]*?<ul class="nav-list">)([\\s\\S]*?)(</ul>)`, 'm');
  const match = sidebar.match(sectionRegex);

  if (match) {
    const existingItems = match[2];
    const updatedItems = existingItems + '\n' + navItem;
    sidebar = sidebar.replace(sectionRegex, `$1${updatedItems}\n$3`);
    fs.writeFileSync(sidebarPath, sidebar, 'utf8');
  }
}

function wrapInMinimalHTML(title, mainContent) {
  return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/assets/style.css" />
</head>
<body>
    <div class="layout">
        <main class="main">
            ${mainContent}
        </main>
    </div>
</body>
</html>`;
}

function generatePageTemplate(title, type) {
  const templates = {
    npc: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#npc</p>

<h2>Overview</h2>
<p>Brief description of this NPC...</p>

<h2>Personality & Traits</h2>
<ul>
<li>Personality trait 1</li>
<li>Personality trait 2</li>
</ul>

<h2>Appearance</h2>
<p>Physical description...</p>

<h2>Relationships</h2>
<p>Connections to other characters...</p>

<h2>DM Notes</h2>
<p>Private notes and plot hooks...</p>`,

    pc: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#pc</p>

<h2>Character Info</h2>
<p><strong>Class:</strong> </p>
<p><strong>Race:</strong> </p>
<p><strong>Background:</strong> </p>

<h2>Backstory</h2>
<p>Character's background and history...</p>

<h2>Personality</h2>
<ul>
<li>Trait</li>
<li>Ideal</li>
<li>Bond</li>
<li>Flaw</li>
</ul>

<h2>Session Notes</h2>
<p>Track character development...</p>
`,

    location: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#location</p>

<h2>Description</h2>
<p>General description of this location...</p>

<h2>Notable Features</h2>
<p>Physical characteristics, atmosphere...</p>

<h2>NPCs</h2>
<p>Who can be found here...</p>

<h2>Points of Interest</h2>
<p>Important locations within this area...</p>

<h2>DM Notes</h2>
<p>Secrets, hooks, and encounter ideas...</p>
  `,

    arc: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#arc #planning</p>

<h2>Overview</h2>
<p>Brief summary of this story arc...</p>

<h2>Key NPCs</h2>
<ul>
<li>NPC 1 - Role</li>
<li>NPC 2 - Role</li>
</ul>

<h2>Major Beats</h2>
<ol>
<li>Opening hook</li>
<li>Rising action</li>
<li>Climax</li>
<li>Resolution</li>
</ol>

<h2>Locations</h2>
<p>Where this arc takes place...</p>

<h2>Session Notes</h2>
<p>Track progress and player choices...</p>
  `,

    shop: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#shops</p>

<h2>Description</h2>
<p>What this shop looks like and what it specializes in...</p>

<h2>Proprietor</h2>
<p><strong>Name:</strong> </p>
<p><strong>Description:</strong> </p>

<h2>Inventory</h2>
<table>
<thead>
<tr><th>Item</th><th>Price</th><th>Notes</th></tr>
</thead>
<tbody>
<tr><td>Item 1</td><td>10 gp</td><td></td></tr>
<tr><td>Item 2</td><td>50 gp</td><td></td></tr>
</tbody>
</table>

<h2>Special Services</h2>
<p>Custom orders, special requests...</p>
  `,

    session: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#session</p>

<h2>Session Summary</h2>
<p><strong>Date:</strong> </p>
<p><strong>Players:</strong> </p>

<h2>What Happened</h2>
<ul>
<li>Event 1</li>
<li>Event 2</li>
<li>Event 3</li>
</ul>

<h2>Important Decisions</h2>
<p>Key player choices and consequences...</p>

<h2>NPCs Met</h2>
<ul>
<li>NPC name - interaction</li>
</ul>

<h2>Loot & Rewards</h2>
<p>Items found, XP awarded...</p>

<h2>Next Session</h2>
<p>Cliffhangers, prep needed...</p>
  `,

    tool: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#tools #planning</p>

<h2>Purpose</h2>
<p>What this tool/reference is for...</p>

<h2>How to Use</h2>
<p>Instructions or guidelines...</p>

<h2>Details</h2>
<p>Main content goes here...</p>
  `
  };

  return templates[type] || `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>Content goes here...</p>

<h2>Section 1</h2>
<p>Add your content...</p>
  `;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(u.pathname);

  // Simple local edit API (single-user, local only)
  if (pathname === '/api/note' && req.method === 'GET') {
    const rel = u.searchParams.get('rel') || '';
    if (!isSafeRel(rel)) return sendJson(res, 400, { error: 'Invalid rel' });
    const abs = path.join(VAULT_ROOT, rel);
    fs.readFile(abs, 'utf8', (err, md) => {
      if (err) return sendJson(res, 404, { error: 'Not found' });
      sendJson(res, 200, { rel, md });
    });
    return;
  }
  if (pathname === '/api/note' && req.method === 'POST') {
    const body = await parseBody(req);
    const { rel, md } = body || {};
    if (!isSafeRel(rel) || typeof md !== 'string') return sendJson(res, 400, { error: 'Invalid payload' });
    const abs = path.join(VAULT_ROOT, rel);
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, md, 'utf8');
      sendJson(res, 200, { ok: true });
    } catch (e) {
      sendJson(res, 500, { error: e.message || 'Write failed' });
    }
    return;
  }
  if (pathname === '/api/edit-page' && req.method === 'POST') {
    const body = await parseBody(req);
    let { url, html } = body || {};
    if (typeof url !== 'string' || typeof html !== 'string') return sendJson(res, 400, { error: 'Invalid payload' });
    // Map URL to file path
    let rel = decodeURIComponent(url).replace(/^\//, '');
    if (!isSafeRel(rel, true)) return sendJson(res, 400, { error: 'Invalid HTML file' });
    const abs = path.join(VAULT_ROOT, rel);
    // Read the file, replace <main class="main">...</main> or <body>...</body>
    try {
      let orig = fs.readFileSync(abs, 'utf8');
      let updated = orig;
      if (/<main[^>]*class=["']main["'][^>]*>/.test(orig)) {
        updated = orig.replace(/(<main[^>]*class=["']main["'][^>]*>)[\s\S]*?(<\/main>)/i, `$1\n${html}\n$2`);
      } else if (/<body[^>]*>/.test(orig)) {
        updated = orig.replace(/(<body[^>]*>)[\s\S]*?(<\/body>)/i, `$1\n${html}\n$2`);
      } else {
        return sendJson(res, 400, { error: 'No editable region found' });
      }
      fs.writeFileSync(abs, updated, 'utf8');
      sendJson(res, 200, { ok: true });
    } catch (e) {
      console.error('[edit-page error]', e);
      sendJson(res, 500, { error: e.message || 'Write failed' });
    }
    return;
  }

  // Static files from ./site
  let p = path.join(ROOT, pathname);
  if (p.endsWith('/')) p = path.join(p, 'index.html');
  fs.stat(p, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(p).toLowerCase();
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    fs.createReadStream(p).pipe(res);
  });
});

server.listen(port, () => {
  console.log(`[dm-site] Serving ./site at http://localhost:${port}`);
});

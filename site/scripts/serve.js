#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { spawn } from 'child_process';
import { syncLandingImages } from './sync-landing-images.js';

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
  // No longer needed - sidebar is generated dynamically
  console.log('[sidebar] Page added:', folder + '/' + filename);
}

function removeSidebarNavigation(relPath) {
  // No longer needed - sidebar is generated dynamically
  console.log('[sidebar] Page removed:', relPath);
}

function generateDynamicSidebar() {
  const sections = [
    { name: 'Characters', icon: 'wizard', folder: '03_PCs', class: 'f-pc' },
    { name: 'NPCs', icon: 'users', folder: '04_NPCs', class: 'f-npc' },
    { name: 'Locations', icon: 'dot', folder: '02_World/Locations', class: 'f-location' },
    { name: 'Arcs', icon: 'compass', folder: '01_Arcs', class: 'f-arc' },
    { name: '03_Sessions', icon: 'wizard', folder: '00_Campaign/03_Sessions', class: 'f-other' },
    { name: 'Tools', icon: 'tools', folder: '05_Tools & Tables', class: 'f-other' }
  ];

  const svgIcons = {
    wizard: 'M4 18l8-14 8 14H4zm8-8l3 6H9l3-6z',
    users: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zm-11 9c0-3 4-5 7-5s7 2 7 5v2H5v-2z',
    dot: 'M12 12a3 3 0 110-6 3 3 0 010 6z',
    compass: 'M12 2a10 10 0 100 20 10 10 0 000-20zm5 5l-3 8-8 3 3-8 8-3zM10 10l-1 2 2-1 1-2-2 1z',
    tools: 'M21 14l-5-5 2-2 3 3 2-2-3-3 1-1-2-2-3 3-2-2-2 2 2 2-9 9v4h4l9-9 2 2z'
  };

  let html = `<!-- Sidebar Navigation -->
<div class="sidebar">
    <nav class="nav" aria-label="Main navigation">
        <div class="nav-header">
            <div class="nav-search">
                <input type="search" id="navSearch" placeholder="Filter..." />
            </div>
            <div id="navFav" class="nav-favorites">
                <details class="nav-details">
                    <summary class="nav-label"><span class="nav-icon">⭐</span><span>Favorites</span></summary>
                    <ul id="favList" class="nav-list"></ul>
                </details>
            </div>
            <ul class="nav-sections">`;

  sections.forEach(section => {
    const folderPath = path.join(ROOT, section.folder);
    if (!fs.existsSync(folderPath)) return;

    // Define landing page filenames to exclude from navigation
    const landingPages = ['Characters.html', 'NPCs.html', 'Locations.html', 'Arcs.html', '03_Sessions.html', 'Tools.html'];

    const files = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.html') && !landingPages.includes(f))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    if (files.length === 0) return;

    const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${svgIcons[section.icon]}"/></svg>`;

    html += `
                    <li class="nav-group">
                        <details class="nav-details ${section.class}" open>
                            <summary class="nav-label"><span class="nav-icon">${icon}</span><span>${section.name}</span></summary>
                            <ul class="nav-list">`;

    files.forEach(file => {
      const title = file.replace('.html', '');
      const encodedFile = encodeURIComponent(file);
      html += `
                                <li><a class="nav-item" href="/${section.folder}/${encodedFile}"><span class="nav-icon">•</span><span class="nav-text">${title}</span></a></li>`;
    });

    html += `
                            </ul>`;

    html += `
                        </details>
                    </li>`;
  });

  html += `
                </ul>
        </div>
    </nav>
</div>`;

  return html;
}

function wrapInMinimalHTML(title, mainContent) {
  // Load all partials to create a complete page
  const layoutPartial = fs.readFileSync(path.join(ROOT, 'assets', 'partials', 'layout.html'), 'utf8');
  const headerPartial = fs.readFileSync(path.join(ROOT, 'assets', 'partials', 'header.html'), 'utf8');
  const sidebarPartialRaw = fs.readFileSync(path.join(ROOT, 'assets', 'partials', 'sidebar.html'), 'utf8');
  const footerPartial = fs.readFileSync(path.join(ROOT, 'assets', 'partials', 'footer.html'), 'utf8');
  const rightPanelPartialRaw = fs.readFileSync(path.join(ROOT, 'assets', 'partials', 'right-panel.html'), 'utf8');

  // For now, use empty sidebar sections - the build script will populate these later
  const sidebarPartial = sidebarPartialRaw.replace('{{SECTIONS}}', '');
  // Right panel with empty RIGHT_TOP content
  const rightPanelPartial = rightPanelPartialRaw.replace('{{RIGHT_TOP}}', '');

  const VERSION = String(Date.now());

  // Assemble the full page using the same method as build2_enhanced.js
  return layoutPartial
    .replace(/{{HEADER}}/g, headerPartial)
    .replace(/{{SIDEBAR}}/g, sidebarPartial)
    .replace(/{{FOOTER}}/g, footerPartial)
    .replace(/{{CONTENT}}/g, mainContent)
    .replace(/{{TITLE}}/g, title)
    .replace(/{{RIGHT}}/g, rightPanelPartial)
    .replace(/{{EXTRA_SCRIPTS}}/g, '')
    .replace(/{{VERSION}}/g, VERSION);
}

function generatePageTemplate(title, type) {
  const templates = {
    npc: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#npc</p>

<section id="overview">
<h2>Overview</h2>
<p>Brief description of this NPC...</p>
</section>

<section id="personality">
<h2>Personality & Traits</h2>
<ul>
<li>Personality trait 1</li>
<li>Personality trait 2</li>
</ul>
</section>

<section id="appearance">
<h2>Appearance</h2>
<p>Physical description...</p>
</section>

<section id="relationships">
<h2>Relationships</h2>
<p>Connections to other characters...</p>
</section>

<section id="dm-notes">
<h2>DM Notes</h2>
<p>Private notes and plot hooks...</p>
</section>`,

    pc: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#pc</p>

<section id="character-info">
<h2>Character Info</h2>
<p><strong>Class:</strong> </p>
<p><strong>Race:</strong> </p>
<p><strong>Background:</strong> </p>
</section>

<section id="backstory">
<h2>Backstory</h2>
<p>Character's background and history...</p>
</section>

<section id="personality">
<h2>Personality</h2>
<ul>
<li>Trait</li>
<li>Ideal</li>
<li>Bond</li>
<li>Flaw</li>
</ul>
</section>

<section id="session-notes">
<h2>Session Notes</h2>
<p>Track character development...</p>
</section>
`,

    location: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#location</p>

<section id="description">
<h2>Description</h2>
<p>General description of this location...</p>
</section>

<section id="features">
<h2>Notable Features</h2>
<p>Physical characteristics, atmosphere...</p>
</section>

<section id="npcs">
<h2>NPCs</h2>
<p>Who can be found here...</p>
</section>

<section id="points-of-interest">
<h2>Points of Interest</h2>
<p>Important locations within this area...</p>
</section>

<section id="dm-notes">
<h2>DM Notes</h2>
<p>Secrets, hooks, and encounter ideas...</p>
</section>
  `,

    arc: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#arc #planning</p>

<section id="overview">
<h2>Overview</h2>
<p>Brief summary of this story arc...</p>
</section>

<section id="key-npcs">
<h2>Key NPCs</h2>
<ul>
<li>NPC 1 - Role</li>
<li>NPC 2 - Role</li>
</ul>
</section>

<section id="major-beats">
<h2>Major Beats</h2>
<ol>
<li>Opening hook</li>
<li>Rising action</li>
<li>Climax</li>
<li>Resolution</li>
</ol>
</section>

<section id="locations">
<h2>Locations</h2>
<p>Where this arc takes place...</p>
</section>

<section id="session-notes">
<h2>Session Notes</h2>
<p>Track progress and player choices...</p>
</section>
  `,

    shop: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#shops</p>

<section id="description">
<h2>Description</h2>
<p>What this shop looks like and what it specializes in...</p>
</section>

<section id="proprietor">
<h2>Proprietor</h2>
<p><strong>Name:</strong> </p>
<p><strong>Description:</strong> </p>
</section>

<section id="inventory">
<h2>Inventory</h2>
<table>
<thead>
<tr><th>Item</th><th>Price</th><th>Notes</th></tr>
</thead>
<tbody>
</tbody>
</table>
</section>

<section id="special-services">
<h2>Special Services</h2>
<p>Custom orders, special requests...</p>
</section>
  `,

    session: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#session</p>

<section id="summary">
<h2>Session Summary</h2>
<p><strong>Date:</strong> </p>
<p><strong>Players:</strong> </p>
</section>

<section id="what-happened">
<h2>What Happened</h2>
<ul>
<li>Event 1</li>
<li>Event 2</li>
<li>Event 3</li>
</ul>
</section>

<section id="decisions">
<h2>Important Decisions</h2>
<p>Key player choices and consequences...</p>
</section>

<section id="npcs-met">
<h2>NPCs Met</h2>
<ul>
<li>NPC name - interaction</li>
</ul>
</section>

<section id="loot">
<h2>Loot & Rewards</h2>
<p>Items found, XP awarded...</p>
</section>

<section id="next-session">
<h2>Next Session</h2>
<p>Cliffhangers, prep needed...</p>
</section>
  `,

    tool: `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>#tools #planning</p>

<section id="purpose">
<h2>Purpose</h2>
<p>What this tool/reference is for...</p>
</section>

<section id="how-to-use">
<h2>How to Use</h2>
<p>Instructions or guidelines...</p>
</section>

<section id="details">
<h2>Details</h2>
<p>Main content goes here...</p>
</section>
  `
  };

  return templates[type] || `<div id="breadcrumbText" class="main-breadcrumb meta"></div><h1>${title}</h1>
<p>Content goes here...</p>

<section id="section-1">
<h2>Section 1</h2>
<p>Add your content...</p>
</section>

<section id="section-2">
<h2>Section 2</h2>
<p>Add your content...</p>
</section>

<section id="section-3">
<h2>Section 3</h2>
<p>Add your content...</p>
</section>
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
  if (pathname === '/api/create-page' && req.method === 'POST') {
    const body = await parseBody(req);
    const { type, title, content } = body || {};
    if (!type || !title) return sendJson(res, 400, { error: 'Missing type or title' });

    const folders = {
      'npc': '04_NPCs',
      'pc': '03_PCs',
      'location': '02_World/Locations',
      'arc': '01_Arcs',
      'shop': '05_Tools & Tables/Shops',
      'session': '00_Campaign/03_Sessions',
      'tool': '05_Tools & Tables'
    };

    const folder = folders[type];
    if (!folder) {
      return sendJson(res, 400, { error: 'Invalid page type' });
    }

    // Create filename (sanitize title)
    const sanitized = title.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, ' ').trim();
    if (!sanitized) {
      return sendJson(res, 400, { error: 'Invalid title - must contain letters or numbers' });
    }
    const filename = sanitized + '.html';
    const filepath = path.join(ROOT, folder, filename);

    // Check if exists
    if (fs.existsSync(filepath)) {
      return sendJson(res, 409, { error: 'A page with this name already exists' });
    }

    // Generate page content based on type, but allow an explicit `content` override
    const mainContent = typeof content === 'string' && content.trim() ? content : generatePageTemplate(title, type);

    // Wrap in minimal HTML structure that rebuild script can process
    const fullHtml = wrapInMinimalHTML(title, mainContent);

    try {
      // Ensure directory exists
      fs.mkdirSync(path.dirname(filepath), { recursive: true });

      // Write the file
      fs.writeFileSync(filepath, fullHtml, 'utf8');

      // Update sidebar navigation to include the new page
      updateSidebarNavigation(folder, filename, title);

      const url = '/' + path.relative(ROOT, filepath);
      sendJson(res, 200, { ok: true, url });
    } catch (e) {
      console.error('[create-page error]', e);
      sendJson(res, 500, { error: 'Failed to create file: ' + e.message });
    }
    return;
  }
  if (pathname === '/api/upload-image' && req.method === 'POST') {
    // Handle multipart/form-data image upload
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) return sendJson(res, 400, { error: 'No boundary' });

    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(data);
        const parts = buffer.toString('binary').split('--' + boundary);

        let imageData = null;
        let imageType = null;
        let filename = null;

        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const nameMatch = part.match(/name="([^"]+)"/);
            const filenameMatch = part.match(/filename="([^"]+)"/);

            if (nameMatch && nameMatch[1] === 'image' && filenameMatch) {
              filename = filenameMatch[1];
              const contentTypeMatch = part.match(/Content-Type: (.+)/);
              if (contentTypeMatch) {
                imageType = contentTypeMatch[1].trim();
              }

              // Extract binary data (everything after double CRLF)
              const dataStart = part.indexOf('\r\n\r\n') + 4;
              const dataEnd = part.lastIndexOf('\r\n');
              imageData = Buffer.from(part.substring(dataStart, dataEnd), 'binary');
            }
          }
        }

        if (!imageData || !filename) {
          return sendJson(res, 400, { error: 'No image data found' });
        }

        // Sanitize filename
        const ext = path.extname(filename);
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const timestamp = Date.now();
        const finalName = `${path.basename(safeName, ext)}-${timestamp}${ext}`;

        // Save to assets folder
        const assetsDir = path.join(ROOT, 'assets');
        if (!fs.existsSync(assetsDir)) {
          fs.mkdirSync(assetsDir, { recursive: true });
        }

        const filePath = path.join(assetsDir, finalName);
        fs.writeFileSync(filePath, imageData);

        const url = '/assets/' + finalName;
        console.log('[upload-image] Saved:', url);
        sendJson(res, 200, { ok: true, url });
      } catch (e) {
        console.error('[upload-image error]', e);
        sendJson(res, 500, { error: 'Upload failed: ' + e.message });
      }
    });
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

      // Also update entity-header and entity-avatar if present in the new HTML
      const headerMatch = html.match(/entity-header[^>]*style="([^"]*)"/);
      const avatarMatch = html.match(/entity-avatar[^>]*<img[^>]*src="([^"]*)"/);

      if (headerMatch) {
        // Update header image URL in the original file
        updated = updated.replace(
          /(entity-header[^>]*style=")([^"]*)(">)/,
          `$1${headerMatch[1]}$3`
        );
      }

      if (avatarMatch) {
        // Update avatar image URL in the original file
        updated = updated.replace(
          /(entity-avatar[^>]*<img[^>]*src=")([^"]*)(")/,
          `$1${avatarMatch[1]}$3`
        );
      }

      if (/<main[^>]*class=["']main["'][^>]*>/.test(updated)) {
        updated = updated.replace(/(<main[^>]*class=["']main["'][^>]*>)[\s\S]*?(<\/main>)/i, `$1\n${html}\n$2`);
      } else if (/<body[^>]*>/.test(updated)) {
        updated = updated.replace(/(<body[^>]*>)[\s\S]*?(<\/body>)/i, `$1\n${html}\n$2`);
      } else {
        return sendJson(res, 400, { error: 'No editable region found' });
      }
      fs.writeFileSync(abs, updated, 'utf8');

      // Auto-sync landing page images after saving
      try {
        syncLandingImages(VAULT_ROOT, true); // silent mode
      } catch (err) {
        console.error('[sync-landing-images]', err.message);
      }

      sendJson(res, 200, { ok: true });
    } catch (e) {
      console.error('[edit-page error]', e);
      sendJson(res, 500, { error: e.message || 'Write failed' });
    }
    return;
  }
  if (pathname === '/api/delete-page' && req.method === 'POST') {
    const body = await parseBody(req);
    let { url } = body || {};
    if (typeof url !== 'string') return sendJson(res, 400, { error: 'Invalid payload' });
    // Map URL to file path
    let rel = decodeURIComponent(url).replace(/^\//, '');
    if (!isSafeRel(rel, true)) return sendJson(res, 400, { error: 'Invalid HTML file' });
    const abs = path.join(VAULT_ROOT, rel);
    try {
      // Check if file exists
      if (!fs.existsSync(abs)) {
        return sendJson(res, 404, { error: 'File not found' });
      }
      // Delete the file
      fs.unlinkSync(abs);
      console.log('[delete-page] Deleted:', abs);

      // Remove from sidebar navigation
      removeSidebarNavigation(rel);

      sendJson(res, 200, { ok: true });
    } catch (e) {
      console.error('[delete-page error]', e);
      sendJson(res, 500, { error: e.message || 'Delete failed' });
    }
    return;
  }
  // Provide a simple JSON list of created enemy / npc pages for clients
  if (pathname === '/api/enemies' && req.method === 'GET') {
    try {
      const folders = ['04_NPCs', '05_Tools & Tables'];
      const landingExcludes = ['NPCs.html', 'Tools.html', 'Characters.html', '03_Sessions.html'];
      const list = [];

      for (const folder of folders) {
        const folderPath = path.join(ROOT, folder);
        if (!fs.existsSync(folderPath)) continue;
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html') && !landingExcludes.includes(f));
        files.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        files.forEach(f => {
          // Build a web-safe href
          const href = '/' + folder + '/' + encodeURIComponent(f);
          list.push({ name: f.replace('.html', ''), href });
        });
      }

      sendJson(res, 200, list);
    } catch (e) {
      console.error('[api/enemies] error', e);
      sendJson(res, 500, { error: 'Failed to list enemies' });
    }
    return;
  }
  if (pathname === '/api/sidebar' && req.method === 'GET') {
    try {
      // Dynamically generate sidebar by scanning filesystem
      const sidebar = generateDynamicSidebar();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(sidebar);
    } catch (e) {
      console.error('[sidebar error]', e);
      sendJson(res, 500, { error: 'Failed to load sidebar' });
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

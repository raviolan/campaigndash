// Insert star button next to H1
(function () {
  const rel = document.getElementById('localGraph')?.dataset.rel;
  // Prefer entity name (PC/NPC pages), else fall back to article h1
  const target = document.querySelector('.entity-name') || document.querySelector('article h1');
  if (target && rel) {
    // Pin/star button
    const btn = document.createElement('button');
    const pinned = JSON.parse(localStorage.getItem('pins') || '[]').includes(rel);
    btn.innerHTML = (window.svgIcon ? window.svgIcon(pinned ? 'star-fill' : 'star', 18) : (pinned ? '★' : '☆'));
    btn.className = 'star';
    btn.setAttribute('data-pin', '');
    btn.style.marginLeft = '8px';
    btn.onclick = () => window.togglePin(rel);
    target.appendChild(btn);

    // Edit button
    const edit = document.createElement('button');
    edit.textContent = 'Edit';
    edit.className = 'chip';
    edit.style.marginLeft = '8px';
    edit.addEventListener('click', () => openEditor(rel));
    target.appendChild(edit);
  }
})();

// Header bookmark toggle (favorites)
(function () {
  const btn = document.querySelector('.bookmark-btn');
  const rel = document.getElementById('localGraph')?.dataset.rel;
  if (!btn || !rel) return;
  function loadFav() { try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch { return [] } }
  function isFav(id) { return loadFav().some(x => x.id === id); }
  function titleFor() { const t = document.querySelector('.entity-name')?.textContent || document.title || rel; return t; }
  function render() { btn.innerHTML = isFav(rel) ? (window.svgIcon ? window.svgIcon('bookmark-fill', 20) : '★') : (window.svgIcon ? window.svgIcon('bookmark', 20) : '☆'); btn.classList.toggle('active', isFav(rel)); }
  btn.addEventListener('click', () => { const title = titleFor(); if (window.toggleFavorite) { window.toggleFavorite(rel, title); } else { const list = loadFav(); const i = list.findIndex(x => x.id === rel); if (i >= 0) list.splice(i, 1); else list.unshift({ id: rel, title }); localStorage.setItem('favorites', JSON.stringify(list)); } render(); });
  render();
})();

// Local graph (radius 2 neighborhood)
(async function () {
  const root = document.getElementById('localGraph'); if (!root) return; const rel = root.dataset.rel;
  const G = await fetch('/graph.json').then(r => r.json()); const N = new Map(G.nodes.map(n => [n.id, n])); const adj = new Map();
  for (const e of G.edges) { if (!adj.has(e.source)) adj.set(e.source, new Set()); if (!adj.has(e.target)) adj.set(e.target, new Set()); adj.get(e.source).add(e.target); adj.get(e.target).add(e.source); }
  const visited = new Set([rel]); let frontier = [rel]; for (let d = 0; d < 2; d++) { const next = []; for (const u of frontier) { for (const v of (adj.get(u) || [])) if (!visited.has(v)) { visited.add(v); next.push(v); } } frontier = next; }
  const nodes = [...visited].map(id => N.get(id)).filter(Boolean); const edges = G.edges.filter(e => visited.has(e.source) && visited.has(e.target));
  renderForceGraph(root, nodes, edges, rel);
})();

// Make entity-body sections collapsible
(function () {
  const entityBody = document.querySelector('.entity-body');
  if (!entityBody) return;

  // Make top-level sections (with IDs like #overview, #connections) collapsible
  const sections = entityBody.querySelectorAll('section[id]');
  sections.forEach(section => {
    // Support both h1 and h2 headings
    const heading = section.querySelector('h1, h2');
    if (!heading) return;

    // Wrap all content after heading in a container
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'section-content';

    let el = heading.nextSibling;
    const toMove = [];
    while (el) {
      const next = el.nextSibling;
      toMove.push(el);
      el = next;
    }

    toMove.forEach(node => contentWrapper.appendChild(node));
    section.appendChild(contentWrapper);

    // Add click handler to heading
    heading.style.cursor = 'pointer';
    heading.setAttribute('tabindex', '0');
    heading.setAttribute('role', 'button');
    heading.setAttribute('aria-expanded', 'true');

    function toggleSection() {
      const isCollapsed = section.classList.contains('collapsed');
      section.classList.toggle('collapsed');
      heading.setAttribute('aria-expanded', String(isCollapsed));

      // Save state to localStorage
      const sectionId = section.id;
      const collapsedSections = JSON.parse(localStorage.getItem('collapsedSections') || '{}');
      const pageKey = location.pathname;
      if (!collapsedSections[pageKey]) collapsedSections[pageKey] = [];

      if (isCollapsed) {
        collapsedSections[pageKey] = collapsedSections[pageKey].filter(id => id !== sectionId);
      } else {
        if (!collapsedSections[pageKey].includes(sectionId)) {
          collapsedSections[pageKey].push(sectionId);
        }
      }
      localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
    }

    heading.addEventListener('click', toggleSection);
    heading.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSection();
      }
    });

    // Restore collapsed state from localStorage
    const collapsedSections = JSON.parse(localStorage.getItem('collapsedSections') || '{}');
    const pageKey = location.pathname;
    if (collapsedSections[pageKey]?.includes(section.id)) {
      section.classList.add('collapsed');
      heading.setAttribute('aria-expanded', 'false');
    }
  });

  // Make h3/h4 headings within sections also collapsible
  const levels = ['H3', 'H4'];
  const headings = [...entityBody.querySelectorAll(levels.join(','))];
  headings.forEach(h => {
    const container = document.createElement('div');
    container.className = 'collapsible-section';
    const content = document.createElement('div');
    content.className = 'collapsible-content';

    let el = h.nextSibling;
    const stopAt = (tag) => levels.indexOf(tag) <= levels.indexOf(h.tagName);
    const toMove = [];

    while (el) {
      if (el.nodeType === 1 && levels.includes(el.tagName) && stopAt(el.tagName)) break;
      const next = el.nextSibling;
      toMove.push(el);
      el = next;
    }

    if (!toMove.length) return;

    h.classList.add('collapsible-toggle');
    h.setAttribute('tabindex', '0');
    h.setAttribute('role', 'button');
    h.setAttribute('aria-expanded', 'true');
    h.parentNode.insertBefore(container, h);
    container.appendChild(h);
    toMove.forEach(n => content.appendChild(n));
    container.appendChild(content);

    function toggle() {
      const open = h.getAttribute('aria-expanded') === 'true';
      h.setAttribute('aria-expanded', String(!open));
      content.style.display = open ? 'none' : 'block';
    }

    h.addEventListener('click', toggle);
    h.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
})();

// Connections tab → popup modal graph
(function () {
  const link = document.querySelector('.entity-tabs a[href="#connections"]');
  if (!link) return;
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    const rel = document.getElementById('localGraph')?.dataset.rel; if (!rel) return;
    const G = await fetch('/graph.json').then(r => r.json());
    const adj = new Map();
    for (const ed of G.edges) { if (!adj.has(ed.source)) adj.set(ed.source, new Set()); if (!adj.has(ed.target)) adj.set(ed.target, new Set()); adj.get(ed.source).add(ed.target); adj.get(ed.target).add(ed.source); }
    const visited = new Set([rel]); let frontier = [rel];
    for (let d = 0; d < 2; d++) { const next = []; for (const u of frontier) { for (const v of (adj.get(u) || [])) if (!visited.has(v)) { visited.add(v); next.push(v); } } frontier = next; }
    const nodes = G.nodes.filter(n => visited.has(n.id));
    const edges = G.edges.filter(ed => visited.has(ed.source) && visited.has(ed.target));
    showGraphModal(nodes, edges, rel);
  });
})();

function showGraphModal(nodes, edges, focusId) {
  const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div'); modal.className = 'modal';
  const header = document.createElement('div'); header.className = 'modal-header';
  const title = document.createElement('div'); title.className = 'modal-title'; title.textContent = 'Connections';
  const btn = document.createElement('button'); btn.className = 'modal-close'; btn.textContent = 'Close';
  const body = document.createElement('div'); body.className = 'modal-body';
  const graph = document.createElement('div'); graph.className = 'modal-graph'; body.appendChild(graph);
  header.appendChild(title); header.appendChild(btn);
  modal.appendChild(header); modal.appendChild(body); backdrop.appendChild(modal); document.body.appendChild(backdrop);
  const cleanup = () => { try { document.body.removeChild(backdrop); } catch { } document.removeEventListener('keydown', onEsc); };
  const onEsc = (ev) => { if (ev.key === 'Escape') cleanup(); };
  btn.addEventListener('click', cleanup);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) cleanup(); });
  document.addEventListener('keydown', onEsc);
  renderForceGraph(graph, nodes, edges, focusId);
}

function renderForceGraph(container, nodes, edges, focusId) {
  const W = container.clientWidth, H = container.clientHeight; const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; container.innerHTML = ''; container.appendChild(canvas); const ctx = canvas.getContext('2d');
  const pos = new Map(nodes.map((n) => [n.id, { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0 }]));
  let scale = 1, tx = 0, ty = 0; let dragging = false, lx = 0, ly = 0; let hoverNode = null;
  // initial centering
  (function center() { let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity; pos.forEach(p => { if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x; if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y; }); const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2; tx = W / 2 - cx * scale; ty = H / 2 - cy * scale; })();
  const tagColor = (tags = []) => { if (tags.includes('pc')) return '#22d3ee'; if (tags.includes('npc')) return '#f472b6'; if (tags.includes('location')) return '#a3e635'; if (tags.includes('arc') || tags.includes('planning')) return '#f59e0b'; return '#7cc7ff'; };
  const worldToScreen = (p) => ({ x: p.x * scale + tx, y: p.y * scale + ty });
  const screenToWorld = (x, y) => ({ x: (x - tx) / scale, y: (y - ty) / scale });
  function step() { for (const e of edges) { const a = pos.get(e.source), b = pos.get(e.target); const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01; const k = 0.01 * (d - 80); const fx = k * dx / d, fy = k * dy / d; a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy; } for (const p of pos.values()) { for (const q of pos.values()) if (p !== q) { const dx = p.x - q.x, dy = p.y - q.y; const d2 = dx * dx + dy * dy; if (d2 < 1) continue; const f = 50 / d2; p.vx += dx * f; p.vy += dy * f; } p.vx *= 0.85; p.vy *= 0.85; p.x += p.vx; p.y += p.vy; } }
  function draw() { ctx.clearRect(0, 0, W, H); ctx.lineWidth = 1; ctx.globalAlpha = 0.7; ctx.strokeStyle = '#2a2f3f'; for (const e of edges) { const a = worldToScreen(pos.get(e.source)), b = worldToScreen(pos.get(e.target)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } for (const n of nodes) { const p = worldToScreen(pos.get(n.id)); const r = (n.id === focusId) ? 5 : 4; ctx.beginPath(); ctx.fillStyle = tagColor(n.tags); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); } }
  (function loop() { step(); draw(); requestAnimationFrame(loop); })();
  // tooltip
  const tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip);
  function showTip(text, x, y) { if (!text) { tip.style.display = 'none'; return; } tip.textContent = text; tip.style.left = (x + 12) + 'px'; tip.style.top = (y + 12) + 'px'; tip.style.display = 'block'; }
  canvas.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
  canvas.addEventListener('mouseup', () => { dragging = false; });
  canvas.addEventListener('mouseleave', () => { dragging = false; showTip(null, 0, 0); });
  canvas.addEventListener('mousemove', (e) => { if (dragging) { tx += (e.clientX - lx); ty += (e.clientY - ly); lx = e.clientX; ly = e.clientY; } const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left, y = e.clientY - rect.top; const w = screenToWorld(x, y); let hit = null; for (const n of nodes) { const p = pos.get(n.id); const d = Math.hypot(p.x - w.x, p.y - w.y); if (d < 8) { hit = n; break; } } hoverNode = hit; showTip(hit ? hit.title : null, e.pageX, e.pageY); });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top; const before = screenToWorld(mx, my); const delta = -e.deltaY * 0.001 * (e.ctrlKey ? 2 : 1); const s = Math.exp(delta); scale = Math.min(5, Math.max(0.2, scale * s)); const after = screenToWorld(mx, my); tx += (mx - (after.x * scale)) - (mx - (before.x * scale)); ty += (my - (after.y * scale)) - (my - (before.y * scale)); }, { passive: false });
  canvas.addEventListener('click', (e) => { if (!hoverNode) return; location.href = '/' + hoverNode.id.replace(/\\/g, '/').replace(/\.md$/i, '.html').split('/').map(encodeURIComponent).join('/'); });
}

async function openEditor(rel) {
  // Fetch current markdown
  let md = '';
  try { const r = await fetch('/api/note?rel=' + encodeURIComponent(rel)); if (r.ok) { const j = await r.json(); md = j.md || ''; } else { alert('Failed to load note'); return; } } catch { alert('Failed to load note'); return; }
  const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div'); modal.className = 'modal';
  const header = document.createElement('div'); header.className = 'modal-header';
  const title = document.createElement('div'); title.className = 'modal-title'; title.textContent = 'Edit Note';
  const close = document.createElement('button'); close.className = 'modal-close'; close.textContent = 'Close';
  const body = document.createElement('div'); body.className = 'modal-body';
  const ta = document.createElement('textarea'); ta.style.width = '100%'; ta.style.minHeight = '60vh'; ta.value = md; ta.spellcheck = false; ta.wrap = 'off';
  const actions = document.createElement('div'); actions.style.marginTop = '8px';
  const save = document.createElement('button'); save.className = 'chip'; save.textContent = 'Save';
  const rebuild = document.createElement('span'); rebuild.className = 'meta'; rebuild.style.marginLeft = '8px'; rebuild.textContent = '';
  actions.appendChild(save); actions.appendChild(rebuild);
  body.appendChild(ta); body.appendChild(actions);
  header.appendChild(title); header.appendChild(close);
  modal.appendChild(header); modal.appendChild(body); backdrop.appendChild(modal); document.body.appendChild(backdrop);
  const cleanup = () => { try { document.body.removeChild(backdrop); } catch { } document.removeEventListener('keydown', onEsc); };
  const onEsc = (ev) => { if (ev.key === 'Escape') cleanup(); };
  close.addEventListener('click', cleanup);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) cleanup(); });
  document.addEventListener('keydown', onEsc);
  save.addEventListener('click', async () => {
    save.disabled = true; save.textContent = 'Saving...'; rebuild.textContent = '';
    try {
      const r = await fetch('/api/note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rel, md: ta.value }) });
      if (!r.ok) { save.disabled = false; save.textContent = 'Save'; alert('Save failed'); return; }
      rebuild.textContent = 'Rebuilding...';
      const b = await fetch('/api/build', { method: 'POST' });
      if (!b.ok) { rebuild.textContent = 'Build failed'; save.disabled = false; save.textContent = 'Save'; return; }
      rebuild.textContent = 'Done';
      cleanup();
      // Reload to reflect updated HTML
      location.reload();
    } catch {
      save.disabled = false; save.textContent = 'Save'; rebuild.textContent = ''; alert('Save/build failed');
    }
  });
}

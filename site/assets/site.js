// Sidebar now ships in-page via partials. Initialize behaviors on DOM ready.
document.addEventListener('DOMContentLoaded', () => {
  try { initializeSplitClickNavigation && initializeSplitClickNavigation(); } catch { }
  try { window.initializeFavorites && window.initializeFavorites(); } catch { }
  try { window.initializeSidebar && window.initializeSidebar(); } catch { }
  try { window.initializeNavSectionState && window.initializeNavSectionState(); } catch { }
  try { window.addKeyboardShortcuts && window.addKeyboardShortcuts(); } catch { }
});

// --- Split-Click Navigation for Category Landing Pages ---
function initializeSplitClickNavigation() {
  const categoryMapping = {
    'Characters': '/03_PCs/Characters.html',
    'NPCs': '/04_NPCs/NPCs.html',
    'Locations': '/02_World/Locations/Locations.html',
    'Arcs': '/01_Arcs/Arcs.html',
    '03_Sessions': '/00_Campaign/03_Sessions/03_Sessions.html',
    'Tools': '/05_Tools & Tables/Tools.html'
  };

  // Find all main category summaries (not nested ones)
  const mainCategories = document.querySelectorAll('.nav-group > .nav-details > summary.nav-label');

  mainCategories.forEach(summary => {
    const labelText = summary.querySelector('span:last-child')?.textContent.trim();
    const landingPage = categoryMapping[labelText];

    if (!landingPage) return;

    summary.addEventListener('click', (e) => {
      const rect = summary.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const clickedRightHalf = clickX > width / 2;

      if (clickedRightHalf) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = landingPage;
      }
      // If left half, let the default toggle behavior happen
    });
  });
}

// --- Confirmation Modal ---
function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');
    const yesBtn = document.getElementById('confirmModalYes');
    const noBtn = document.getElementById('confirmModalNo');

    if (!modal) {
      resolve(window.confirm(message)); // Fallback
      return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.style.display = 'flex';

    // Get all focusable elements in the modal
    const modalContent = modal.querySelector('.modal-content');
    const focusableElements = modalContent.querySelectorAll('button:not([disabled])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus the No button by default (safer)
    setTimeout(() => noBtn.focus(), 100);

    function cleanup() {
      modal.style.display = 'none';
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      document.removeEventListener('keydown', handleKey);
      modalContent.removeEventListener('keydown', trapFocus);
    }

    function handleYes() {
      cleanup();
      resolve(true);
    }

    function handleNo() {
      cleanup();
      resolve(false);
    }

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleNo();
      }
    }

    // Trap focus within modal for accessibility
    function trapFocus(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else { // Tab
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    }

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
    document.addEventListener('keydown', handleKey);
    modalContent.addEventListener('keydown', trapFocus);

    // Close on overlay click
    modal.querySelector('.modal-overlay').addEventListener('click', handleNo, { once: true });
  });
}

// WYSIWYG editor moved to assets/wysiwyg.js
const byId = (id) => document.getElementById(id);
// Inline SVG icons for client-side rendering
function svgIcon(name, size = 16) {
  const p = (d) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  switch (name) {
    case 'home': return p('M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z');
    case 'clock': return p('M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6l5 3 1-1.7-4-2.3V7z');
    case 'star': return p('M12 2l3.1 6.3 7 .9-5.1 4.9 1.3 6.9L12 17.8 5.7 21l1.3-6.9L2 9.2l7-.9L12 2z');
    case 'star-fill': return p('M12 2l3.1 6.3 7 .9-5.1 4.9 1.3 6.9L12 17.8 5.7 21l1.3-6.9L2 9.2l7-.9L12 2z');
    case 'pin': return p('M12 2a6 6 0 016 6c0 4-6 12-6 12S6 12 6 8a6 6 0 016-6zm0 8a2 2 0 110-4 2 2 0 010 4z');
    case 'checklist': return p('M4 6h9v2H4V6zm0 6h9v2H4v-2zm11-7l3 3-1.5 1.5L14.5 7.5 13 9l-1.5-1.5L14.5 4z');
    case 'note': return p('M6 3h9a2 2 0 012 2v14l-4-3-4 3V5a2 2 0 00-2-2z');
    case 'bookmark': return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 4h12v18l-6-4-6 4V4z"/></svg>`;
    case 'bookmark-fill': return p('M6 4h12v18l-6-4-6 4V4z');
    default: return p('');
  }
}
window.svgIcon = svgIcon;
const searchBox = byId('searchBox'); const results = byId('searchResults');
const urlFor = (id) => '/' + id.replace(/\\/g, '/').replace(/\.md$/i, '.html').split('/').map(encodeURIComponent).join('/');
let INDEX = []; let NOTES = [];
fetch('/search-index.json').then(r => r.json()).then(d => INDEX = d);
fetch('/notes.json').then(r => r.json()).then(d => NOTES = d);

function doSearch(q) {
  q = q.trim().toLowerCase(); if (!q) { results.style.display = 'none'; return }
  const isTag = q.startsWith('#'); const term = isTag ? q.slice(1) : q; const out = [];
  for (const it of INDEX) {
    const hit = isTag ? (it.tags || []).some(t => t.toLowerCase().includes(term)) : (it.title.toLowerCase().includes(term) || (it.headings || []).some(h => h.toLowerCase().includes(term)));
    if (hit) out.push(it); if (out.length > 20) break;
  }
  if (!out.length) { results.style.display = 'none'; return }
  results.innerHTML = out.map(function (it) {
    const preview = (it.headings || [])[0] || ''; // First heading as preview
    const previewHtml = preview ? '<div class="search-preview">' + preview.slice(0, 100) + (preview.length > 100 ? '...' : '') + '</div>' : '';
    return '<div class="search-result"><a href="' + ('/' + it.id.replace(/\\/g, '/').replace(/\.md$/i, '.html').split('/').map(encodeURIComponent).join('/')) + '\">' + it.title + '</a> <span class="meta">' + ((it.tags || []).map(function (t) { return '#' + t }).join(' ')) + '</span>' + previewHtml + '</div>';
  }).join('');
  results.style.display = 'block';
}
if (searchBox) {
  searchBox.addEventListener('input', () => doSearch(searchBox.value));
  searchBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchBox.value.trim();
      if (query) {
        window.location.href = '/search.html?q=' + encodeURIComponent(query);
      }
    }
  });
}
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchBox && searchBox.focus(); } });

// Global keyboard shortcuts
let blurred = false;

console.log('[Shortcuts] Initializing global keyboard shortcuts');

document.addEventListener('keydown', (e) => {
  // Skip if typing in input/textarea (except for Cmd+S and blur)
  const isTyping = e.target && /input|textarea/i.test(e.target.tagName) && !e.target.classList.contains('inplace-wysiwyg-editor');
  const isEditMode = document.querySelector('.inplace-wysiwyg-editor');

  // Debug logging
  if (e.altKey || (e.metaKey && e.key.toLowerCase() === 's')) {
    console.log('[Shortcuts] Key pressed:', {
      key: e.key,
      code: e.code,
      altKey: e.altKey,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      isTyping,
      isEditMode: !!isEditMode
    });
  }

  // Option+B: Blur/unblur screen (works everywhere)
  if (e.altKey && e.code === 'KeyB') {
    console.log('[Shortcuts] Blur/unblur triggered');
    e.preventDefault();
    blurred = !blurred;
    if (blurred) {
      document.body.style.filter = 'blur(8px)';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.filter = '';
      document.body.style.userSelect = '';
    }
    return;
  }

  // Skip other shortcuts if typing (except blur)
  if (isTyping && !(e.metaKey || e.ctrlKey)) return;

  // Cmd+S: Save and exit edit mode (only in edit mode)
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && isEditMode) {
    console.log('[Shortcuts] Save triggered');
    e.preventDefault();
    const saveBtn = document.querySelector('.btn-primary');
    if (saveBtn && !saveBtn.disabled) {
      saveBtn.click();
    }
    return;
  }

  // Skip remaining shortcuts if typing
  if (isTyping) return;

  // Option+C: Collapse all nav sections except current
  if (e.altKey && e.code === 'KeyC') {
    console.log('[Shortcuts] Collapse except current triggered');
    e.preventDefault();
    const currentPath = window.location.pathname;
    const allDetails = document.querySelectorAll('.left .nav-details');

    console.log('[Shortcuts] Found details elements:', allDetails.length);

    allDetails.forEach(det => {
      const links = det.querySelectorAll('a.nav-item');
      const isCurrentSection = [...links].some(link => link.getAttribute('href') === currentPath);

      if (!isCurrentSection) {
        det.open = false;
      } else {
        det.open = true;
      }
    });
    return;
  }

  // Option+Q: Collapse ALL nav sections
  if (e.altKey && e.code === 'KeyQ') {
    console.log('[Shortcuts] Collapse all triggered');
    e.preventDefault();
    const allDetails = document.querySelectorAll('.left .nav-details');
    console.log('[Shortcuts] Found details elements:', allDetails.length);
    allDetails.forEach(det => {
      det.open = false;
    });
    return;
  }

  // Option+D: Toggle bookmark for current page
  if (e.altKey && e.code === 'KeyD') {
    console.log('[Shortcuts] Bookmark toggle triggered');
    e.preventDefault();
    const bookmarkBtn = document.querySelector('.bookmark-btn');
    console.log('[Shortcuts] Bookmark button:', bookmarkBtn);
    if (bookmarkBtn) {
      bookmarkBtn.click();
    }
    return;
  }
});

const hover = document.createElement('div'); hover.className = 'hovercard'; document.body.appendChild(hover);
document.body.addEventListener('mousemove', (e) => { hover.style.left = (e.pageX + 12) + 'px'; hover.style.top = (e.pageY + 12) + 'px'; });
document.body.addEventListener('mouseover', (e) => { const a = e.target.closest('a'); if (!a || !a.href || !a.pathname.endsWith('.html')) { hover.style.display = 'none'; return } if (a.closest('.left')) { hover.style.display = 'none'; return; } const id = decodeURIComponent(a.pathname.replace(/^\//, '')).replace(/\.html$/i, '.md'); const n = NOTES.find(n => n.id === id); if (n) { hover.innerHTML = '<strong>' + n.title + '</strong><div class="meta">' + ((n.tags || []).map(t => '#' + t).join(' ')) + '</div>'; hover.style.display = 'block'; } });
document.body.addEventListener('mouseout', () => { hover.style.display = 'none' });

window.togglePin = function (rel) { const pins = JSON.parse(localStorage.getItem('pins') || '[]'); const i = pins.indexOf(rel); if (i >= 0) pins.splice(i, 1); else pins.push(rel); localStorage.setItem('pins', JSON.stringify(pins)); const el = document.querySelector('[data-pin]'); if (el) el.innerHTML = pins.includes(rel) ? svgIcon('star-fill') : svgIcon('star'); }

// Save Session (global): exports session notes + todos + pins as files
window.saveSessionSnapshot = async function () {
  const notes = localStorage.getItem('sessionNotes') || '';
  const todos = localStorage.getItem('graphTodos') || '[]';
  const pins = localStorage.getItem('pins') || '[]';
  const now = new Date(); const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const json = JSON.stringify({ when: now.toISOString(), notes, todos: JSON.parse(todos), pins: JSON.parse(pins) }, null, 2);
  const summary = `Session ${stamp}\n\nNotes preview:\n${notes.slice(0, 500)}\n\nTodos count: ${JSON.parse(todos).length}\nPins count: ${JSON.parse(pins).length}\n`;
  async function saveFile(name, contents, type) {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: name });
        const w = await handle.createWritable(); await w.write(contents); await w.close(); return true;
      } catch (e) { /* user cancelled */ }
    }
    const a = document.createElement('a'); a.download = name; a.href = URL.createObjectURL(new Blob([contents], { type })); a.click(); URL.revokeObjectURL(a.href);
    return true;
  }
  await saveFile(`session-snapshot-${stamp}.json`, json, 'application/json');
  await saveFile(`session-summary-${stamp}.txt`, summary, 'text/plain');
};

// Color-code tags to match node colors
(function () {
  const map = (name) => {
    if (name === 'pc') return 'tag-pc';
    if (name === 'npc') return 'tag-npc';
    if (name === 'location') return 'tag-location';
    if (name === 'arc' || name === 'planning') return 'tag-arc';
    return null;
  };
  document.querySelectorAll('.tag').forEach(a => {
    const txt = (a.textContent || '').trim();
    const name = txt.startsWith('#') ? txt.slice(1) : txt;
    const cls = map(name);
    if (cls) a.classList.add(cls);
  });
})();

// Resizable side panels (drag to adjust --left-w and --right-w)
(function () {
  const left = document.querySelector('.resizer-left');
  const right = document.querySelector('.resizer-right');
  if (!left || !right) return;
  const root = document.documentElement;
  const KEY_L = 'panelLeftW'; const KEY_R = 'panelRightW';
  // Restore saved widths
  try { const lw = parseInt(localStorage.getItem(KEY_L) || '0', 10); if (lw) root.style.setProperty('--left-w', lw + 'px'); } catch { }
  try { const rw = parseInt(localStorage.getItem(KEY_R) || '0', 10); if (rw) root.style.setProperty('--right-w', rw + 'px'); } catch { }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function onDrag(which, ev) {
    ev.preventDefault(); function move(e) { if (which === 'left') { const x = e.clientX; const min = 180; const max = window.innerWidth - (parseInt(getComputedStyle(root).getPropertyValue('--right-w')) || 340) - 300; const w = clamp(x, min, max); root.style.setProperty('--left-w', w + 'px'); try { localStorage.setItem(KEY_L, String(w)); } catch { } } else { const x = e.clientX; const min = 220; const max = window.innerWidth - (parseInt(getComputedStyle(root).getPropertyValue('--left-w')) || 300) - 300; const w = clamp(window.innerWidth - x, min, max); root.style.setProperty('--right-w', w + 'px'); try { localStorage.setItem(KEY_R, String(w)); } catch { } } }
    function up() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }
  left.addEventListener('mousedown', onDrag.bind(null, 'left'));
  right.addEventListener('mousedown', onDrag.bind(null, 'right'));
})();

// Inject Save Session button at the end of the top bar (to the right of search)
(function () {
  const topBar = document.querySelector('.top');
  if (!topBar) return;
  if (document.getElementById('saveSession')) return;
  const frag = document.createDocumentFragment();
  const btnSave = document.createElement('button');
  btnSave.id = 'saveSession'; btnSave.className = 'chip primary'; btnSave.textContent = 'Save Session'; btnSave.title = 'Save Session';
  btnSave.addEventListener('click', () => window.saveSessionSnapshot && window.saveSessionSnapshot());
  const btnFav = document.createElement('button');
  btnFav.id = 'bookmarkPage'; btnFav.className = 'chip'; btnFav.textContent = 'Bookmark'; btnFav.title = 'Bookmark this page';
  btnFav.addEventListener('click', () => addFavorite());
  frag.appendChild(btnFav); frag.appendChild(btnSave);
  const searchWrap = document.querySelector('.top .search');
  if (searchWrap && searchWrap.nextSibling) { topBar.insertBefore(frag, searchWrap.nextSibling); } else { topBar.appendChild(frag); }
})();

// Global Drawer (toggle + pin + adaptive layout)
(function () {
  const right = document.querySelector('.right');
  if (!right) return;
  const toggle = document.getElementById('drawerToggle');
  const reveal = document.getElementById('drawerReveal');
  const pin = document.getElementById('drawerPin');
  const KEY_PIN = 'drawerPinned';
  const KEY_OPEN = 'drawerOpen';
  function applyState() {
    const pinned = JSON.parse(localStorage.getItem(KEY_PIN) || 'false');
    const open = JSON.parse(localStorage.getItem(KEY_OPEN) || 'true');
    if (pin) { pin.innerHTML = window.svgIcon && window.svgIcon('pin', 16) || 'Pin'; pin.setAttribute('aria-pressed', String(pinned)); pin.classList.toggle('active', pinned); }
    const shouldOpen = pinned ? true : open;
    document.body.classList.toggle('drawer-collapsed', !shouldOpen);
  }
  toggle?.addEventListener('click', () => { const cur = JSON.parse(localStorage.getItem(KEY_OPEN) || 'true'); localStorage.setItem(KEY_OPEN, JSON.stringify(!cur)); applyState(); });
  pin?.addEventListener('click', () => { const cur = JSON.parse(localStorage.getItem(KEY_PIN) || 'false'); const next = !cur; localStorage.setItem(KEY_PIN, JSON.stringify(next)); if (next) { localStorage.setItem(KEY_OPEN, 'true'); } applyState(); });
  reveal?.addEventListener('click', () => { localStorage.setItem(KEY_OPEN, 'true'); applyState(); });
  applyState();
})();

// Right panel tools: tabs, pinning, notepad autosave, default home
// Moved to assets/right-panel.js
/* (function () {
  const tabs = document.querySelectorAll('.tool-tab');
  const views = {
    home: document.getElementById('toolHome'),
    todo: document.getElementById('toolTodo'),
    note: document.getElementById('toolNote')
  };
  const KEY_TOOL = 'rightActiveTool';
  const SPLIT = true; // split mode: two panes visible
  const KEY_PINS = 'rightPinnedTools';
  const KEY_TOP = 'rightPaneTop';
  const KEY_BOTTOM = 'rightPaneBottom';
  const KEY_SPLIT = 'rightPaneSplit';
  function getPins() { try { return JSON.parse(localStorage.getItem(KEY_PINS) || '[]'); } catch { return [] } }
  function setPins(list) { localStorage.setItem(KEY_PINS, JSON.stringify(list)); }
  function isPinned(id) { return getPins().includes(id); }
  function togglePin(id) { const arr = getPins(); const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id); setPins(arr); renderPins(); renderHome(); renderPinButtons(); }
  function setActive(name) {
    localStorage.setItem(KEY_TOOL, name); for (const b of tabs) { b.classList.toggle('active', b.getAttribute('data-tool') === name); if (window.svgIcon) { const t = b.getAttribute('data-tool'); b.innerHTML = t === 'home' ? svgIcon('home') : t === 'todo' ? svgIcon('checklist') : svgIcon('note'); } }
    if (SPLIT) { // always show todo + note in split mode
      views.home && views.home.classList.remove('active');
      views.todo && views.todo.classList.add('active');
      views.note && views.note.classList.add('active');
      renderHome();
    } else {
      for (const k in views) { if (views[k]) views[k].classList.toggle('active', k === name); }
      if (name === 'home') renderHome();
    }
  }
  function renderPins() { document.querySelectorAll('.tool-pin').forEach(btn => { const id = btn.getAttribute('data-tool'); btn.classList.toggle('active', isPinned(id)); if (window.svgIcon) btn.innerHTML = svgIcon('pin', 14); }); }
  function renderHome() {
    const home = document.getElementById('toolHomePins'); if (!home) return; const pins = getPins(); const map = { todo: { icon: 'checklist', label: 'To-Do' }, note: { icon: 'note', label: 'Notepad' } };
    home.innerHTML = pins.length ? pins.map(id => `<button class="chip" data-open="${id}">${window.svgIcon ? svgIcon(map[id]?.icon || 'dot', 16) : ''} ${map[id]?.label || id}</button>`).join('') : '<div class="meta">No tools pinned. Open a tool and click its pin.</div>';
    home.querySelectorAll('button[data-open]').forEach(b => b.addEventListener('click', () => setActive(b.getAttribute('data-open') || 'home')));
  }
  // Initialize icons and clicks
  tabs.forEach(b => {
    const t = b.getAttribute('data-tool'); if (window.svgIcon) { b.innerHTML = t === 'home' ? svgIcon('home') : t === 'todo' ? svgIcon('checklist') : svgIcon('note'); }
    b.addEventListener('click', () => setActive(b.getAttribute('data-tool') || 'home'));
  });
  // Pin buttons
  document.querySelectorAll('.tool-pin').forEach(btn => btn.addEventListener('click', () => togglePin(btn.getAttribute('data-tool') || '')));
  renderPins();
  // Notepad autosave
  (function () { const ta = document.getElementById('toolNotepad'); if (!ta) return; const KEY = 'sessionNotes'; try { ta.value = localStorage.getItem(KEY) || ''; } catch { } ta.addEventListener('input', () => { try { localStorage.setItem(KEY, ta.value); } catch { } }); })();
  setActive(localStorage.getItem(KEY_TOOL) || 'home');

  // Per-pane selection and adjustable split (split mode)
  if (SPLIT) {
    const topBody = document.querySelector('.pane-body[data-pane="top"]');
    const bottomBody = document.querySelector('.pane-body[data-pane="bottom"]');
    function iconFor(tool) { return tool === 'home' ? (window.svgIcon ? svgIcon('home', 14) : 'H') : tool === 'todo' ? (window.svgIcon ? svgIcon('checklist', 14) : 'T') : (window.svgIcon ? svgIcon('note', 14) : 'N'); }
    function activatePane(pane, tool) { const body = pane === 'top' ? topBody : bottomBody; if (!body) return; const el = views[tool]; if (!el) return; body.innerHTML = ''; body.appendChild(el); document.querySelectorAll('.pane-tab[data-pane="' + pane + '"]').forEach(b => { const t = b.getAttribute('data-tool'); b.classList.toggle('active', t === tool); if (window.svgIcon) { b.innerHTML = iconFor(t); } }); localStorage.setItem(pane === 'top' ? KEY_TOP : KEY_BOTTOM, tool); if (tool === 'home') renderHome(); }
    // Init pane tab icons and clicks
    document.querySelectorAll('.pane-tab').forEach(b => { const t = b.getAttribute('data-tool'); if (window.svgIcon) b.innerHTML = iconFor(t); b.addEventListener('click', () => activatePane(b.getAttribute('data-pane') || 'top', t)); });
    const topSel = localStorage.getItem(KEY_TOP) || 'todo';
    const botSel = localStorage.getItem(KEY_BOTTOM) || 'note';
    activatePane('top', topSel);
    activatePane('bottom', botSel);
    // Adjustable split resizer
    (function () {
      const container = document.querySelector('.right-split');
      const res = document.querySelector('.pane-resizer-h'); if (!container || !res) return;
      const saved = localStorage.getItem(KEY_SPLIT);
      // Initialize and clamp
      (function initSplit() {
        const rect = container.getBoundingClientRect();
        const minPx = 120; const maxPx = Math.max(minPx, rect.height - 120);
        let val = '50%';
        if (saved && /^(\d+)(px|%)$/.test(saved)) {
          if (saved.endsWith('%')) {
            const pct = parseFloat(saved); let px = rect.height * ((isNaN(pct) ? 50 : pct) / 100);
            if (px < minPx) px = Math.min(rect.height / 2, minPx); if (px > maxPx) px = Math.max(rect.height / 2, maxPx);
            val = px + 'px';
          } else {
            let px = parseFloat(saved); if (isNaN(px)) px = rect.height / 2;
            if (px < minPx) px = Math.min(rect.height / 2, minPx); if (px > maxPx) px = Math.max(rect.height / 2, maxPx);
            val = px + 'px';
          }
        }
        container.style.setProperty('--pane-top-h', val);
      })();
      function onDown(e) {
        e.preventDefault(); const rect = container.getBoundingClientRect(); const startY = e.clientY; const cur = getComputedStyle(container).getPropertyValue('--pane-top-h').trim(); const startPx = cur.endsWith('%') ? rect.height * parseFloat(cur) / 100 : parseFloat(cur) || (rect.height / 2);
        function onMove(ev) { const dy = ev.clientY - startY; let h = startPx + dy; const min = 120; const max = rect.height - 120; if (h < min) h = min; if (h > max) h = max; const val = h + 'px'; container.style.setProperty('--pane-top-h', val); try { localStorage.setItem(KEY_SPLIT, val); } catch { } }
        function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
      }
      res.addEventListener('mousedown', onDown);
    })();
  }
})();
*/

// Left Drawer (toggle + pin + collapse/expand all)
(function () {
  const left = document.querySelector('.left');
  if (!left) return;
  const toggle = document.getElementById('leftDrawerToggle');
  const pin = document.getElementById('leftDrawerPin');
  const btnCollapse = document.getElementById('leftCollapseExpand');
  const reveal = (function () { const b = document.createElement('button'); b.id = 'leftDrawerReveal'; b.className = 'left-drawer-tab'; b.textContent = 'Nav'; b.title = 'Show navigation'; document.body.appendChild(b); return b; })();
  const KEY_PIN = 'leftDrawerPinned';
  const KEY_OPEN = 'leftDrawerOpen';
  function applyState() {
    const pinned = JSON.parse(localStorage.getItem(KEY_PIN) || 'false');
    const open = JSON.parse(localStorage.getItem(KEY_OPEN) || 'true');
    pin && (pin.textContent = pinned ? 'Unpin' : 'Pin', pin.setAttribute('aria-pressed', String(pinned)));
    const shouldOpen = pinned ? true : open;
    document.body.classList.toggle('left-collapsed', !shouldOpen);
  }
  toggle?.addEventListener('click', () => { const cur = JSON.parse(localStorage.getItem(KEY_OPEN) || 'true'); localStorage.setItem(KEY_OPEN, JSON.stringify(!cur)); applyState(); });
  pin?.addEventListener('click', () => { const cur = JSON.parse(localStorage.getItem(KEY_PIN) || 'false'); const next = !cur; localStorage.setItem(KEY_PIN, JSON.stringify(next)); if (next) { localStorage.setItem(KEY_OPEN, 'true'); } applyState(); });
  reveal?.addEventListener('click', () => { localStorage.setItem(KEY_OPEN, 'true'); applyState(); });

  function collapseAll(keepCurrent) {
    const details = Array.from(document.querySelectorAll('.left details'));
    details.forEach(d => d.open = false);
    if (!keepCurrent) return;
    const currentLink = (function () {
      const lg = document.getElementById('localGraph');
      if (!lg) return null;
      const rel = lg.dataset.rel; if (!rel) return null;
      const href = '/' + rel.replace(/\\/g, '/').replace(/\\.md$/i, '.html').split('/').map(encodeURIComponent).join('/');
      return [...document.querySelectorAll('.left a')].find(a => { try { return new URL(a.href, location.origin).pathname === href; } catch { return false; } });
    })();
    if (currentLink) {
      let el = currentLink.parentElement;
      while (el && !el.classList.contains('left')) {
        if (el.tagName === 'DETAILS') el.open = true;
        el = el.parentElement;
      }
    }
  }
  let collapsed = true;
  btnCollapse?.addEventListener('click', () => {
    const KEY_SEC = 'navOpenSections';
    if (collapsed) {
      document.querySelectorAll('.left details').forEach(d => d.open = true);
      btnCollapse.textContent = 'Collapse all';
      // Save all sections as open
      const opens = [...document.querySelectorAll('.left details.nav-details')]
        .map(d => d.querySelector('.nav-label span:last-child')?.textContent || '')
        .filter(Boolean);
      try { localStorage.setItem(KEY_SEC, JSON.stringify(opens)); } catch (e) { }
    } else {
      collapseAll(true);
      btnCollapse.textContent = 'Expand all';
      // Save current state after collapsing
      const opens = [...document.querySelectorAll('.left details.nav-details')]
        .filter(d => d.open)
        .map(d => d.querySelector('.nav-label span:last-child')?.textContent || '')
        .filter(Boolean);
      try { localStorage.setItem(KEY_SEC, JSON.stringify(opens)); } catch (e) { }
    }
    collapsed = !collapsed;
  });
  if (btnCollapse) btnCollapse.textContent = 'Collapse all';
  applyState();
})();

// Initialize nav section state - called after sidebar is loaded
window.initializeNavSectionState = function () {
  const KEY_SEC = 'navOpenSections';

  function saveSections() {
    const opens = [...document.querySelectorAll('.left details.nav-details')]
      .filter(d => d.open)
      .map(d => d.querySelector('.nav-label span:last-child')?.textContent || '')
      .filter(Boolean);
    try {
      localStorage.setItem(KEY_SEC, JSON.stringify(opens));
      console.log('[NavState] Saved sections:', opens);
    } catch (e) {
      console.error('Failed to save nav section state:', e);
    }
  }

  function loadSections() {
    try {
      return JSON.parse(localStorage.getItem(KEY_SEC) || 'null');
    } catch {
      return null;
    }
  }

  // Mark active nav item first (before restoring state)
  const path = location.pathname;
  const activeLink = [...document.querySelectorAll('.left a.nav-item')].find(el => {
    try {
      return new URL(el.href, location.origin).pathname === path;
    } catch {
      return false;
    }
  });

  if (activeLink) {
    activeLink.classList.add('active');
    activeLink.scrollIntoView({ block: 'center' });
  }

  // Restore saved state if available
  const savedSections = loadSections();
  if (savedSections !== null) {
    console.log('[NavState] Restoring sections:', savedSections);
    const opens = new Set(savedSections);
    document.querySelectorAll('.left details.nav-details').forEach(d => {
      const n = d.querySelector('.nav-label span:last-child')?.textContent || '';
      if (n) {
        d.open = opens.has(n);
      }
    });

    // Always ensure active link's parents are open
    if (activeLink) {
      let el = activeLink.parentElement;
      while (el && !el.classList.contains('left')) {
        if (el.tagName === 'DETAILS') el.open = true;
        el = el.parentElement;
      }
    }
  }

  // Attach toggle listeners to save state
  document.querySelectorAll('.left details.nav-details').forEach(d => {
    d.addEventListener('toggle', saveSections);
  });

  // Breadcrumb
  const bc = document.getElementById('breadcrumbText');
  if (bc && activeLink) {
    const sec = activeLink.closest('.nav-group')?.querySelector('.nav-label span:last-child')?.textContent || '';
    const title = document.title || activeLink.textContent;
    bc.textContent = `You Are Here: ${sec} > ${title}`;
  }
};

// Recents: store and render
(function recents() {
  const KEY = 'recents'; function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } } function save(v) { localStorage.setItem(KEY, JSON.stringify(v)); }
  const id = decodeURIComponent(location.pathname.replace(/^\//, '')).replace(/\.html$/i, '.md'); let list = load().filter(x => x.id !== id); const title = document.title || id; list.unshift({ id, title }); list = list.slice(0, 12); save(list);
  const ul = document.getElementById('navRecents'); if (ul) { ul.innerHTML = list.map(r => '<li><a class="nav-item" href="' + urlFor(r.id) + '"><span class="nav-icon">' + svgIcon('clock') + '</span><span class="nav-text">' + r.title + '</span></a></li>').join('') || '<li class="meta">No recents</li>'; }
})();

// Quick Nav filter
(function quick() {
  const q = document.getElementById('navQuick'); if (!q) return; q.addEventListener('input', () => {
    const term = q.value.trim().toLowerCase(); const items = [...document.querySelectorAll('.left .nav-list a.nav-item')]; items.forEach(a => { const t = a.textContent.toLowerCase(); const show = !term || t.includes(term); a.parentElement.style.display = show ? '' : 'none'; }); // Hide empty groups
    document.querySelectorAll('.left .nav-group').forEach(g => { const any = [...g.querySelectorAll('.nav-list li')].some(li => li.style.display !== 'none'); g.style.display = any ? '' : 'none'; });
  });
})();

// Per-section mini filters
(function sectionFilters() {
  const inputs = [...document.querySelectorAll('.left .nav-mini-input')]; if (!inputs.length) return;
  inputs.forEach(inp => {
    inp.addEventListener('input', () => {
      const term = (inp.value || '').trim().toLowerCase();
      const details = inp.closest('details.nav-details'); if (!details) return;
      const items = [...details.querySelectorAll('ul.nav-list > li')];
      items.forEach(li => {
        const t = (li.textContent || '').toLowerCase();
        li.style.display = !term || t.includes(term) ? '' : 'none';
      });
    });
  });
})();

// "Show only this section" toggle
(function onlySection() {
  const KEY = 'navOnlySection';
  function applyOnly(sectionLabel) {
    const groups = [...document.querySelectorAll('.left .nav-group')];
    groups.forEach(g => {
      const label = g.querySelector('.nav-label span:last-child')?.textContent || '';
      const show = !sectionLabel || label === sectionLabel;
      g.style.display = show ? '' : 'none';
    });
    // reflect active button state
    document.querySelectorAll('.nav-only').forEach(btn => {
      const lab = btn.getAttribute('data-section');
      btn.setAttribute('aria-pressed', sectionLabel && lab === sectionLabel ? 'true' : 'false');
    });
  }
  const saved = (function () { try { return localStorage.getItem(KEY) || '' } catch { return '' } })();
  if (saved) applyOnly(saved);
  document.querySelectorAll('.nav-only').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const label = btn.getAttribute('data-section') || '';
      const cur = (function () { try { return localStorage.getItem(KEY) || '' } catch { return '' } })();
      const next = (cur === label) ? '' : label;
      try { if (next) localStorage.setItem(KEY, next); else localStorage.removeItem(KEY); } catch { }
      applyOnly(next);
    });
  });
})();

// Hotkeys moved to assets/keyboard-nav.js
// (function hotkeys() { ... })();

// Favorites rendering and actions
// Favorites moved to assets/favorites.js

// Global To-Do (works on any page with todo elements present)
(function () {
  const FORM = document.getElementById('todoForm');
  const INPUT = document.getElementById('todoInput');
  const LIST = document.getElementById('todoList');
  const TOGGLE = document.getElementById('todoClearDone'); // repurposed as Hide/Show Completed
  if (!FORM || !INPUT || !LIST) return; // not present on this page
  const KEY = 'graphTodos';
  const KEY_HIDE = 'todoHideCompleted';
  const KEY_ID = 'todoIdSeq';
  let nextFocusPath = '';
  let nextFocusId = '';

  function genId() {
    try { const cur = Number(localStorage.getItem(KEY_ID) || '0') + 1; localStorage.setItem(KEY_ID, String(cur)); return 't' + Date.now().toString(36) + cur.toString(36); } catch { return 't' + Math.random().toString(36).slice(2); }
  }

  function load() {
    let arr = []; try { arr = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { }
    let changed = false;
    function norm(items) { return (items || []).map(it => { const node = { id: it.id || genId(), text: it.text || '', done: !!it.done, collapsed: !!it.collapsed, children: it.children ? norm(it.children) : [] }; if (!it.id) changed = true; return node; }); }
    const normed = norm(arr);
    if (changed) save(normed);
    return normed;
  }
  function save(items) { localStorage.setItem(KEY, JSON.stringify(items)); }
  function hideCompleted() { try { return localStorage.getItem(KEY_HIDE) === '1'; } catch { return false } }
  function setHideCompleted(v) { try { localStorage.setItem(KEY_HIDE, v ? '1' : '0'); } catch { } }
  function escapeHtml(s) { return s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", "</script": "&lt;/script>", "</": "&lt;/" }[c] || c)); }

  function render() {
    const items = load();
    const hide = hideCompleted();
    if (TOGGLE) TOGGLE.textContent = hide ? 'Show Completed' : 'Hide Completed';
    if (!items.length) { LIST.innerHTML = '<li class="meta">No tasks yet</li>'; return; }
    LIST.innerHTML = renderList(items, '', true, hide);
    bindEvents();
    if (nextFocusId) {
      const ed = LIST.querySelector('.todo-text[data-id="' + nextFocusId + '"]');
      if (ed) { ed.focus(); document.getSelection()?.selectAllChildren(ed); document.getSelection()?.collapseToEnd(); }
      nextFocusId = '';
    } else if (nextFocusPath) {
      const ed = LIST.querySelector('.todo-text[data-path="' + nextFocusPath + '"]');
      if (ed) { ed.focus(); document.getSelection()?.selectAllChildren(ed); document.getSelection()?.collapseToEnd(); }
      nextFocusPath = '';
    }
  }

  function renderList(items, path, topLevel, hide) {
    const parts = [];
    const filtered = hide ? items.filter(it => !it.done) : items;
    filtered.forEach((it, i) => {
      const p = path === '' ? String(i) : path + '.' + i;
      const domId = 'todo_' + p.replace(/\./g, '_');
      const nid = it.id;
      const hasChildren = (it.children || []).length > 0;
      const isParent = hasChildren && topLevel;
      const clsText = 'todo-text editable' + (it.done ? ' done' : '') + (isParent ? ' parent-text' : '');
      const chevron = hasChildren ? '<button class="todo-chevron" data-path="' + p + '" aria-label="Expand/Collapse">' + (it.collapsed ? '▸' : '▾') + '</button>' : '<span class="todo-chevron-spacer"></span>';
      const childCount = hasChildren ? '<span class="todo-count-badge">' + it.children.length + '</span>' : '';

      parts.push('<li class="todo-item' + (topLevel ? ' top-level' : '') + (isParent ? ' is-parent' : '') + '" role="listitem" data-path="' + p + '" data-id="' + nid + '">');
      parts.push('<div class="todo-row">');
      parts.push('<span class="todo-grip" draggable="true" data-id="' + nid + '" aria-label="Drag">⋮⋮</span>');
      parts.push(chevron);
      parts.push('<input id="' + domId + '" class="todo-check" type="checkbox" data-path="' + p + '" ' + (it.done ? 'checked' : '') + ' aria-label="Mark task as done">');
      parts.push('<div class="' + clsText + '" contenteditable="true" data-path="' + p + '" data-id="' + nid + '" spellcheck="false">' + escapeHtml(it.text) + '</div>');
      parts.push(childCount);
      parts.push('<div class="todo-actions"><button class="todo-more" data-path="' + p + '" title="Delete">⋯</button></div>');
      parts.push('</div>');

      if (hasChildren) {
        const sublistHtml = renderList(it.children, p, false, hide);
        parts.push('<ul class="todo-sublist' + (it.collapsed ? ' collapsed' : '') + '">' + sublistHtml + '</ul>');
      }

      parts.push('</li>');
    });
    return parts.join('');
  }

  function getByPath(items, path) { if (!path) return null; const idx = path.split('.').map(n => parseInt(n, 10)); let cur = { items }; for (let i = 0; i < idx.length; i++) { const k = idx[i]; const arr = (i === 0 ? cur.items : cur.children); if (!arr || k < 0 || k >= arr.length) return null; cur = arr[k]; } return cur; }
  function getParentAndIndex(items, path) { const parts = path.split('.'); const last = parseInt(parts.pop(), 10); const parentPath = parts.join('.'); let parentList = (parentPath === '') ? items : getByPath(items, parentPath)?.children; return { parentList, index: last, parentPath } }

  function findById(items, id) {
    let found = null, parent = null, index = -1;
    function walk(arr, p) {
      for (let i = 0; i < arr.length; i++) {
        const n = arr[i]; if (n.id === id) { found = n; parent = p; index = i; return true; }
        if (n.children && walk(n.children, n)) return true;
      }
      return false;
    }
    walk(items, null);
    return { node: found, parent, index };
  }

  function containsId(root, id) {
    if (!root) return false; if (root.id === id) return true; return (root.children || []).some(c => containsId(c, id));
  }

  function moveNodeById(id, targetId, mode) {
    const items = load();
    const src = findById(items, id);
    const dst = findById(items, targetId);
    if (!src.node || !dst.node) return;
    // Prevent moving into itself/descendant
    if (mode === 'into' && containsId(src.node, targetId)) return;
    // Remove from source
    let fromArr = src.parent ? (src.parent.children || []) : items;
    const moved = fromArr.splice(src.index, 1)[0];
    if (mode === 'into') {
      dst.node.children = dst.node.children || [];
      dst.node.children.push(moved);
    } else {
      // before/after in destination's parent list
      const toArr = dst.parent ? (dst.parent.children || []) : items;
      let di = dst.index + (mode === 'after' ? 1 : 0);
      // If moving within same array and original index < insertion index, adjust
      if (toArr === fromArr && src.index < di) di -= 1;
      toArr.splice(di, 0, moved);
    }
    save(items);
    nextFocusId = id;
    render();
  }

  function newSiblingAfter(path) { const items = load(); const { parentList, index } = getParentAndIndex(items, path); if (!parentList) return; const insertAt = index + 1; parentList.splice(insertAt, 0, { text: '', done: false, collapsed: false, children: [] }); save(items); nextFocusPath = (path.split('.').slice(0, -1).concat(insertAt)).join('.'); render(); }
  function deleteItem(path) { const items = load(); const { parentList, index, parentPath } = getParentAndIndex(items, path); if (!parentList) return; const focusIdx = Math.max(0, index - 1); parentList.splice(index, 1); save(items); nextFocusPath = parentList.length ? (parentPath ? parentPath + '.' + focusIdx : String(focusIdx)) : parentPath; render(); }
  function indentItem(path) { const items = load(); const { parentList, index } = getParentAndIndex(items, path); if (!parentList || index <= 0) return; const prev = parentList[index - 1]; prev.children = prev.children || []; const moved = parentList.splice(index, 1)[0]; prev.children.push(moved); save(items); nextFocusPath = path.replace(/\.\d+$/, '') + '.' + (index - 1) + '.' + (prev.children.length - 1); render(); }
  function outdentItem(path) { const items = load(); const { parentList, index, parentPath } = getParentAndIndex(items, path); if (parentPath === '') return; const gp = getParentAndIndex(items, parentPath); if (!gp.parentList) return; const moved = parentList.splice(index, 1)[0]; const parentIndex = parseInt(parentPath.split('.').pop() || '0', 10); gp.parentList.splice(parentIndex + 1, 0, moved); save(items); nextFocusPath = gp.parentPath ? gp.parentPath + '.' + (parentIndex + 1) : String(parentIndex + 1); render(); }

  function bindEvents() {
    LIST.querySelectorAll('input.todo-check').forEach(cb => cb.addEventListener('change', () => { const items = load(); const p = cb.getAttribute('data-path') || ''; const node = getByPath(items, p); if (node) { node.done = cb.checked; save(items); render(); } }));
    LIST.querySelectorAll('button.todo-more').forEach(b => b.addEventListener('click', () => {
      const p = b.getAttribute('data-path') || ''; // simple delete for now
      if (confirm('Delete this task?')) deleteItem(p);
    }));
    LIST.querySelectorAll('button.todo-disclose').forEach(d => d.addEventListener('click', () => { const items = load(); const p = d.getAttribute('data-path') || ''; const node = getByPath(items, p); if (node) { node.collapsed = !node.collapsed; save(items); render(); } }));
    LIST.querySelectorAll('.todo-text[contenteditable]')
      .forEach(ed => {
        ed.addEventListener('input', () => { const items = load(); const p = ed.getAttribute('data-path') || ''; const node = getByPath(items, p); if (node) { node.text = ed.textContent || ''; save(items); } });
        ed.addEventListener('keydown', (e) => {
          const p = ed.getAttribute('data-path') || ''; const text = ed.textContent || '';
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); newSiblingAfter(p); return; }
          if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); indentItem(p); return; }
          if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); outdentItem(p); return; }
          if (e.key === 'Backspace' && text.trim() === '') {
            e.preventDefault(); deleteItem(p); return;
          }
        });
      });
    // Drag & drop
    let dragId = '';
    LIST.querySelectorAll('.todo-grip').forEach(grip => {
      grip.addEventListener('dragstart', (e) => { dragId = grip.getAttribute('data-id') || ''; e.dataTransfer?.setData('text/plain', dragId); e.dataTransfer?.setDragImage(document.createElement('img'), 0, 0); });
    });
    // Handle drag over main items
    LIST.querySelectorAll('.todo-item').forEach(row => {
      row.addEventListener('dragover', (e) => {
        if (!dragId) return; e.preventDefault();
        const rect = row.getBoundingClientRect(); const y = e.clientY - rect.top; const zone = y / rect.height;
        row.classList.remove('drop-before', 'drop-after', 'drop-into');
        if (zone < 0.33) row.classList.add('drop-before'); else if (zone > 0.66) row.classList.add('drop-after'); else row.classList.add('drop-into');
      });
      row.addEventListener('dragleave', () => { row.classList.remove('drop-before', 'drop-after', 'drop-into'); });
      row.addEventListener('drop', (e) => {
        if (!dragId) return; e.preventDefault();
        const targetId = row.getAttribute('data-id') || '';
        if (!targetId || targetId === dragId) { dragId = ''; row.classList.remove('drop-before', 'drop-after', 'drop-into'); return; }
        const rect = row.getBoundingClientRect(); const y = e.clientY - rect.top; const zone = y / rect.height; let mode = 'into'; if (zone < 0.33) mode = 'before'; else if (zone > 0.66) mode = 'after';
        row.classList.remove('drop-before', 'drop-after', 'drop-into');
        moveNodeById(dragId, targetId, mode);
        dragId = '';
      });
    });
    // Chevron click to toggle collapse/expand
    LIST.querySelectorAll('.todo-chevron').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const p = btn.getAttribute('data-path') || '';
        const items = load();
        const node = getByPath(items, p);
        if (!node) return;
        node.collapsed = !node.collapsed;
        save(items);
        render();
      });
    });
  }

  TOGGLE?.addEventListener('click', () => { const next = !hideCompleted(); setHideCompleted(next); render(); });
  FORM.addEventListener('submit', (e) => { e.preventDefault(); const t = (INPUT.value || '').trim(); if (!t) return; const items = load(); items.unshift({ id: genId(), text: t, done: false, collapsed: false, children: [] }); save(items); INPUT.value = ''; render(); });

  render();
})();

// Add keyboard shortcuts guide at the bottom of left sidebar
// Shortcuts guide moved to assets/shortcuts-guide.js
/* window.addKeyboardShortcuts = function () {
  const sidebar = document.querySelector('.left .sidebar');
  if (sidebar && !document.getElementById('sidebarShortcuts')) {
    const shortcuts = document.createElement('details');
    shortcuts.id = 'sidebarShortcuts';
    shortcuts.className = 'sidebar-shortcuts';
    shortcuts.innerHTML = `
      <summary>⌨️ Keyboard Shortcuts</summary>
      <ul class="shortcuts-list">
        <li><span><kbd class="shortcut-key">Enter</kbd></span><span>New task below</span></li>
        <li><span><kbd class="shortcut-key">Tab</kbd></span><span>Nest as subtask</span></li>
        <li><span><kbd class="shortcut-key">Shift+Tab</kbd></span><span>Unnest subtask</span></li>
        <li><span><kbd class="shortcut-key">Backspace</kbd></span><span>Delete empty task</span></li>
        <li><span><kbd class="shortcut-key">Drag</kbd></span><span>Reorder/nest tasks</span></li>
        <li><span><kbd class="shortcut-key">⋯</kbd></span><span>Delete task</span></li>
        <li><span><kbd class="shortcut-key">▸/▾</kbd></span><span>Expand/collapse</span></li>
        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);"><strong>Global Shortcuts</strong></li>
        <li><span><kbd class="shortcut-key">Cmd/Ctrl+K</kbd></span><span>Focus search</span></li>
        <li><span><kbd class="shortcut-key">Cmd+S</kbd></span><span>Save & exit edit</span></li>
        <li><span><kbd class="shortcut-key">Esc</kbd></span><span>Cancel edit mode</span></li>
        <li><span><kbd class="shortcut-key">Option+B</kbd></span><span>Blur/unblur screen</span></li>
        <li><span><kbd class="shortcut-key">Option+C</kbd></span><span>Collapse nav (except current)</span></li>
        <li><span><kbd class="shortcut-key">Option+Q</kbd></span><span>Collapse all nav</span></li>
        <li><span><kbd class="shortcut-key">Option+D</kbd></span><span>Toggle bookmark</span></li>
        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);"><strong>Quick Navigation</strong></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">C</kbd></span><span>Go to Characters</span></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">N</kbd></span><span>Go to NPCs</span></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">L</kbd></span><span>Go to Locations</span></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">A</kbd></span><span>Go to Arcs</span></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">D</kbd></span><span>Go to Dashboard</span></li>
      </ul>
    `;
    sidebar.appendChild(shortcuts);
  }
}; */

// Theme toggle moved to assets/theme.js
/* (function () {
  const rightPane = document.querySelector('.right');
  if (!rightPane) return;
  let theme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', theme);
  const handle = rightPane.querySelector('.drawer-handle');
  const content = document.getElementById('drawerContent');
  function attach(el) {
    el.addEventListener('click', () => {
      theme = (localStorage.getItem('theme') || 'dark') === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', theme);
      document.body.setAttribute('data-theme', theme);
    });
  }
  // Prefer an existing button in the header if present
  const existing = document.getElementById('themeToggle');
  if (existing) { attach(existing); return; }
  if (handle && !existing) {
    const btn = document.createElement('button');
    btn.id = 'themeToggle'; btn.className = 'chip'; btn.title = 'Toggle Light/Dark'; btn.textContent = 'Theme';
    handle.appendChild(btn);
    attach(btn);
  } else if (content && !existing) {
    const wrap = document.createElement('div'); wrap.className = 'card';
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div>Theme</div><button id="themeToggle" class="chip">Toggle Light/Dark</button></div>';
    content.appendChild(wrap);
    const btn = document.getElementById('themeToggle');
    if (btn) attach(btn);
  }
})(); */

// Save Session (global): exports session notes + todos + pins as files
window.saveSessionSnapshot = async function () {
  const notes = localStorage.getItem('sessionNotes') || '';
  const todos = localStorage.getItem('graphTodos') || '[]';
  const pins = localStorage.getItem('pins') || '[]';
  const now = new Date(); const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const json = JSON.stringify({ when: now.toISOString(), notes, todos: JSON.parse(todos), pins: JSON.parse(pins) }, null, 2);
  const summary = `Session ${stamp}\n\nNotes preview:\n${notes.slice(0, 500)}\n\nTodos count: ${JSON.parse(todos).length}\nPins count: ${JSON.parse(pins).length}\n`;
  async function saveFile(name, contents, type) {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: name });
        const w = await handle.createWritable(); await w.write(contents); await w.close(); return true;
      } catch (e) { /* user cancelled */ }
    }
    const a = document.createElement('a'); a.download = name; a.href = URL.createObjectURL(new Blob([contents], { type })); a.click(); URL.revokeObjectURL(a.href);
    return true;
  }
  await saveFile(`session-snapshot-${stamp}.json`, json, 'application/json');
  await saveFile(`session-summary-${stamp}.txt`, summary, 'text/plain');
};

// Image Lightbox for avatars and headers
(function () {
  function extractUrl(val) {
    if (!val) return null; const m = String(val).match(/url\((['"]?)(.*?)\1\)/); return m ? m[2] : null;
  }
  function openLightbox(src) {
    if (!src) return;
    const preload = new Image();
    function show() {
      const backdrop = document.createElement('div'); backdrop.className = 'lightbox-backdrop';
      const wrap = document.createElement('div'); wrap.className = 'lightbox-img';
      const img = document.createElement('img'); img.alt = ''; img.src = src; wrap.appendChild(img);
      document.body.appendChild(backdrop);
      document.body.appendChild(wrap);
      document.body.classList.add('lightbox-open');
      function cleanup() { try { document.body.removeChild(wrap); } catch { } try { document.body.removeChild(backdrop); } catch { } document.body.classList.remove('lightbox-open'); document.removeEventListener('keydown', onEsc); }
      function onEsc(e) { if (e.key === 'Escape') cleanup(); }
      backdrop.addEventListener('click', cleanup);
      document.addEventListener('keydown', onEsc);
    }
    preload.onload = show;
    preload.onerror = show;
    preload.src = src;
  }
  // Avatar clicks (PC/NPC entity pages)
  document.querySelectorAll('.entity-avatar img').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.currentSrc || img.src));
  });
  // Entity header background
  document.querySelectorAll('.entity-header').forEach(h => {
    h.addEventListener('click', () => {
      const v = getComputedStyle(h).getPropertyValue('--header');
      const url = extractUrl(v);
      if (url) openLightbox(url.replace(/^"|"$/g, ''));
    });
  });
  // Generic page header background
  document.querySelectorAll('.page-header').forEach(h => {
    h.addEventListener('click', () => {
      const v = getComputedStyle(h).getPropertyValue('--page-header');
      const url = extractUrl(v) || extractUrl(getComputedStyle(h, '::before').backgroundImage);
      if (url) openLightbox(url.replace(/^"|"$/g, ''));
    });
  });
})();

// Create Page Modal
(function () {
  const modal = document.getElementById('createPageModal');
  const form = document.getElementById('createPageForm');
  const btnOpen = document.getElementById('btnCreatePage');
  const btnCancel = document.getElementById('btnCancelCreate');
  const statusDiv = document.getElementById('createPageStatus');

  if (!modal || !form || !btnOpen) return;

  function openModal() {
    modal.style.display = 'flex';
    document.getElementById('pageTitle').focus();
  }

  function closeModal() {
    modal.style.display = 'none';
    form.reset();
    statusDiv.style.display = 'none';
    statusDiv.className = '';
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
  }

  btnOpen.addEventListener('click', openModal);
  btnCancel.addEventListener('click', closeModal);

  // Close on overlay click
  modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeModal();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('pageType').value;
    const title = document.getElementById('pageTitle').value.trim();

    if (!title) {
      showStatus('Please enter a page title', 'error');
      return;
    }

    // Disable form
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    showStatus('Creating page...', 'loading');

    try {
      const response = await fetch('/api/create-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title })
      });

      const data = await response.json();

      if (response.ok) {
        showStatus('Page created! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = data.url;
        }, 1000);
      } else {
        showStatus(data.error || 'Failed to create page', 'error');
        submitBtn.disabled = false;
      }
    } catch (err) {
      showStatus('Network error: ' + err.message, 'error');
      submitBtn.disabled = false;
    }
  });
})();

// Delete Page Modal
(function () {
  const modal = document.getElementById('deletePageModal');
  const form = document.getElementById('deletePageForm');
  const btnOpen = document.getElementById('btnDeletePage');
  const btnCancel = document.getElementById('btnCancelDelete');
  const confirmInput = document.getElementById('deletePageConfirm');
  const titleDisplay = document.getElementById('deletePageTitle');
  const statusDiv = document.getElementById('deletePageStatus');

  if (!modal || !form || !btnOpen) return;

  // Extract page title from the h1 or document title
  function getPageTitle() {
    const h1 = document.querySelector('main.main h1');
    if (h1) return h1.textContent.trim();
    return document.title.split('|')[0].trim();
  }

  function openModal() {
    const title = getPageTitle();
    titleDisplay.textContent = title;
    confirmInput.dataset.expectedTitle = title;
    modal.style.display = 'flex';
    confirmInput.value = '';
    confirmInput.focus();
  }

  function closeModal() {
    modal.style.display = 'none';
    form.reset();
    statusDiv.style.display = 'none';
    statusDiv.className = '';
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
  }

  btnOpen.addEventListener('click', openModal);
  btnCancel.addEventListener('click', closeModal);

  // Close on overlay click
  modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeModal();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const expectedTitle = confirmInput.dataset.expectedTitle;
    const enteredTitle = confirmInput.value.trim();

    if (enteredTitle !== expectedTitle) {
      showStatus('Title does not match. Please type the exact title to confirm deletion.', 'error');
      return;
    }

    // Disable form
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    confirmInput.disabled = true;
    showStatus('Deleting page...', 'loading');

    try {
      const response = await fetch('/api/delete-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: window.location.pathname })
      });

      const data = await response.json();

      if (response.ok) {
        showStatus('Page deleted! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1500);
      } else {
        showStatus(data.error || 'Failed to delete page', 'error');
        submitBtn.disabled = false;
        confirmInput.disabled = false;
      }
    } catch (err) {
      showStatus('Network error: ' + err.message, 'error');
      submitBtn.disabled = false;
      confirmInput.disabled = false;
    }
  });
})();

// --- Make Entity Body Sections Collapsible ---
// Collapsible sections moved to assets/collapsible-sections.js
/* (function makeEntitySectionsCollapsible() {
  const entityBody = document.querySelector('.entity-body');
  const article = document.querySelector('article');
  const main = document.querySelector('main.main');
  const target = entityBody || article || main;
  if (!target) return;

  // For regular articles or main without entity-body, wrap H1 and H2 headings in sections first
  if (!entityBody && (article || main)) {
    const topLevelHeadings = Array.from((article || main).querySelectorAll('h1, h2'));
    topLevelHeadings.forEach((heading, index) => {
      // Skip if already in a section
      if (heading.closest('section[id]')) return;

      const section = document.createElement('section');
      section.id = 'section-' + (index + 1);

      // Insert section before heading
      heading.parentNode.insertBefore(section, heading);

      // Move heading and all following content until next h1/h2 into section
      const toMove = [heading];
      let el = heading.nextSibling;
      while (el && el.tagName !== 'H1' && el.tagName !== 'H2') {
        const next = el.nextSibling;
        toMove.push(el);
        el = next;
      }

      toMove.forEach(node => section.appendChild(node));
    });
  }

  // Make top-level sections (with IDs like #overview, #connections) collapsible
  const sections = target.querySelectorAll('section[id]');
  sections.forEach(section => {
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

  // Make h1-h4 headings within sections also collapsible (for nested headings)
  const levels = ['H1', 'H2', 'H3', 'H4'];
  const headings = [...target.querySelectorAll(levels.join(','))].filter(h => {
    // Skip headings that are already part of the section toggle (direct children)
    return !h.parentElement.classList.contains('entity') &&
      !h.parentElement.matches('section[id]');
  });
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
})(); */

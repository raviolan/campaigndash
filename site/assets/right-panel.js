// Right panel tools: tabs, pinning, notepad autosave, default home
(function () {
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

// Right panel tools: tabs, pinning, notepad autosave, default home
(function () {
    // Color theme definitions (each palette provides 6 values used as:
    // 1: --bg, 2: --panel, 3: --accent, 4: --text, 5: --muted, 6: --border)
    // Originals preserved in comments for reference.
    const COLOR_THEMES = {
        // auburn: ['#642F37', '#C0350F', '#F3904B', '#F7C767', '#B89DBB']
        auburn: ['#3E1F21', '#642F2F', '#D97729', '#F6E6B3', '#A68298', '#2B1415'],

        // desert: ['#ae5433', '#ecc481', '#aa462d', '#9e895f', '#d5c79f', '#4a4231']
        // nudge the muted tone toward a greener, more visible shade
        desert: ['#4a3728', '#aa6b45', '#ecc481', '#f4e9d0', '#A7B06A', '#3f372e'],

        // mother: ['#080d22', '#531f4f', '#6e234b', '#932549', '#fdf3eb']
        mother: ['#080d22', '#24102a', '#932549', '#fdf3eb', '#6e234b', '#0b0d14'],

        // orchid: ['#CB438B', '#BF3556', '#6C6A43', '#4D3449', '#FFF0D2']
        // make the muted/nature green brighter for better visibility against panels
        orchid: ['#2b1023', '#4D3449', '#CB438B', '#FFF0D2', '#9CB575', '#21121b'],

        // pearls: ['#414B9e', '#9792CB', '#AA74A0', '#E2C99E', '#8527736'] (fixed)
        pearls: ['#2b2f73', '#414B9E', '#7B6ED9', '#E6DCC4', '#9792CB', '#2a254f'],

        // light (kept original ordering)
        light: ['#ffffff', '#f6f7f8', '#0ea5ff', '#111827', '#6b7280', '#d1d5db'],

        // dark (kept original ordering)
        dark: ['#0b1220', '#0f1724', '#8b5cf6', '#e5e7eb', '#9aa3b2', '#0b0f16']
    };

    function applyColorTheme(theme) {
        const colors = COLOR_THEMES[theme];
        if (!colors) return;
        try { console.info('Applying theme:', theme); } catch (e) { }
        // Ensure we always set up to 6 theme variables (fill missing values by repeating last)
        const normalized = colors.slice();
        while (normalized.length < 6) normalized.push(normalized[normalized.length - 1] || '#000000');
        document.body.setAttribute('data-color-theme', theme);
        // Set CSS variables for theme colors
        for (let i = 0; i < 6; i++) {
            document.documentElement.style.setProperty(`--theme-color${i + 1}`, normalized[i]);
        }
        // If the selected theme is the semantic 'light' or 'dark', also toggle the legacy `data-theme`
        // attribute used by other parts of the CSS for light/dark overrides.
        if (theme === 'light' || theme === 'dark') {
            document.body.setAttribute('data-theme', theme);
        } else {
            // Remove any legacy data-theme so it doesn't interfere with custom palettes
            document.body.removeAttribute('data-theme');
        }
        localStorage.setItem('colorTheme', theme);
    }

    // Restore theme on load
    const savedTheme = localStorage.getItem('colorTheme');
    if (savedTheme && COLOR_THEMES[savedTheme]) {
        applyColorTheme(savedTheme);
    }

    // Listen for theme picker clicks
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.theme-swatch');
        if (btn) {
            const theme = btn.getAttribute('data-theme');
            applyColorTheme(theme);
        }
    });
    const tabs = document.querySelectorAll('.tool-tab');
    const views = {
        home: document.getElementById('toolHome'),
        todo: document.getElementById('toolTodo'),
        note: document.getElementById('toolNote'),
        colors: document.getElementById('toolColors')
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
        localStorage.setItem(KEY_TOOL, name);
        for (const b of tabs) {
            b.classList.toggle('active', b.getAttribute('data-tool') === name);
            if (window.svgIcon) {
                const t = b.getAttribute('data-tool');
                b.innerHTML = t === 'home' ? svgIcon('home') : t === 'todo' ? svgIcon('checklist') : t === 'note' ? svgIcon('note') : t === 'colors' ? svgIcon('palette') : '';
            }
        }
        // Show/hide panels
        if (views.colors) {
            views.colors.style.display = (name === 'colors') ? '' : 'none';
            // If the color tool panel contains only text, replace it with parsed HTML
            if (name === 'colors' && views.colors.textContent.trim().startsWith('<div')) {
                const temp = document.createElement('div');
                temp.innerHTML = views.colors.textContent;
                views.colors.innerHTML = '';
                while (temp.firstChild) views.colors.appendChild(temp.firstChild);
            }
        }
        if (views.note) views.note.style.display = (name === 'note') ? '' : 'none';
        if (views.todo) views.todo.style.display = (name === 'todo') ? '' : 'none';
        if (views.home) views.home.style.display = (name === 'home') ? '' : 'none';
        if (name === 'home') renderHome();
    }
    function renderPins() { document.querySelectorAll('.tool-pin').forEach(btn => { const id = btn.getAttribute('data-tool'); btn.classList.toggle('active', isPinned(id)); if (window.svgIcon) btn.innerHTML = svgIcon('pin', 14); }); }
    function renderHome() {
        const home = document.getElementById('toolHomePins'); if (!home) return; const pins = getPins(); const map = { todo: { icon: 'checklist', label: 'To-Do' }, note: { icon: 'note', label: 'Notepad' } };
        home.innerHTML = pins.length ? pins.map(id => `<button class="chip" data-open="${id}">${window.svgIcon ? svgIcon(map[id]?.icon || 'dot', 16) : ''} ${map[id]?.label || id}</button>`).join('') : '<div class="meta">No tools pinned. Open a tool and click its pin.</div>';
        home.querySelectorAll('button[data-open]').forEach(b => b.addEventListener('click', () => setActive(b.getAttribute('data-open') || 'home')));
    }
    // Initialize icons and clicks
    tabs.forEach(b => {
        const t = b.getAttribute('data-tool');
        if (window.svgIcon) {
            b.innerHTML = t === 'home' ? svgIcon('home') : t === 'todo' ? svgIcon('checklist') : t === 'note' ? svgIcon('note') : t === 'colors' ? svgIcon('palette') : '';
        }
        b.addEventListener('click', () => setActive(b.getAttribute('data-tool') || 'home'));
    });

    // Colors button logic
    const colorsBtn = document.getElementById('colorsToggle');
    if (colorsBtn) {
        colorsBtn.addEventListener('click', function () {
            setActive('colors');
        });
    }
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
        function activatePane(pane, tool) {
            const body = pane === 'top' ? topBody : bottomBody;
            if (!body) return;
            const el = views[tool];
            if (!el) return;
            body.innerHTML = '';
            body.appendChild(el);
            // Ensure the appended element is visible (in case setActive previously hid it)
            try { el.style.display = ''; } catch (e) { }
            document.querySelectorAll('.pane-tab[data-pane="' + pane + '"]').forEach(b => {
                const t = b.getAttribute('data-tool');
                b.classList.toggle('active', t === tool);
                if (window.svgIcon) { b.innerHTML = iconFor(t); }
            });
            localStorage.setItem(pane === 'top' ? KEY_TOP : KEY_BOTTOM, tool);
            if (tool === 'home') renderHome();
        }
        // Init pane tab icons and clicks
        document.querySelectorAll('.pane-tab').forEach(b => { const t = b.getAttribute('data-tool'); if (window.svgIcon) b.innerHTML = iconFor(t); b.addEventListener('click', () => activatePane(b.getAttribute('data-pane') || 'top', t)); });
        // Ensure header Colors button also activates the top pane tab when clicked
        if (colorsBtn) {
            colorsBtn.addEventListener('click', () => activatePane('top', 'colors'));
        }
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
            function initSplit() {
                const rect = container.getBoundingClientRect();
                const minPx = 120; const maxPx = Math.max(minPx, rect.height - 120);
                // Use a smaller default top pane height so the bottom To-Do has more room
                let val = '30%';
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
            }
            initSplit();
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

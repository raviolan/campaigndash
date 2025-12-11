// Theme toggle in right drawer handle (with fallback card)
(function () {
    const rightPane = document.querySelector('.right');
    if (!rightPane) return;
    // Respect any saved custom color theme; only apply legacy light/dark on load
    const savedColorTheme = localStorage.getItem('colorTheme');
    let theme = localStorage.getItem('theme') || 'dark';
    if (!savedColorTheme || savedColorTheme === 'light' || savedColorTheme === 'dark') {
        document.body.setAttribute('data-theme', theme);
    }
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
})();

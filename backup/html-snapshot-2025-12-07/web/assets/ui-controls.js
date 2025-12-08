/**
 * ui-controls.js - UI state management and control handlers
 * Manages theme switching, drawer collapse/expand, panel resizing, and drawer tabs
 */

window.UIControls = (() => {
    // Theme management
    const themeManager = (() => {
        let currentTheme = localStorage.getItem('theme') || 'dark';

        const init = () => {
            applyTheme(currentTheme);
            setupThemeToggle();
        };

        const applyTheme = (theme) => {
            currentTheme = theme;
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        };

        const toggle = () => {
            const next = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(next);
        };

        const get = () => currentTheme;

        const setupThemeToggle = () => {
            const rightPane = document.querySelector('.right');
            if (!rightPane) return;

            const handle = rightPane.querySelector('.drawer-handle');
            const content = document.getElementById('drawerContent');

            const attachToggle = (el) => {
                el.addEventListener('click', () => toggle());
            };

            // Prefer existing button
            const existing = document.getElementById('themeToggle');
            if (existing) {
                attachToggle(existing);
                return;
            }

            // Create in handle
            if (handle && !existing) {
                const btn = document.createElement('button');
                btn.id = 'themeToggle';
                btn.className = 'chip';
                btn.title = 'Toggle Light/Dark';
                btn.textContent = 'Theme';
                handle.appendChild(btn);
                attachToggle(btn);
            }
            // Fallback: create in content card
            else if (content && !existing) {
                const wrap = document.createElement('div');
                wrap.className = 'card';
                wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div>Theme</div><button id="themeToggle" class="chip">Toggle Light/Dark</button></div>';
                content.appendChild(wrap);
                const btn = document.getElementById('themeToggle');
                if (btn) attachToggle(btn);
            }
        };

        return { init, toggle, get, applyTheme };
    })();

    // Drawer collapse state
    const drawerManager = (() => {
        const getLeftCollapsed = () => localStorage.getItem('leftCollapsed') === 'true';
        const getRightCollapsed = () => localStorage.getItem('rightCollapsed') === 'true';

        const setLeftCollapsed = (v) => {
            localStorage.setItem('leftCollapsed', v);
            document.body.classList.toggle('left-collapsed', v);
        };

        const setRightCollapsed = (v) => {
            localStorage.setItem('rightCollapsed', v);
            document.body.classList.toggle('right-collapsed', v);
        };

        const init = () => {
            document.body.classList.toggle('left-collapsed', getLeftCollapsed());
            document.body.classList.toggle('right-collapsed', getRightCollapsed());

            // Attach listeners to collapse buttons
            setupCollapseButtons();
        };

        const setupCollapseButtons = () => {
            document.querySelectorAll('[data-collapse-left]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const now = getLeftCollapsed();
                    setLeftCollapsed(!now);
                });
            });

            document.querySelectorAll('[data-collapse-right]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const now = getRightCollapsed();
                    setRightCollapsed(!now);
                });
            });
        };

        return {
            init,
            getLeft: getLeftCollapsed,
            getRight: getRightCollapsed,
            setLeft: setLeftCollapsed,
            setRight: setRightCollapsed,
        };
    })();

    // Panel resizing
    const resizeManager = (() => {
        const init = () => {
            const leftResizer = document.querySelector('.resizer-left');
            const rightResizer = document.querySelector('.resizer-right');

            if (leftResizer) setupResize(leftResizer, 'left-w');
            if (rightResizer) setupResize(rightResizer, 'right-w');
        };

        const setupResize = (resizer, varName) => {
            let isResizing = false;
            const startX = 0;
            const startW = 0;

            resizer.addEventListener('mousedown', (e) => {
                isResizing = true;
                const startX = e.clientX;
                const root = document.documentElement;
                const startW = parseInt(
                    getComputedStyle(root).getPropertyValue(`--${varName}`),
                    10
                );

                const handleMouseMove = (moveEvent) => {
                    if (!isResizing) return;
                    const delta = moveEvent.clientX - startX;
                    const newW = Math.max(200, Math.min(600, startW + delta));
                    root.style.setProperty(`--${varName}`, newW + 'px');
                    localStorage.setItem(varName, newW);
                };

                const handleMouseUp = () => {
                    isResizing = false;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
        };

        return { init };
    })();

    // Drawer tabs (session, graph, etc.)
    const tabsManager = (() => {
        const init = () => {
            document.querySelectorAll('.drawer-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.getAttribute('data-tab');
                    if (!tabName) return;

                    // Hide all drawers
                    document.querySelectorAll('[data-drawer]').forEach(d => {
                        d.style.display = 'none';
                    });

                    // Show selected
                    const drawer = document.querySelector(`[data-drawer="${tabName}"]`);
                    if (drawer) {
                        drawer.style.display = 'block';
                    }

                    // Update active state
                    document.querySelectorAll('.drawer-tab').forEach(t => {
                        t.classList.toggle('active', t === tab);
                    });

                    localStorage.setItem('activeTab', tabName);
                });
            });

            // Restore last active tab
            const lastTab = localStorage.getItem('activeTab');
            if (lastTab) {
                const tab = document.querySelector(`[data-tab="${lastTab}"]`);
                if (tab) tab.click();
            }
        };

        return { init };
    })();

    // Public initialization
    const init = () => {
        themeManager.init();
        drawerManager.init();
        resizeManager.init();
        tabsManager.init();
    };

    // Public API
    return {
        init,
        theme: themeManager,
        drawer: drawerManager,
        resize: resizeManager,
        tabs: tabsManager,
    };
})();

/**
 * features.js - Complex features: todo lists, image lightbox, session saving
 * Handles todo CRUD operations with drag/drop, image preview, and session snapshots
 */

window.FeaturesModule = (() => {
    // ============================================================================
    // TODO LIST FUNCTIONALITY
    // ============================================================================

    const todos = (() => {
        const LIST = byId('todoList');
        const INPUT = byId('todoInput');
        const FORM = byId('todoForm');
        const TOGGLE = byId('toggleCompleted');

        let nextFocusPath = '';
        let nextFocusId = '';

        if (!LIST || !INPUT || !FORM) {
            return { init: () => { } };
        }

        // Storage helpers
        const load = () => {
            try {
                const data = localStorage.getItem('graphTodos');
                return data ? JSON.parse(data) : [];
            } catch {
                return [];
            }
        };

        const save = (items) => {
            localStorage.setItem('graphTodos', JSON.stringify(items));
        };

        const hideCompleted = () => localStorage.getItem('hideCompleted') === 'true';
        const setHideCompleted = (v) => localStorage.setItem('hideCompleted', v);

        // Rendering
        const renderList = (items, path, topLevel, hide) => {
            const parts = [];
            const filtered = hide ? items.filter(it => !it.done) : items;

            filtered.forEach((it, i) => {
                const p = path === '' ? String(i) : path + '.' + i;
                const domId = 'todo_' + p.replace(/\./g, '_');
                const nid = it.id;
                const clsText = 'todo-text editable' + (it.done ? ' done' : '') + (topLevel ? ' top-level' : '');
                const hasChildren = (it.children || []).length > 0;
                const disclose = hasChildren
                    ? `<button class="todo-disclose" data-path="${p}" aria-label="Toggle">${it.collapsed ? '▸' : '▾'}</button>`
                    : '<span class="todo-disclose hidden"></span>';

                parts.push(
                    `<li class="todo-item${topLevel ? ' top-level' : ''}" role="listitem" data-path="${p}" data-id="${nid}">`
                    + `<span class="todo-grip" draggable="true" data-id="${nid}" aria-label="Drag"></span>`
                    + disclose
                    + `<input id="${domId}" class="todo-check" type="checkbox" data-path="${p}" ${it.done ? 'checked' : ''} aria-label="Mark task as done">`
                    + `<div class="${clsText}" contenteditable="true" data-path="${p}" data-id="${nid}" spellcheck="false">${escapeHtml(it.text)}</div>`
                    + `<div class="todo-actions"><button class="todo-more" data-path="${p}" title="More">⋯</button></div>`
                );

                if (hasChildren) {
                    parts.push(
                        `<ul class="todo-sublist" ${it.collapsed ? 'style="display:none"' : ''}>`
                        + renderList(it.children, p, false, hide)
                        + '</ul>'
                    );
                }

                parts.push('</li>');
            });

            return parts.join('');
        };

        const render = () => {
            const items = load();
            LIST.innerHTML = renderList(items, '', true, hideCompleted());
            bindEvents();

            // Restore focus
            if (nextFocusPath) {
                const ed = document.querySelector(`[data-path="${nextFocusPath}"]`);
                if (ed) {
                    ed.focus();
                    document.getSelection()?.selectAllChildren(ed);
                    document.getSelection()?.collapseToEnd();
                }
                nextFocusPath = '';
            }
        };

        // Traversal helpers
        const getByPath = (items, path) => {
            if (!path) return null;
            const idx = path.split('.').map(n => parseInt(n, 10));
            let cur = { items };
            for (let i = 0; i < idx.length; i++) {
                const k = idx[i];
                const arr = i === 0 ? cur.items : cur.children;
                if (!arr || k < 0 || k >= arr.length) return null;
                cur = arr[k];
            }
            return cur;
        };

        const getParentAndIndex = (items, path) => {
            const parts = path.split('.');
            const last = parseInt(parts.pop(), 10);
            const parentPath = parts.join('.');
            const parentList = parentPath === '' ? items : getByPath(items, parentPath)?.children;
            return { parentList, index: last, parentPath };
        };

        const findById = (items, id) => {
            let found = null, parent = null, index = -1;
            const walk = (arr, p) => {
                for (let i = 0; i < arr.length; i++) {
                    const n = arr[i];
                    if (n.id === id) {
                        found = n;
                        parent = p;
                        index = i;
                        return true;
                    }
                    if (n.children && walk(n.children, n)) return true;
                }
                return false;
            };
            walk(items, null);
            return { node: found, parent, index };
        };

        const containsId = (root, id) => {
            if (!root) return false;
            if (root.id === id) return true;
            return (root.children || []).some(c => containsId(c, id));
        };

        // Operations
        const moveNodeById = (id, targetId, mode) => {
            const items = load();
            const src = findById(items, id);
            const dst = findById(items, targetId);
            if (!src.node || !dst.node) return;
            if (mode === 'into' && containsId(src.node, targetId)) return;

            let fromArr = src.parent ? src.parent.children || [] : items;
            const moved = fromArr.splice(src.index, 1)[0];

            if (mode === 'into') {
                dst.node.children = dst.node.children || [];
                dst.node.children.push(moved);
            } else {
                const toArr = dst.parent ? dst.parent.children || [] : items;
                let di = dst.index + (mode === 'after' ? 1 : 0);
                if (toArr === fromArr && src.index < di) di -= 1;
                toArr.splice(di, 0, moved);
            }

            save(items);
            nextFocusId = id;
            render();
        };

        const newSiblingAfter = (path) => {
            const items = load();
            const { parentList, index } = getParentAndIndex(items, path);
            if (!parentList) return;
            const insertAt = index + 1;
            parentList.splice(insertAt, 0, { id: genId(), text: '', done: false, collapsed: false, children: [] });
            save(items);
            nextFocusPath = (path.split('.').slice(0, -1).concat(insertAt)).join('.');
            render();
        };

        const deleteItem = (path) => {
            const items = load();
            const { parentList, index, parentPath } = getParentAndIndex(items, path);
            if (!parentList) return;
            const focusIdx = Math.max(0, index - 1);
            parentList.splice(index, 1);
            save(items);
            nextFocusPath = parentList.length ? (parentPath ? parentPath + '.' + focusIdx : String(focusIdx)) : parentPath;
            render();
        };

        const indentItem = (path) => {
            const items = load();
            const { parentList, index } = getParentAndIndex(items, path);
            if (!parentList || index <= 0) return;
            const prev = parentList[index - 1];
            prev.children = prev.children || [];
            const moved = parentList.splice(index, 1)[0];
            prev.children.push(moved);
            save(items);
            nextFocusPath = path.replace(/\.\d+$/, '') + '.' + (index - 1) + '.' + (prev.children.length - 1);
            render();
        };

        const outdentItem = (path) => {
            const items = load();
            const { parentList, index, parentPath } = getParentAndIndex(items, path);
            if (parentPath === '') return;
            const gp = getParentAndIndex(items, parentPath);
            if (!gp.parentList) return;
            const moved = parentList.splice(index, 1)[0];
            const parentIndex = parseInt(parentPath.split('.').pop() || '0', 10);
            gp.parentList.splice(parentIndex + 1, 0, moved);
            save(items);
            nextFocusPath = gp.parentPath ? gp.parentPath + '.' + (parentIndex + 1) : String(parentIndex + 1);
            render();
        };

        // Event binding
        const bindEvents = () => {
            // Checkboxes
            LIST.querySelectorAll('input.todo-check').forEach(cb => {
                cb.addEventListener('change', () => {
                    const items = load();
                    const p = cb.getAttribute('data-path') || '';
                    const node = getByPath(items, p);
                    if (node) {
                        node.done = cb.checked;
                        save(items);
                        render();
                    }
                });
            });

            // Delete buttons
            LIST.querySelectorAll('button.todo-more').forEach(b => {
                b.addEventListener('click', () => {
                    const p = b.getAttribute('data-path') || '';
                    if (confirm('Delete this task?')) deleteItem(p);
                });
            });

            // Collapse buttons
            LIST.querySelectorAll('button.todo-disclose').forEach(d => {
                d.addEventListener('click', () => {
                    const items = load();
                    const p = d.getAttribute('data-path') || '';
                    const node = getByPath(items, p);
                    if (node) {
                        node.collapsed = !node.collapsed;
                        save(items);
                        render();
                    }
                });
            });

            // Text editing
            LIST.querySelectorAll('.todo-text[contenteditable]').forEach(ed => {
                ed.addEventListener('input', () => {
                    const items = load();
                    const p = ed.getAttribute('data-path') || '';
                    const node = getByPath(items, p);
                    if (node) {
                        node.text = ed.textContent || '';
                        save(items);
                    }
                });

                ed.addEventListener('keydown', (e) => {
                    const p = ed.getAttribute('data-path') || '';
                    const text = ed.textContent || '';

                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        newSiblingAfter(p);
                        return;
                    }
                    if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        indentItem(p);
                        return;
                    }
                    if (e.key === 'Tab' && e.shiftKey) {
                        e.preventDefault();
                        outdentItem(p);
                        return;
                    }
                    if (e.key === 'Backspace' && text.trim() === '') {
                        e.preventDefault();
                        deleteItem(p);
                        return;
                    }
                });
            });

            // Drag & drop
            let dragId = '';

            LIST.querySelectorAll('.todo-grip').forEach(grip => {
                grip.addEventListener('dragstart', (e) => {
                    dragId = grip.getAttribute('data-id') || '';
                    e.dataTransfer?.setData('text/plain', dragId);
                    e.dataTransfer?.setDragImage(document.createElement('img'), 0, 0);
                });
            });

            LIST.querySelectorAll('.todo-item').forEach(row => {
                row.addEventListener('dragover', (e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    const rect = row.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const zone = y / rect.height;

                    row.classList.remove('drop-before', 'drop-after', 'drop-into');
                    if (zone < 0.33) row.classList.add('drop-before');
                    else if (zone > 0.66) row.classList.add('drop-after');
                    else row.classList.add('drop-into');
                });

                row.addEventListener('dragleave', () => {
                    row.classList.remove('drop-before', 'drop-after', 'drop-into');
                });

                row.addEventListener('drop', (e) => {
                    if (!dragId) return;
                    e.preventDefault();

                    const targetId = row.getAttribute('data-id') || '';
                    if (!targetId || targetId === dragId) {
                        dragId = '';
                        row.classList.remove('drop-before', 'drop-after', 'drop-into');
                        return;
                    }

                    const rect = row.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const zone = y / rect.height;
                    let mode = 'into';
                    if (zone < 0.33) mode = 'before';
                    else if (zone > 0.66) mode = 'after';

                    row.classList.remove('drop-before', 'drop-after', 'drop-into');
                    moveNodeById(dragId, targetId, mode);
                    dragId = '';
                });
            });

            // Form submission
            if (FORM) {
                FORM.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const t = (INPUT.value || '').trim();
                    if (!t) return;
                    const items = load();
                    items.unshift({ id: genId(), text: t, done: false, collapsed: false, children: [] });
                    save(items);
                    INPUT.value = '';
                    render();
                });
            }

            // Toggle completed
            if (TOGGLE) {
                TOGGLE.addEventListener('click', () => {
                    const next = !hideCompleted();
                    setHideCompleted(next);
                    render();
                });
            }
        };

        const init = () => {
            render();
        };

        return { init, render };
    })();

    // ============================================================================
    // IMAGE LIGHTBOX
    // ============================================================================

    const lightbox = (() => {
        const extractUrl = (val) => {
            if (!val) return null;
            const m = String(val).match(/url\((['"]?)(.*?)\1\)/);
            return m ? m[2] : null;
        };

        const openLightbox = (src) => {
            if (!src) return;

            const preload = new Image();

            const show = () => {
                const backdrop = document.createElement('div');
                backdrop.className = 'lightbox-backdrop';

                const wrap = document.createElement('div');
                wrap.className = 'lightbox-img';

                const img = document.createElement('img');
                img.alt = '';
                img.src = src;
                wrap.appendChild(img);

                document.body.appendChild(backdrop);
                document.body.appendChild(wrap);
                document.body.classList.add('lightbox-open');

                const cleanup = () => {
                    try {
                        document.body.removeChild(wrap);
                    } catch { }
                    try {
                        document.body.removeChild(backdrop);
                    } catch { }
                    document.body.classList.remove('lightbox-open');
                    document.removeEventListener('keydown', onEsc);
                };

                const onEsc = (e) => {
                    if (e.key === 'Escape') cleanup();
                };

                backdrop.addEventListener('click', cleanup);
                document.addEventListener('keydown', onEsc);
            };

            preload.onload = show;
            preload.onerror = show;
            preload.src = src;
        };

        const init = () => {
            // Avatar clicks
            document.querySelectorAll('.entity-avatar img').forEach(img => {
                img.addEventListener('click', () => openLightbox(img.currentSrc || img.src));
            });

            // Entity header backgrounds
            document.querySelectorAll('.entity-header').forEach(h => {
                h.addEventListener('click', () => {
                    const v = getComputedStyle(h).getPropertyValue('--header');
                    const url = extractUrl(v);
                    if (url) openLightbox(url.replace(/^"|"$/g, ''));
                });
            });

            // Generic page headers
            document.querySelectorAll('.page-header').forEach(h => {
                h.addEventListener('click', () => {
                    const v = getComputedStyle(h).getPropertyValue('--page-header');
                    const url = extractUrl(v) || extractUrl(getComputedStyle(h, '::before').backgroundImage);
                    if (url) openLightbox(url.replace(/^"|"$/g, ''));
                });
            });
        };

        return { init };
    })();

    // ============================================================================
    // SESSION SNAPSHOT SAVE
    // ============================================================================

    const sessionSave = (() => {
        window.saveSessions = async () => {
            const notes = localStorage.getItem('sessionNotes') || '';
            const todos = localStorage.getItem('graphTodos') || '[]';
            const pins = localStorage.getItem('pins') || '[]';
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
            const json = JSON.stringify(
                {
                    when: now.toISOString(),
                    notes,
                    todos: JSON.parse(todos),
                    pins: JSON.parse(pins),
                },
                null,
                2
            );
            const summary = `Session ${stamp}\n\nNotes preview:\n${notes.slice(0, 500)}\n\nTodos count: ${JSON.parse(todos).length}\nPins count: ${JSON.parse(pins).length}\n`;

            const saveFile = async (name, contents, type) => {
                if (window.showSaveFilePicker) {
                    try {
                        const handle = await window.showSaveFilePicker({ suggestedName: name });
                        const w = await handle.createWritable();
                        await w.write(contents);
                        await w.close();
                        return true;
                    } catch (e) {
                        /* user cancelled */
                    }
                }
                const a = document.createElement('a');
                a.download = name;
                a.href = URL.createObjectURL(new Blob([contents], { type }));
                a.click();
                URL.revokeObjectURL(a.href);
                return true;
            };

            await saveFile(`session-snapshot-${stamp}.json`, json, 'application/json');
            await saveFile(`session-summary-${stamp}.txt`, summary, 'text/plain');
        };

        return {};
    })();

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    const init = () => {
        todos.init();
        lightbox.init();
    };

    return {
        init,
        todos,
        lightbox,
    };
})();

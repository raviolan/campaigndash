// Quick hotkeys for navigation and bookmarks
(function keyboardNav() {
    // g + key navigation
    let gated = false; let to = null;
    document.addEventListener('keydown', (e) => {
        if (e.target && (/input|textarea/i.test(e.target.tagName))) return;
        if (!gated && e.key.toLowerCase() === 'g') {
            gated = true; clearTimeout(to); to = setTimeout(() => { gated = false }, 1500); return;
        }
        if (gated) {
            const k = e.key.toLowerCase(); gated = false;
            const map = { c: 'Characters', n: 'NPCs', l: 'World', a: 'Arcs', d: 'Dashboard', t: 'Tools', w: 'World' };
            const target = map[k]; if (!target) return;
            if (k === 'd') { location.href = '/index.html'; return; }
            const label = [...document.querySelectorAll('.left .nav-group .nav-label span:last-child')].find(span => span.textContent === target);
            const det = label?.closest('.nav-details');
            if (det) {
                det.open = true; det.scrollIntoView({ block: 'start' });
                const first = det.parentElement.querySelector('.nav-list a.nav-item'); first?.focus();
            }
        }
    });

    // Option+D: Toggle bookmark for current page (reuse favorites module)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.code === 'KeyD') {
            e.preventDefault();
            const bookmarkBtn = document.querySelector('.bookmark-btn');
            if (bookmarkBtn) bookmarkBtn.click();
        }
    });
})();
/**
 * keyboard-nav.js - Enhanced keyboard navigation
 * Modular file - easy to update/extend
 * 
 * Features:
 * - Arrow navigation in search results
 * - Quick bookmark (Cmd/Ctrl-B)
 * - Toggle panels (Cmd/Ctrl-\)
 * - Close search (Escape)
 * - Navigate recent pages (Cmd/Ctrl-H)
 */

window.KeyboardNav = (() => {
    const searchBox = document.getElementById('searchBox');
    const searchResults = document.getElementById('searchResults');

    let selectedIndex = -1;

    /**
     * Initialize keyboard navigation
     */
    const init = () => {
        document.addEventListener('keydown', handleGlobalKeys);

        if (searchBox) {
            searchBox.addEventListener('keydown', handleSearchKeys);
            searchBox.addEventListener('input', resetSelection);
        }
    };

    /**
     * Reset search result selection
     */
    const resetSelection = () => {
        selectedIndex = -1;
        updateSelection();
    };

    /**
     * Update visual selection in search results
     */
    const updateSelection = () => {
        const items = searchResults?.querySelectorAll('.search-result') || [];
        items.forEach((item, i) => {
            if (i === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    };

    /**
     * Navigate to selected search result
     */
    const navigateToSelected = () => {
        const items = searchResults?.querySelectorAll('.search-result a') || [];
        if (selectedIndex >= 0 && selectedIndex < items.length) {
            items[selectedIndex].click();
        } else if (items.length > 0) {
            items[0].click(); // Default to first result
        }
    };

    /**
     * Handle keyboard shortcuts in search box
     */
    const handleSearchKeys = (e) => {
        const items = searchResults?.querySelectorAll('.search-result') || [];
        const visible = searchResults?.style.display !== 'none' && items.length > 0;

        if (!visible) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection();
                break;

            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection();
                break;

            case 'Enter':
                // Only navigate if a result is selected, otherwise let search page navigation happen
                if (selectedIndex >= 0) {
                    e.preventDefault();
                    navigateToSelected();
                }
                break;

            case 'Escape':
                e.preventDefault();
                searchResults.style.display = 'none';
                searchBox.blur();
                break;
        }
    };

    /**
     * Handle global keyboard shortcuts
     */
    const handleGlobalKeys = (e) => {
        // Don't trigger in input/textarea (except search box for some keys)
        const inInput = e.target && /input|textarea/i.test(e.target.tagName);
        const isSearchBox = e.target === searchBox;

        // Cmd/Ctrl-K: Focus search (already handled in site.js, but ensure blur works)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            searchBox?.focus();
            return;
        }

        // Cmd/Ctrl-B: Quick bookmark current page
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            if (window.addFavorite) {
                window.addFavorite();
                showToast('Bookmarked!');
            }
            return;
        }

        // Cmd/Ctrl-\: Toggle right panel
        if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
            e.preventDefault();
            document.body.classList.toggle('drawer-collapsed');
            return;
        }

        // Cmd/Ctrl-[: Toggle left panel
        if ((e.ctrlKey || e.metaKey) && e.key === '[') {
            e.preventDefault();
            document.body.classList.toggle('left-collapsed');
            return;
        }

        // Cmd/Ctrl-H: Show recent pages (opens dropdown)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            const recentBtn = document.getElementById('recentPagesBtn');
            if (recentBtn) {
                recentBtn.click();
            }
            return;
        }

        // Escape: Close search results or panels
        if (e.key === 'Escape' && !inInput) {
            if (searchResults?.style.display !== 'none') {
                searchResults.style.display = 'none';
            }
            return;
        }

        // Number keys 1-9: Quick jump to favorites
        if (!inInput && /^[1-9]$/.test(e.key) && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const favIndex = parseInt(e.key) - 1;
            const favItems = document.querySelectorAll('#navFav a.nav-item');
            if (favItems[favIndex]) {
                favItems[favIndex].click();
            }
            return;
        }
    };

    /**
     * Show temporary toast notification
     */
    const showToast = (message) => {
        let toast = document.getElementById('keyboardToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'keyboardToast';
            toast.className = 'keyboard-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.display = 'block';
        toast.style.opacity = '1';

        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 300);
        }, 2000);
    };

    /**
     * Get help text for keyboard shortcuts
     */
    const getShortcuts = () => {
        return {
            'Cmd/Ctrl-K': 'Focus search',
            'Arrow keys': 'Navigate search results',
            'Enter': 'Open selected result',
            'Escape': 'Close search',
            'Cmd/Ctrl-B': 'Bookmark page',
            'Cmd/Ctrl-\\': 'Toggle right panel',
            'Cmd/Ctrl-[': 'Toggle left panel',
            'Cmd/Ctrl-H': 'Show recent pages',
            'Cmd/Ctrl-1-9': 'Jump to favorite',
            'g + c/n/l/a/d': 'Jump to section'
        };
    };

    // Public API
    return {
        init,
        getShortcuts,
        showToast
    };
})();

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.KeyboardNav.init());
} else {
    window.KeyboardNav.init();
}

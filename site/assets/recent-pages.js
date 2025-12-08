/**
 * recent-pages.js - Recent pages history tracker
 * Tracks last visited pages for quick navigation
 */

window.RecentPages = (() => {
    const RECENT_KEY = 'recentPages';
    const MAX_RECENT = 10;

    /**
     * Add current page to recent history
     */
    const addPage = (id, title) => {
        if (!id || !title) return;

        let recent = loadRecent();

        // Remove if already exists (to move to top)
        recent = recent.filter(r => r.id !== id);

        // Add to top
        recent.unshift({
            id,
            title,
            when: Date.now()
        });

        // Keep only last N
        recent = recent.slice(0, MAX_RECENT);

        saveRecent(recent);

        // Notify listeners
        document.dispatchEvent(new CustomEvent('recent-pages-changed', { detail: recent }));
    };

    /**
     * Load recent pages from storage
     */
    const loadRecent = () => {
        try {
            return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        } catch {
            return [];
        }
    };

    /**
     * Save recent pages to storage
     */
    const saveRecent = (list) => {
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(list));
        } catch (e) {
            console.warn('Failed to save recent pages:', e);
        }
    };

    /**
     * Clear recent pages history
     */
    const clearRecent = () => {
        try {
            localStorage.removeItem(RECENT_KEY);
            document.dispatchEvent(new CustomEvent('recent-pages-changed', { detail: [] }));
        } catch (e) {
            console.warn('Failed to clear recent pages:', e);
        }
    };

    /**
     * Get URL for page ID
     */
    const urlFor = (id) => {
        return '/' + id.replace(/\\/g, '/').replace(/\.md$/i, '.html')
            .split('/').map(encodeURIComponent).join('/');
    };

    /**
     * Render recent pages dropdown
     */
    const renderDropdown = (container) => {
        const recent = loadRecent();

        if (recent.length === 0) {
            container.innerHTML = '<div class="meta" style="padding:8px">No recent pages</div>';
            return;
        }

        container.innerHTML = recent.map((r, i) => {
            const ago = timeAgo(r.when);
            return `
                <a href="${urlFor(r.id)}" class="recent-item">
                    <div class="recent-title">${r.title}</div>
                    <div class="meta recent-time">${ago}</div>
                </a>
            `;
        }).join('');
    };

    /**
     * Format time ago string
     */
    const timeAgo = (timestamp) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        return new Date(timestamp).toLocaleDateString();
    };

    /**
     * Initialize recent pages tracking
     */
    const init = () => {
        // Track current page
        const currentId = decodeURIComponent(location.pathname.replace(/^\//, ''))
            .replace(/\.html$/i, '.md');
        const currentTitle = document.querySelector('.entity-name')?.textContent ||
            document.querySelector('h1')?.textContent ||
            document.title ||
            currentId;

        // Don't track index/graph/session/tags pages
        if (!/^(index|graph|session|tags)/.test(currentId)) {
            addPage(currentId, currentTitle);
        }

        // Setup dropdown button in toolbar
        setupToolbarButton();
    };

    /**
     * Setup recent pages button in toolbar
     */
    const setupToolbarButton = () => {
        const topBar = document.querySelector('.top');
        if (!topBar || document.getElementById('recentPagesBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'recentPagesBtn';
        btn.className = 'chip';
        btn.innerHTML = window.svgIcon ? window.svgIcon('clock', 16) : '🕐';
        btn.title = 'Recent pages (Cmd/Ctrl-H)';
        btn.setAttribute('aria-label', 'Show recent pages');

        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.id = 'recentPagesDropdown';
        dropdown.className = 'recent-dropdown';
        dropdown.style.display = 'none';

        // Toggle dropdown
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === 'block';
            dropdown.style.display = isOpen ? 'none' : 'block';

            if (!isOpen) {
                renderDropdown(dropdown);
                // Position dropdown
                const rect = btn.getBoundingClientRect();
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Close on navigation
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('recent-item') || e.target.closest('.recent-item')) {
                dropdown.style.display = 'none';
            }
        });

        // Insert after bookmark button or search
        const bookmarkBtn = document.getElementById('bookmarkPage');
        const searchWrap = document.querySelector('.top .search');

        if (bookmarkBtn) {
            bookmarkBtn.after(btn);
        } else if (searchWrap?.nextSibling) {
            topBar.insertBefore(btn, searchWrap.nextSibling);
        } else {
            topBar.appendChild(btn);
        }

        document.body.appendChild(dropdown);
    };

    // Public API
    return {
        init,
        addPage,
        loadRecent,
        clearRecent,
        renderDropdown
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.RecentPages.init());
} else {
    window.RecentPages.init();
}

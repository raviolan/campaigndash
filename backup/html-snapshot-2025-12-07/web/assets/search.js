/**
 * search.js - Search functionality module
 * Handles note/entity search, index loading, hover cards, and results display
 */

window.SearchModule = (() => {
    let INDEX = [];
    let NOTES = [];
    const searchBox = byId('searchBox');
    const results = byId('searchResults');

    /**
     * Load search index from JSON file
     * Called once on page initialization
     */
    const loadIndex = async () => {
        try {
            const response = await fetch('/search-index.json?v=' + (window.SITE_VERSION || 'dev'));
            const data = await response.json();
            INDEX = data.notes || [];
            NOTES = data.items || [];
        } catch (e) {
            console.error('Failed to load search index:', e);
        }
    };

    /**
     * Perform search and display results
     * @param {string} q - Search query
     */
    const doSearch = (q) => {
        const hover = document.createElement('div');
        hover.className = 'hovercard';
        document.body.appendChild(hover);

        // Clear previous results
        results.innerHTML = '';

        if (!q.trim()) {
            hover.remove();
            return;
        }

        const needle = q.toLowerCase();
        const hits = [];

        // Search through index
        for (const note of INDEX) {
            if (!note.id || !note.title) continue;

            let score = 0;
            let match = null;

            // Title match (highest priority)
            if (note.title.toLowerCase().includes(needle)) {
                score = 1000;
                match = note.title;
            }
            // Tag match
            else if (note.tags?.some(t => t.toLowerCase().includes(needle))) {
                score = 500;
                match = note.tags.find(t => t.toLowerCase().includes(needle));
            }
            // Summary match
            else if (note.summary?.toLowerCase().includes(needle)) {
                score = 200;
                const idx = note.summary.toLowerCase().indexOf(needle);
                match = note.summary.substring(idx, idx + 60);
            }

            if (score > 0) {
                hits.push({ ...note, score, match });
            }
        }

        // Sort by score descending
        hits.sort((a, b) => b.score - a.score);

        // Limit results
        const limited = hits.slice(0, 10);

        // Render results
        limited.forEach(hit => {
            const item = document.createElement('div');
            item.className = 'search-result';
            item.innerHTML = `
        <div class="search-result-title">
          <a href="${urlFor(hit.id)}">${escapeHtml(hit.title)}</a>
        </div>
        <div class="search-result-meta">
          ${hit.tags ? hit.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') : ''}
        </div>
        ${hit.summary ? `<div class="search-result-summary">${escapeHtml(hit.summary.substring(0, 100))}</div>` : ''}
      `;

            // Preview on hover
            item.addEventListener('mouseenter', () => {
                const note = NOTES.find(n => n.id === hit.id);
                if (!note) return;

                const rect = item.getBoundingClientRect();
                hover.innerHTML = `
          <div class="hovercard-title">${escapeHtml(note.title)}</div>
          ${note.summary ? `<div class="hovercard-body">${escapeHtml(note.summary.substring(0, 200))}</div>` : ''}
          ${note.tags ? `<div class="hovercard-tags">${note.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        `;
                hover.style.display = 'block';
                hover.style.left = (rect.right + 10) + 'px';
                hover.style.top = (rect.top - 50) + 'px';
            });

            item.addEventListener('mouseleave', () => {
                hover.style.display = 'none';
            });

            results.appendChild(item);
        });

        hover.remove();
    };

    /**
     * Debounced search handler
     */
    const handleSearchInput = window.AppUtils.debounce((e) => {
        doSearch(e.target.value);
    }, 150);

    /**
     * Initialize search module
     * Called from site.js
     */
    const init = () => {
        if (!searchBox || !results) return;

        loadIndex();
        searchBox.addEventListener('input', handleSearchInput);
    };

    // Public API
    return {
        init,
        doSearch,
        loadIndex,
        getIndex: () => INDEX,
        getNotes: () => NOTES,
    };
})();

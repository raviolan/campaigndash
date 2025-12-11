// Landing Page Interactive Features

class LandingPage {
    constructor() {
        this.cards = [];
        this.allCards = [];
        this.init();
    }

    init() {
        if (!document.querySelector('.landing-page')) return;

        this.setupSearch();
        this.setupSort();
        this.setupFilters();
        this.setupCards();
        this.setupActions();
        this.updateStats();
    }

    setupSearch() {
        const searchInput = document.querySelector('.landing-search input');
        if (!searchInput) return;

        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.filterCards(e.target.value);
            }, 300);
        });
    }

    setupSort() {
        const sortSelect = document.querySelector('.landing-sort select');
        if (!sortSelect) return;

        sortSelect.addEventListener('change', (e) => {
            this.sortCards(e.target.value);
        });
    }

    setupFilters() {
        const filterPills = document.querySelectorAll('.filter-pill');
        filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                pill.classList.toggle('active');
                this.applyFilters();
            });
        });
    }

    setupCards() {
        this.cards = Array.from(document.querySelectorAll('.landing-card'));
        this.allCards = [...this.cards];

        this.cards.forEach(card => {
            // Click to navigate
            card.addEventListener('click', (e) => {
                if (e.target.closest('.landing-card-favorite')) return;
                const link = card.dataset.href;
                if (link) window.location.href = link;
            });

            // Favorite toggle
            const favoriteBtn = card.querySelector('.landing-card-favorite');
            if (favoriteBtn) {
                favoriteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFavorite(card);
                });
            }
        });
    }

    setupActions() {
        // Random button
        const randomBtn = document.querySelector('[data-action="random"]');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                const visibleCards = this.cards.filter(card =>
                    card.style.display !== 'none'
                );
                if (visibleCards.length > 0) {
                    const randomCard = visibleCards[Math.floor(Math.random() * visibleCards.length)];
                    const link = randomCard.dataset.href;
                    if (link) window.location.href = link;
                }
            });
        }

        // View mode toggles
        const viewBtns = document.querySelectorAll('[data-view]');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.setViewMode(view);
            });
        });
    }

    filterCards(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        this.cards.forEach(card => {
            const title = card.querySelector('.landing-card-title')?.textContent.toLowerCase() || '';
            const excerpt = card.querySelector('.landing-card-excerpt')?.textContent.toLowerCase() || '';
            const tags = Array.from(card.querySelectorAll('.landing-card-tag'))
                .map(tag => tag.textContent.toLowerCase()).join(' ');

            const matches = title.includes(term) || excerpt.includes(term) || tags.includes(term);
            card.style.display = matches ? '' : 'none';
        });

        this.updateEmptyState();
    }

    sortCards(sortBy) {
        const grid = document.querySelector('.landing-grid');
        if (!grid) return;

        const sortedCards = [...this.cards].sort((a, b) => {
            switch (sortBy) {
                case 'alpha':
                    const titleA = a.querySelector('.landing-card-title')?.textContent || '';
                    const titleB = b.querySelector('.landing-card-title')?.textContent || '';
                    return titleA.localeCompare(titleB);

                case 'alpha-desc':
                    const titleA2 = a.querySelector('.landing-card-title')?.textContent || '';
                    const titleB2 = b.querySelector('.landing-card-title')?.textContent || '';
                    return titleB2.localeCompare(titleA2);

                case 'recent':
                    // Could use data-modified attribute if available
                    return 0;

                default:
                    return 0;
            }
        });

        sortedCards.forEach(card => grid.appendChild(card));
        this.cards = sortedCards;
    }

    applyFilters() {
        const activeFilters = Array.from(document.querySelectorAll('.filter-pill.active'))
            .map(pill => pill.dataset.filter);

        if (activeFilters.length === 0) {
            this.cards.forEach(card => card.style.display = '');
            this.updateEmptyState();
            return;
        }

        this.cards.forEach(card => {
            const cardTags = Array.from(card.querySelectorAll('.landing-card-tag'))
                .map(tag => tag.textContent.toLowerCase().replace('#', '').trim());

            const matches = activeFilters.some(filter =>
                cardTags.includes(filter.toLowerCase())
            );

            card.style.display = matches ? '' : 'none';
        });

        this.updateEmptyState();
    }

    toggleFavorite(card) {
        const favoriteBtn = card.querySelector('.landing-card-favorite');
        const isActive = favoriteBtn.classList.toggle('active');

        // Update the character (could save to localStorage or server)
        const rel = card.dataset.rel;
        if (rel) {
            // This would integrate with your existing favorites system
            console.log('Toggle favorite for:', rel, isActive);
        }

        favoriteBtn.textContent = isActive ? '★' : '☆';
    }

    updateEmptyState() {
        const visibleCards = this.cards.filter(card => card.style.display !== 'none');
        const emptyState = document.querySelector('.landing-empty');
        const grid = document.querySelector('.landing-grid');

        if (visibleCards.length === 0) {
            if (!emptyState && grid) {
                const empty = document.createElement('div');
                empty.className = 'landing-empty';
                empty.innerHTML = `
                    <div class="landing-empty-icon">🔍</div>
                    <h3 class="landing-empty-title">No matches found</h3>
                    <p class="landing-empty-description">Try adjusting your search or filters</p>
                `;
                grid.parentNode.insertBefore(empty, grid.nextSibling);
            }
            if (grid) grid.style.display = 'none';
        } else {
            if (emptyState) emptyState.remove();
            if (grid) grid.style.display = 'grid';
        }
    }

    updateStats() {
        // Update any stat badges with current counts
        const totalCards = this.cards.length;
        const statValue = document.querySelector('.stat-badge-value');
        if (statValue) {
            statValue.textContent = totalCards;
        }
    }

    setViewMode(mode) {
        const grid = document.querySelector('.landing-grid');
        if (!grid) return;

        grid.dataset.view = mode;

        // Adjust grid for different view modes
        if (mode === 'list') {
            grid.style.gridTemplateColumns = '1fr';
        } else if (mode === 'compact') {
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        } else {
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new LandingPage());
} else {
    new LandingPage();
}

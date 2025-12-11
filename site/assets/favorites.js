// Favorites rendering and bookmark buttons
window.initializeFavorites = function () {
    const favList = document.getElementById('navFav');
    if (!favList) return;

    function loadFav() {
        try { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
        catch { return []; }
    }

    function saveFav(list) {
        localStorage.setItem('favorites', JSON.stringify(list));
    }

    function hrefFor(id) {
        return '/' + id.replace(/\\/g, '/')
            .replace(/\.md$/i, '.html')
            .split('/')
            .map(encodeURIComponent)
            .join('/');
    }

    function render() {
        const list = loadFav();
        favList.innerHTML = list.length
            ? list.map((f, i) =>
                `<div class="fav-item">
             <a class="fav-link" href="${hrefFor(f.id)}">${f.title || f.id}</a>
             <button class="fav-remove" data-remove="${i}" title="Remove">✕</button>
           </div>`
            ).join('')
            : '<div class="meta">No favorites</div>';

        favList.querySelectorAll('button[data-remove]').forEach(b =>
            b.addEventListener('click', () => {
                const i = parseInt(b.getAttribute('data-remove'), 10);
                const arr = loadFav();
                arr.splice(i, 1);
                saveFav(arr);
                render();
                document.dispatchEvent(new CustomEvent('favorites-changed'));
            })
        );
    }

    window.addFavorite = function () {
        const id = decodeURIComponent(location.pathname.replace(/^\//, ''))
            .replace(/\.html$/i, '.md');
        const list = loadFav();
        if (list.find(x => x.id === id)) return;

        let title = document.title || id;
        try {
            const meta = window.NOTES && window.NOTES.find(n => n.id === id);
            if (meta) title = meta.title;
        } catch { }

        list.unshift({ id, title });
        saveFav(list);
        render();
        document.dispatchEvent(new CustomEvent('favorites-changed'));
    };

    window.toggleFavorite = function (id, title) {
        const list = loadFav();
        const i = list.findIndex(x => x.id === id);
        if (i >= 0) {
            list.splice(i, 1);
        } else {
            list.unshift({ id, title: title || id });
        }
        saveFav(list);
        render();
        document.dispatchEvent(new CustomEvent('favorites-changed'));
    };

    document.addEventListener('favorites-changed', () => {
        try { render(); } catch { }
    });

    render();
};

(function initBookmarkButtons() {
    function updateBookmarkButton(btn, isFavorited) {
        if (isFavorited) {
            btn.innerHTML = '★';
            btn.classList.add('favorited');
            btn.title = 'Remove from favorites';
        } else {
            btn.innerHTML = '☆';
            btn.classList.remove('favorited');
            btn.title = 'Add to favorites';
        }
    }

    function setupBookmarkButton(btn) {
        const relPath = btn.getAttribute('data-rel');
        if (!relPath) return;

        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const isFavorited = favorites.some(f => f.id === relPath);
        updateBookmarkButton(btn, isFavorited);

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const title = document.title || relPath;
            window.toggleFavorite(relPath, title);

            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            const nowFavorited = favorites.some(f => f.id === relPath);
            updateBookmarkButton(btn, nowFavorited);
        });
    }

    document.querySelectorAll('.bookmark-btn').forEach(setupBookmarkButton);

    document.addEventListener('favorites-changed', () => {
        document.querySelectorAll('.bookmark-btn').forEach(btn => {
            const relPath = btn.getAttribute('data-rel');
            if (!relPath) return;
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            const isFavorited = favorites.some(f => f.id === relPath);
            updateBookmarkButton(btn, isFavorited);
        });
    });
})();

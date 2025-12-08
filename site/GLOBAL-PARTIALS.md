# Global Partials System

## ✅ FIXED: Single Source of Truth

All 64 HTML pages now use **shared partials** for global features. No more duplicated code!

## How It Works

### File Structure
```
site/
├── assets/partials/          ← EDIT THESE for global changes
│   ├── layout.html           ← Page structure, <head>, scripts
│   ├── header.html           ← Top toolbar, search bar
│   ├── sidebar.html          ← Left nav, favorites, sections  
│   ├── footer.html           ← Page footer
│   └── right-panel.html      ← Right drawer (tools, to-do)
│
├── 00_Campaign/              ← Individual page content
├── 01_Arcs/                  ← Individual page content
├── 03_PCs/                   ← Individual page content
└── ...                       ← Individual page content
```

### When to Rebuild

**Rebuild Required:** After editing any file in `assets/partials/`
```bash
npm run build
```

**No Rebuild:** When editing page-specific content (inside `<main>` tags)

## Example Workflows

### Change Sidebar Structure
1. Edit `assets/partials/sidebar.html`
2. Run `npm run build`
3. All 64 pages updated automatically ✅

### Add Toolbar Button
1. Edit `assets/partials/header.html`
2. Run `npm run build`
3. Button appears on every page ✅

### Update Page Content
1. Edit any `.html` file (e.g., `03_PCs/Nyx.html`)
2. No build needed - changes are immediate ✅

## What Was Fixed

**Before:**
- 64 HTML files had duplicated sidebar HTML
- Changing sidebar required editing 64 files manually
- No single source of truth

**After:**
- 1 sidebar file (`assets/partials/sidebar.html`)
- Edit once, rebuild, updates everywhere
- True separation of global vs page-specific content

## Build Script

The build script (`scripts/rebuild-from-partials.js`):
1. Reads all partials from `assets/partials/`
2. Extracts page-specific content from each HTML file
3. Rebuilds pages by wrapping content with partials
4. Preserves titles, extra scripts (graph.js, session.js)

## Cache Busting

Each build generates a new version timestamp:
```html
<link rel="stylesheet" href="/assets/style.css?v=1765195587290" />
```

This ensures browsers load fresh CSS/JS after changes.

## Status

✅ 64 pages successfully converted to use partials
❌ 1 page skipped (Lost-Items.html - different structure)

All global features now have a single source of truth!

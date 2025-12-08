# Campaign Site Workflow

## Your Setup

**Architecture:** HTML-first static site with global partials
- **Source files:** HTML pages in `/site` (page-specific content only)
- **Global features:** Sidebar, header, footer in `/assets/partials` (single source of truth)
- **Assets:** Images, CSS, JS in `/assets`
- **Build system:** Extracts content and wraps with global templates

## ⚠️ IMPORTANT: Global vs Page-Specific

### Global Features (Edit Once, Apply Everywhere)
Edit these files in `/assets/partials/`:
- **sidebar.html** - Left navigation (favorites, sections)
- **header.html** - Top toolbar and search
- **footer.html** - Page footer
- **layout.html** - Overall page structure

After editing global features, run:
```bash
npm run build
```

### Page-Specific Content (Edit Individual Pages)
Edit the `<main>` content section in individual HTML files:
- Page title
- Headers, paragraphs, lists
- Tables, images, specific content

No rebuild needed after editing page content - changes are immediate.

## Daily Workflow

### Editing Page Content

Edit HTML files directly in their respective folders:

```
site/
  ├── 00_Campaign/        # Campaign info
  ├── 01_Arcs/            # Story arcs
  ├── 02_World/           # Locations
  ├── 03_PCs/             # Player characters
  ├── 04_NPCs/            # Non-player characters
  └── 05_Tools & Tables/  # DM tools
```

**Note:** Only edit content inside `<main>` tags. Global features (sidebar, header) are in partials.

After editing, optionally run:
```bash
npm run patch
```

This ensures all pages have correct headers/avatars.

### Editing Global Features

To change sidebar, navigation, header, or footer for ALL pages:

1. Edit the appropriate file in `assets/partials/`:
   - `sidebar.html` - Left navigation, favorites, sections
   - `header.html` - Top toolbar, search bar
   - `footer.html` - Footer content
   - `layout.html` - Page structure, scripts

2. Rebuild all pages:
```bash
npm run build
```

3. Verify changes on any page - they'll be everywhere!

**Examples:**
- Change favorites list structure → edit `sidebar.html` → run `npm run build`
- Add new toolbar button → edit `header.html` → run `npm run build`
- Update footer text → edit `footer.html` → run `npm run build`

### Adding Header Images

**For any page:**
1. Create image file: `pagename-header.png` (or `.jpg`, `.webp`, `.svg`)
2. Save to `/assets/`
3. Run `npm run patch`

**For PC/NPC avatars:**
1. Create image file: `pagename-avatar.png`
2. Save to `/assets/`
3. Run `npm run patch`

**Naming convention:**
- Convert page name to lowercase
- Replace spaces/special chars with hyphens
- Example: "Old King's Road" → `oldkingsroad-header.png` or `old-kings-road-header.png`

### Preview Locally

```bash
npm run serve
```

Then open browser to `http://localhost:3000`

## Available Commands

```bash
npm run patch     # Inject headers/avatars into all pages
npm run headers   # Alias for patch
npm run serve     # Start local preview server
```

## File Organization

```
site/
  ├── *.html                    # Top-level pages (index, graph, session)
  ├── package.json              # Scripts configuration
  ├── WORKFLOW.md              # This file
  │
  ├── assets/                   # All images, CSS, JS
  │   ├── *-header.{png,jpg,webp,svg}    # Header images
  │   ├── *-avatar.{png,jpg,webp,svg}    # Avatar images (PC/NPC)
  │   ├── ph-header.svg         # Default header placeholder
  │   ├── ph-avatar.svg         # Default avatar placeholder
  │   ├── *.css                 # Stylesheets
  │   ├── *.js                  # JavaScript
  │   └── partials/             # HTML template partials
  │
  ├── 00_Campaign/              # Campaign content
  ├── 01_Arcs/                  # Story arcs
  ├── 02_World/                 # World/locations
  ├── 03_PCs/                   # Player characters
  ├── 04_NPCs/                  # NPCs
  ├── 05_Tools & Tables/        # DM tools
  ├── 99_Attachments/           # Embedded images
  ├── tags/                     # Tag index
  │
  └── scripts/
      ├── serve.js              # Local preview server
      ├── tools/
      │   └── patch-entity-images.js    # Header injection script
      └── archive/              # Old build scripts (reference only)
```

## Backup Strategy

**Manual backups:**
```bash
cd "/Users/vioarr/LOCAL/DnD/deep-dive/Campaign/Campaign part 2"
mkdir -p backup/html-snapshot-$(date +%Y-%m-%d)
rsync -av --exclude='node_modules' --exclude='.git' site/ backup/html-snapshot-$(date +%Y-%m-%d)/
```

**Git tracking:**
- All changes tracked in git
- Can revert anytime
- Commit regularly: `git add . && git commit -m "Update content"`

## Publishing

### To Web Server

Upload entire `/site` folder contents to your web host:

```bash
# Example with rsync to remote server
rsync -avz --delete site/ user@server:/var/www/campaign/

# Or via FTP/SFTP
# Upload all files from /site to web root
```

### GitHub Pages (if applicable)

```bash
git push origin main
# GitHub Actions or Pages will deploy automatically
```

## Troubleshooting

### Headers not showing?
1. Check image name matches page (lowercase, hyphenated)
2. Verify image is in `/assets/` (not subdirectory)
3. Run `npm run patch`
4. Hard refresh browser (Cmd+Shift+R)

### Patch script errors?
```bash
# Check script exists
ls scripts/tools/patch-entity-images.js

# Run directly
node scripts/tools/patch-entity-images.js
```

### Preview server not starting?
```bash
# Check port 3000 not in use
lsof -i :3000

# Kill existing process if needed
kill -9 $(lsof -t -i:3000)

# Start server
npm run serve
```

## Adding New Pages

1. **Create HTML file** in appropriate folder
2. **Copy structure** from similar existing page
3. **Edit content** as needed
4. **Add header image** (optional) to `/assets/`
5. **Run patch**: `npm run patch`
6. **Preview**: `npm run serve`

## Image Optimization Tips

- **Headers:** 1200x300px, WebP format recommended
- **Avatars:** 300x300px, PNG or WebP
- **Compress:** Use tools like ImageOptim or Squoosh
- **Keep under:** 200KB per image for fast loading

## Notes

- **No markdown:** This site uses HTML directly (no build step)
- **Patch is fast:** Runs in ~1 second for entire site
- **Safe to re-run:** Patch script won't duplicate headers
- **Git-friendly:** All changes tracked, easy to revert

## Quick Reference

| Task | Command |
|------|---------|
| Update headers | `npm run patch` |
| Preview site | `npm run serve` |
| Add page | Copy existing HTML, edit, patch |
| Add header | Drop in `/assets/`, run patch |
| Publish | Upload `/site` folder to host |

---

**Last updated:** December 7, 2025  
**Site architecture:** HTML-first, post-process header injection

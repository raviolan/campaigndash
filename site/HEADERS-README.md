# Campaign Site - Headers & Avatars Setup

## Current Architecture

Your site uses **build-time includes** - the correct, performant approach:

- **Static HTML generation**: Pages are pre-generated with layout/chrome baked in
- **Post-process patching**: Header images are injected after generation
- **No client-side overhead**: Zero JavaScript needed for navigation/layout
- **Fast loading**: Fully-rendered pages served instantly

## How It Works

### 1. Header Images

Place header images in `/assets/` with this naming convention:

```
assets/
  nyx-header.png          # Matches PC "Nyx"
  saltmarsh-header.webp   # Matches location "Saltmarsh"
  ph-header.svg           # Placeholder for pages without specific headers
```

**Naming rules:**
- Convert page name to lowercase
- Replace spaces/special chars with hyphens
- Remove hyphens for matching (e.g., "Old King's Road" → `oldkingsroad-header.png`)
- Support extensions: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`

### 2. Avatar Images (PC/NPC only)

Place avatar images alongside headers:

```
assets/
  nyx-avatar.png
  oceanus-avatar.png
  ph-avatar.svg          # Placeholder avatar
```

### 3. Page Types

**Entity Pages (PC/NPC):**
- Get both header AND avatar
- Located in `03_PCs/` and `04_NPCs/`
- Layout: `.entity-header` with `.entity-avatar`

**Regular Pages (all others):**
- Get header only
- Everything in `00_Campaign/`, `01_Arcs/`, `02_World/`, `05_Tools/`, etc.
- Layout: `.page-header` before `<h1>`

## Workflow

### After HTML Generation

Whenever your HTML files are regenerated (by Obsidian or other tool):

```bash
npm run patch
# or
npm run headers
```

This injects headers/avatars into all pages.

### Adding New Headers

1. Create image with appropriate name (e.g., `kedjou-avatar.png`)
2. Place in `/assets/` directory
3. Run `npm run patch`
4. Done! Pages will use the new image

### Placeholder Images

If no specific header/avatar exists, pages use:
- `ph-header.svg` - Default header for all pages
- `ph-avatar.svg` - Default avatar for PC/NPC

You can replace these with custom artwork.

## Why This Approach?

### ✅ Advantages

1. **Performance**: Zero runtime overhead, instant page loads
2. **Maintainability**: Change header once, rebuild → all pages updated
3. **Reliability**: Works without JavaScript, no FOUC
4. **SEO/Accessibility**: Fully-rendered HTML, crawlable content
5. **Simplicity**: Static files, easy to host anywhere

### ❌ What You're NOT Missing

Client-side shells would add:
- JavaScript dependency
- Slower initial render
- Layout shifts during load
- Complex state management

None of which your site needs.

## File Structure

```
site/
  assets/
    *-header.{png,jpg,webp,svg}  # Header images
    *-avatar.{png,jpg,webp,svg}  # Avatar images (PC/NPC)
    ph-header.svg                 # Default header
    ph-avatar.svg                 # Default avatar
    partials/
      layout.html                 # Main wrapper
      header.html                 # Top toolbar
      sidebar.html                # Navigation
      footer.html                 # Footer scripts
  scripts/
    build2_enhanced.js            # Build script (generates from .md if present)
    tools/
      patch-entity-images.js      # Post-process header injection
  03_PCs/
    *.html                        # Entity pages with headers + avatars
  04_NPCs/
    *.html                        # Entity pages with headers + avatars
  01_Arcs/
    *.html                        # Regular pages with headers only
  ...
```

## Troubleshooting

### Headers not appearing?

1. Check image name matches page (lowercase, no spaces)
2. Verify image is in `/assets/` (not `/assets/partials/`)
3. Run `npm run patch` after adding images
4. Check browser DevTools for 404s

### Wrong header showing?

The script tries multiple name variants:
1. Full slugified name: `old-kings-road`
2. Compact (no hyphens): `oldkingsroad`
3. Short version

Place the most specific name in the filename.

### Patch not running?

Check node version (requires ES modules support):
```bash
node --version  # Should be v14+ 
```

## Next Steps

Your setup is production-ready! To enhance:

1. **Add more header images** - Replace placeholders with custom art
2. **Integrate patch into build** - Add to your HTML generation pipeline
3. **Version control** - Track headers in git alongside HTML
4. **Optimize images** - Compress PNGs, use WebP for photography

## Summary

You're using the **recommended architecture** for static campaign sites:
- Build-time includes (not client-side shell)
- Post-process enhancement (header injection)
- Static HTML (fast, reliable, accessible)

Keep going! 🎲

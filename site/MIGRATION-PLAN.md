# Migration Plan: From Fragile to Stable

## Current Problem

✅ **What Works:**
- Site runs perfectly with all content intact
- Headers/avatars display correctly
- 76MB of working HTML + assets

❌ **What's Fragile:**
- Source Obsidian vault deleted
- Build scripts expect markdown that doesn't exist
- Can't regenerate if something breaks
- Unclear which scripts are actually needed

## Solution: HTML-First Architecture

### ✅ Step 1: Backup Complete (DONE)
- Full site backed up to `backup/html-snapshot-2025-12-07/`
- 229 files preserved
- Safe to make changes

### 🔄 Step 2: Simplify Package.json

**Remove:**
- `build` script (expects markdown)
- `watch` script (expects markdown)

**Keep:**
- `patch` script (what you actually use)
- `serve` script (local preview server)

**New file:**
```json
{
  "name": "campaign-site",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "patch": "node scripts/tools/patch-entity-images.js",
    "serve": "node scripts/serve.js",
    "headers": "node scripts/tools/patch-entity-images.js"
  }
}
```

### 📁 Step 3: Reorganize Scripts

**Keep (Essential):**
```
scripts/
  ├── serve.js                          # Local preview server
  └── tools/
      └── patch-entity-images.js        # Header injection (only script you need)
```

**Archive (Not needed but keep as reference):**
```
scripts/
  └── archive/                          # Move here
      ├── build2_enhanced.js
      ├── build2.js
      ├── build.js
      └── lib/
          ├── markdown-parser.js
          ├── file-processor.js
          └── io.js
```

### 📝 Step 4: Document Your Actual Workflow

Create `WORKFLOW.md`:

```markdown
# Campaign Site Workflow

## Your Setup
- **Source**: HTML files (no markdown source exists)
- **Editing**: Edit HTML files directly in `/site`
- **Headers**: Managed via patch script

## Daily Workflow

### Adding/Editing Content
1. Edit HTML files directly in their folders
2. Run `npm run patch` to ensure headers are correct
3. Preview with `npm run serve`

### Adding Header Images
1. Create image: `pagename-header.png` or `pagename-avatar.png`
2. Drop in `/assets/`
3. Run `npm run patch`

### Publishing
1. Upload entire `/site` folder to web server
2. Done!

## Backup Strategy
- Full site backed up monthly
- Git tracks all changes
- Backups in `/backup/html-snapshot-YYYY-MM-DD/`
```

### 🗂️ Step 5: Clean Web Folder

**Issue**: You have duplicate assets in `/web/assets/`

**Action**: 
- Remove `/web/` folder (duplicates `/assets/`)
- Keep only `/assets/` as single source

## Implementation Order

1. ✅ **Backup created** (already done - 76MB safe)
2. **Simplify package.json** (remove markdown dependencies)
3. **Archive unused build scripts** (move to `/scripts/archive/`)
4. **Remove duplicate `/web/` folder**
5. **Create WORKFLOW.md** (document actual process)
6. **Test everything** (patch, serve, headers)

## Safety Guarantees

- ✅ Full backup exists (`backup/html-snapshot-2025-12-07/`)
- ✅ Git tracks all changes (can revert anytime)
- ✅ No content deletion (only organization)
- ✅ Site functionality unchanged

## After Migration

**Your new structure:**
```
Campaign part 2/
  ├── backup/
  │   └── html-snapshot-2025-12-07/    # Full working backup
  │
  └── site/
      ├── *.html                        # Your actual pages
      ├── assets/                       # Images, CSS, JS
      ├── 00_Campaign/                  # Content folders
      ├── 01_Arcs/
      ├── 02_World/
      ├── 03_PCs/
      ├── 04_NPCs/
      ├── 05_Tools & Tables/
      │
      ├── package.json                  # Simplified (patch + serve only)
      ├── WORKFLOW.md                   # Your actual workflow
      │
      └── scripts/
          ├── serve.js                  # Preview server
          ├── tools/
          │   └── patch-entity-images.js # Header injection
          └── archive/                  # Old build scripts (reference only)
              └── [markdown build stuff]
```

## Benefits After Migration

✅ **Clarity**: Only keep what you actually use
✅ **Stability**: No dependency on missing markdown
✅ **Simplicity**: HTML is the source, not generated
✅ **Safety**: Full backup + git history
✅ **Maintainability**: Clear workflow documented

## Risk Assessment

**Risk Level: VERY LOW**
- No content changes
- No functionality changes
- Only file organization
- Full backup exists
- Git can revert everything

## Next Steps

Ready to proceed? I'll:
1. Simplify package.json
2. Archive unused scripts
3. Remove duplicate /web folder
4. Create WORKFLOW.md
5. Verify everything still works

Say "proceed" and I'll execute the migration safely.

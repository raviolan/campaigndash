# Refactoring Plan and Strategy

Goal: shorten oversized files (>400 lines) without changing the site’s look, styles, or behavior.

## Principles
- Preserve IDs, classes, data-attributes, and ARIA so JS/CSS continue to work.
- Keep visual parity by maintaining CSS variable usage and import/cascade order.
- Incremental rollout: convert shared blocks first, then migrate pages in small batches.
- Structural diffs only (no feature work mixed in). Small, reviewable PRs.

## Constraints / Non-Goals
- No user-facing redesign. No URL changes. No renaming of stable selectors used by scripts.
- Performance should stay same or improve; avoid adding heavy build deps.

## Target Structure (high-level)
```
assets/
  css/
    base/          # tokens, reset, type
    components/    # toolbar, drawer, sidebar, breadcrumb, chip, modal, etc.
    features/      # search, tags, session-specific styles
    style.css      # aggregator (keeps current import order)
  js/
    core/          # dom.js, events.js, storage.js, a11y.js, router.js
    features/      # search.js, keyboard-nav.js, drawer.js, modals.js, bookmarks.js, tags.js, recent-pages.js
    pages/         # index.js, session.js, tags.js, graph.js (page entrypoints)
    init.js        # boot logic that imports needed features
partials/
  layout/          # layout.html (wraps {{ content }}), top-toolbar.html, sidebar-shell.html, breadcrumb.html, footer.html
  modals/          # create.html, edit.html, delete.html, confirm.html, all.html
  nav/             # nav-shell.html, nav-sections.html, nav-favorites.html
data/
  nav.json         # groups/items (labels, hrefs, classes, open flags)
```
Notes:
- We will reuse and extend existing build scripts (e.g., `scripts/rebuild-from-partials.js`).
- If the codebase already has `assets/partials/`, we will place the new folders under that path to match conventions.

## Build Strategy
- Add a tiny include/template pass to `scripts/rebuild-from-partials.js`:
  - Render `layout/layout.html` with `{{ content }}` placeholder.
  - Include `partials/modals/all.html` in pages that need modals.
  - Render `partials/nav/nav-sections.html` from `data/nav.json` (preserving current classes, structure, and open states).
- Ensure output markup remains semantically identical for the shared blocks (so existing CSS/JS keep working).

## HTML Refactor Playbook
1. Extract shared blocks to partials:
   - Top toolbar (links and search container).
   - Modals: Create/Edit/Delete/Confirm (move full markup to `partials/modals/`).
   - Sidebar shell: drawer handle, `aside.sidebar`, `nav` frame.
   - Nav list: each `<details>` group becomes a data entry rendered from `data/nav.json`.
   - Breadcrumb container (+ delete button block).
2. Page files become content-focused:
   - Use `layout.html` wrapper with `{{ content }}` slot for `<main>` content.
   - Target 150–250 lines per page (mostly `<article>` and page-specific blocks).

## JS Refactor Playbook (ES Modules)
- Split monoliths (e.g., `site.js`) into feature modules in `assets/js/features/*` and small `core/*` utilities.
- Create per-page entrypoints in `assets/js/pages/*` that import only the needed features.
- Load with `<script type="module" src="/assets/js/pages/session.js"></script>`.
- Keep selectors and event names unchanged; prefer delegated listeners where possible.
- Lint rule `max-lines` (e.g., 300 for modules, 150 for page entrypoints).

## CSS Refactor Playbook
- Move rules into base/components/features while preserving selectors and variables.
- Maintain import order to avoid cascade changes.
- Add Stylelint and advise max file size via file-splitting (advisory, not breaking).

## Acceptance Criteria
- Visual parity on representative pages: header, sidebar, nav groups, modals, breadcrumbs.
- Behavioral parity: search, keyboard shortcuts, drawer pin/toggle, favorites, tags, recent pages, session tools, graph links.
- No broken links or console errors; all pages render as before.
- File sizes drop: pages < 250 lines where feasible; modules < 300 lines.

## Phased Rollout
- Phase 1: Inventory and target structure
  - List all files >400 lines (HTML/JS/CSS). Categorize by type. Identify repeated blocks.
- Phase 2: Layout + modals partialization
  - Extract header/toolbar, sidebar shell, breadcrumb, and all modals into `partials/*`. Keep IDs/classes.
- Phase 3: Data-driven navigation
  - Create `data/nav.json`; render `nav-sections.html`. Preserve group open states and URL structure.
- Phase 4: JS modularization (ESM)
  - Create `core/*`, `features/*`, and `pages/*`. Replace monolithic initializers with feature imports.
- Phase 5: Pilot migration (2 pages)
  - Refactor `index.html` and `00_Campaign/01_Session notes.html`. Verify parity with a checklist.
- Phase 6: Rollout remaining pages
  - Batch by folder (Campaign, Arcs, World, Tools). Keep PRs small and structural-only.
- Phase 7: Documentation and workflow
  - Update `WORKFLOW.md` and `IMPLEMENTATION-SUMMARY.md` (how to add a page/component/feature in the new layout).

## Regression Checklist (use for each phase/page)
- Search box and results overlay behaves identically.
- Keyboard shortcuts work (open search, navigate results, drawer toggles).
- Drawer: open/close, pin/unpin, collapse/expand all sections.
- Favorites/bookmarks toggle and persistence.
- Tags, recent pages, and session utilities.
- Graph page links and rendering.
- No console errors/warnings.

## Tooling & Quality Gates
- ESLint (ESM, `max-lines`, `import/order`), Prettier, Stylelint, html-validate.
- NPM scripts: `lint`, `format`, `build`, `serve`.
- Advisory size gates (CI warnings) for files >300 lines.

## Open Questions (to decide before Phase 3)
- Source of truth for navigation: static `data/nav.json` versus generating from content folders.
- Where to store partials: `partials/` vs `assets/partials/` (align with current build script expectations).

---

## Task List (living)
- [x] 1. Draft refactor plan & strategy
- [ ] 2. Inventory oversized files
- [ ] 3. Define target structure
- [ ] 4. Standardize layout partials
- [ ] 5. Componentize modals
- [ ] 6. Data-driven navigation
- [ ] 7. Per-page content shells
- [ ] 8. JS modularization (ESM)
- [ ] 9. CSS layering & splits
- [ ] 10. Build script updates
- [ ] 11. Linters & limits
- [ ] 12. Pilot migration (2 pages)
- [ ] 13. Regression checklist
- [ ] 14. Rollout remaining pages
- [ ] 15. Docs & workflow update
- [x] 16. Write refactor plan doc

## Next Options
- Run the inventory of >400-line files and propose exact extraction points.
- Start Phase 2 by extracting layout + modals partials and wiring the build includes.

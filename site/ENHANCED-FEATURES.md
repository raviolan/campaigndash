# Enhanced Features Documentation

## 🎹 Keyboard Navigation

Modular keyboard shortcuts for power users. Located in `/assets/keyboard-nav.js`.

### Shortcuts

| Key | Action |
|-----|--------|
| `Cmd/Ctrl-K` | Focus search |
| `Arrow Up/Down` | Navigate search results |
| `Enter` | Open selected search result |
| `Escape` | Close search / Clear selection |
| `Cmd/Ctrl-B` | Bookmark current page |
| `Cmd/Ctrl-\` | Toggle right panel |
| `Cmd/Ctrl-[` | Toggle left panel |
| `Cmd/Ctrl-H` | Show recent pages |
| `Cmd/Ctrl-1-9` | Jump to favorite (by position) |
| `g + c/n/l/a/d` | Jump to section (existing) |

### Customization

Edit `/assets/keyboard-nav.js` to:
- Add new shortcuts
- Change key bindings
- Customize behavior

Example - add Cmd/Ctrl-E to edit mode:
```javascript
// In handleGlobalKeys function
if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    // Your custom action
    window.location.href = '/edit';
    return;
}
```

---

## 🕐 Recent Pages History

Tracks last 10 visited pages. Located in `/assets/recent-pages.js`.

### Features

- Automatic tracking of visited pages
- Clock icon 🕐 in toolbar (after bookmark button)
- Keyboard shortcut: `Cmd/Ctrl-H`
- Shows time ago (e.g., "5m ago", "2h ago")
- Excludes special pages (index, graph, session, tags)

### Customization

Edit `/assets/recent-pages.js` to:

**Change number of tracked pages:**
```javascript
const MAX_RECENT = 20; // Default is 10
```

**Exclude more pages:**
```javascript
// In init() function
if (!/^(index|graph|session|tags|special-page)/.test(currentId)) {
    addPage(currentId, currentTitle);
}
```

**Clear history:**
```javascript
window.RecentPages.clearRecent();
```

---

## 🔍 Search Result Previews

Enhanced search with content previews. Modified in `/assets/site.js`.

### Features

- Shows first heading as preview (up to 100 chars)
- Visual selection for keyboard navigation
- Hover highlighting
- Smooth scrolling to selected result

### Customization

**Change preview source:**
```javascript
// In doSearch() function - line ~25
const preview = (it.headings||[])[0] || ''; // Use first heading
// Alternative: use tags instead
const preview = (it.tags||[]).join(', ');
```

**Change preview length:**
```javascript
preview.slice(0, 150) // Default is 100
```

**Add more metadata:**
```javascript
const previewHtml = preview ? 
    '<div class="search-preview">' + preview + '</div>' +
    '<div class="search-meta">Location: ' + it.id + '</div>'
    : '';
```

---

## 🎨 Styling

All enhanced features styled in `/assets/enhanced-features.css`.

### Customization

**Change selected result color:**
```css
.search-result.selected {
  background: rgba(139, 92, 246, 0.15); /* Purple tint */
  border-left: 3px solid var(--accent);
}
```

**Change toast position:**
```css
.keyboard-toast {
  bottom: 24px;  /* Change to top: 24px for top placement */
  right: 24px;   /* Change to left: 24px for left side */
}
```

**Adjust dropdown size:**
```css
.recent-dropdown {
  max-width: 400px;  /* Default is 320px */
  max-height: 500px; /* Default is 400px */
}
```

---

## 🔧 Installation Status

✅ **Installed:**
- keyboard-nav.js
- recent-pages.js  
- enhanced-features.css
- Updated layout.html partial

⚠️ **Existing HTML pages need update:**

Run this command to add scripts to all existing HTML files:

```bash
npm run update-html
```

Or manually add to each HTML file before `</body>`:
```html
<script src="/assets/keyboard-nav.js?v=1733609876757"></script>
<script src="/assets/recent-pages.js?v=1733609876757"></script>
```

And add to `<head>`:
```html
<link rel="stylesheet" href="/assets/enhanced-features.css?v=1733609876757" />
```

---

## ✅ Apple Reminders-Style To-Do List

Beautiful, hierarchical task management with clean design. Located in `/assets/site.js` and `/assets/enhanced-todo.css`.

### Features

- **Clear Hierarchy:** Parent tasks are bold section headers, subtasks nest underneath
- **Collapsible Chevrons:** ▸ expands to ▾, showing/hiding nested subtasks
- **Circular Checkboxes:** Clean, minimal design with no shading
- **Count Badges:** Shows number of subtasks on the right
- **Drag & Drop:** Reorder or nest tasks by dragging
- **Auto-save:** All changes persist in localStorage

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | New task below current |
| `Tab` | Nest current task as subtask |
| `Shift+Tab` | Unnest subtask to parent level |
| `Backspace` | Delete empty task |
| `▸/▾` | Click chevron to expand/collapse |
| `⋯` | Delete task button |

### Design Principles

1. **Typography:** Parent tasks use bold text, subtasks use regular weight
2. **Spacing:** Generous padding, minimal borders for clean feel
3. **Interaction:** Chevrons indicate and toggle nested lists
4. **Visual Hierarchy:** Indentation shows nesting depth

### Structure

```
Parent Task (bold, count badge)
  ▾ Subtask 1 (indented)
  ▾ Subtask 2
    ▸ Sub-subtask (nested deeper)
```

### Customization

Edit `/assets/enhanced-todo.css` to adjust:
- Colors: Change `rgba(139, 92, 246, ...)` accent colors
- Spacing: Adjust `.todo-sublist` padding-left
- Typography: Modify `.parent-text` font-weight/size
- Checkboxes: Customize `.todo-check` border/size

---

## 🐛 Troubleshooting

### Keyboard shortcuts not working?

1. Check browser console for errors
2. Ensure scripts loaded: check Network tab
3. Try hard refresh: `Cmd/Ctrl-Shift-R`

### Recent pages not showing?

1. Visit a few pages to populate history
2. Check localStorage: `localStorage.getItem('recentPages')`
3. Clear and retry: `window.RecentPages.clearRecent()`

### Search previews missing?

1. Check `search-index.json` has `headings` property
2. Rebuild search index if needed
3. Clear browser cache

---

## 📝 Future Enhancements

Easy additions you can make:

1. **Fuzzy search:** Replace exact match with fuzzy scoring
2. **Search in content:** Add full-text search beyond headings
3. **Recent pages shortcuts:** Add quick keys for recent 1-5
4. **Custom themes:** Different keyboard toast colors per action
5. **Search history:** Track and suggest previous searches

---

## 🎯 Quick Start

After installation:

1. **Try keyboard nav:** Press `Cmd-K`, type, use arrows
2. **Bookmark a page:** Press `Cmd-B`
3. **Check recent:** Click 🕐 or press `Cmd-H`
4. **Toggle panels:** Press `Cmd-\` or `Cmd-[`

Enjoy! 🎲

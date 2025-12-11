// Add keyboard shortcuts guide at the bottom of left sidebar
window.addKeyboardShortcuts = function () {
    const sidebar = document.querySelector('.left .sidebar');
    if (sidebar && !document.getElementById('sidebarShortcuts')) {
        const shortcuts = document.createElement('details');
        shortcuts.id = 'sidebarShortcuts';
        shortcuts.className = 'sidebar-shortcuts';
        shortcuts.innerHTML = `
      <summary>⌨️ Keyboard Shortcuts</summary>
      <ul class="shortcuts-list">
        <li><span><kbd class="shortcut-key">Enter</kbd></span><span>New task below</span></li>
        <li><span><kbd class="shortcut-key">Tab</kbd></span><span>Nest as subtask</span></li>
        <li><span><kbd class="shortcut-key">Shift+Tab</kbd></span><span>Unnest subtask</span></li>
        <li><span><kbd class="shortcut-key">Backspace</kbd></span><span>Delete empty task</span></li>
        <li><span><kbd class="shortcut-key">Drag</kbd></span><span>Reorder/nest tasks</span></li>
        <li><span><kbd class="shortcut-key">⋯</kbd></span><span>Delete task</span></li>
        <li><span><kbd class="shortcut-key">▸/▾</kbd></span><span>Expand/collapse</span></li>
        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);"><strong>Global Shortcuts</strong></li>
        <li><span><kbd class="shortcut-key">Cmd/Ctrl+K</kbd></span><span>Focus search</span></li>
        <li><span><kbd class="shortcut-key">Cmd+S</kbd></span><span>Save & exit edit</span></li>
        <li><span><kbd class="shortcut-key">Esc</kbd></span><span>Cancel edit mode</span></li>
        <li><span><kbd class="shortcut-key">Option+B</kbd></span><span>Blur/unblur screen</span></li>
        <li><span><kbd class="shortcut-key">Option+C</kbd></span><span>Collapse nav (except current)</span></li>
        <li><span><kbd class="shortcut-key">Option+Q</kbd></span><span>Collapse all nav</span></li>
        <li><span><kbd class="shortcut-key">Option+D</kbd></span><span>Toggle bookmark</span></li>
        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);"><strong>Quick Navigation</strong></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">C</kbd></span><span>Go to Characters</span></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">N</kbd></span><span>Go to NPCs</span></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">L</kbd></span><span>Go to Locations</span></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">A</kbd></span><span>Go to Arcs</span></li>
        <li><span><kbd class="shortcut-key">G</kbd> then <kbd class="shortcut-key">D</kbd></span><span>Go to Dashboard</span></li>
      </ul>
    `;
        sidebar.appendChild(shortcuts);
    }
};

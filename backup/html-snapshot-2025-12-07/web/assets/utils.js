/**
 * utils.js - Common utility functions used across modules
 * Provides DOM helpers, string escaping, SVG icon generation, and URL encoding
 */

// Expose utilities to global scope for use across modules
window.AppUtils = {
    /**
     * Get element by ID (shorthand helper)
     * @param {string} id - Element ID
     * @returns {HTMLElement|null}
     */
    byId: (id) => document.getElementById(id),

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML-safe string
     */
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Convert file path to URL
     * @param {string} id - File path/id
     * @returns {string} URL path
     */
    urlFor: (id) =>
        '/' + id
            .replace(/\\/g, '/')
            .replace(/\.md$/i, '.html')
            .split('/')
            .map(encodeURIComponent)
            .join('/'),

    /**
     * Generate SVG icon HTML
     * @param {string} name - Icon name (from icon enum)
     * @param {number} size - Icon size in pixels (default 16)
     * @returns {string} SVG HTML string
     */
    svgIcon: (name, size = 16) => {
        const icons = {
            search: `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" stroke-width="1.5"/>
      </svg>`,
            close: `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor">
        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="2"/>
        <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="2"/>
      </svg>`,
            link: `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1v14M1 8h14"/>
      </svg>`,
        };
        return icons[name] || '';
    },

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: (func, delay) => {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Request animation frame wrapper for smooth DOM updates
     * @param {Function} callback - Callback to execute
     */
    raf: (callback) => {
        requestAnimationFrame(callback);
    },

    /**
     * Deep clone object/array
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),

    /**
     * Generate unique ID for todos
     * @returns {string} Unique ID
     */
    genId: () => Math.random().toString(36).substr(2, 9),
};

// Shorthand exports for common functions
window.byId = window.AppUtils.byId;
window.escapeHtml = window.AppUtils.escapeHtml;
window.urlFor = window.AppUtils.urlFor;
window.svgIcon = window.AppUtils.svgIcon;
window.genId = window.AppUtils.genId;

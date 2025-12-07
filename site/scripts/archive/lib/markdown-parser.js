/**
 * markdown-parser.js
 * Markdown extraction and parsing utilities
 */

const getTitleFromMd = (md, fallback) =>
    (md.match(/^\s*#\s+(.+)$/m)?.[1]?.trim() || fallback.replace(/\.md$/i, ''));

const extractTags = (md) => {
    md = md.replace(/```[\s\S]*?```/g, '');
    const s = new Set();
    const re = /(^|\s)#([\p{L}\p{N}_-]+)/gu;
    let m;
    while ((m = re.exec(md))) s.add(m[2]);
    return [...s];
};

const extractHeadings = (md) => {
    const hs = [];
    const re = /^(#{1,6})\s+(.+)$/gm;
    let m;
    while ((m = re.exec(md))) hs.push(m[2].trim());
    return hs;
};

const extractContent = (md) => {
    // Remove code blocks, comments, and metadata
    let text = md
        .replace(/```[\s\S]*?```/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/^\s*---[\s\S]*?---\s*/m, '');
    // Get first substantial paragraph (at least 15 chars, not a heading/link)
    const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && !l.startsWith('|'));
    for (const line of lines) {
        if (line.length > 15 && !line.startsWith('!') && !line.startsWith('[')) {
            // Clean up wikilinks and other markup
            return line
                .substring(0, 120)
                .replace(/\[\[([^\]]+)\]\]/g, '$1')
                .replace(/\*\*(.+?)\*\*/g, '$1')
                .replace(/__(.+?)__/g, '$1');
        }
    }
    return '';
};

const parseWikiLinks = (md) => {
    const out = [];
    const wikilinkRE = /!?\[\[([^\]]+)\]\]/g;
    let m;
    while ((m = wikilinkRE.exec(md))) {
        const raw = m[1];
        const embed = m[0].startsWith('!');
        const parts = raw.split('|');
        out.push({
            target: parts[0].trim(),
            display: parts[1]?.trim(),
            embed
        });
    }
    return out;
};

export { getTitleFromMd, extractTags, extractHeadings, extractContent, parseWikiLinks };

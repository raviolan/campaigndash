/**
 * file-processor.js
 * File system utilities for build process
 */
import fs from 'fs';
import path from 'path';

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const writeFile = (p, c) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, c); };
const copyFile = (src, dest) => { ensureDir(path.dirname(dest)); fs.copyFileSync(src, dest); };
const readText = (p) => fs.readFileSync(p, 'utf8');

const copyDir = (src, dest) => {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(s, d); else copyFile(s, d);
    }
};

const listFilesRec = (baseDir, ignoreSet = new Set()) => {
    const res = [];
    const stack = [baseDir];
    while (stack.length) {
        const d = stack.pop();
        const ents = fs.readdirSync(d, { withFileTypes: true });
        for (const ent of ents) {
            if (ent.name.startsWith('.')) continue;
            const full = path.join(d, ent.name);
            const rel = path.relative(baseDir, full);
            if (rel.split(path.sep).some(seg => ignoreSet.has(seg))) continue;
            if (ent.isDirectory()) stack.push(full); else res.push(full);
        }
    }
    return res;
};

export { ensureDir, writeFile, copyFile, copyDir, listFilesRec, readText };

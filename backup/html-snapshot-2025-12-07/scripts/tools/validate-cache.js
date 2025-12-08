#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { sha1, saveCache } from '../lib/io.js';

const VAULT_ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(VAULT_ROOT, 'site');
const CACHE_PATH = path.join(OUT_DIR, '.buildcache.json');

// sha1 is imported from shared IO helpers

function loadRaw(p) {
    try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; }
}

function checkCache() {
    const raw = loadRaw(CACHE_PATH);
    if (!raw) { console.error('Cache file missing:', CACHE_PATH); return 2; }
    try {
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== 'object') { console.error('Cache is not an object'); return 2; }
        if (!obj.notes || !obj.assets) { console.error('Cache missing notes or assets keys'); return 2; }
        if (typeof obj.notes !== 'object' || typeof obj.assets !== 'object') { console.error('Cache notes/assets not objects'); return 2; }
        console.log('Cache looks structurally valid. notes=', Object.keys(obj.notes).length, 'assets=', Object.keys(obj.assets).length);
        return 0;
    } catch (e) {
        console.error('Failed to parse cache JSON:', e && e.message);
        return 2;
    }
}

function rebuildNotesCache() {
    const notes = {};
    const stack = [VAULT_ROOT];
    const IGNORE_DIRS = new Set(['.git', 'node_modules', 'site', '.obsidian']);
    while (stack.length) {
        const d = stack.pop();
        let ents;
        try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { continue; }
        for (const ent of ents) {
            if (ent.name.startsWith('.')) continue;
            const full = path.join(d, ent.name);
            const rel = path.relative(VAULT_ROOT, full).replace(/\\/g, '/');
            if (rel.split(path.sep).some(seg => IGNORE_DIRS.has(seg))) continue;
            if (ent.isDirectory()) stack.push(full); else {
                if (full.toLowerCase().endsWith('.md')) {
                    try {
                        const md = fs.readFileSync(full, 'utf8');
                        notes[rel] = sha1(Buffer.from(md, 'utf8'));
                    } catch (e) { /* ignore */ }
                }
            }
        }
    }
    return notes;
}

function writeCacheAtomically(obj) {
    try {
        saveCache(CACHE_PATH, obj, { dryRun: false, noCache: false });
        console.log('Wrote repaired cache to', CACHE_PATH);
        return 0;
    } catch (e) { console.error('Failed to write cache:', e && e.message); return 3; }
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log('validate-cache [--repair]');
    process.exit(0);
}

if (args.includes('--repair')) {
    console.log('Rebuilding notes cache from vault...');
    const notes = rebuildNotesCache();
    const obj = { notes, assets: {} };
    const rc = writeCacheAtomically(obj);
    process.exit(rc);
} else {
    const rc = checkCache();
    process.exit(rc);
}

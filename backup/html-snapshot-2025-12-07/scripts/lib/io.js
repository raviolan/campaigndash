import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
export const readText = (p) => fs.readFileSync(p, 'utf8');
export const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

export function writeFile(p, content, { dryRun = false } = {}) {
    ensureDir(path.dirname(p));
    if (dryRun) return;
    try {
        if (fs.existsSync(p)) {
            const old = fs.readFileSync(p, 'utf8');
            if (old === content) return; // unchanged
        }
        fs.writeFileSync(p, content);
    } catch (err) {
        console.error('[io] write error', p, err && err.message);
    }
}

export function copyFile(src, dest, assetKey = null, cache = null, newCache = null, { dryRun = false } = {}) {
    ensureDir(path.dirname(dest));
    if (dryRun) return;
    try {
        if (cache && newCache && assetKey) {
            const srcBuf = fs.readFileSync(src);
            const fingerprint = sha1(srcBuf);
            if (cache.assets && cache.assets[assetKey] === fingerprint) {
                // unchanged: record fingerprint in new cache and skip copying
                newCache.assets[assetKey] = fingerprint;
                return;
            }
            // update fingerprint in new cache and copy atomically
            newCache.assets[assetKey] = fingerprint;
        }
        const tmp = dest + '.tmp';
        try {
            fs.copyFileSync(src, tmp);
            fs.renameSync(tmp, dest);
        } catch (e) {
            // fallback to direct copy on failure
            fs.copyFileSync(src, dest);
        }
    } catch (err) {
        console.error('[io] copy error', src, '->', dest, err && err.message);
    }
}

export function copyDir(src, dest, cache = null, newCache = null, opts = {}) {
    ensureDir(dest);
    if (!fs.existsSync(src)) return;
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(s, d, cache, newCache, opts); else copyFile(s, d, path.relative(process.cwd(), s).replace(/\\/g, '/'), cache, newCache, opts);
    }
}

// --- Async helpers with simple concurrency pool ---
const runWithPool = async (tasks, concurrency = 4) => {
    const out = [];
    let i = 0;
    const runners = new Array(Math.max(1, concurrency)).fill(0).map(async () => {
        while (i < tasks.length) {
            const idx = i++;
            try { out[idx] = await tasks[idx](); } catch (e) { out[idx] = e; }
        }
    });
    await Promise.all(runners);
    return out;
};

export async function copyFileAsync(src, dest, assetKey = null, cache = null, newCache = null, { dryRun = false } = {}) {
    ensureDir(path.dirname(dest));
    if (dryRun) return;
    try {
        if (cache && newCache && assetKey) {
            const srcBuf = await fs.promises.readFile(src);
            const fingerprint = sha1(srcBuf);
            if (cache.assets && cache.assets[assetKey] === fingerprint) {
                newCache.assets[assetKey] = fingerprint; return;
            }
            newCache.assets[assetKey] = fingerprint;
        }
        const tmp = dest + '.tmp';
        try {
            await fs.promises.copyFile(src, tmp);
            await fs.promises.rename(tmp, dest);
        } catch (e) {
            await fs.promises.copyFile(src, dest);
        }
    } catch (err) {
        console.error('[io] copyAsync error', src, '->', dest, err && err.message);
    }
}

export async function copyDirAsync(src, dest, cache = null, newCache = null, { concurrency = 4, dryRun = false } = {}) {
    ensureDir(dest);
    try {
        const list = [];
        const walk = (d) => {
            for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
                if (ent.name.startsWith('.')) continue;
                const s = path.join(d, ent.name);
                const rel = path.relative(src, s);
                const dst = path.join(dest, rel);
                if (ent.isDirectory()) walk(s); else list.push({ s, d: dst, rel });
            }
        };
        if (!fs.existsSync(src)) return;
        walk(src);
        const tasks = list.map(item => async () => await copyFileAsync(item.s, item.d, path.relative(process.cwd(), item.s).replace(/\\/g, '/'), cache, newCache, { dryRun }));
        await runWithPool(tasks, concurrency);
    } catch (e) {
        console.error('[io] copyDirAsync error', e && e.message);
    }
}

export function loadCache(cachePath, { noCache = false } = {}) {
    try {
        if (noCache) return { notes: {}, assets: {} };
        const raw = fs.readFileSync(cachePath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return { notes: {}, assets: {} };
    }
}

export function saveCache(cachePath, c, { dryRun = false, noCache = false } = {}) {
    if (dryRun || noCache) return;
    try {
        ensureDir(path.dirname(cachePath));
        const tmp = cachePath + '.tmp';
        const bak = cachePath + '.bak';
        const data = JSON.stringify(c, null, 2);
        try {
            if (fs.existsSync(cachePath)) {
                try { fs.copyFileSync(cachePath, bak); } catch (e) { /* non-fatal */ }
            }
        } catch (e) { /* ignore */ }
        fs.writeFileSync(tmp, data);
        fs.renameSync(tmp, cachePath);
    } catch (e) {
        console.error('[io] failed to write cache', e && e.message);
    }
}

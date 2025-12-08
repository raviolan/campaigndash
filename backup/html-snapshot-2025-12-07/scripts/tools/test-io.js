#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';
import { sha1, saveCache, copyFileAsync } from '../lib/io.js';

async function run() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'io-test-'));
    console.log('[test-io] temp dir', tmp);

    // Test saveCache atomicity + .bak rotation
    const cachePath = path.join(tmp, 'cache.json');
    const c1 = { notes: { 'a.md': 'h1' }, assets: {} };
    saveCache(cachePath, c1, { dryRun: false, noCache: false });
    assert.ok(fs.existsSync(cachePath), 'cache file should exist after saveCache');
    const raw1 = fs.readFileSync(cachePath, 'utf8');
    const parsed1 = JSON.parse(raw1);
    assert.deepStrictEqual(parsed1, c1, 'written cache should match first object');

    // Write a second cache - should create .bak of previous
    const c2 = { notes: { 'b.md': 'h2' }, assets: { 'x': 'y' } };
    saveCache(cachePath, c2, { dryRun: false, noCache: false });
    assert.ok(fs.existsSync(cachePath + '.bak'), '.bak should exist after second save');
    const bakRaw = fs.readFileSync(cachePath + '.bak', 'utf8');
    const parsedBak = JSON.parse(bakRaw);
    assert.deepStrictEqual(parsedBak, c1, '.bak contents should match first cache');
    const parsed2 = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    assert.deepStrictEqual(parsed2, c2, 'current cache should match second object');

    console.log('[test-io] saveCache atomic + backup OK');

    // Test copyFileAsync atomic copy and skip when fingerprint matches
    const src = path.join(tmp, 'src.bin');
    const dest = path.join(tmp, 'dest.bin');
    const N = 1024 * 64; // 64KB
    const buf = Buffer.alloc(N, 0);
    for (let i = 0; i < N; i++) buf[i] = i % 256;
    fs.writeFileSync(src, buf);
    const fingerprint = sha1(buf);

    const newCache = { assets: {} };
    await copyFileAsync(src, dest, 'rel/path/src.bin', null, newCache, { dryRun: false });
    assert.ok(fs.existsSync(dest), 'dest should exist after copyFileAsync');
    const d1 = fs.readFileSync(dest);
    assert.strictEqual(sha1(d1), fingerprint, 'dest content should match src fingerprint');
    assert.strictEqual(newCache.assets['rel/path/src.bin'], fingerprint, 'newCache should record fingerprint');

    // Now simulate cache that already has same fingerprint -> copy should be skipped
    const cache = { assets: { 'rel/path/src.bin': fingerprint } };
    // modify dest to a marker
    fs.writeFileSync(dest, 'MARKER');
    const newCache2 = { assets: {} };
    await copyFileAsync(src, dest, 'rel/path/src.bin', cache, newCache2, { dryRun: false });
    const d2 = fs.readFileSync(dest, 'utf8');
    assert.strictEqual(d2, 'MARKER', 'dest should remain unchanged when fingerprint matches cache');
    assert.strictEqual(newCache2.assets['rel/path/src.bin'], fingerprint, 'newCache2 should record fingerprint even when skipped');

    console.log('[test-io] copyFileAsync atomic + skip OK');

    // cleanup
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { }
    console.log('[test-io] all tests passed');
}

run().catch((err) => { console.error(err && (err.stack || err)); process.exit(2); });

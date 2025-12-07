#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const SCRIPT = path.join(ROOT, 'site', 'scripts', 'build2_enhanced.js');
const CACHE = path.join(ROOT, 'site', '.buildcache.json');

function run(args) {
    const res = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
    return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

function parseStats(output) {
    const m = output.match(/Built\s+(\d+)\s+notes[\s\S]*?\(rendered:\s*(\d+)\s*,?\s*skipped:\s*(\d+)\s*,?\s*copied:\s*(\d+)\s*(?:,?\s*asset-skipped:\s*(\d+)\s*)?\)/i);
    if (!m) return null;
    return { total: parseInt(m[1], 10), rendered: parseInt(m[2], 10), skipped: parseInt(m[3], 10), copied: parseInt(m[4], 10), assetSkipped: parseInt(m[5] || '0', 10) };
}

function fail(msg) { console.error(msg); process.exit(2); }

// Step 0: remove cache
try { if (fs.existsSync(CACHE)) fs.unlinkSync(CACHE); } catch (e) { /* ignore */ }

console.log('1) Initial clean build (creates cache)');
const a = run([]);
console.log(a.stdout);
if (a.status !== 0) fail('Clean build failed (exit ' + a.status + ')');
const s1 = parseStats(a.stdout + '\n' + a.stderr);
if (!s1) fail('Could not parse stats from clean build');
if (s1.rendered !== s1.total) fail('Clean build did not render all notes: ' + JSON.stringify(s1));
console.log('Clean build OK:', s1);

console.log('\n2) Incremental build (with cache)');
const b = run([]);
console.log(b.stdout);
if (b.status !== 0) fail('Incremental build failed (exit ' + b.status + ')');
const s2 = parseStats(b.stdout + '\n' + b.stderr);
if (!s2) fail('Could not parse stats from incremental build');
if (!(s2.skipped > 0 || s2.rendered < s2.total)) {
    fail('Incremental build did not skip any notes (looks like cache was not used): ' + JSON.stringify(s2));
}
console.log('Incremental build OK:', s2);

console.log('\n3) Force build (should render all)');
const c = run(['--force']);
console.log(c.stdout);
if (c.status !== 0) fail('Force build failed (exit ' + c.status + ')');
const s3 = parseStats(c.stdout + '\n' + c.stderr);
if (!s3) fail('Could not parse stats from force build');
if (s3.rendered !== s3.total) fail('Force build did not render all notes: ' + JSON.stringify(s3));
console.log('Force build OK:', s3);

console.log('\nAll incremental build checks passed.');
process.exit(0);

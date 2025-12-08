#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const VAULT_ROOT = path.resolve(process.cwd());
const ROOT = VAULT_ROOT; // Site root is already the cwd
const port = process.env.PORT || 8080;

const mime = {
  '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml', '.webp':'image/webp'
};

function sendJson(res, code, obj){
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function parseBody(req){
  return new Promise((resolve)=>{
    let data='';
    req.on('data', (c)=>{ data += c; });
    req.on('end', ()=>{
      try { resolve(JSON.parse(data||'{}')); } catch { resolve({}); }
    });
  });
}

function isSafeRel(rel){
  if (typeof rel !== 'string') return false;
  const norm = rel.replace(/\\/g,'/');
  if (!norm.endsWith('.md')) return false;
  if (norm.includes('..')) return false;
  // Disallow hidden/system dirs
  if (/(^|\/)\.(git|obsidian)(\/|$)/.test(norm)) return false;
  return true;
}

const server = http.createServer(async (req,res)=>{
  const u = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(u.pathname);

  // Simple local edit API (single-user, local only)
  if (pathname === '/api/note' && req.method === 'GET'){
    const rel = u.searchParams.get('rel') || '';
    if (!isSafeRel(rel)) return sendJson(res, 400, { error: 'Invalid rel' });
    const abs = path.join(VAULT_ROOT, rel);
    fs.readFile(abs, 'utf8', (err, md)=>{
      if (err) return sendJson(res, 404, { error: 'Not found' });
      sendJson(res, 200, { rel, md });
    });
    return;
  }
  if (pathname === '/api/note' && req.method === 'POST'){
    const body = await parseBody(req);
    const { rel, md } = body || {};
    if (!isSafeRel(rel) || typeof md !== 'string') return sendJson(res, 400, { error: 'Invalid payload' });
    const abs = path.join(VAULT_ROOT, rel);
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, md, 'utf8');
      sendJson(res, 200, { ok: true });
    } catch (e) {
      sendJson(res, 500, { error: e.message||'Write failed' });
    }
    return;
  }
  if (pathname === '/api/build' && req.method === 'POST'){
    // Rebuild the site by invoking the builder script
    const child = spawn(process.execPath, ['scripts/build2.js'], { cwd: VAULT_ROOT, stdio: 'inherit' });
    child.on('error', (e)=> sendJson(res, 500, { error: e.message||'Spawn failed' }));
    child.on('exit', (code)=>{
      if (code === 0) sendJson(res, 200, { ok: true });
      else sendJson(res, 500, { error: 'Build failed', code });
    });
    return;
  }

  // Static files from ./site
  let p = path.join(ROOT, pathname);
  if (p.endsWith('/')) p = path.join(p, 'index.html');
  fs.stat(p, (err, st)=>{
    if (err || !st.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(p).toLowerCase();
    res.setHeader('Content-Type', mime[ext]||'application/octet-stream');
    fs.createReadStream(p).pipe(res);
  });
});

server.listen(port, ()=>{
  console.log(`[dm-site] Serving ./site at http://localhost:${port}`);
});

#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.cwd(), 'site');
const port = process.env.PORT || 8080;

const mime = {
  '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml', '.webp':'image/webp'
};

const server = http.createServer((req,res)=>{
  const u = new URL(req.url, `http://${req.headers.host}`);
  let p = path.join(ROOT, decodeURIComponent(u.pathname));
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


/* Provë lokale pa Vercel: node dev-server.js → http://localhost:8000
   Shërben skedarët statikë dhe /api/* nga dosja api/. Të dhënat ruhen te .data/db.json. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname, PORT = +process.env.PORT || 8000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const m = url.pathname.match(/^\/api\/([a-z]+)$/);
  if (m) {
    const f = path.join(ROOT, 'api', m[1] + '.js');
    if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('{}'); }
    return require(f)(req, res);
  }
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  if (!p) p = 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || /^(api|\.data|\.git)([/\\]|$)/.test(p)) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (e, d) => {
    if (e) { res.statusCode = 404; return res.end('404'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(d);
  });
}).listen(PORT, () => console.log('Mëso Arabisht → http://localhost:' + PORT));

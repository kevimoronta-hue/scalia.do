/* ==========================================================================
   Scalia · local server: the static site + the /api functions, as Vercel
   runs them. Reads .env.local (never printed). With BOOKING_MOCK=1 the
   booking API uses a local test calendar instead of Google.
     node scripts/dev-server.mjs              → http://localhost:4520
     BOOKING_MOCK=1 node scripts/dev-server.mjs
     PORT=3001 HOST=0.0.0.0 node scripts/dev-server.mjs   (phones on Wi-Fi)
   ========================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// .env.local → process.env (values stay in memory, never logged).
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])([\s\S]*)\1$/, '$2');
  }
} catch (e) { /* no .env.local: fine */ }

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const p = decodeURIComponent(url.pathname);

  // API: /api/name or /api/name/ → api/name.js
  const api = p.match(/^\/api\/([a-z0-9-]+)\/?$/);
  if (api) {
    const file = path.join(ROOT, 'api', api[1] + '.js');
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
    req.query = Object.fromEntries(url.searchParams);
    try { await require(file)(req, res); } catch (e) {
      console.error(e); if (!res.headersSent) { res.statusCode = 500; res.end('Error'); }
    }
    return;
  }

  // Static files. Never serve sources or secrets.
  if (/(^|\/)\.|^\/api\/|^\/server\/|^\/scripts\//.test(p)) { res.statusCode = 404; return res.end('Not found'); }
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  try {
    if (fs.statSync(file).isDirectory()) {
      if (!p.endsWith('/')) { res.statusCode = 308; res.setHeader('Location', p + '/' + url.search); return res.end(); }
      file = path.join(file, 'index.html');
    }
    const stat = fs.statSync(file);
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    res.setHeader('Content-Type', type);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    if (range) {
      const start = range[1] ? +range[1] : 0;
      const end = range[2] ? +range[2] : stat.size - 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
      res.setHeader('Content-Length', end - start + 1);
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
  }
});

const PORT = +process.env.PORT || 4520;
const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  const mock = process.env.BOOKING_MOCK === '1' ? ' · booking: local test calendar' : '';
  console.log('Scalia dev server on http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT + mock);
});

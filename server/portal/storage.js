/* ==========================================================================
   Scalia Portal · private file storage: Vercel Blob, private store.
   No file is ever public, and the browser never receives the store's
   read-write token:
   · upload: after the admin and project checks, the server signs ONE
     upload URL (exact pathname, declared type, declared size, 15 min); the
     admin's browser sends the file there directly (Vercel Functions cap
     request bodies at 4.5 MB, documents go up to 50 MB).
   · download: after the client / document checks, the server signs ONE
     read URL valid 60 seconds and redirects to it.
   PORTAL_MOCK=1: the same interface on a local folder, the signed URLs
   being one-time tokens served by /api/portal (mock-put / mock-get).
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { portalError } = require('./errors');

const MAX_BYTES = 50 * 1024 * 1024;
// Accepted documents: extension → MIME type. Anything executable, HTML or
// SVG (script-capable) is refused.
const TYPES = {
  pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet',
  txt: 'text/plain', csv: 'text/csv',
  zip: 'application/zip',
  mp4: 'video/mp4', mov: 'video/quicktime',
  ai: 'application/postscript', eps: 'application/postscript', psd: 'image/vnd.adobe.photoshop', fig: 'application/octet-stream'
};
// The type is decided by the server from the extension, never taken from
// the browser.
function typeOf(fileName) {
  const ext = String(fileName || '').toLowerCase().match(/\.([a-z0-9]{1,5})$/);
  return ext && TYPES[ext[1]] ? TYPES[ext[1]] : null;
}

/* --------------------------------------------------------- Vercel Blob */
function vercel() {
  const blob = require('@vercel/blob');
  const token = () => {
    const t = config.blobToken();
    if (!t) throw portalError('NOT_CONFIGURED');
    return t;
  };
  return {
    async uploadTarget(pathname, contentType, size) {
      const validUntil = Date.now() + 15 * 60e3;
      const scope = { pathname, validUntil, allowedContentTypes: [contentType], maximumSizeInBytes: size };
      const signed = await blob.issueSignedToken(Object.assign({ operations: ['put'], token: token() }, scope));
      const { presignedUrl } = await blob.presignUrl(signed, Object.assign({ operation: 'put', access: 'private', allowOverwrite: false, addRandomSuffix: false }, scope));
      // The headers @vercel/blob's own presigned upload sends (API v13).
      return {
        url: presignedUrl, method: 'PUT',
        headers: { 'x-api-version': '13', 'x-vercel-blob-access': 'private', 'x-content-type': contentType, 'x-vercel-blob-store-id': blob.parseStoreIdFromDelegationToken(signed.delegationToken) }
      };
    },
    async stat(pathname) {
      try { const h = await blob.head(pathname, { token: token() }); return { size: h.size, contentType: h.contentType }; } catch (e) {
        if (e instanceof blob.BlobNotFoundError) return null;
        throw e;
      }
    },
    async downloadUrl(pathname, seconds) {
      const validUntil = Date.now() + seconds * 1000;
      const signed = await blob.issueSignedToken({ pathname, operations: ['get'], validUntil, token: token() });
      return (await blob.presignUrl(signed, { operation: 'get', access: 'private', pathname, validUntil, useCache: false })).presignedUrl;
    },
    async remove(pathname) {
      try { await blob.del(pathname, { token: token() }); } catch (e) { if (!(e instanceof blob.BlobNotFoundError)) throw e; }
    },
    // Admin page CSP: the upload URL's origin (https://vercel.com/api/blob).
    uploadOrigin: 'https://vercel.com'
  };
}

/* ------------------------------------------------------- local (mock) */
function local() {
  const dir = path.join(config.mockDir(), 'blob');
  const grants = path.join(config.mockDir(), 'blob-grants.json');
  const file = p => path.join(dir, crypto.createHash('sha256').update(p).digest('hex'));
  const read = () => { try { return JSON.parse(fs.readFileSync(grants, 'utf8')); } catch (e) { return {}; } };
  const write = g => { fs.mkdirSync(path.dirname(grants), { recursive: true }); fs.writeFileSync(grants, JSON.stringify(g)); };
  function grant(kind, data, seconds) {
    const g = read(), t = crypto.randomBytes(24).toString('hex');
    g[t] = Object.assign({ kind, exp: Date.now() + seconds * 1000 }, data);
    write(g);
    return t;
  }
  function take(t, kind) {
    const g = read(), x = g[t];
    if (!x || x.kind !== kind || x.exp < Date.now()) return null;
    delete g[t]; write(g);                                       // one use, like a short-lived URL
    return x;
  }
  return {
    async uploadTarget(pathname, contentType, size) {
      return { url: '/api/portal/?a=mock-put&t=' + grant('put', { pathname, contentType, size }, 15 * 60), method: 'PUT', headers: { 'x-content-type': contentType } };
    },
    async stat(pathname) {
      const f = file(pathname);
      if (!fs.existsSync(f)) return null;
      return { size: fs.statSync(f).size, contentType: JSON.parse(fs.readFileSync(f + '.json', 'utf8')).contentType };
    },
    async downloadUrl(pathname, seconds) { return '/api/portal/?a=mock-get&t=' + grant('get', { pathname }, seconds); },
    async remove(pathname) { for (const f of [file(pathname), file(pathname) + '.json']) { try { fs.unlinkSync(f); } catch (e) { /* gone */ } } },
    uploadOrigin: null,
    // Stand-ins for the signed Blob URLs (api/portal.js, mock only).
    put(t, buf, declaredType) {
      const x = take(t, 'put');
      if (!x) return 'FORBIDDEN';
      if (buf.length > x.size || buf.length > MAX_BYTES) return 'FILE_TOO_LARGE';
      if (declaredType !== x.contentType) return 'INVALID';
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file(x.pathname), buf);
      fs.writeFileSync(file(x.pathname) + '.json', JSON.stringify({ contentType: x.contentType }));
      return null;
    },
    get(t) {
      const x = take(t, 'get');
      if (!x || !fs.existsSync(file(x.pathname))) return null;
      return { file: file(x.pathname), name: x.pathname.split('/').pop(), contentType: JSON.parse(fs.readFileSync(file(x.pathname) + '.json', 'utf8')).contentType };
    }
  };
}

let impl = null;
function store() { if (!impl) impl = config.mock() ? local() : vercel(); return impl; }

module.exports = { store, typeOf, MAX_BYTES, TYPES };

/* Scalia Portal · shared request handling for api/portal.js and
   api/portal-admin.js: method + origin checks, JSON in, errors out. */
'use strict';
const { send, readJson, originOk } = require('../http');

const KNOWN = { UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, NOT_CONFIGURED: 503, RATE_LIMITED: 429 };

function fail(res, e) {
  const code = e && e.code && /^[A-Z_]+$/.test(e.code) ? e.code : 'SERVER_ERROR';
  const status = KNOWN[code] || (e && e.status && e.status < 500 && code !== 'SERVER_ERROR' ? e.status : code === 'SERVER_ERROR' ? 500 : 400);
  if (status >= 500) console.error('[portal]', (e && (e.code || e.message)) || e);
  send(res, status, { error: code, field: (e && e.field) || undefined }, { 'Cache-Control': 'no-store' });
}

// action handlers: { name: { method: 'GET'|'POST', run: async (req, res, body) => data } }
function router(actions) {
  return async function (req, res) {
    const a = String((req.query && req.query.a) || '');
    const h = Object.prototype.hasOwnProperty.call(actions, a) ? actions[a] : null;
    if (!h) return send(res, 404, { error: 'NOT_FOUND' });
    if (req.method !== h.method && !(h.method === 'POST' && req.method === h.alt)) return send(res, 405, { error: 'METHOD_NOT_ALLOWED' }, { Allow: h.method });
    // Writes: same site only (cookies are SameSite=Lax as well).
    if (req.method !== 'GET' && !h.raw && !originOk(req)) return send(res, 403, { error: 'FORBIDDEN' });
    try {
      let body = {};
      if (req.method === 'POST' && !h.raw) {
        try { body = await readJson(req, 64 * 1024); } catch (e) { return send(res, 400, { error: 'INVALID' }); }
        if (!body || typeof body !== 'object') body = {};
      }
      const out = await h.run(req, res, body);
      if (out === undefined || res.headersSent || res.writableEnded) return;
      send(res, 200, out, { 'Cache-Control': 'no-store' });
    } catch (e) {
      if (!res.headersSent) fail(res, e);
    }
  };
}

module.exports = { router, fail };

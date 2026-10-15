/* ==========================================================================
   Scalia Portal · Supabase backend (Auth, Postgres REST, Storage) over
   fetch, without the npm client, like the rest of /server.
   Two keys, both server-only (never sent to the browser):
     SUPABASE_ANON_KEY          publishable key: every call made as a user,
                                with that user's own session. Row Level
                                Security (schema.sql) decides what they see.
     SUPABASE_SERVICE_ROLE_KEY  secret key: ONLY for the Auth admin calls
                                (create an invitation or a password link).
                                Never used to read or write portal data.
   Same interface as mock.js.
   ========================================================================== */
'use strict';

const BUCKET = 'portal';

function base() {
  const u = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(u)) throw Object.assign(new Error('portal_not_configured'), { code: 'NOT_CONFIGURED' });
  return u;
}
function configured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
// A user's call: publishable key + the user's access token (or none).
function userHeaders(token) {
  const h = { apikey: process.env.SUPABASE_ANON_KEY };
  if (token) h.Authorization = 'Bearer ' + token;
  return h;
}
// Admin Auth call. New "sb_secret_" keys go in apikey only; legacy
// service_role JWTs also as a bearer.
function serviceHeaders() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return /^sb_secret_/.test(k) ? { apikey: k } : { apikey: k, Authorization: 'Bearer ' + k };
}

async function call(method, path, headers, body, extra) {
  const r = await fetch(base() + path, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers, extra || {}),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!r.ok) {
    const code = (data && (data.error_code || data.code || data.error)) || ('http_' + r.status);
    const err = new Error('supabase_' + code);
    err.status = r.status;
    err.code = String(code);
    throw err;
  }
  return data;
}

/* ------------------------------------------------------------------- auth */
function session(d) {
  return { accessToken: d.access_token, refreshToken: d.refresh_token, expiresAt: Date.now() + (d.expires_in || 3600) * 1000, user: { id: d.user.id, email: d.user.email } };
}
const auth = {
  async signIn(email, password) {
    return session(await call('POST', '/auth/v1/token?grant_type=password', userHeaders(), { email, password }));
  },
  async refresh(refreshToken) {
    return session(await call('POST', '/auth/v1/token?grant_type=refresh_token', userHeaders(), { refresh_token: refreshToken }));
  },
  async getUser(accessToken) {
    const u = await call('GET', '/auth/v1/user', userHeaders(accessToken));
    return { id: u.id, email: u.email };
  },
  // Link from an invitation or a password email: { token_hash, type }.
  async verify(tokenHash, type) {
    return session(await call('POST', '/auth/v1/verify', userHeaders(), { type, token_hash: tokenHash }));
  },
  async setPassword(accessToken, password) {
    await call('PUT', '/auth/v1/user', userHeaders(accessToken), { password });
  },
  async signOut(accessToken) {
    try { await call('POST', '/auth/v1/logout', userHeaders(accessToken)); } catch (e) { /* already gone */ }
  },
  // type: 'invite' (creates the user) or 'recovery'. Supabase sends no email:
  // Scalia sends its own (server/portal/mail.js) with the hashed token.
  async generateLink(type, email, data) {
    const d = await call('POST', '/auth/v1/admin/generate_link', serviceHeaders(), { type, email, data: data || {} });
    const props = d.properties || d;
    return { userId: d.id || (d.user && d.user.id), tokenHash: props.hashed_token, type: props.verification_type || type };
  }
};

/* --------------------------------------------------------------- database
   filters: { col: value } (equals) or { col: { in: [...] } }. */
function qs(filters, opts) {
  const p = new URLSearchParams();
  p.set('select', (opts && opts.select) || '*');
  for (const k in filters || {}) {
    const v = filters[k];
    if (v && typeof v === 'object' && Array.isArray(v.in)) p.append(k, 'in.(' + v.in.map(x => '"' + String(x).replace(/"/g, '') + '"').join(',') + ')');
    else if (v === null) p.append(k, 'is.null');
    else p.append(k, 'eq.' + v);
  }
  if (opts && opts.order) p.set('order', opts.order.map(o => o.col + '.' + (o.desc ? 'desc' : 'asc')).join(','));
  if (opts && opts.limit) p.set('limit', String(opts.limit));
  return p.toString();
}
function db(token) {
  const h = userHeaders(token);
  return {
    select: (table, filters, opts) => call('GET', '/rest/v1/' + table + '?' + qs(filters, opts), h),
    insert: (table, rows) => call('POST', '/rest/v1/' + table, h, rows, { Prefer: 'return=representation' }),
    update: (table, filters, patch) => call('PATCH', '/rest/v1/' + table + '?' + qs(filters), h, patch, { Prefer: 'return=representation' }),
    remove: (table, filters) => call('DELETE', '/rest/v1/' + table + '?' + qs(filters), h, undefined, { Prefer: 'return=representation' })
  };
}

/* ---------------------------------------------------------------- storage
   Always with the user's session: the storage policies decide. */
function enc(path) { return path.split('/').map(encodeURIComponent).join('/'); }
function storage(token) {
  const h = userHeaders(token);
  return {
    // A one-time URL the admin's browser uploads the file to directly.
    async uploadUrl(path) {
      const d = await call('POST', '/storage/v1/object/upload/sign/' + BUCKET + '/' + enc(path), h);
      return { url: base() + '/storage/v1' + d.url, method: 'PUT' };
    },
    // Size and type of an uploaded file (null if it is not there).
    async stat(path) {
      const i = path.lastIndexOf('/');
      const list = await call('POST', '/storage/v1/object/list/' + BUCKET, h, { prefix: path.slice(0, i), search: path.slice(i + 1), limit: 5 });
      const f = (list || []).find(x => x.name === path.slice(i + 1));
      return f ? { size: (f.metadata && f.metadata.size) || 0, mime: (f.metadata && f.metadata.mimetype) || '' } : null;
    },
    // Short-lived download link.
    async signedUrl(path, seconds, fileName) {
      const d = await call('POST', '/storage/v1/object/sign/' + BUCKET + '/' + enc(path), h, { expiresIn: seconds });
      const u = base() + '/storage/v1' + d.signedURL;
      return fileName ? u + (u.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(fileName) : u;
    },
    async remove(path) {
      await call('DELETE', '/storage/v1/object/' + BUCKET, h, { prefixes: [path] });
    }
  };
}

// Where the admin's browser uploads to (Content-Security-Policy connect-src).
function uploadOrigin() { try { return base(); } catch (e) { return null; } }

module.exports = { name: 'supabase', configured, auth, db, storage, uploadOrigin };

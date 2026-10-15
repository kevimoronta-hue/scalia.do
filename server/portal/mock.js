/* ==========================================================================
   Scalia Portal · local test backend (same interface as supabase.js).
   Only with PORTAL_MOCK=1 on a local machine: refused on Vercel and when
   NODE_ENV is "production". Data, uploaded files and "sent" emails (.eml)
   live in the OS temp folder. Row Level Security is reproduced below
   (READ / admin-only writes), so client isolation can be tested locally
   exactly as the policies in schema.sql define it.
   ========================================================================== */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(os.tmpdir(), 'scalia-portal-mock');
const FILE = path.join(DIR, 'db.json');
const FILES = path.join(DIR, 'files');
const HOUR = 3600 * 1000;

function enabled() {
  if (process.env.PORTAL_MOCK !== '1') return false;
  return !(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === 'production');
}

const TABLES = ['profiles', 'organizations', 'organization_members', 'projects', 'project_stages', 'project_updates', 'payments', 'documents', 'project_actions'];
function empty() {
  const d = { users: [], sessions: {}, refresh: {}, otps: {}, uploads: {}, downloads: {} };
  TABLES.forEach(t => { d[t] = []; });
  return d;
}
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return empty(); } }
function save(d) { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 1)); }
const uuid = () => crypto.randomUUID();
const token = () => crypto.randomBytes(24).toString('hex');
const now = () => new Date().toISOString();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
function fail(code, status) { const e = new Error('supabase_' + code); e.code = code; e.status = status || 400; return e; }

/* ------------------------------------------------- column defaults (schema) */
const DEFAULTS = {
  profiles: () => ({ full_name: '', phone: '', whatsapp: '', title: '', role: 'client', locale: 'es', created_at: now(), updated_at: now() }),
  organizations: () => ({ id: uuid(), created_at: now(), updated_at: now() }),
  organization_members: () => ({ created_at: now() }),
  projects: () => ({ id: uuid(), type: '', status: 'active', preferred_locale: 'es', currency: 'EUR', total_amount: 0, start_date: null, estimated_delivery_date: null, domain: '', languages: [], contact_id: null, current_stage: 'brief', next_step: '', created_at: now(), updated_at: now(), updated_by: null }),
  project_stages: () => ({ id: uuid(), status: 'upcoming', progress: 0, note: '', updated_at: now(), updated_by: null }),
  project_updates: () => ({ id: uuid(), visible_to_client: true, created_at: now() }),
  payments: () => ({ id: uuid(), status: 'pending', paid_at: null, notes: '', created_at: now(), updated_at: now(), updated_by: null }),
  documents: () => ({ id: uuid(), category: 'other', mime_type: '', size_bytes: 0, visible_to_client: true, created_at: now(), updated_at: now() }),
  project_actions: () => ({ id: uuid(), description: '', kind: 'info', status: 'open', created_at: now(), resolved_at: null, resolved_by: null })
};

/* ------------------------------------------------- row level security (RLS) */
function actorOf(d, accessToken) {
  const s = accessToken && d.sessions[accessToken];
  if (!s || s.exp < Date.now()) return null;
  const p = d.profiles.find(x => x.id === s.userId);
  return { id: s.userId, admin: !!p && p.role === 'admin' };
}
function member(d, a, orgId) { return d.organization_members.some(m => m.organization_id === orgId && m.user_id === a.id); }
function canReadProject(d, a, projectId) {
  if (a.admin) return true;
  const p = d.projects.find(x => x.id === projectId);
  return !!p && member(d, a, p.organization_id);
}
function canRead(d, a, table, r) {
  if (!a) return false;
  if (a.admin) return true;
  switch (table) {
    case 'profiles': return r.id === a.id || r.role === 'admin';
    case 'organizations': return member(d, a, r.id);
    case 'organization_members': return r.user_id === a.id;
    case 'projects': return member(d, a, r.organization_id);
    case 'project_updates':
    case 'documents': return !!r.visible_to_client && canReadProject(d, a, r.project_id);
    default: return canReadProject(d, a, r.project_id);
  }
}

function match(r, filters) {
  for (const k in filters || {}) {
    const v = filters[k];
    if (v && typeof v === 'object' && Array.isArray(v.in)) { if (!v.in.map(String).includes(String(r[k]))) return false; }
    else if (v === null) { if (r[k] != null) return false; }
    else if (String(r[k]) !== String(v)) return false;
  }
  return true;
}
function sorted(rows, opts) {
  const out = rows.slice();
  if (opts && opts.order) {
    out.sort((x, y) => {
      for (const o of opts.order) {
        const a = x[o.col], b = y[o.col];
        if (a === b) continue;
        const c = a == null ? -1 : b == null ? 1 : a < b ? -1 : 1;
        return o.desc ? -c : c;
      }
      return 0;
    });
  }
  return opts && opts.limit ? out.slice(0, opts.limit) : out;
}
const copy = x => JSON.parse(JSON.stringify(x));

function db(accessToken) {
  return {
    async select(table, filters, opts) {
      const d = load();
      const a = actorOf(d, accessToken);
      return copy(sorted(d[table].filter(r => match(r, filters) && canRead(d, a, table, r)), opts));
    },
    async insert(table, rows) {
      const d = load();
      const a = actorOf(d, accessToken);
      if (!a || !a.admin) throw fail('42501', 403);              // RLS: admins only
      const list = (Array.isArray(rows) ? rows : [rows]).map(r => Object.assign(DEFAULTS[table](), r));
      if (table === 'organization_members' && list.some(r => d.organization_members.some(m => m.organization_id === r.organization_id && m.user_id === r.user_id))) throw fail('23505', 409);
      d[table].push(...list);
      save(d);
      return copy(list);
    },
    async update(table, filters, patch) {
      const d = load();
      const a = actorOf(d, accessToken);
      if (!a || !a.admin) return [];                             // RLS: no row matches
      const out = [];
      d[table].forEach(r => {
        if (!match(r, filters)) return;
        Object.assign(r, patch);
        if ('updated_at' in r) r.updated_at = now();
        if ('updated_by' in r) r.updated_by = a.id;
        out.push(r);
      });
      save(d);
      return copy(out);
    },
    async remove(table, filters) {
      const d = load();
      const a = actorOf(d, accessToken);
      if (!a || !a.admin) return [];
      const gone = d[table].filter(r => match(r, filters));
      d[table] = d[table].filter(r => !match(r, filters));
      save(d);
      return copy(gone);
    }
  };
}

/* ------------------------------------------------------------------- auth */
function hash(pw, salt) { return crypto.scryptSync(pw, salt, 32).toString('hex'); }
function newSession(d, user) {
  const at = token(), rt = token();
  d.sessions[at] = { userId: user.id, exp: Date.now() + HOUR };
  d.refresh[rt] = { userId: user.id };
  return { accessToken: at, refreshToken: rt, expiresAt: Date.now() + HOUR, user: { id: user.id, email: user.email } };
}
const auth = {
  async signIn(email, password) {
    const d = load();
    const u = d.users.find(x => x.email === String(email).toLowerCase());
    if (!u || !u.hash || hash(password, u.salt) !== u.hash) throw fail('invalid_credentials', 400);
    const s = newSession(d, u);
    save(d);
    return s;
  },
  async refresh(rt) {
    const d = load();
    const r = d.refresh[rt];
    if (!r) throw fail('refresh_token_not_found', 400);
    delete d.refresh[rt];                                        // rotation, as Supabase
    const s = newSession(d, d.users.find(x => x.id === r.userId));
    save(d);
    return s;
  },
  async getUser(at) {
    const d = load();
    const s = d.sessions[at];
    if (!s || s.exp < Date.now()) throw fail('bad_jwt', 401);
    const u = d.users.find(x => x.id === s.userId);
    return { id: u.id, email: u.email };
  },
  async verify(tokenHash, type) {
    const d = load();
    const o = d.otps[tokenHash];
    if (!o || o.type !== type || o.exp < Date.now()) throw fail('otp_expired', 403);
    delete d.otps[tokenHash];                                    // one use
    const u = d.users.find(x => x.id === o.userId);
    u.confirmed = true;
    const s = newSession(d, u);
    save(d);
    return s;
  },
  async setPassword(at, password) {
    const d = load();
    const s = d.sessions[at];
    if (!s || s.exp < Date.now()) throw fail('bad_jwt', 401);
    const u = d.users.find(x => x.id === s.userId);
    u.salt = token();
    u.hash = hash(password, u.salt);
    save(d);
  },
  async signOut(at) {
    const d = load();
    const s = d.sessions[at];
    if (s) {
      delete d.sessions[at];
      for (const k in d.refresh) if (d.refresh[k].userId === s.userId) delete d.refresh[k];
      save(d);
    }
  },
  async generateLink(type, email, data) {
    const d = load();
    email = String(email).toLowerCase();
    let u = d.users.find(x => x.email === email);
    if (type === 'invite') {
      if (u && u.confirmed) throw fail('email_exists', 422);
      if (!u) {
        u = { id: uuid(), email, confirmed: false };
        d.users.push(u);
        // trigger handle_new_user
        d.profiles.push(Object.assign(DEFAULTS.profiles(), {
          id: u.id, email, full_name: (data && data.full_name) || '',
          locale: data && ['es', 'fr', 'en'].includes(data.locale) ? data.locale : 'es'
        }));
      }
    } else if (!u) throw fail('user_not_found', 404);
    const th = sha(token());
    d.otps[th] = { userId: u.id, type, exp: Date.now() + 24 * HOUR };
    save(d);
    return { userId: u.id, tokenHash: th, type };
  }
};

/* ---------------------------------------------------------------- storage */
function storage(accessToken) {
  return {
    async uploadUrl(p) {
      const d = load();
      const a = actorOf(d, accessToken);
      if (!a || !a.admin) throw fail('42501', 403);
      const t = token();
      d.uploads[t] = { path: p, exp: Date.now() + 2 * HOUR };
      save(d);
      return { url: '/api/portal/?a=mock-put&t=' + t, method: 'PUT' };
    },
    async stat(p) {
      const f = path.join(FILES, sha(p));
      if (!fs.existsSync(f)) return null;
      const meta = JSON.parse(fs.readFileSync(f + '.json', 'utf8'));
      return { size: fs.statSync(f).size, mime: meta.mime };
    },
    async signedUrl(p, seconds, fileName) {
      const d = load();
      const a = actorOf(d, accessToken);
      // storage policy portal_files_read
      const doc = d.documents.find(x => x.storage_path === p);
      const ok = a && (a.admin || (doc && doc.visible_to_client && canReadProject(d, a, doc.project_id)));
      if (!ok) throw fail('not_found', 400);
      const t = token();
      d.downloads[t] = { path: p, exp: Date.now() + seconds * 1000, name: fileName || '' };
      save(d);
      return '/api/portal/?a=mock-get&t=' + t;
    },
    async remove(p) {
      const d = load();
      const a = actorOf(d, accessToken);
      if (!a || !a.admin) return;
      try { fs.unlinkSync(path.join(FILES, sha(p))); fs.unlinkSync(path.join(FILES, sha(p)) + '.json'); } catch (e) {}
    }
  };
}

// The two local endpoints that stand in for Supabase Storage URLs.
function putFile(t, buf, mime) {
  const d = load();
  const u = d.uploads[t];
  if (!u || u.exp < Date.now()) return false;
  delete d.uploads[t];
  save(d);
  fs.mkdirSync(FILES, { recursive: true });
  fs.writeFileSync(path.join(FILES, sha(u.path)), buf);
  fs.writeFileSync(path.join(FILES, sha(u.path)) + '.json', JSON.stringify({ mime: mime || 'application/octet-stream' }));
  return true;
}
function getFile(t) {
  const d = load();
  const g = d.downloads[t];
  if (!g || g.exp < Date.now()) return null;
  const f = path.join(FILES, sha(g.path));
  if (!fs.existsSync(f)) return null;
  return { file: f, name: g.name, mime: JSON.parse(fs.readFileSync(f + '.json', 'utf8')).mime };
}

// Test helper: make an existing user an admin (dev only, see README).
function promote(email) {
  const d = load();
  const p = d.profiles.find(x => x.email === String(email).toLowerCase());
  if (!p) return false;
  p.role = 'admin';
  save(d);
  return true;
}
function reset() { save(empty()); }

module.exports = { name: 'mock', enabled, configured: () => true, auth, db, storage, uploadOrigin: () => null, putFile, getFile, promote, reset, DIR };

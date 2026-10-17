/* Scalia Portal · users. password_hash never leaves the server: views are
   built in service.js from the safe columns. */
'use strict';
const { setClause } = require('./sql');

const SAFE = 'id, email, role, preferred_locale, gender, first_name, last_name, phone, whatsapp, title, is_active, created_at, updated_at';
const EDITABLE = ['first_name', 'last_name', 'gender', 'phone', 'whatsapp', 'title', 'preferred_locale', 'is_active'];

const byId = (q, id) => q.one('select ' + SAFE + ' from users where id = $1', [id]);
const byEmail = (q, email) => q.one('select ' + SAFE + ' from users where email = $1', [String(email).toLowerCase()]);
// Sign-in only: the one query that reads the hash.
const credentialsByEmail = (q, email) => q.one('select id, password_hash, is_active, role from users where email = $1', [String(email).toLowerCase()]);

function create(q, u) {
  return q.one(
    'insert into users (email, role, preferred_locale, gender, first_name, last_name, phone, updated_by) values ($1, $2, $3, $4, $5, $6, $7, $8) returning ' + SAFE,
    [u.email.toLowerCase(), u.role || 'client', u.preferred_locale || 'es', u.gender || '', u.first_name || '', u.last_name || '', u.phone || '', u.by || null]
  );
}
async function update(q, id, patch, by) {
  const s = setClause(patch, EDITABLE, 3);
  if (s.empty) return byId(q, id);
  return q.one('update users set ' + s.sql + ', updated_at = now(), updated_by = $2 where id = $1 returning ' + SAFE, [id, by || null].concat(s.values));
}
// Password set: the account becomes active.
const setPassword = (q, id, hash) => q.one('update users set password_hash = $2, is_active = true, updated_at = now() where id = $1 returning ' + SAFE, [id, hash]);
const admins = q => q.query('select ' + SAFE + " from users where role = 'admin' order by first_name, email");
async function adminExists(q) { return !!(await q.one("select 1 as x from users where role = 'admin' limit 1")); }
const byIds = (q, ids) => ids.length ? q.query('select ' + SAFE + ' from users where id = any($1::uuid[])', [ids]) : Promise.resolve([]);

function fullName(u) { return u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() : ''; }

module.exports = { byId, byEmail, credentialsByEmail, create, update, setPassword, admins, adminExists, byIds, fullName };

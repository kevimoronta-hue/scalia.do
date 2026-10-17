/* ==========================================================================
   POST /api/ai-relay  (server-to-server only)
   Lets another site of the same Vercel team use Scalia's OpenAI key without
   the key ever leaving this project. The caller sends the OIDC token Vercel
   issues to its own deployment; we verify its signature against Vercel's
   JWKS and accept only allow-listed projects. No shared secret exists.
   Body: { instructions, input: [{ role, content }], schema: { name, schema } }
   → { text } (the model's output text) or { error }.
   Bounded sizes, capped output, store:false, per-project rate limit.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const { send, readJson, limited } = require('../server/http');

const TEAM = 'scalia';
const ALLOWED_PROJECTS = ['eclatdesflots'];       // callers allowed to use the key
const API = 'https://api.openai.com/v1/responses';
const TIMEOUT_MS = 15000;
const MAX_BODY = 96 * 1024;

let jwksCache = { at: 0, iss: '', keys: [] };
async function jwks(iss) {
  if (jwksCache.iss === iss && Date.now() - jwksCache.at < 10 * 60000 && jwksCache.keys.length) return jwksCache.keys;
  const r = await fetch(iss + '/.well-known/jwks');
  if (!r.ok) throw new Error('jwks_' + r.status);
  const body = await r.json();
  jwksCache = { at: Date.now(), iss, keys: Array.isArray(body.keys) ? body.keys : [] };
  return jwksCache.keys;
}

const b64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// → claims | throws with a short reason (never the token itself)
async function verify(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed');
  const header = JSON.parse(b64(parts[0]).toString('utf8'));
  const claims = JSON.parse(b64(parts[1]).toString('utf8'));
  if (header.alg !== 'RS256') throw new Error('alg');
  const iss = String(claims.iss || '');
  if (iss !== 'https://oidc.vercel.com/' + TEAM && iss !== 'https://oidc.vercel.com') throw new Error('iss');
  const now = Math.floor(Date.now() / 1000);
  if (!claims.exp || claims.exp < now - 30 || (claims.nbf && claims.nbf > now + 30)) throw new Error('expired');
  const jwk = (await jwks(iss)).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('kid');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const ok = crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, b64(parts[2]));
  if (!ok) throw new Error('signature');
  if (claims.owner !== TEAM) throw new Error('owner');
  if (ALLOWED_PROJECTS.indexOf(claims.project) < 0) throw new Error('project');
  return claims;
}

function outputText(body) {
  if (!body || body.status !== 'completed' || !Array.isArray(body.output)) return null;
  for (const item of body.output) {
    if (!item || item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const c of item.content) {
      if (c && c.type === 'refusal') return null;
      if (c && c.type === 'output_text' && typeof c.text === 'string') return c.text;
    }
  }
  return null;
}

module.exports = async function aiRelay(req, res) {
  const noStore = { 'Cache-Control': 'no-store' };
  if (req.method !== 'POST') return send(res, 405, { error: 'METHOD' }, { Allow: 'POST' });
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) return send(res, 503, { error: 'NOT_CONFIGURED' }, noStore);
  if (+req.headers['content-length'] > MAX_BODY) return send(res, 413, { error: 'TOO_LARGE' }, noStore);

  let claims;
  try {
    claims = await verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  } catch (e) {
    console.log('[ai-relay] rejected reason=' + e.message);
    return send(res, 401, { error: 'UNAUTHORIZED' }, noStore);
  }
  if (limited('relay:' + claims.project, 60, 10 * 60000)) return send(res, 429, { error: 'RATE_LIMITED' }, noStore);

  let body;
  try { body = await readJson(req, MAX_BODY); } catch (e) { return send(res, 400, { error: 'BAD_BODY' }, noStore); }
  const instructions = body && typeof body.instructions === 'string' ? body.instructions.slice(0, 60000) : '';
  const input = body && Array.isArray(body.input) ? body.input.slice(-12).filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) })) : [];
  const schema = body && body.schema && typeof body.schema.name === 'string' && body.schema.schema && typeof body.schema.schema === 'object' ? body.schema : null;
  if (!instructions || !input.length || !schema) return send(res, 422, { error: 'INVALID' }, noStore);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API, {
      method: 'POST', signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        instructions,
        input,
        text: { format: { type: 'json_schema', name: schema.name.slice(0, 64), strict: true, schema: schema.schema } },
        max_output_tokens: 800,
        store: false,
      }),
    });
    if (!r.ok) { console.log('[ai-relay] project=' + claims.project + ' openai_status=' + r.status); return send(res, 502, { error: 'UPSTREAM' }, noStore); }
    const text = outputText(await r.json());
    console.log('[ai-relay] project=' + claims.project + ' result=' + (text ? 'ok' : 'empty'));
    if (!text) return send(res, 502, { error: 'EMPTY' }, noStore);
    return send(res, 200, { text }, noStore);
  } catch (e) {
    return send(res, 504, { error: 'TIMEOUT' }, noStore);
  } finally {
    clearTimeout(timer);
  }
};

/* ==========================================================================
   POST /api/faq  { locale, messages: [{ role, content }] }
   The Scalia AI agent's conversation (server/faq.js). The browser keeps the
   conversation and sends its recent turns, the last one being the visitor's
   new message. Same-site origin, JSON only, bounded body, 30 messages per
   IP per 10 minutes plus a short burst limit, visitor messages up to 500
   characters. Always answers { kind, text, cta }.
   ========================================================================== */
'use strict';
const { send, readJson, ip, originOk, limited } = require('../server/http');
const faq = require('../server/faq');

const MAX_BODY = 32 * 1024;

module.exports = async function faqRoute(req, res) {
  const noStore = { 'Cache-Control': 'no-store' };
  if (req.method !== 'POST') return send(res, 405, { error: 'METHOD' }, { Allow: 'POST' });
  if (!originOk(req)) return send(res, 403, { error: 'FORBIDDEN' }, noStore);
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return send(res, 415, { error: 'CONTENT_TYPE' }, noStore);
  if (+req.headers['content-length'] > MAX_BODY) return send(res, 413, { error: 'TOO_LARGE' }, noStore);
  const who = ip(req);
  if (limited('faq:' + who, 30, 10 * 60000) || limited('faq-burst:' + who, 6, 20000)) {
    return send(res, 429, { error: 'RATE_LIMITED' }, Object.assign({ 'Retry-After': '60' }, noStore));
  }

  let body;
  try { body = await readJson(req, MAX_BODY); } catch (e) { return send(res, e.message === 'too_large' ? 413 : 400, { error: 'BAD_BODY' }, noStore); }
  const locale = ['fr', 'en', 'es'].indexOf(body && body.locale) >= 0 ? body.locale : 'fr';
  const n = faq.normalize(body && body.messages);
  if (n.error) return send(res, 422, { error: n.error, field: 'messages' }, noStore);

  // The € / $ the visitor chose on the site; anything else → the site's default.
  const currency = ['EUR', 'USD'].indexOf(body && body.currency) >= 0 ? body.currency : 'EUR';
  const out = await faq.reply(n.messages, locale, currency);
  faq.record(locale, n.messages, out);
  send(res, 200, out, noStore);
};

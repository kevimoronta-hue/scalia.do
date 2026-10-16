/* ==========================================================================
   POST /api/apply  · an application from /join/ (multipart/form-data)
   Same protections as /api/book: same-site origin, honeypot, minimum fill
   time, rate limits, strict server validation. The CV is checked by
   extension, size and file signature. Sent through the booking's Gmail
   (service account): to Scalia with the CV and a short automatic summary of
   the answers (server/ai-summary.js, optional), and a receipt to the
   candidate.
   Each email leaves at most once per application: the browser sends a
   submissionId (UUID made once per form, kept for every retry) and
   server/mail-events.js records apply:<id>:admin / :candidate in Postgres
   (atomic claim). A retry of an application already sent answers success
   without sending anything again, even if the first answer was lost.
   Time budget, under Vercel's 30 s: summary ≤ 5 s, then every email shares
   what is left of 24 s.
   Logs carry an event name only: never the CV, answers, email or phone.
   ========================================================================== */
'use strict';
const { send, ip, originOk, limited, calendar } = require('../server/http');
const { BOOKING } = require('../server/config');
const BOOKING_NOTIFY = () => BOOKING.notifyEmail;
const apply = require('../server/apply');
const mail = require('../server/mail');
const ai = require('../server/ai-summary');
const events = require('../server/mail-events');

const DAY = 86400000;
const MIN_FILL_MS = 10000;   // twelve questions and a form: never faster than this
const BUDGET_MS = 24000;     // all external calls, with a margin under maxDuration (30 s)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function log(event) { console.log('[apply] ' + event); }

async function readBody(req, limit) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) { const e = new Error('too_large'); e.code = 'TOO_LARGE'; throw e; }
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

// Minimal multipart/form-data reader: text fields and one file field (cv).
function multipart(buf, boundary) {
  const fields = {}, files = {};
  const delim = Buffer.from('--' + boundary);
  let pos = buf.indexOf(delim);
  let parts = 0;
  while (pos >= 0) {
    pos += delim.length;
    if (buf.slice(pos, pos + 2).toString() === '--') break;      // closing delimiter
    if (++parts > 40) throw new Error('parts');
    pos += 2;                                                     // CRLF after the delimiter
    const headEnd = buf.indexOf('\r\n\r\n', pos);
    if (headEnd < 0) throw new Error('head');
    const head = buf.slice(pos, headEnd).toString('utf8');
    const next = buf.indexOf(Buffer.concat([Buffer.from('\r\n'), delim]), headEnd + 4);
    if (next < 0) throw new Error('body');
    const body = buf.slice(headEnd + 4, next);
    const name = (/\bname="([^"]{1,40})"/i.exec(head) || [])[1];
    const filename = (/\bfilename="([^"]{0,200})"/i.exec(head) || [])[1];
    if (name) {
      if (filename !== undefined) files[name] = { filename, data: body };
      else if (body.length <= 2000) fields[name] = body.toString('utf8');
      else throw new Error('field');
    }
    pos = next + 2;
  }
  return { fields, files };
}

module.exports = async function applyRoute(req, res) {
  const noStore = { 'Cache-Control': 'no-store' };
  if (req.method !== 'POST') return send(res, 405, { error: 'METHOD' }, { Allow: 'POST' });
  if (!originOk(req)) return send(res, 403, { error: 'FORBIDDEN' }, noStore);
  const type = String(req.headers['content-type'] || '');
  const boundary = (/^multipart\/form-data;.*\bboundary=(?:"([^"]{1,70})"|([^\s;]{1,70}))/i.exec(type) || []).slice(1).find(Boolean);
  if (!boundary) return send(res, 415, { error: 'CONTENT_TYPE' }, noStore);
  if (+req.headers['content-length'] > apply.BODY_MAX) { log('validation_error'); return send(res, 413, { error: 'TOO_LARGE' }, noStore); }
  if (limited('apply:' + ip(req), 5, 10 * 60000)) return send(res, 429, { error: 'RATE_LIMITED' }, Object.assign({ 'Retry-After': '600' }, noStore));

  const cal = calendar();
  if (!cal.configured()) return send(res, 503, { error: 'NOT_CONFIGURED' }, noStore);

  let form;
  try { form = multipart(await readBody(req, apply.BODY_MAX), boundary); }
  catch (e) {
    log('validation_error');
    return send(res, e.code === 'TOO_LARGE' ? 413 : 400, { error: e.code === 'TOO_LARGE' ? 'TOO_LARGE' : 'BAD_BODY' }, noStore);
  }
  const f = form.fields;
  // Bots: the hidden field is filled, or the whole journey took seconds.
  if (f.website || !(Number(f.elapsed) >= MIN_FILL_MS)) { log('validation_error'); return send(res, 400, { error: 'REJECTED' }, noStore); }

  const { errors, data } = apply.validate(f, form.files.cv);
  if (Object.keys(errors).length) { log('validation_error'); return send(res, 422, { error: 'INVALID', fields: errors }, noStore); }
  if (limited('applym:' + data.email.toLowerCase(), 3, DAY)) return send(res, 429, { error: 'RATE_LIMITED' }, noStore);

  // Idempotence key. A page from before this version sends none: that
  // application goes out as before, without deduplication.
  const sid = typeof f.submissionId === 'string' && UUID.test(f.submissionId) ? f.submissionId.toLowerCase() : null;
  if (!sid) log('no_submission_id');
  const deadline = Date.now() + BUDGET_MS;
  const left = min => Math.max(min, deadline - Date.now());
  const deliver = (ev, fn) => sid ? events.once(ev, fn) : fn().then(r => ({ status: 'sent', provider: r && r.provider }));

  // Scalia first: without it the application is not received, and the
  // candidate can try again. The key is claimed before the summary, so a
  // retry arriving meanwhile sends nothing.
  let admin;
  try {
    admin = await deliver({ key: 'apply:' + sid + ':admin', type: 'application_admin', recipient: BOOKING_NOTIFY() }, async () => {
      // A short reading aid for Scalia (answers and role only). It never
      // blocks: no key, timeout, error or rejected output → null, and the
      // email says the summary is unavailable. The raw answers are always included.
      const summary = await ai.generateCandidateSummary(apply.answersFor(data), data.role);
      const m = apply.ownerMail(data, summary);
      m.messageId = sid ? mail.messageId('apply', sid, 'admin') : undefined;
      m.timeoutMs = left(4000);
      return mail.sendLarge(cal, m);
    });
  } catch (e) { log('application_failed'); return send(res, 503, { error: 'UNAVAILABLE' }, noStore); }

  // Same application, already being handled by another request (the first
  // one is still running, or its email left without confirmation): received.
  if (admin.status === 'duplicate' && admin.previous === 'processing') {
    log('application_duplicate_pending');
    return send(res, 202, { ok: true, pending: true }, noStore);
  }

  // The receipt to the candidate (deduplicated the same way).
  try {
    await deliver({ key: 'apply:' + sid + ':candidate', type: 'application_candidate', recipient: data.email }, () => {
      const m = apply.candidateMail(data);
      m.messageId = sid ? mail.messageId('apply', sid, 'candidate') : undefined;
      m.timeoutMs = left(3000);
      return mail.send(cal, m);
    });
  } catch (e) { log('application_receipt_failed'); }   // received anyway; Scalia answers by email

  if (admin.status === 'duplicate') { log('application_duplicate'); return send(res, 201, { ok: true, duplicate: true }, noStore); }
  log('application_sent');
  send(res, 201, { ok: true }, noStore);
};

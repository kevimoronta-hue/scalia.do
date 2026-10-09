/* ==========================================================================
   Scalia · applications: a short internal reading aid (server only)
   join.js → /api/apply → generateCandidateSummary() → OpenAI Responses API.
   The only file that knows the provider. The browser never talks to OpenAI
   and never sees the result.
   Sent: the role sought, the 12 questions and the 12 chosen answers. Never
   the name, email, phone, country, city, links, CV or its file name.
   Needs OPENAI_API_KEY and OPENAI_MODEL (Vercel, server side; no default
   model in the code). The output is never trusted: JSON parsing, schema,
   lengths, cleaning and a content filter decide. Anything missing or wrong
   gives { status: 'unavailable' } or { status: 'rejected' }, and the
   application goes on without it.
   Logs: ai_summary_success / ai_summary_unavailable / ai_summary_rejected,
   never the prompt, the answers or the summary.
   ========================================================================== */
'use strict';

const API = 'https://api.openai.com/v1/responses';
const TIMEOUT_MS = 9000;

const SYSTEM = [
  'Tu aides uniquement à résumer les réponses déclaratives d’une candidature professionnelle.',
  'Tu ne prends aucune décision de recrutement.',
  'Tu ne donnes aucun score, classement, verdict ou recommandation : pas de note, pas de pourcentage, pas de comparaison avec d’autres candidats, pas de « à recruter », « à refuser », « à éliminer » ni « à appeler ».',
  'Tu n’infères aucune caractéristique sensible ou personnelle : religion, santé, santé mentale, handicap, origine, ethnie, orientation sexuelle, opinions politiques, âge, situation familiale ou toute autre caractéristique sensible, même si tu penses pouvoir la déduire.',
  'Tu décris uniquement les tendances professionnelles directement soutenues par les réponses fournies. Les questions 5 à 8 portent sur le relationnel : appuie-toi sur elles pour relationalStyle.',
  'Utilise systématiquement un langage prudent : « les réponses suggèrent », « semble privilégier », « tendance déclarative », « pourrait être approfondi ». N’écris jamais « ce candidat est… » ni « cette personne est… ».',
  'Ta synthèse est destinée à aider un humain à lire plus rapidement la candidature et à préparer éventuellement un entretien. Elle est courte et rédigée en français : workStyle et relationalStyle en une ou deux phrases, 2 à 4 motivations, 2 à 5 forces potentielles à explorer, 1 à 4 sujets à approfondir en entretien, et un summary de 2 à 4 phrases.',
  'Retourne uniquement le JSON demandé.'
].join('\n');

// The JSON shape, enforced on OpenAI's side (Structured Outputs, strict).
// Counts and lengths are checked here, in validate().
const SCHEMA = {
  type: 'json_schema',
  name: 'profile_summary',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      workStyle: { type: 'string', description: 'Fonctionnement professionnel suggéré par les réponses, une ou deux phrases prudentes.' },
      relationalStyle: { type: 'string', description: 'Tendances relationnelles déclarées (questions 5 à 8), une ou deux phrases prudentes.' },
      motivations: { type: 'array', items: { type: 'string' }, description: '1 à 4 motivations déclarées, quelques mots chacune.' },
      potentialStrengths: { type: 'array', items: { type: 'string' }, description: '1 à 5 forces potentielles à explorer, quelques mots chacune.' },
      interviewTopics: { type: 'array', items: { type: 'string' }, description: '1 à 4 sujets à approfondir lors d’un éventuel entretien.' },
      summary: { type: 'string', description: 'Synthèse de 2 à 4 phrases prudentes.' }
    },
    required: ['workStyle', 'relationalStyle', 'motivations', 'potentialStrengths', 'interviewTopics', 'summary']
  }
};

/* ---------------------------------------------------------- filter ----- */
// No \b: in JavaScript it does not see accented letters as word letters
// ("éliminer", "à refuser"). (?<!\p{L}) / (?!\p{L}) with the u flag do.
const START = '(?<!\\p{L})';
const word = (alts, tail) => new RegExp(START + '(?:' + alts + ')' + (tail || ''), 'iu');
// Same rules as before, grouped by family so a rejection can name its group
// (never the word that matched).
const FORBIDDEN = [
  ['score', /\d+(?:[.,]\d+)?\s*(?:\/|sur|out of)\s*\d+/iu],
  ['score', /\d+(?:[.,]\d+)?\s*%/u],
  ['score', /(?<!\p{L})[A-E][+-](?!\p{L})/u],
  ['score', word('score|notation|noté|percentile|compatibilit')],
  ['ranking', word('classement|classé|rang\\s*(?:n°|no|#)?\\s*\\d|top\\s*\\d|meilleur(?:e|s)? que|moins bon|premier de|dernier de')],
  ['recommendation', word('recrut|embauch|à refuser|refuser|rejet|élimin|à écarter|à appeler|à convoquer|à retenir|à garder|hire|no.?hire|go/no')],
  ['verdict', word('excellent(?:e)?|mauvais(?:e)?|bon|bonne|idéal(?:e)?|parfait(?:e)?|faible|médiocre', '\\s+(?:candidat|candidate|profil|recrue)')],
  ['verdict', word('candidat|candidate|profil', '\\s+(?:idéal|parfait|excellent|médiocre|faible)')],
  ['verdict', word('ce candidat|cette candidate|cette personne|il|elle', '\\s+(?:est|n’est|n\'est|sera|serait)\\s+(?:un|une|le|la|très|trop|clairement|vraiment|idéal|parfait|excellent)')],
  ['sensitive', word('relig|croyan|foi |santé|malad|médic|psych|mental|dépress|anxi|trouble|handicap|origine|ethni|racial|nationalit|orientation sexuelle|sexualit|homosex|hétérosex|politique|militant|syndic|âge|âgé|jeune|senior|famille|familial|enfant|enceinte|grossesse|marié|célibataire')]
];

function clean(v) { return v.replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim(); }
function sentences(s) { return (s.match(/[^.!?…]+[.!?…]+/g) || [s]).length; }

const TEXTS = { workStyle: [10, 320], relationalStyle: [10, 360], summary: [20, 700] };
const LISTS = { motivations: [1, 4, 100], potentialStrengths: [1, 5, 100], interviewTopics: [1, 4, 160] };
const KEYS = ['workStyle', 'relationalStyle', 'motivations', 'potentialStrengths', 'interviewTopics', 'summary'];

// Returns { status: 'ok', data } or { status: 'rejected', reason } where the
// reason is a code only (e.g. "count:motivations", "filter:sensitive").
function validate(input) {
  const no = reason => ({ status: 'rejected', reason });
  if (!input || typeof input !== 'object' || Array.isArray(input)) return no('schema:not_object');
  if (Object.keys(input).some(k => KEYS.indexOf(k) < 0)) return no('schema:unknown_field');
  if (KEYS.some(k => !(k in input))) return no('schema:missing_field');
  const d = {};
  for (const k in TEXTS) {
    if (typeof input[k] !== 'string') return no('type:' + k);
    const v = clean(input[k]);
    if (v.length < TEXTS[k][0] || v.length > TEXTS[k][1]) return no('length:' + k);
    d[k] = v;
  }
  for (const k in LISTS) {
    const [minN, maxN, max] = LISTS[k];
    if (!Array.isArray(input[k])) return no('type:' + k);
    if (input[k].length < minN || input[k].length > maxN) return no('count:' + k);
    if (input[k].some(x => typeof x !== 'string')) return no('type:' + k);
    const items = input[k].map(clean);
    if (items.some(x => x.length < 2 || x.length > max)) return no('length:' + k);
    d[k] = items;
  }
  if (sentences(d.summary) > 4) return no('sentences:summary');
  const all = [d.workStyle, d.relationalStyle, d.summary].concat(d.motivations, d.potentialStrengths, d.interviewTopics).join('\n');
  const hit = FORBIDDEN.find(([, re]) => re.test(all));
  if (hit) return no('filter:' + hit[0]);
  return { status: 'ok', data: { workStyle: d.workStyle, relationalStyle: d.relationalStyle, motivations: d.motivations,
    potentialStrengths: d.potentialStrengths, interviewTopics: d.interviewTopics, summary: d.summary } };
}

/* --------------------------------------------------------------- call -- */
function log(event) { console.log('[apply] ' + event); }
// Diagnostic for a failed call: the HTTP status and OpenAI's error code /
// type only (e.g. 429 insufficient_quota). Never the key, the request, the
// answers or the response body. Only an identifier in OpenAI's own form
// (lowercase snake_case) is written; anything else, or anything carrying a
// key prefix (sk-), becomes "-".
const token = v => (typeof v === 'string' && /^[a-z][a-z0-9_.:-]{0,59}$/.test(v) && !/sk-/.test(v)) ? v : '-';
function logFailure(status, code, type) {
  log('ai_summary_openai_error status=' + (Number(status) || 0) + ' code=' + token(code) + (type ? ' type=' + token(type) : ''));
}

// The model's text answer (Responses API): the first output_text of the
// message. A refusal or an unfinished response gives { reason } instead.
function outputText(body) {
  if (!body || typeof body !== 'object') return { reason: 'no_body' };
  if (body.status !== 'completed') return { reason: 'status_' + token(body.status) + (body.incomplete_details && body.incomplete_details.reason ? ':' + token(body.incomplete_details.reason) : '') };
  if (!Array.isArray(body.output)) return { reason: 'no_output' };
  for (const item of body.output) {
    if (!item || item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const c of item.content) {
      if (c && c.type === 'refusal') return { reason: 'refusal' };
      if (c && c.type === 'output_text' && typeof c.text === 'string') return { text: c.text };
    }
  }
  return { reason: 'no_output_text' };
}

// qa: [{ q, a }] in French; role: the role sought, as typed (≤ 120 chars).
async function generateCandidateSummary(qa, role) {
  const key = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL;
  if (!key || !model) { log('ai_summary_unavailable'); return { status: 'unavailable' }; }
  const prompt = 'Domaine / poste recherché (déclaré par le candidat) : ' + (role || 'non précisé') + '\n\n' +
    qa.map((x, i) => 'Question ' + (i + 1) + ' : ' + x.q + '\nRéponse choisie : ' + x.a).join('\n\n');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API, {
      method: 'POST', signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, instructions: SYSTEM, input: prompt,
        text: { format: SCHEMA },
        max_output_tokens: 2000,   // room for reasoning models; the JSON itself is short
        store: false
        // Responses API option only. It promises nothing about what OpenAI keeps: the
        // Scalia project shares inputs and outputs with OpenAI (data sharing setting).
      })
    });
    if (!r.ok) {   // 4xx (quota, model, key), 5xx
      let err = null;
      try { err = (await r.json()).error; } catch (e) {}
      logFailure(r.status, err && err.code, err && err.type);
      log('ai_summary_unavailable');
      return { status: 'unavailable' };
    }
    const out0 = outputText(await r.json());
    if (!out0.text) { logFailure(r.status, out0.reason); log('ai_summary_unavailable'); return { status: 'unavailable' }; }
    const raw = out0.text;
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { log('ai_summary_rejected reason=json_parse'); return { status: 'rejected', reason: 'json_parse' }; }
    const out = validate(parsed);
    log(out.status === 'ok' ? 'ai_summary_success' : 'ai_summary_rejected reason=' + out.reason);
    return out;
  } catch (e) {
    log('ai_summary_unavailable');   // timeout, network, unreadable body
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generateCandidateSummary, validate, SYSTEM, SCHEMA };

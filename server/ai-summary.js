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
const FORBIDDEN = [
  // scores, grades, percentages, rankings
  /\d+(?:[.,]\d+)?\s*(?:\/|sur|out of)\s*\d+/iu,
  /\d+(?:[.,]\d+)?\s*%/u,
  /(?<!\p{L})[A-E][+-](?!\p{L})/u,
  word('score|notation|noté|classement|classé|rang\\s*(?:n°|no|#)?\\s*\\d|percentile|compatibilit|top\\s*\\d|meilleur(?:e|s)? que|moins bon|premier de|dernier de'),
  // verdicts and recruitment advice
  word('recrut|embauch|à refuser|refuser|rejet|élimin|à écarter|à appeler|à convoquer|à retenir|à garder|hire|no.?hire|go/no'),
  word('excellent(?:e)?|mauvais(?:e)?|bon|bonne|idéal(?:e)?|parfait(?:e)?|faible|médiocre', '\\s+(?:candidat|candidate|profil|recrue)'),
  word('candidat|candidate|profil', '\\s+(?:idéal|parfait|excellent|médiocre|faible)'),
  word('ce candidat|cette candidate|cette personne|il|elle', '\\s+(?:est|n’est|n\'est|sera|serait)\\s+(?:un|une|le|la|très|trop|clairement|vraiment|idéal|parfait|excellent)'),
  // sensitive inferences
  word('relig|croyan|foi |santé|malad|médic|psych|mental|dépress|anxi|trouble|handicap|origine|ethni|racial|nationalit|orientation sexuelle|sexualit|homosex|hétérosex|politique|militant|syndic|âge|âgé|jeune|senior|famille|familial|enfant|enceinte|grossesse|marié|célibataire')
];

function clean(v) { return v.replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim(); }
function text(v, min, max) {
  if (typeof v !== 'string') return null;
  const s = clean(v);
  return s.length >= min && s.length <= max ? s : null;
}
function list(v, minN, maxN, max) {
  if (!Array.isArray(v) || v.length < minN || v.length > maxN) return null;
  const out = v.map(x => text(x, 2, max));
  return out.every(Boolean) ? out : null;
}
function sentences(s) { return (s.match(/[^.!?…]+[.!?…]+/g) || [s]).length; }

// Returns { status: 'ok', data } or { status: 'rejected' }.
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { status: 'rejected' };
  const KEYS = ['workStyle', 'relationalStyle', 'motivations', 'potentialStrengths', 'interviewTopics', 'summary'];
  if (Object.keys(input).some(k => KEYS.indexOf(k) < 0)) return { status: 'rejected' };
  const d = {
    workStyle: text(input.workStyle, 10, 320),
    relationalStyle: text(input.relationalStyle, 10, 360),
    motivations: list(input.motivations, 1, 4, 100),
    potentialStrengths: list(input.potentialStrengths, 1, 5, 100),
    interviewTopics: list(input.interviewTopics, 1, 4, 160),
    summary: text(input.summary, 20, 700)
  };
  if (KEYS.some(k => !d[k])) return { status: 'rejected' };
  if (sentences(d.summary) > 4) return { status: 'rejected' };
  const all = [d.workStyle, d.relationalStyle, d.summary].concat(d.motivations, d.potentialStrengths, d.interviewTopics).join('\n');
  if (FORBIDDEN.some(re => re.test(all))) return { status: 'rejected' };
  return { status: 'ok', data: d };
}

/* --------------------------------------------------------------- call -- */
function log(event) { console.log('[apply] ' + event); }

// The model's text answer (Responses API): the first output_text of the
// message. A refusal or an unfinished response gives null.
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
        store: false               // not kept in the OpenAI dashboard logs
      })
    });
    if (!r.ok) { log('ai_summary_unavailable'); return { status: 'unavailable' }; }   // 4xx (quota, model, key), 5xx
    const raw = outputText(await r.json());
    if (raw === null) { log('ai_summary_unavailable'); return { status: 'unavailable' }; }
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { log('ai_summary_rejected'); return { status: 'rejected' }; }
    const out = validate(parsed);
    log(out.status === 'ok' ? 'ai_summary_success' : 'ai_summary_rejected');
    return out;
  } catch (e) {
    log('ai_summary_unavailable');   // timeout, network, unreadable body
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generateCandidateSummary, validate, SYSTEM, SCHEMA };

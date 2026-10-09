/* ==========================================================================
   Scalia · language URLs for search engines and shared links
   Builds /fr/, /en/ and /es/ from index.html (French, the only source) and
   the i18n dictionaries, with the same rules as i18n/i18n.js, so each URL
   is already in its language before any script runs: crawlers (Googlebot,
   link previews) see the right title, description and content whatever
   their IP. Run by Vercel at deploy (vercel.json buildCommand) and locally:
     node scripts/build-locales.mjs
   The output folders are generated, never edited (see .gitignore).
   / keeps detecting the visitor's language; it is the x-default.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://scalia.do/';
const LOCALES = { fr: 'fr_FR', en: 'en_US', es: 'es_LA' };
// Social preview per language (1200×630, same artwork, text in that
// language). French keeps the image and alt text of index.html.
const PREVIEW = {
  en: { image: SITE + 'assets/og/scalia-og-en.jpg', alt: 'Scalia — The agency that connects you.' },
  es: { image: SITE + 'assets/og/scalia-og-es.jpg', alt: 'Scalia — La agencia que te conecta.' }
};
const PAGES = ['scalians/', 'mentions-legales/', 'confidentialite/'];   // other pages: keep the language via ?lang=
const ATTRS = ['aria-label', 'alt', 'title', 'placeholder'];
// Same in every language (as INVARIANT in i18n.js): never reported missing.
const INVARIANT = /^(Scalia|SCALIA|Kevi Moronta|Yeice Triana|Adan Moronta|Yolaine Gomez|Sohany Galan|[^\s]+@[^\s]+)$/;
const URL_ATTRS = /^(href|src|srcset|poster|action|data-[a-z-]*src[a-z-]*)$/;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

const source = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function dictionary(loc) {
  if (loc === 'fr') return null;
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n', loc + '.js'), 'utf8'), sandbox);
  return sandbox.window.SCALIA_I18N[loc];
}

const norm = s => String(s).replace(/\s+/g, ' ').trim();
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[e.toLowerCase()] ?? m;
});
const escText = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
const escAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function build(loc) {
  const dict = dictionary(loc);
  const missing = new Set();
  const t = (fr, quiet) => {
    if (!dict) return fr;
    const key = norm(fr);
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    if (!quiet && !INVARIANT.test(key)) missing.add(key);
    return fr;
  };

  // Relative URLs → root-absolute (the page lives one level down); links to
  // the other pages carry the language.
  function url(v) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|#|\?)/i.test(v) || !v) return v;
    const abs = '/' + v;
    const page = PAGES.find(p => v === p || v.startsWith(p + '#'));
    return page ? abs.replace(page, page + '?lang=' + loc) : abs;
  }
  function tag(raw, opts) {
    return raw.replace(/\s([a-zA-Z][\w:-]*)="([^"]*)"/g, (m, name, value) => {
      const n = name.toLowerCase();
      if (URL_ATTRS.test(n)) {
        const v = n === 'srcset' ? value.split(',').map(c => c.trim().replace(/^\S+/, u => url(u))).join(', ') : url(value);
        return ' ' + name + '="' + v + '"';
      }
      if (opts.translate && ATTRS.includes(n)) {
        const d = decode(value);
        if (/[A-Za-zÀ-ÿ]/.test(d)) return ' ' + name + '="' + escAttr(t(d)) + '"';
      }
      return m;
    });
  }
  const urlsOnly = html => html.replace(/<[a-zA-Z][^>]*>/g, m => tag(m, { translate: false }));

  // Same walk as i18n.js: text nodes in <body>, outside script / style / svg
  // / noscript / [data-i18n-skip]; [data-i18n="html"] blocks as one unit;
  // aria-label / alt / title / placeholder everywhere but inside <svg>.
  const tokens = source.split(/(<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[a-zA-Z][^>]*>)/);
  let out = '', inBody = false, skip = null, svg = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok.startsWith('<!')) { out += tok; continue; }            // comments, doctype
    if (tok[0] !== '<') {
      if (!inBody || skip || svg || !/[A-Za-zÀ-ÿ]/.test(decode(tok))) { out += tok; continue; }
      const m = tok.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const fr = decode(m[2]);
      const v = t(fr);
      out += v === fr ? tok : m[1] + escText(v) + m[3];
      continue;
    }
    const close = tok[1] === '/';
    const name = (tok.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/) || [])[1].toLowerCase();
    if (name === 'body' && !close) inBody = true;
    if (!close && (name === 'script' || name === 'style')) {        // raw content up to the closing tag
      let j = i + 1, raw = '';
      while (j < tokens.length && !new RegExp('^</' + name, 'i').test(tokens[j])) raw += tokens[j++];
      out += tag(tok, { translate: false }) + raw + (tokens[j] || '');
      i = j;
      continue;
    }
    if (!close && /\sdata-i18n="html"/.test(tok) && !skip && !svg) { // one unit: the whole inner HTML
      let j = i + 1, depth = 1, inner = '';
      for (; j < tokens.length; j++) {
        const x = tokens[j];
        if (new RegExp('^<' + name + '[\\s>]', 'i').test(x)) depth++;
        else if (new RegExp('^</' + name + '\\s*>', 'i').test(x) && --depth === 0) break;
        inner += x;
      }
      out += tag(tok, { translate: true }) + urlsOnly(loc === 'fr' ? inner : t(inner)) + tokens[j];
      i = j;
      continue;
    }
    if (name === 'svg') svg += close ? -1 : (tok.endsWith('/>') ? 0 : 1);
    if (skip) {
      if (name === skip.name && !VOID.has(name) && !tok.endsWith('/>')) skip.depth += close ? -1 : 1;
      if (skip.depth === 0) skip = null;
    } else if (!close && !VOID.has(name) && !tok.endsWith('/>') && (/\sdata-i18n-skip[\s>=]/.test(tok) || name === 'noscript')) {
      skip = { name, depth: 1 };
    }
    out += tag(tok, { translate: !svg });
  }

  // <head>: language, own URL, translated title / description / previews.
  const page = SITE + loc + '/';
  const meta = (attr, key, fn) => {
    const re = new RegExp('(<meta ' + attr + '="' + key + '" content=")([^"]*)(")');
    if (!re.test(out)) throw new Error('missing meta ' + key);
    out = out.replace(re, (m, a, v, b) => a + escAttr(fn(decode(v))) + b);
  };
  out = out.replace(/<html lang="fr">/, '<html lang="' + loc + '" data-page-locale="' + loc + '">');
  out = out.replace(/<title>([^<]*)<\/title>/, (m, v) => '<title>' + escText(t(decode(v))) + '</title>');
  meta('name', 'description', t);
  meta('property', 'og:locale', () => LOCALES[loc]);
  meta('property', 'og:url', () => page);
  meta('property', 'og:title', t);
  meta('property', 'og:description', t);
  const pv = PREVIEW[loc];
  if (pv) {
    meta('property', 'og:image', () => pv.image);
    meta('property', 'og:image:alt', () => pv.alt);
    meta('name', 'twitter:image', () => pv.image);
  }
  meta('name', 'twitter:title', t);
  meta('name', 'twitter:description', t);
  out = out.replace('<link rel="canonical" href="' + SITE + '">', '<link rel="canonical" href="' + page + '">');
  out = out.replace(/(<script src="\/i18n\/boot\.js[^"]*" data-root=")"/, '$1/"');
  if (!out.includes('<link rel="canonical" href="' + page + '">') || !out.includes('data-root="/"')) throw new Error('head not rewritten');

  fs.mkdirSync(path.join(ROOT, loc), { recursive: true });
  fs.writeFileSync(path.join(ROOT, loc, 'index.html'), out);
  return missing;
}

let failed = false;
for (const loc of Object.keys(LOCALES)) {
  const missing = build(loc);
  console.log('/' + loc + '/  ' + (missing.size ? missing.size + ' string(s) without translation' : 'ok'));
  for (const k of missing) console.log('   · ' + k.slice(0, 110));
  if (missing.size) failed = true;
}
if (failed && process.env.LOCALES_STRICT === '1') process.exit(1);

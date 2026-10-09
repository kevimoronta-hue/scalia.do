/* ==========================================================================
   Scalia · i18n engine + navbar controls
   French is written in the HTML and is the single source of truth. The EN /
   ES dictionaries map each French string (whitespace collapsed) to its
   translation, gettext-style, so a page can never drift into three copies.
     · text nodes are translated in place
     · [data-i18n="html"] blocks (sentences with an inline link) as one unit
     · aria-label / alt / title / <title> / meta description
   Public API: window.ScaliaI18n = { t, locale, currency, setLocale,
   setCurrency, intl, on }. Modules listen to "scalia:locale" and
   "scalia:currency" for anything they render themselves (prices, labels).
   ========================================================================== */
(function () {
  'use strict';
  var d = document.documentElement;
  var boot = window.SCALIA_I18N_BOOT || { locale: 'fr', currency: 'EUR', root: '' };
  // /fr/, /en/, /es/: built in their language. Nothing to translate in the
  // page; another language is another URL.
  var page = boot.page || null;
  var dicts = window.SCALIA_I18N = window.SCALIA_I18N || {};
  var LOCALES = ['fr', 'en', 'es'];
  var INTL = { fr: 'fr-FR', en: 'en-US', es: 'es-419' };
  var OG = { fr: 'fr_FR', en: 'en_US', es: 'es_LA' };
  var FLAGS = { fr: '🇫🇷', en: '🇺🇸', es: '🇩🇴' };
  var CODES = { fr: 'FR', en: 'EN', es: 'ES' };
  var ATTRS = ['aria-label', 'alt', 'title', 'placeholder'];
  var current = 'fr';
  var currency = boot.currency || 'EUR';
  var reported = {};
  // Same in every language: brand, names, addresses. Never reported as missing.
  var INVARIANT = /^(Scalia|SCALIA|Kevi Moronta|Yeice Triana|Adan Moronta|Yolaine Gomez|Sohany Galan|[^\s]+@[^\s]+)$/;

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function t(fr, loc) {
    loc = loc || current;
    if (loc === 'fr' || fr == null) return fr;
    var dict = dicts[loc], key = norm(fr);
    if (dict && Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    if (dict && !reported[loc + key] && /[a-zà-ÿ]{3}/.test(key) && !INVARIANT.test(key)) {
      reported[loc + key] = 1;
      if (window.console) console.warn('[i18n] missing ' + loc + ':', key);
    }
    return fr;
  }

  /* ------------------------------------------------------------- collect --
     Snapshot of every translatable string, taken once, in French. */
  var texts = [], units = [], attrEls = [], head = {};
  function collect() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p || p.closest('script,style,svg,noscript,[data-i18n="html"],[data-i18n-skip]')) return NodeFilter.FILTER_REJECT;
        return /[A-Za-zÀ-ÿ]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      var m = n.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
      texts.push({ node: n, fr: m[2], lead: m[1], trail: m[3] });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n="html"]'), function (el) {
      units.push({ el: el, fr: el.innerHTML });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[aria-label],[alt],[title],[placeholder]'), function (el) {
      if (el.closest('svg')) return;
      var rec = {};
      ATTRS.forEach(function (a) { var v = el.getAttribute(a); if (v && /[A-Za-zÀ-ÿ]/.test(v)) rec[a] = { fr: v, applied: v }; });
      if (Object.keys(rec).length) attrEls.push({ el: el, rec: rec });
    });
    head.title = document.title;
    var desc = document.querySelector('meta[name="description"]');
    head.desc = desc && desc.getAttribute('content');
    head.descEl = desc;
  }

  /* --------------------------------------------------------------- apply -- */
  function apply(loc) {
    current = loc;
    if (!page) translatePage(loc);
    var og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute('content', OG[loc]);
    d.lang = loc;
    d.setAttribute('data-locale', loc);
    syncLangUI();
    d.dispatchEvent(new CustomEvent('scalia:locale', { detail: { locale: loc } }));
  }
  function translatePage(loc) {
    texts.forEach(function (x) {
      var v = t(x.fr, loc);
      var next = x.lead + v + x.trail;
      if (x.node.nodeValue !== next) x.node.nodeValue = next;
    });
    units.forEach(function (u) {
      var v = loc === 'fr' ? u.fr : t(u.fr, loc);
      if (u.el.innerHTML !== v) u.el.innerHTML = v;
    });
    attrEls.forEach(function (a) {
      Object.keys(a.rec).forEach(function (name) {
        var r = a.rec[name], cur = a.el.getAttribute(name);
        if (cur !== r.applied) r.fr = cur;               // changed by a script since: new source
        var v = t(r.fr, loc);
        a.el.setAttribute(name, v);
        r.applied = v;
      });
    });
    document.title = t(head.title, loc);
    if (head.descEl && head.desc) head.descEl.setAttribute('content', t(head.desc, loc));
  }

  function loadDict(loc, cb) {
    if (loc === 'fr' || dicts[loc]) { cb(); return; }
    var id = 'i18n-dict-' + loc;
    var s = document.getElementById(id);
    if (!s) {
      s = document.createElement('script');
      s.id = id; s.src = (boot.root || '') + 'i18n/' + loc + '.js';
      document.head.appendChild(s);
    }
    var done = false;
    function ready() { if (!done && dicts[loc]) { done = true; cb(); } }
    s.addEventListener('load', ready);
    s.addEventListener('error', function () { if (!done) { done = true; cb(); } });
    ready();
  }

  function setLocale(loc, opts) {
    if (LOCALES.indexOf(loc) < 0) return;
    opts = opts || {};
    if (opts.persist && page) {
      store('scalia.locale', loc);
      if (loc !== page) { location.href = (boot.root || '/') + loc + '/' + location.hash; return; }
    }
    if (opts.persist && !page) {
      store('scalia.locale', loc);
      // A manual choice replaces any ?lang= in the address.
      try {
        var u = new URL(location.href);
        if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); history.replaceState(null, '', u.pathname + u.search + u.hash); }
      } catch (e) {}
    }
    loadDict(loc, function () {
      apply(loc);
      d.classList.remove('i18n-wait');
    });
  }

  function setCurrency(c, opts) {
    if (c !== 'EUR' && c !== 'USD') return;
    currency = c;
    if (opts && opts.persist) store('scalia.currency', c);
    d.setAttribute('data-currency', c);
    Array.prototype.forEach.call(document.querySelectorAll('[data-currency-switch] [data-currency]'), function (b) {
      var on = b.getAttribute('data-currency') === c;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    d.dispatchEvent(new CustomEvent('scalia:currency', { detail: { currency: c } }));
  }

  /* ----------------------------------------------------- currency switch --
     A two-option radiogroup: click, or arrow keys between € and $. */
  function initCurrency() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-currency-switch]'), function (group) {
      group.addEventListener('click', function (e) {
        var b = e.target.closest('[data-currency]');
        if (b) setCurrency(b.getAttribute('data-currency'), { persist: true });
      });
      group.addEventListener('keydown', function (e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
        e.preventDefault();
        var next = currency === 'EUR' ? 'USD' : 'EUR';
        setCurrency(next, { persist: true });
        var nb = group.querySelector('[data-currency="' + next + '"]');
        if (nb) nb.focus();
      });
    });
    setCurrency(currency);
  }

  /* ----------------------------------------------------- language switch --
     Compact button (flag + code) opening a small glass menu. Keyboard:
     Enter/Space/ArrowDown open, arrows move, Escape closes, Tab leaves. */
  var langRoot, langBtn, langMenu, langItems = [];
  function syncLangUI() {
    if (!langRoot) return;
    var f = langRoot.querySelector('[data-lang-flag]'), c = langRoot.querySelector('[data-lang-code]');
    if (f) f.textContent = FLAGS[current];
    if (c) c.textContent = CODES[current];
    langItems.forEach(function (it) {
      it.setAttribute('aria-checked', it.getAttribute('data-lang') === current ? 'true' : 'false');
    });
  }
  function openLang(focusIdx) {
    langRoot.setAttribute('data-open', 'true');
    langBtn.setAttribute('aria-expanded', 'true');
    var i = typeof focusIdx === 'number' ? focusIdx : Math.max(0, LOCALES.indexOf(current));
    setTimeout(function () { if (langItems[i]) langItems[i].focus(); }, 30);
  }
  function closeLang(refocus) {
    if (!langRoot || langRoot.getAttribute('data-open') !== 'true') return;
    langRoot.setAttribute('data-open', 'false');
    langBtn.setAttribute('aria-expanded', 'false');
    if (refocus) langBtn.focus();
  }
  function initLang() {
    langRoot = document.querySelector('[data-lang]');
    if (!langRoot) return;
    langBtn = langRoot.querySelector('[data-lang-toggle]');
    langMenu = langRoot.querySelector('[data-lang-menu]');
    langItems = Array.prototype.slice.call(langMenu.querySelectorAll('[data-lang-option]'));
    langBtn.addEventListener('click', function () {
      if (langRoot.getAttribute('data-open') === 'true') closeLang(false); else openLang();
    });
    langBtn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openLang(); }
    });
    langMenu.addEventListener('click', function (e) {
      var it = e.target.closest('[data-lang-option]');
      if (!it) return;
      setLocale(it.getAttribute('data-lang'), { persist: true });
      closeLang(true);
    });
    langMenu.addEventListener('keydown', function (e) {
      var i = langItems.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); langItems[(i + 1) % langItems.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); langItems[(i - 1 + langItems.length) % langItems.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); langItems[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); langItems[langItems.length - 1].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeLang(true); }
      else if (e.key === 'Tab') { closeLang(false); }
    });
    document.addEventListener('click', function (e) { if (!langRoot.contains(e.target)) closeLang(false); });
  }

  /* ---------------------------------------------------------------- init -- */
  if (!page) collect();
  initCurrency();
  initLang();
  window.ScaliaI18n = {
    t: function (fr) { return t(fr, current); },
    locale: function () { return current; },
    currency: function () { return currency; },
    intl: function () { return INTL[current]; },
    setLocale: setLocale,
    setCurrency: setCurrency,
    on: function (name, fn) { d.addEventListener('scalia:' + name, function (e) { fn(e.detail); }); }
  };
  setLocale(boot.locale || 'fr');
})();

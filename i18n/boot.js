/* ==========================================================================
   Scalia · i18n boot (runs in <head>, before first paint)
   Decides the locale and the currency as early as possible so the page is
   never shown in the wrong language:
     1. ?lang=fr|en|es in the URL (shared links, hreflang alternates)
     2. the visitor's saved choice (localStorage scalia.locale)
     3. the visitor's country, from the network: the scalia_country cookie
        written by middleware.js from Vercel's x-vercel-ip-country (country
        code only, never the IP). Countries not listed below get English.
     4. the browser's preferred languages (no country known, e.g. locally)
     5. French
   A manual choice is saved and always wins over detection on later visits.
   It also decides the visitor's time zone, once, for the booking:
     1. a zone chosen by hand (localStorage scalia.tz)
     2. the zone of the connection: the scalia_timezone cookie (IANA name
        only), written by middleware.js from x-vercel-ip-timezone
     3. the browser's zone
     4. America/Santo_Domingo
   Both cookies come with the page itself, so this works on the first visit.
   ========================================================================== */
(function () {
  'use strict';
  var d = document.documentElement;
  var me = document.currentScript;
  var ROOT = (me && me.getAttribute('data-root')) || '';
  var LOCALES = ['fr', 'en', 'es'];
  var KEY_LOCALE = 'scalia.locale';
  var KEY_CURRENCY = 'scalia.currency';

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function has(l) { return LOCALES.indexOf(l) > -1; }

  // Country -> locale (the single mapping). Any other country: English.
  var FR = 'FR CH BE LU MC';
  var ES = 'DO ES MX CO AR CL PE EC VE UY PY BO CR PA GT HN SV NI CU PR';
  var COUNTRY = {};
  FR.split(' ').forEach(function (c) { COUNTRY[c] = 'fr'; });
  ES.split(' ').forEach(function (c) { COUNTRY[c] = 'es'; });
  function edgeCountry() {
    var m = document.querySelector('meta[name="scalia-country"]');
    var v = m && m.content;
    if (!v) { var c = document.cookie.match(/(?:^|;\s*)scalia_country=([A-Za-z]{2})/); v = c && c[1]; }
    return v ? v.toUpperCase() : null;
  }
  function browserLocale() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var two = String(list[i]).slice(0, 2).toLowerCase();
      if (has(two)) return two;
    }
    return null;
  }
  function countryLocale(c) { return c ? (COUNTRY[c] || 'en') : null; }
  var locale, source, country = null;
  var q = null;
  try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  var saved = read(KEY_LOCALE);
  if (has(q)) { locale = q; source = 'url'; }
  else if (has(saved)) { locale = saved; source = 'saved'; }
  else {
    country = edgeCountry();
    locale = countryLocale(country);
    source = locale ? 'country' : null;
    if (!locale) { locale = browserLocale(); source = locale ? 'browser' : null; }
    if (!locale) { locale = 'fr'; source = 'default'; }
  }

  function zoneOk(z) {
    if (!z || z.length > 64) return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true; } catch (e) { return false; }
  }
  var timezone = read('scalia.tz'), tzSource = 'manual';
  if (!zoneOk(timezone)) {
    var zc = document.cookie.match(/(?:^|;\s*)scalia_timezone=([A-Za-z0-9_+\-\/]{1,64})(?:;|$)/);
    timezone = zc && zc[1]; tzSource = 'ip';
    if (!zoneOk(timezone)) {
      timezone = null; tzSource = 'browser';
      try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
      if (!zoneOk(timezone)) { timezone = 'America/Santo_Domingo'; tzSource = 'fallback'; }
    }
  }

  var currency = read(KEY_CURRENCY);
  if (currency !== 'EUR' && currency !== 'USD') currency = 'EUR';

  d.lang = locale;
  d.setAttribute('data-locale', locale);
  d.setAttribute('data-currency', currency);
  window.SCALIA_I18N_BOOT = { locale: locale, source: source, country: country, currency: currency, root: ROOT, timezone: timezone, tzSource: tzSource };

  // French is in the HTML. Other locales: fetch the dictionary now and keep
  // the page hidden until it is applied (with a safety release).
  if (locale !== 'fr') {
    d.classList.add('i18n-wait');
    var s = document.createElement('script');
    s.src = ROOT + 'i18n/' + locale + '.js';
    s.id = 'i18n-dict-' + locale;
    document.head.appendChild(s);
    setTimeout(function () { d.classList.remove('i18n-wait'); }, 2500);
  }
})();

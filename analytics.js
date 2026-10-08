/* ==========================================================================
   Scalia · audience measurement (Vercel Web Analytics, cookieless)
   Page views are recorded by Vercel's script. The few events below are sent
   with short, stable names and coarse labels only: never a name, an email,
   a phone number, typed text or a personal URL. No cookie, no persistent id.

   The script only loads on a deployed host (never on localhost / LAN), so
   local tests send nothing. Custom events need a Vercel Pro or Enterprise
   plan; on Hobby they are simply ignored by Vercel.

   Events
     cta_click         primary call-to-action clicked     { place }
     calendly_open     booking calendar opened            { place, lang }
     whatsapp_click    WhatsApp link or button clicked    { place }
     email_click       email link clicked                 { place }
     testimonial_play  testimonial video started          { video }  (Wistia id)
     language_change   language switched by the visitor   { to }
     currency_change   currency switched by the visitor   { to }
   place = where on the page: nav, menu, hero, footer, fab, or a section id.
   ========================================================================== */
(function () {
  'use strict';

  var SCRIPT = '/_vercel/insights/script.js';
  var LOCAL = /^(localhost|127\.|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.(local|test|localhost)$/.test(location.hostname);

  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  if (!LOCAL && location.protocol === 'https:') {
    var s = document.createElement('script');
    s.defer = true;
    s.src = SCRIPT;
    document.head.appendChild(s);
  }

  function track(name, data) {
    if (LOCAL) return;
    try { window.va('event', data ? { name: name, data: data } : { name: name }); } catch (e) {}
  }
  window.scaliaTrack = track;

  function place(el) {
    if (el.closest('#wa-fab')) return 'fab';
    if (el.closest('#menu')) return 'menu';
    if (el.closest('header')) return 'nav';
    if (el.closest('footer')) return 'footer';
    if (el.closest('.hero, .sx-hero')) return 'hero';
    var sec = el.closest('section[id]');
    return sec ? sec.id : 'page';
  }
  function locale() { return window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr'; }

  // One delegated listener; each click maps to at most one event.
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button');
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (el.matches('[data-open-calendly], [data-action="open-calendly"]')) { track('calendly_open', { place: place(el), lang: locale() }); return; }
    if (/^https:\/\/wa\.me\//.test(href)) { track('whatsapp_click', { place: place(el) }); return; }
    if (/^mailto:/.test(href)) { track('email_click', { place: place(el) }); return; }
    if (el.matches('.btn--primary')) { track('cta_click', { place: place(el) }); return; }
    var lang = el.getAttribute('data-lang');
    if (el.hasAttribute('data-lang-option') && lang && lang !== locale()) { track('language_change', { to: lang }); return; }
    var cur = el.getAttribute('data-currency');
    if (cur && window.ScaliaI18n && cur !== window.ScaliaI18n.currency()) { track('currency_change', { to: cur }); }
  }, true);
})();

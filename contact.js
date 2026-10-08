/* ==========================================================================
   Scalia · contact links (footer, both pages)
   The links are written in the HTML (they work without JS). This file is
   the single source to keep them in sync: change a value here and every
   [data-contact] link on the page follows. An empty value would leave the
   HTML as written.
   ========================================================================== */
(function () {
  'use strict';

  var CONTACT = {
    email: 'contact@scalia.do',
    whatsapp: '33769965798',
    linkedin: 'https://www.linkedin.com/in/kevi-moronta',
    instagram: 'https://www.instagram.com/kevimoronta/'
  };

  /* Optional pre-filled WhatsApp message, per language. Empty = no message
     (current behaviour). Fill these to localize it later. */
  var WHATSAPP_MESSAGE = { fr: '', en: '', es: '' };

  function hrefFor(key, value) {
    if (key === 'email') return 'mailto:' + value;
    if (key === 'whatsapp') {
      var loc = window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr';
      var msg = WHATSAPP_MESSAGE[loc];
      return 'https://wa.me/' + String(value).replace(/\D/g, '') + (msg ? '?text=' + encodeURIComponent(msg) : '');
    }
    return value;
  }

  function hydrate() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-contact]'), function (el) {
    var key = el.getAttribute('data-contact');
    var value = CONTACT[key];
    if (!value) return;                                   // stays a placeholder
    el.setAttribute('href', hrefFor(key, value));
    el.classList.remove('is-pending');
    if (key !== 'email') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
  });
  }
  hydrate();
  if (window.ScaliaI18n) window.ScaliaI18n.on('locale', hydrate);
})();

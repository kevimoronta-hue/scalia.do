/* ==========================================================================
   Scalia Portal · shared browser helpers (/portal/, /admin/)
   · L(fr): the site's i18n rule (French text is the key) with the portal
     dictionary i18n/portal.js; the language follows ScaliaI18n (navbar
     switch, saved choice), else the client's preferred language.
   · api(): same-origin calls; the session is an httpOnly cookie, so this
     script never sees a token. 401 → login page.
   · money() / date(): Intl, one place.
   ========================================================================== */
(function () {
  'use strict';
  var D = window.SCALIA_PORTAL_I18N || {};
  var INTL = { fr: 'fr-FR', en: 'en-US', es: 'es-ES' };
  var warned = {};

  function locale() { return window.ScaliaI18n ? window.ScaliaI18n.locale() : (document.documentElement.lang || 'fr'); }
  function L(fr, vars) {
    var l = locale(), s = fr;
    if (l !== 'fr') {
      var d = D[l] || {};
      if (Object.prototype.hasOwnProperty.call(d, fr)) s = d[fr];
      else if (!warned[l + fr]) { warned[l + fr] = 1; if (window.console) console.warn('[portal i18n] missing ' + l + ':', fr); }
    }
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }

  var STAGES = ['brief', 'mockup', 'development', 'review', 'delivery'];
  var STAGE_NAMES = { brief: 'Brief et préparation', mockup: 'Maquette', development: 'Développement', review: 'Révision et finalisation', delivery: 'Livraison' };
  var STATUS_NAMES = { upcoming: 'À venir', in_progress: 'En cours', waiting_client: 'En attente du client', completed: 'Terminée' };
  var PROJECT_STATUS = { active: 'En cours', on_hold: 'En pause', completed: 'Terminé' };
  var CATEGORIES = { contract: 'Contrat', mockup: 'Maquette', branding: 'Branding', project: 'Document projet', invoice: 'Facture', delivery: 'Livraison', other: 'Autre' };
  var LANG_NAMES = { es: 'Espagnol', fr: 'Français', en: 'Anglais', de: 'Allemand', it: 'Italien', pt: 'Portugais' };
  function stageName(k) { return L(STAGE_NAMES[k] || k); }
  function statusName(k) { return L(STATUS_NAMES[k] || k); }

  /* ------------------------------------------------------------ formats */
  function intl() { return INTL[locale()] || 'fr-FR'; }
  function money(n, cur) {
    n = Number(n) || 0;
    var frac = Math.round(n * 100) % 100 ? 2 : 0;
    // Dominican peso: "RD$35,000" as written in the Dominican Republic.
    if (cur === 'DOP') return 'RD$' + new Intl.NumberFormat(locale() === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: frac, maximumFractionDigits: frac }).format(n);
    try { return new Intl.NumberFormat(intl(), { style: 'currency', currency: cur || 'EUR', minimumFractionDigits: frac, maximumFractionDigits: frac }).format(n); }
    catch (e) { return n + ' ' + cur; }
  }
  function date(v) {
    if (!v) return '';
    var only = /^\d{4}-\d{2}-\d{2}$/.test(v);
    var d = new Date(only ? v + 'T00:00:00Z' : v);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat(intl(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: only ? 'UTC' : undefined }).format(d);
  }
  function size(b) {
    b = Number(b) || 0;
    if (!b) return '';
    var u = b >= 1048576 ? [b / 1048576, 'MB'] : [Math.max(1, Math.round(b / 1024)), 'KB'];
    return new Intl.NumberFormat(intl(), { maximumFractionDigits: u[1] === 'MB' ? 1 : 0 }).format(u[0]) + ' ' + u[1];
  }
  function pct(n) { return new Intl.NumberFormat(intl(), { maximumFractionDigits: 0 }).format(Number(n) || 0) + ' %'; }

  /* ---------------------------------------------------------------- dom */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  // Static labels: data-t (text), data-t-aria, data-t-ph, data-t-title.
  function applyStatic(root) {
    $$('[data-t]', root).forEach(function (el) { el.textContent = L(el.getAttribute('data-t')); });
    $$('[data-t-aria]', root).forEach(function (el) { el.setAttribute('aria-label', L(el.getAttribute('data-t-aria'))); });
    $$('[data-t-ph]', root).forEach(function (el) { el.setAttribute('placeholder', L(el.getAttribute('data-t-ph'))); });
    var t = document.querySelector('meta[name="pt-title"]');
    if (t) document.title = L(t.content) + ' · Scalia';
  }
  function onLocale(fn) { if (window.ScaliaI18n) window.ScaliaI18n.on('locale', fn); }
  // The client's language when they never chose one themselves.
  function preferLocale(l) {
    var boot = window.SCALIA_I18N_BOOT || {};
    if (!l || boot.source === 'saved' || boot.source === 'url' || !window.ScaliaI18n) return;
    if (window.ScaliaI18n.locale() !== l) window.ScaliaI18n.setLocale(l, { persist: false });
  }

  /* ---------------------------------------------------------------- api */
  var ERRORS = {
    INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
    RATE_LIMITED: 'Trop de tentatives. Réessayez dans quelques minutes.',
    LINK_INVALID: 'Ce lien n’est plus valable. Demandez-en un nouveau.',
    PASSWORD_WEAK: 'Le mot de passe doit contenir au moins 10 caractères.',
    PASSWORD_MISMATCH: 'Les deux mots de passe ne correspondent pas.',
    CURRENCY_LOCKED: 'La devise ne peut plus changer : des paiements sont enregistrés.',
    NOT_CONFIGURED: 'Le portail n’est pas encore configuré.',
    EMAIL_EXISTS: 'Cette adresse a déjà un accès. Utilisez « Renvoyer l’invitation ».',
    REQUIRED: 'Champ obligatoire.',
    INVALID: 'Valeur invalide.',
    TOO_LONG: 'Texte trop long.',
    FILE_TOO_LARGE: 'Fichier trop lourd (50 Mo maximum).',
    FILE_TYPE: 'Type de fichier non accepté (PDF, images, documents Office, ZIP, vidéo).',
    UPLOAD_MISSING: 'Le fichier n’a pas été reçu. Réessayez.',
    NOT_FOUND: 'Élément introuvable.',
    FORBIDDEN: 'Accès refusé.',
    NETWORK: 'Connexion impossible. Vérifiez votre réseau et réessayez.',
    SERVER_ERROR: 'Une erreur est survenue. Réessayez.'
  };
  function errorText(code) { return L(ERRORS[code] || ERRORS.SERVER_ERROR); }

  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.body ? 'POST' : 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (opts.body) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    return fetch(path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.status === 401 && !opts.noRedirect) { toLogin(); return new Promise(function () {}); }
        if (!r.ok) { var e = new Error(data.error || 'SERVER_ERROR'); e.code = data.error || 'SERVER_ERROR'; e.field = data.field; e.status = r.status; throw e; }
        return data;
      });
    }, function () { var e = new Error('NETWORK'); e.code = 'NETWORK'; throw e; });
  }
  function portalApi(a, body, opts) { return api('/api/portal/?a=' + a, Object.assign({ body: body }, opts || {})); }
  function adminApi(a, body, opts) { return api('/api/portal-admin/?a=' + a, Object.assign({ body: body }, opts || {})); }
  function toLogin() {
    var next = location.pathname + location.search;
    location.replace('/portal/login/?next=' + encodeURIComponent(next));
  }
  function logout() {
    portalApi('logout', {}, { noRedirect: true }).catch(function () {}).then(function () { location.replace('/portal/login/'); });
  }

  /* -------------------------------------------------------------- toast */
  var toastEl, toastTimer;
  function toast(msg, tone) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'pt-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.setAttribute('data-tone', tone || 'ok');
    toastEl.setAttribute('data-show', '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.removeAttribute('data-show'); }, 3200);
  }
  // Disables a button while a promise runs.
  function busy(btn, p) {
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    return p.then(function (v) { if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); } return v; },
      function (e) { if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); } throw e; });
  }
  // Shows a field error from an API error (data-field="name").
  function formError(form, e) {
    $$('[data-invalid]', form).forEach(function (f) { f.removeAttribute('data-invalid'); var m = f.querySelector('.pt-error'); if (m) m.remove(); });
    var alert = form.querySelector('[data-form-alert]');
    var field = e.field && form.querySelector('[data-field="' + e.field + '"]');
    if (field) {
      field.setAttribute('data-invalid', '');
      var m = document.createElement('p'); m.className = 'pt-error'; m.textContent = errorText(e.code); field.appendChild(m);
      var input = field.querySelector('input,select,textarea'); if (input) input.focus();
      if (alert) alert.hidden = true;
    } else if (alert) { alert.textContent = errorText(e.code); alert.hidden = false; }
    else toast(errorText(e.code), 'err');
  }

  /* ---------------------------------------------------------- inactivity */
  // Signed-in pages. The server ends a session after its idle limit
  // (admin 30 min, client 1 h, api/portal.js ping); the page measures the
  // same thing on its side, warns 2 minutes before, then signs out and
  // sends to the login page. Activity in any tab of the site counts
  // (localStorage), and keeps the server session alive (ping, at most
  // every 30 s). The page acts a little before the server, which only
  // sees the pings.
  var ACTIVITY_KEY = 'scalia_activity';
  var WARN_MS = 120e3, MARGIN_MS = 120e3, PING_MS = 30e3;
  function watchIdle() {
    var limit = 0, mem = Date.now(), lastPing = 0, warn = null, timer = null, done = false;
    function last() { var v = 0; try { v = Number(localStorage.getItem(ACTIVITY_KEY)) || 0; } catch (e) {} return Math.max(v, mem); }
    function ping() {
      lastPing = Date.now();
      return api('/api/portal/?a=ping', { noRedirect: true }).then(function (r) {
        limit = Math.max(60e3, r.idleSeconds * 1000 - MARGIN_MS);
      }, function (e) { if (e.status === 401) end(); });
    }
    function mark() {
      if (done) return;
      mem = Date.now();
      try { localStorage.setItem(ACTIVITY_KEY, String(mem)); } catch (e) {}
      if (Date.now() - lastPing > PING_MS) ping();
    }
    function end() {
      if (done) return;
      done = true; clearInterval(timer);
      portalApi('logout', {}, { noRedirect: true }).catch(function () {}).then(function () {
        location.replace('/portal/login/?expired=1&next=' + encodeURIComponent(location.pathname + location.search));
      });
    }
    function clock(ms) { var t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
    function showWarn(left) {
      if (!warn) {
        warn = document.createElement('dialog');
        warn.className = 'ad-dialog';
        warn.setAttribute('aria-labelledby', 'pt-idle-t');
        warn.innerHTML = '<form method="dialog"><h2 id="pt-idle-t">' + esc(L('Toujours là ?')) + '</h2>' +
          '<p class="pt-muted" data-idle-text></p>' +
          '<div class="pt-actions"><button class="btn btn--primary btn--lg" type="button" data-idle-stay>' + esc(L('Rester connecté')) + '</button>' +
          '<button class="btn btn--secondary btn--lg" type="button" data-idle-out>' + esc(L('Se déconnecter')) + '</button></div></form>';
        document.body.appendChild(warn);
        warn.addEventListener('cancel', function (e) { e.preventDefault(); });
        warn.querySelector('[data-idle-stay]').addEventListener('click', function () { lastPing = 0; mark(); hideWarn(); });
        warn.querySelector('[data-idle-out]').addEventListener('click', function () { done = true; logout(); });
        warn.showModal();
      }
      warn.querySelector('[data-idle-text]').textContent = L('Sans activité, vous serez déconnecté dans {time} pour protéger votre espace.', { time: clock(left) });
    }
    function hideWarn() { if (warn) { warn.close(); warn.remove(); warn = null; } }
    function tick() {
      if (!limit || done) return;
      var idle = Date.now() - last();
      if (idle >= limit) { hideWarn(); return end(); }
      if (idle >= limit - WARN_MS) showWarn(limit - idle); else hideWarn();
    }
    // While the warning is open, only its button counts as activity.
    var onActivity = function () { if (!warn) mark(); };
    ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(function (t) { window.addEventListener(t, onActivity, { passive: true, capture: true }); });
    var lastMove = 0;
    window.addEventListener('pointermove', function () { if (Date.now() - lastMove > 5e3) { lastMove = Date.now(); onActivity(); } }, { passive: true });
    window.addEventListener('storage', function (e) { if (e.key === ACTIVITY_KEY) tick(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
    mark();
    timer = setInterval(tick, 1000);
  }

  window.Portal = {
    L: L, locale: locale, STAGES: STAGES, stageName: stageName, statusName: statusName,
    PROJECT_STATUS: PROJECT_STATUS, CATEGORIES: CATEGORIES, LANG_NAMES: LANG_NAMES, STATUS_NAMES: STATUS_NAMES,
    money: money, date: date, size: size, pct: pct, esc: esc, $: $, $$: $$, applyStatic: applyStatic, onLocale: onLocale,
    preferLocale: preferLocale, api: api, portalApi: portalApi, adminApi: adminApi, errorText: errorText,
    toLogin: toLogin, logout: logout, watchIdle: watchIdle, toast: toast, busy: busy, formError: formError
  };
})();

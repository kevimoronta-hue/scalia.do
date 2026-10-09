/* ==========================================================================
   Scalia · application (/join/)
   Twelve questions, one per screen, then the contact details and the CV.
   Picking an answer moves on by itself after a short beat; "Retour" goes
   back with the answer still selected. A draft (answers, step, details,
   never the CV) stays in this browser for 24 hours.
   ========================================================================== */
(function () {
  'use strict';
  var form = document.querySelector('[data-jn-form]');
  if (!form) return;

  var TOTAL = 12, FORM_STEP = 13;
  var DRAFT_KEY = 'scalia.applicationDraft', DRAFT_TTL = 24 * 3600 * 1000;
  var CV_MAX = 4 * 1024 * 1024, CV_EXT = /\.(pdf|docx?)$/i;
  var NEXT_DELAY = 260, OUT_MS = 180;
  var API = '/api/apply/';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  function L(fr) { return window.ScaliaI18n ? window.ScaliaI18n.t(fr) : fr; }
  function F(fr, vars) { return L(fr).replace(/\{(\w+)\}/g, function (m, k) { return vars[k]; }); }
  function locale() { return window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr'; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var steps = $$('[data-step]', form);
  var bars = $$('[data-jn-bars] li');
  var count = $('[data-jn-count]');
  var prev = $('[data-jn-prev]');
  var done = $('[data-jn-done]');
  var S = { step: 1, answers: new Array(TOTAL).fill(''), start: Date.now(), cv: null, busy: false, sending: false };

  /* -------------------------------------------------------------- links -- */
  // Back to Scalia's home page, in the language of this page.
  function homeUrl() { return '/' + locale() + '/'; }
  function syncHome() { $$('[data-jn-home]').forEach(function (a) { a.href = homeUrl(); }); }

  /* -------------------------------------------------------------- draft -- */
  var FIELDS = ['firstName', 'lastName', 'email', 'phone', 'country', 'city', 'role', 'linkedin', 'portfolio'];
  function saveDraft() {
    try {
      var f = {};
      FIELDS.forEach(function (k) { f[k] = form.elements[k].value; });
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, at: Date.now(), start: S.start, step: S.step, answers: S.answers, fields: f, cc: phone && phone.manual() ? phone.cc() : '' }));
    } catch (e) {}
  }
  function readDraft() {
    try {
      var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!d || d.v !== 1 || Date.now() - d.at > DRAFT_TTL) { localStorage.removeItem(DRAFT_KEY); return null; }
      return d;
    } catch (e) { return null; }
  }
  function dropDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

  /* ----------------------------------------------------------- progress -- */
  function renderHead() {
    bars.forEach(function (b, i) {
      var n = i + 1;
      b.className = n < S.step || S.step === FORM_STEP ? 'is-done' : n === S.step ? 'is-current' : '';
    });
    count.textContent = S.step === FORM_STEP ? L('Dernière étape') : F('Question {n} sur {t}', { n: S.step, t: TOTAL });
    prev.style.visibility = S.step === 1 ? 'hidden' : '';
  }

  /* ---------------------------------------------------------- questions -- */
  function stepEl(n) { return form.querySelector('[data-step="' + n + '"]'); }
  function renderAnswers(n) {
    var sec = stepEl(n);
    if (!sec || n > TOTAL) return;
    $$('.jn-card', sec).forEach(function (c) { c.setAttribute('aria-checked', String(c.getAttribute('data-v') === S.answers[n - 1])); });
  }
  // One screen leaves (fade, 8px to the side it goes), the next comes in.
  function go(n, dir) {
    if (n < 1 || n > FORM_STEP || n === S.step) return;
    var from = stepEl(S.step), to = stepEl(n);
    S.busy = true;
    var swap = function () {
      from.hidden = true; from.classList.remove('is-out');
      S.step = n;
      renderAnswers(n);
      renderHead();
      to.hidden = false;
      form.setAttribute('data-dir', dir);
      if (!reduce.matches) { to.classList.remove('is-in'); void to.offsetWidth; to.classList.add('is-in'); }
      window.scrollTo({ top: 0, behavior: 'instant' });
      var target = n === FORM_STEP ? $('#jn-q13') : (to.querySelector('[aria-checked="true"]') || $('.jn-q', to));
      target.focus({ preventScroll: true });
      S.busy = false;
      saveDraft();
    };
    if (reduce.matches) { swap(); return; }
    form.setAttribute('data-dir', dir);
    from.classList.add('is-out');
    setTimeout(swap, OUT_MS);
  }
  form.addEventListener('click', function (e) {
    var card = e.target.closest('.jn-card');
    if (!card || S.busy) return;
    var n = +card.closest('[data-step]').getAttribute('data-step');
    S.answers[n - 1] = card.getAttribute('data-v');
    renderAnswers(n);
    saveDraft();
    S.busy = true;
    setTimeout(function () { S.busy = false; go(n + 1, 'next'); }, NEXT_DELAY);
  });
  // Arrow keys move between the four cards; Enter / Space pick (buttons).
  form.addEventListener('keydown', function (e) {
    var card = e.target.closest && e.target.closest('.jn-card');
    if (!card || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
    e.preventDefault();
    var cards = $$('.jn-card', card.parentNode), i = cards.indexOf(card);
    var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
    cards[(i + d + cards.length) % cards.length].focus();
  });
  prev.addEventListener('click', function () { if (!S.busy) go(S.step - 1, 'back'); });

  /* -------------------------------------------------------------- phone -- */
  var phone = window.ScaliaPhone ? window.ScaliaPhone.attach($('[data-pf]'), { onChange: saveDraft }) : null;

  /* ------------------------------------------------------------ country -- */
  var countrySel = $('[data-jn-country]');
  function fillCountries() {
    var keep = countrySel.value;
    var names = window.ScaliaPhone ? Object.keys(window.ScaliaPhone.DIALS) : [];
    var intlTag = window.ScaliaI18n && window.ScaliaI18n.intl ? window.ScaliaI18n.intl() : 'fr-FR';
    var list = names.map(function (c) { return [c, window.ScaliaPhone.countryName(c)]; })
      .sort(function (a, b) { return a[1].localeCompare(b[1], intlTag); });
    countrySel.innerHTML = '<option value="">' + L('Choisir un pays') + '</option>' +
      list.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('');
    countrySel.value = keep;
  }

  /* ----------------------------------------------------------------- CV -- */
  var drop = $('[data-jn-drop]'), cvInput = $('[data-jn-cv]');
  function size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', locale() === 'en' ? '.' : ',') + ' ' + L('Mo') : Math.max(1, Math.round(n / 1024)) + ' ' + L('Ko'); }
  function cvCheck(file) {
    if (!file) return 'CV_REQUIRED';
    if (!CV_EXT.test(file.name)) return 'CV_TYPE';
    if (file.size > CV_MAX) return 'CV_SIZE';
    if (!file.size) return 'CV_TYPE';
    return '';
  }
  function setCv(file) {
    var err = cvCheck(file);
    if (err) { S.cv = null; renderCv(); setError('cv', err); return; }
    S.cv = file;
    setError('cv', '');
    renderCv();
  }
  function renderCv() {
    var f = S.cv;
    drop.classList.toggle('has-file', !!f);
    $('[data-jn-cv-title]').textContent = f ? f.name : L('Ajouter votre CV');
    $('[data-jn-cv-sub]').textContent = f ? size(f.size) : L('PDF, DOC ou DOCX · 4 Mo maximum');
    $('[data-jn-cv-swap]').hidden = !f;
  }
  cvInput.addEventListener('change', function () { if (cvInput.files[0]) setCv(cvInput.files[0]); });
  ['dragenter', 'dragover'].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
  });
  drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) setCv(f); });

  /* --------------------------------------------------------- validation -- */
  var MSG = {
    REQUIRED: 'Ce champ est requis.',
    EMAIL: 'Adresse email invalide.',
    PHONE: 'Numéro invalide. Vérifiez l’indicatif et le numéro.',
    URL: 'Lien invalide.',
    COUNTRY: 'Choisissez un pays.',
    CV_REQUIRED: 'Ajoutez votre CV.',
    CV_TYPE: 'Format accepté : PDF, DOC ou DOCX.',
    CV_SIZE: 'Fichier trop lourd : 4 Mo maximum.',
    CONSENT: 'Merci de cocher cette case pour envoyer votre candidature.'
  };
  var ERR_FIELD = { firstName: 'first', lastName: 'last', email: 'email', phone: 'phone', country: 'country', city: 'city', role: 'role', linkedin: 'linkedin', portfolio: 'portfolio', cv: 'cv', consent: 'consent' };
  function setError(name, code) {
    var p = $('#jn-' + ERR_FIELD[name] + '-err');
    var input = name === 'cv' ? cvInput : form.elements[name];
    p.textContent = code ? L(MSG[code] || MSG.REQUIRED) : '';
    p.setAttribute('data-code', code || '');
    if (input) input.setAttribute('aria-invalid', code ? 'true' : 'false');
    if (name === 'cv') drop.classList.toggle('is-invalid', !!code);
  }
  function urlOk(v) { return !v || /^(https?:\/\/)?[^\s/$.?#][^\s]*\.[^\s]{2,}$/i.test(v); }
  function check() {
    var el = form.elements, errs = {};
    ['firstName', 'lastName', 'city', 'role'].forEach(function (k) { if (!el[k].value.trim()) errs[k] = 'REQUIRED'; });
    var em = el.email.value.trim();
    if (!em) errs.email = 'REQUIRED'; else if (!/^[^\s@<>()",;:]+@[^\s@]+\.[A-Za-z]{2,}$/.test(em)) errs.email = 'EMAIL';
    if (!el.phone.value.trim()) errs.phone = 'REQUIRED'; else if (phone && !phone.valid()) errs.phone = 'PHONE';
    if (!el.country.value) errs.country = 'COUNTRY';
    if (!urlOk(el.linkedin.value.trim())) errs.linkedin = 'URL';
    if (!urlOk(el.portfolio.value.trim())) errs.portfolio = 'URL';
    var cvErr = cvCheck(S.cv); if (cvErr) errs.cv = cvErr;
    if (!el.consent.checked) errs.consent = 'CONSENT';
    Object.keys(ERR_FIELD).forEach(function (k) { setError(k, errs[k] || ''); });
    return errs;
  }
  // An error clears as soon as its field is fixed.
  form.addEventListener('input', function (e) {
    var n = e.target.name;
    if (n && ERR_FIELD[n] && e.target.getAttribute('aria-invalid') === 'true') setError(n, '');
    if (FIELDS.indexOf(n) >= 0) saveDraft();
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'consent' && e.target.checked) setError('consent', '');
    if (e.target.name === 'country') { setError('country', ''); saveDraft(); }
  });

  /* --------------------------------------------------------------- send -- */
  var fail = $('[data-jn-fail]'), submit = $('[data-jn-submit]');
  var SERVER = { INVALID: 'REQUIRED', TOO_LARGE: 'CV_SIZE', TYPE: 'CV_TYPE' };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (S.step !== FORM_STEP || S.sending) return;
    fail.hidden = true;
    var errs = check();
    var first = Object.keys(ERR_FIELD).filter(function (k) { return errs[k]; })[0];
    if (first) {
      var target = first === 'cv' ? drop : form.elements[first];
      (first === 'cv' ? cvInput : target).focus({ preventScroll: true });
      target.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
      return;
    }
    if (S.answers.some(function (a) { return !a; })) { go(S.answers.indexOf('') + 1, 'back'); return; }

    var fd = new FormData();
    FIELDS.forEach(function (k) { if (k !== 'phone') fd.append(k, form.elements[k].value.trim()); });
    fd.append('phone', phone ? phone.e164() : form.elements.phone.value.trim());
    fd.append('phoneDial', phone ? phone.dial() : '');
    S.answers.forEach(function (a, i) { fd.append('q' + (i + 1), a); });
    fd.append('consent', '1');
    fd.append('locale', locale());
    fd.append('website', form.elements.website.value);
    fd.append('elapsed', String(Date.now() - S.start));
    fd.append('cv', S.cv, S.cv.name);

    S.sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = L('Envoi…');
    fetch(API, { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 201) return sent();
        if (res.status === 422 && res.body.fields) {
          var f = res.body.fields;
          if (f.answers) { go(1, 'back'); return; }
          Object.keys(f).forEach(function (k) {
            if (!ERR_FIELD[k]) return;
            var code = k === 'cv' ? (f.cv === 'TOO_LARGE' ? 'CV_SIZE' : f.cv === 'TYPE' ? 'CV_TYPE' : 'CV_REQUIRED')
              : k === 'email' ? 'EMAIL' : k === 'phone' ? 'PHONE' : k === 'linkedin' || k === 'portfolio' ? 'URL' : k === 'consent' ? 'CONSENT' : SERVER[f[k]] || 'REQUIRED';
            setError(k, code);
          });
          return;
        }
        if (res.status === 413) { setError('cv', 'CV_SIZE'); return; }
        showFail(res.status === 429 ? 'Trop de tentatives. Réessayez un peu plus tard.' : 'L’envoi n’a pas abouti. Réessayez dans un instant ou écrivez-nous à contact@scalia.do.');
      }, function () { showFail('L’envoi n’a pas abouti. Vérifiez votre connexion et réessayez.'); })
      .then(function () {
        S.sending = false;
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.textContent = L('Envoyer ma candidature');
      });
  });
  function showFail(msg) { fail.textContent = L(msg); fail.hidden = false; }

  // Only after the server's success: 5, 4, 3, 2, 1, then the home page.
  function sent() {
    dropDraft();
    form.hidden = true;
    $('[data-jn-head]').hidden = true;
    done.hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    done.focus({ preventScroll: true });
    var auto = $('[data-jn-auto]'), left = 5;
    var tick = function () {
      if (left === 0) { location.href = homeUrl(); return; }
      auto.textContent = left === 1 ? L('Retour vers Scalia dans 1 seconde…') : F('Retour vers Scalia dans {n} secondes…', { n: left });
      left -= 1;
      setTimeout(tick, 1000);
    };
    tick();
  }

  /* --------------------------------------------------------------- init -- */
  fillCountries();
  var draft = readDraft();
  if (draft) {
    S.start = draft.start || S.start;
    if (Array.isArray(draft.answers) && draft.answers.length === TOTAL) S.answers = draft.answers.map(function (a) { return /^[ABCD]$/.test(a) ? a : ''; });
    FIELDS.forEach(function (k) { if (draft.fields && typeof draft.fields[k] === 'string') form.elements[k].value = draft.fields[k]; });
    if (draft.cc && phone) phone.setCc(draft.cc, true);
    var firstOpen = S.answers.indexOf('') + 1 || FORM_STEP;
    S.step = Math.min(Math.max(1, +draft.step || 1), firstOpen);
  }
  if (!countrySel.value) {
    var ipc = (document.cookie.match(/(?:^|;\s*)scalia_country=([A-Z]{2})/) || [])[1];
    if (ipc && countrySel.querySelector('option[value="' + ipc + '"]')) countrySel.value = ipc;
  }
  stepEl(S.step).hidden = false;
  renderAnswers(S.step);
  renderHead();
  renderCv();
  syncHome();
  if (window.ScaliaI18n) window.ScaliaI18n.on('locale', function () { fillCountries(); renderHead(); renderCv(); syncHome(); });
})();

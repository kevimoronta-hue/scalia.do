/* ==========================================================================
   Scalia Booking · the booking sheet (home page)
   Scalia's own booking: availability and bookings come from /api (Google
   Calendar behind it). Nothing third-party is loaded in the browser.

   Every [data-open-booking] button opens it. If the API is really down,
   the sheet offers WhatsApp and email instead.

   Speed: the sheet is in the page and opens at once. Availability (a few
   KB) is fetched when the page is idle, refreshed when a booking button
   comes near or is pointed at, and reused for a minute; at the click it
   is drawn from memory and quietly refreshed behind if it is older than
   30 s. A booking is always re-checked by the server.
   ========================================================================== */
(function () {
  'use strict';

  var dlg = document.getElementById('bk');
  if (!dlg) return;
  // Browsers without <dialog> support (iOS before 15.4): same sheet, shown
  // with the open attribute.
  if (typeof dlg.showModal !== 'function') {
    dlg.showModal = function () { dlg.setAttribute('open', ''); };
    dlg.close = function () { dlg.removeAttribute('open'); dlg.dispatchEvent(new Event('close')); };
  }
  try { localStorage.removeItem('scalia.booking'); } catch (e) {}   // old test switch

  var root = document.documentElement;
  var css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'booking.css';
  document.head.appendChild(css);

  var API_AVAIL = '/api/availability/';
  var API_BOOK = '/api/book/';
  var TRIGGERS = '[data-open-booking]';
  var FRESH = 60000, REVALIDATE = 30000;

  function L(fr) { return window.ScaliaI18n ? window.ScaliaI18n.t(fr) : fr; }
  function F(fr, vars) { return L(fr).replace(/\{(\w+)\}/g, function (m, k) { return vars[k]; }); }
  function intl() { return window.ScaliaI18n && window.ScaliaI18n.intl ? window.ScaliaI18n.intl() : 'fr-FR'; }
  function locale() { return window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr'; }
  function $(sel) { return dlg.querySelector(sel); }
  function track(name, data) { if (window.scaliaTrack) window.scaliaTrack(name, data); }

  var el = {
    back: $('[data-bk-back]'), meta: $('[data-bk-meta]'), notice: $('[data-bk-notice]'),
    month: $('[data-bk-month]'), prev: $('[data-bk-prev]'), next: $('[data-bk-next]'),
    dow: $('[data-bk-dow]'), days: $('[data-bk-days]'), day: $('[data-bk-day]'), slots: $('[data-bk-slots]'),
    tzNow: $('[data-bk-tz-now]'), tzEdit: $('[data-bk-tz-edit]'), tzPanel: $('[data-bk-tz-panel]'),
    tzSearch: $('[data-bk-tz-search]'), tzList: $('[data-bk-tz-list]'), recap: $('[data-bk-recap]'), form: $('[data-bk-form]'), fail: $('[data-bk-fail]'),
    submit: $('[data-bk-submit]'), doneRecap: $('[data-bk-done-recap]'), ics: $('[data-bk-ics]'),
    types: $('[data-bk-types]'), foot: $('[data-bk-foot]')
  };

  var S = {
    data: null, at: 0, pending: null, failed: false,
    tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })(),
    byDay: {}, days: [], view: null, day: null, slot: null,
    step: 'date', formAt: 0, booking: null, trigger: null, zones: null
  };

  /* --------------------------------------------------------------- dates -- */
  var fmtCache = {};
  function fmt(opts, tz) {
    var k = intl() + '|' + (tz || '') + '|' + JSON.stringify(opts);
    if (!fmtCache[k]) { var o = Object.assign({}, opts); if (tz) o.timeZone = tz; fmtCache[k] = new Intl.DateTimeFormat(intl(), o); }
    return fmtCache[k];
  }
  var keyFmt = {};
  function dayKey(ts, tz) {
    if (!keyFmt[tz]) keyFmt[tz] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return keyFmt[tz].format(ts);
  }
  function keyDate(key) { var p = key.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2], 12); }   // noon UTC of that calendar day
  function longDay(key) { return fmt({ weekday: 'long', day: 'numeric', month: 'long' }, 'UTC').format(keyDate(key)); }
  function timeOf(ts) { return fmt({ hour: '2-digit', minute: '2-digit' }, S.tz).format(ts); }
  function zoneLabel(tz, ts) {
    var off = '';
    try { off = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(ts || Date.now()).filter(function (p) { return p.type === 'timeZoneName'; })[0].value; } catch (e) {}
    return tz.replace(/_/g, ' ') + (off ? ' · ' + off.replace('-', '−') : '');
  }
  function weekStartsSunday() { return locale() === 'en'; }

  /* -------------------------------------------------------------- data ---- */
  function fetchAvail(force) {
    if (S.pending) return S.pending;
    if (!force && S.data && Date.now() - S.at < FRESH) return Promise.resolve(S.data);
    S.pending = fetch(API_AVAIL + (force ? '?fresh=' + Date.now().toString(36) : ''), { headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http_' + r.status); return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.slots)) throw new Error('shape');
        S.data = d; S.at = Date.now(); S.failed = false; index();
        return d;
      })
      .catch(function (e) { S.failed = true; throw e; })
      .then(function (d) { S.pending = null; return d; }, function (e) { S.pending = null; throw e; });
    return S.pending;
  }
  function index() {
    S.byDay = {}; S.days = [];
    if (!S.data) return;
    S.data.slots.forEach(function (iso) {
      var ts = Date.parse(iso), k = dayKey(ts, S.tz);
      if (!S.byDay[k]) { S.byDay[k] = []; S.days.push(k); }
      S.byDay[k].push(ts);
    });
    S.days.sort();
    if (S.day && !S.byDay[S.day]) S.day = null;
    if (S.slot && S.data.slots.indexOf(S.slot) < 0) S.slot = null;
  }

  /* ------------------------------------------------------------- render --- */
  function setStep(step) {
    S.step = step;
    dlg.setAttribute('data-step', step);
    Array.prototype.forEach.call(dlg.querySelectorAll('[data-pane]'), function (p) { p.hidden = p.getAttribute('data-pane') !== step; });
    el.back.hidden = step !== 'form';
    var title = $('[data-pane="' + step + '"] .bk__title');
    dlg.setAttribute('aria-labelledby', title.id);
    if (dlg.hasAttribute('open')) title.focus({ preventScroll: true });
    $('.bk__body').scrollTop = 0;
  }

  function renderMeta() {
    var min = S.data ? S.data.durationMin : 30;
    el.meta.innerHTML =
      '<span class="bk__chip"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8l2.4 1.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>' + F('{n} min', { n: min }) + '</span>' +
      '<span class="bk__chip"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="1.75" y="4" width="8.5" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M10.25 7l4-2.25v6.5l-4-2.25" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>' + L('Visioconférence') + '</span>';
  }

  /* Time zone: the detected one is shown; "Modifier" opens a search
     (8 results at most). With nothing typed, the zones Scalia's visitors
     are most likely in. */
  var LIKELY = ['America/Santo_Domingo', 'America/New_York', 'America/Puerto_Rico', 'America/Bogota',
    'America/Mexico_City', 'Europe/Paris', 'Europe/Madrid', 'Europe/London'];
  function norm(x) { return x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_/]/g, ' ').toLowerCase(); }
  function zones() {
    if (!S.zones) {
      var list = [];
      try { list = Intl.supportedValuesOf('timeZone'); } catch (e) { list = LIKELY.slice(); }
      if (list.indexOf('UTC') < 0) list.push('UTC');
      var now = Date.now();
      S.zones = list.map(function (z) {
        var label = zoneLabel(z, now), off = label.split(' · ')[1] || '';
        return { id: z, city: z.split('/').pop().replace(/_/g, ' '), region: z.indexOf('/') > 0 ? z.split('/')[0] : '', off: off,
          key: norm(z + ' ' + off + ' ' + off.replace('−', '-')) };
      });
    }
    return S.zones;
  }
  function renderTz() { el.tzNow.textContent = zoneLabel(S.tz); }
  function renderZoneList() {
    var q = norm(el.tzSearch.value.trim());
    var all = zones(), picks;
    if (!q) {
      var ids = [S.tz].concat(LIKELY.filter(function (z) { return z !== S.tz; }));
      picks = ids.map(function (id) { return all.filter(function (z) { return z.id === id; })[0]; }).filter(Boolean);
    } else {
      var words = q.split(/\s+/);
      picks = all.filter(function (z) { return words.every(function (w) { return z.key.indexOf(w) >= 0; }); })
        .sort(function (a, b) { return (norm(a.city).indexOf(q) === 0 ? 0 : 1) - (norm(b.city).indexOf(q) === 0 ? 0 : 1); });
    }
    picks = picks.slice(0, 8);
    el.tzList.innerHTML = picks.length ? picks.map(function (z) {
      return '<li><button type="button" class="bk__tz-opt" data-tz="' + z.id + '" aria-pressed="' + (z.id === S.tz) + '">' + z.city +
        ' <span>' + (z.region ? z.region + ' · ' : '') + z.off + '</span></button></li>';
    }).join('') : '<li class="bk__tz-none">' + L('Aucun fuseau trouvé.') + '</li>';
  }
  function tzPanel(open) {
    el.tzPanel.hidden = !open;
    el.tzEdit.setAttribute('aria-expanded', String(open));
    if (open) { el.tzSearch.value = ''; renderZoneList(); el.tzSearch.focus({ preventScroll: false }); }
  }
  function setZone(z) {
    S.tz = z;
    var keep = S.day;
    index();
    S.day = null; S.view = null;
    if (keep && S.byDay[keep]) { S.day = keep; S.view = monthOf(keep); }
    tzPanel(false);
    renderDate();
    el.tzEdit.focus({ preventScroll: true });
  }

  function monthOf(key) { var p = key.split('-'); return { y: +p[0], m: +p[1] }; }
  function cmpMonth(a, b) { return (a.y - b.y) * 12 + (a.m - b.m); }

  function renderCal() {
    var todayKey = dayKey(Date.now(), S.tz);
    var first = monthOf(todayKey);
    var last = S.data ? monthOf(dayKey(Date.parse(S.data.to), S.tz)) : first;
    if (!S.view) S.view = S.days.length ? monthOf(S.days[0]) : first;
    var v = S.view;
    el.month.textContent = fmt({ month: 'long', year: 'numeric' }, 'UTC').format(Date.UTC(v.y, v.m - 1, 15));
    el.prev.disabled = cmpMonth(v, first) <= 0;
    el.next.disabled = cmpMonth(v, last) >= 0;

    // Weekday initials.
    var sun = weekStartsSunday();
    var dow = '';
    for (var i = 0; i < 7; i++) {
      var wd = (i + (sun ? 0 : 1)) % 7;   // 0 = Sunday
      dow += '<span>' + fmt({ weekday: 'narrow' }, 'UTC').format(Date.UTC(2026, 1, 1 + wd, 12)) + '</span>';   // 1 Feb 2026 is a Sunday
    }
    el.dow.innerHTML = dow;

    var startWd = new Date(Date.UTC(v.y, v.m - 1, 1)).getUTCDay();
    var lead = sun ? startWd : (startWd + 6) % 7;
    var count = new Date(Date.UTC(v.y, v.m, 0)).getUTCDate();
    var html = '';
    for (var b = 0; b < lead; b++) html += '<span class="bk__d bk__d--blank" aria-hidden="true"></span>';
    var loading = !S.data;
    for (var d = 1; d <= count; d++) {
      var key = v.y + '-' + String(v.m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var label = longDay(key);
      if (loading) { html += '<span class="bk__d bk__d--skel" aria-hidden="true"></span>'; continue; }
      var open = !!S.byDay[key];
      var cls = 'bk__d' + (open ? ' bk__d--open' : '') + (key === todayKey ? ' bk__d--today' : '') + (key === S.day ? ' bk__d--sel' : '');
      if (open) {
        html += '<button type="button" class="' + cls + '" data-day="' + key + '" aria-pressed="' + (key === S.day) + '" aria-label="' +
          label + ', ' + F('{n} créneaux', { n: S.byDay[key].length }) + '">' + d + '</button>';
      } else {
        html += '<span class="' + cls + '" aria-hidden="true">' + d + '</span>';
      }
    }
    el.days.innerHTML = html;
  }

  function renderSlots() {
    if (!S.data) {
      el.day.textContent = '';
      el.slots.innerHTML = '<li class="bk__empty">' + L('Chargement des disponibilités…') + '</li>';
      return;
    }
    if (!S.days.length) {
      el.day.textContent = '';
      el.slots.innerHTML = '<li class="bk__empty">' + L('Aucun créneau n’est ouvert dans les prochaines semaines. Écrivez-nous sur WhatsApp ou à contact@scalia.do.') + '</li>';
      return;
    }
    if (!S.day) {
      // First open day of the month on view, else the first one at all.
      var v = S.view, inView = S.days.filter(function (k) { var m = monthOf(k); return m.y === v.y && m.m === v.m; });
      S.day = inView[0] || null;
    }
    if (!S.day) {
      el.day.textContent = '';
      el.slots.innerHTML = '<li class="bk__empty">' + L('Aucun créneau ce mois-ci.') + '</li>';
      return;
    }
    el.day.textContent = longDay(S.day);
    el.slots.innerHTML = S.byDay[S.day].map(function (ts) {
      var iso = new Date(ts).toISOString();
      return '<li><button type="button" class="bk__slot" data-slot="' + iso + '" aria-pressed="' + (iso === S.slot) + '">' + timeOf(ts) + '</button></li>';
    }).join('');
  }

  function renderDate() {
    renderMeta(); renderTz();
    if (S.view === null && S.days.length) S.view = monthOf(S.days[0]);
    renderCal();
    renderSlots();
    var sel = el.days.querySelector('.bk__d--sel');
    if (sel) sel.setAttribute('aria-pressed', 'true');
  }

  function recapHtml(ts) {
    return '<span class="bk__recap-cal" aria-hidden="true"><svg viewBox="0 0 16 16" width="18" height="18"><rect x="2" y="3" width="12" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2 6.5h12M5.5 1.75v2.5M10.5 1.75v2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>' +
      '<div class="bk__recap-when"><p class="bk__recap-date">' + longDay(dayKey(ts, S.tz)) + ' · ' + timeOf(ts) + '</p>' +
      '<p class="bk__recap-zone">' + F('{n} min · heure locale {tz}', { n: S.data ? S.data.durationMin : 30, tz: zoneLabel(S.tz, ts) }) + '</p></div>';
  }
  function renderForm() {
    el.recap.innerHTML = recapHtml(Date.parse(S.slot)) + '<button type="button" class="bk__link" data-bk-back>' + L('Modifier') + '</button>';
  }
  function renderDone() {
    var b = S.booking;
    el.doneRecap.innerHTML = recapHtml(Date.parse(b.start));
  }

  function render() {
    if (S.step === 'date') renderDate();
    else if (S.step === 'form') renderForm();
    else if (S.step === 'done') renderDone();
  }

  /* ---------------------------------------------------------- open/close --- */
  function open(trigger) {
    S.trigger = trigger || null;
    if (S.step === 'done' || S.step === 'error') { S.slot = null; el.form.reset(); setTypes([]); clearErrors(); }
    el.notice.hidden = true;
    if (S.step !== 'form') setStep('date');
    render();
    dlg.showModal();
    root.classList.add('is-locked');
    $('[data-pane="' + S.step + '"] .bk__title').focus({ preventScroll: true });

    var stale = !S.data || Date.now() - S.at > REVALIDATE;
    if (stale) {
      fetchAvail(true).then(function () { if (S.step === 'date') render(); }, function () {
        if (!S.data) setStep('error');   // only a real failure with nothing to show
      });
    }
  }
  function close() { if (dlg.hasAttribute('open')) dlg.close(); }
  dlg.addEventListener('close', function () {
    root.classList.remove('is-locked');
    if (S.trigger && document.contains(S.trigger)) S.trigger.focus();
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });   // backdrop

  /* ------------------------------------------------------------- events --- */
  dlg.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t || !dlg.contains(t)) return;
    if (t.hasAttribute('data-bk-close')) return close();
    if (t.hasAttribute('data-bk-back')) { setStep('date'); return render(); }
    if (t.hasAttribute('data-bk-prev') || t.hasAttribute('data-bk-next')) {
      var v = S.view, m = v.m + (t.hasAttribute('data-bk-next') ? 1 : -1);
      S.view = { y: v.y + (m > 12 ? 1 : m < 1 ? -1 : 0), m: m > 12 ? 1 : m < 1 ? 12 : m };
      S.day = null;
      return renderDate();
    }
    if (t.hasAttribute('data-day')) {
      S.day = t.getAttribute('data-day');
      renderDate();
      var focusDay = el.days.querySelector('[data-day="' + S.day + '"]');
      if (focusDay) focusDay.focus({ preventScroll: true });
      // On phones the times sit below the calendar: bring them into view.
      if (matchMedia('(max-width: 759px)').matches) el.day.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (t.hasAttribute('data-slot')) {
      S.slot = t.getAttribute('data-slot');
      el.notice.hidden = true;
      setStep('form');
      renderForm();
      S.formAt = Date.now();
      return;
    }
    if (t.hasAttribute('data-bk-ics')) return downloadIcs();
    if (t.hasAttribute('data-bk-retry')) {
      setStep('date'); render();
      fetchAvail(true).then(function () { render(); }, function () { setStep('error'); });
    }
  });

  el.tzEdit.addEventListener('click', function () { tzPanel(el.tzPanel.hidden); });
  el.tzSearch.addEventListener('input', renderZoneList);
  el.tzSearch.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); var first = el.tzList.querySelector('[data-tz]'); if (first) setZone(first.getAttribute('data-tz')); }
  });
  el.tzList.addEventListener('click', function (e) { var b = e.target.closest('[data-tz]'); if (b) setZone(b.getAttribute('data-tz')); });
  // Escape closes the search first, the sheet only after. Handled on keydown
  // (a cancelled keydown never reaches the dialog); `cancel` is a backup.
  el.tzPanel.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    e.preventDefault(); e.stopPropagation();
    tzPanel(false); el.tzEdit.focus({ preventScroll: true });
  });
  dlg.addEventListener('cancel', function (e) {
    if (!el.tzPanel.hidden) { e.preventDefault(); tzPanel(false); el.tzEdit.focus({ preventScroll: true }); }
  });

  /* --------------------------------------------------------------- form --- */
  var EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}$/;
  var MESSAGES = {
    REQUIRED: 'Ce champ est requis.',
    INVALID: 'Ce champ semble incorrect.',
    EMAIL: 'Entrez une adresse email valide.',
    PHONE: 'Entrez un numéro valide, par exemple +1 809 555 0123.',
    TYPES: 'Choisissez au moins une option.',
    TOO_LONG: 'Ce texte est un peu long.'
  };
  function setError(name, code) {
    var input = el.form.elements[name];
    var out = document.getElementById('bk-' + name + '-err');
    if (input) input.setAttribute('aria-invalid', code ? 'true' : 'false');
    if (out) out.textContent = code ? L(MESSAGES[code] || MESSAGES.INVALID) : '';
  }
  function clearErrors() {
    ['name', 'email', 'phone', 'types'].forEach(function (n) { setError(n, null); });
    el.fail.hidden = true;
  }
  function checkForm() {
    var f = el.form.elements, bad = [];
    var name = f.name.value.trim(), email = f.email.value.trim(), phone = f.phone.value.trim();
    setError('name', name.length < 2 ? 'REQUIRED' : null); if (name.length < 2) bad.push('name');
    var ec = !email ? 'REQUIRED' : !EMAIL.test(email) ? 'EMAIL' : null;
    setError('email', ec); if (ec) bad.push('email');
    var pc = phone && !/^[+()0-9.\-\s]{6,32}$/.test(phone) ? 'PHONE' : null;
    setError('phone', pc); if (pc) bad.push('phone');
    var tc = selectedTypes().length ? null : 'TYPES';
    setError('types', tc); if (tc) bad.push('types');
    if (bad.length) (bad[0] === 'types' ? el.types.querySelector('[data-type]') : f[bad[0]]).focus();
    return !bad.length;
  }
  ['name', 'email', 'phone'].forEach(function (n) {
    el.form.elements[n].addEventListener('input', function () {
      if (this.getAttribute('aria-invalid') === 'true') setError(n, null);
    });
  });

  /* "Que souhaitez-vous créer ?": toggle buttons (aria-pressed), several
     at once, each can be released. */
  function selectedTypes() {
    return Array.prototype.map.call(el.types.querySelectorAll('[aria-pressed="true"]'), function (b) { return b.getAttribute('data-type'); });
  }
  function setTypes(list) {
    Array.prototype.forEach.call(el.types.querySelectorAll('[data-type]'), function (b) {
      b.setAttribute('aria-pressed', String(list.indexOf(b.getAttribute('data-type')) >= 0));
    });
  }
  el.types.addEventListener('click', function (e) {
    var b = e.target.closest('[data-type]');
    if (!b) return;
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    if (selectedTypes().length) setError('types', null);
  });

  function failWith(html) { el.fail.innerHTML = html; el.fail.hidden = false; }
  function contactHtml() {
    return ' <a data-contact="whatsapp" href="https://wa.me/33769965798" target="_blank" rel="noopener noreferrer">WhatsApp</a> · <a href="mailto:contact@scalia.do">contact@scalia.do</a>';
  }

  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (el.submit.getAttribute('aria-busy') === 'true') return;
    el.fail.hidden = true;
    if (!checkForm()) return;
    var f = el.form.elements;
    var payload = {
      start: S.slot, timezone: S.tz, locale: locale(),
      name: f.name.value, email: f.email.value.trim(), phone: f.phone.value, company: f.company.value, message: f.message.value,
      projectTypes: selectedTypes(),
      website: f.website.value, elapsed: Date.now() - S.formAt
    };
    var label = el.submit.textContent;
    el.submit.setAttribute('aria-busy', 'true');
    el.submit.textContent = L('Réservation…');

    fetch(API_BOOK, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
    }).then(function (res) {
      if (res.status === 201 && res.body.ok) {
        S.booking = res.body.booking;
        S.at = 0;                                    // the calendar changed: refresh at next open
        setStep('done'); renderDone();
        track('booking_confirmed', { lang: locale() });
        return;
      }
      if (res.status === 409) {
        // Taken between the choice and the confirmation: straight back to
        // the times, refreshed, with the reason.
        S.slot = null;
        el.notice.textContent = L('Ce créneau vient d’être réservé. Choisissez un autre horaire.');
        el.notice.hidden = false;
        setStep('date'); render();
        fetchAvail(true).then(function () { renderDate(); }, function () {});
        return;
      }
      if (res.status === 422 && res.body.fields) {
        var map = { name: 'REQUIRED', email: 'EMAIL', phone: 'PHONE', message: 'TOO_LONG', projectTypes: 'TYPES' };
        if (res.body.fields.projectTypes) { setError('types', 'TYPES'); delete res.body.fields.projectTypes; }
        Object.keys(res.body.fields).forEach(function (k) { if (k === 'start') return; setError(k, res.body.fields[k] === 'REQUIRED' ? 'REQUIRED' : (map[k] || 'INVALID')); });
        if (res.body.fields.start) { setStep('date'); render(); }
        return;
      }
      if (res.status === 429) return failWith(L('Trop de tentatives. Réessayez dans quelques minutes ou écrivez-nous :') + contactHtml());
      if (res.status === 400 && res.body.error === 'REJECTED') return failWith(L('Prenez un instant pour vérifier vos informations, puis réessayez.'));
      failWith(L('La réservation n’a pas pu aboutir. Réessayez dans un instant ou écrivez-nous :') + contactHtml());
    }, function () {
      failWith(L('Connexion impossible. Vérifiez votre réseau puis réessayez, ou écrivez-nous :') + contactHtml());
    }).then(function () {
      el.submit.removeAttribute('aria-busy');
      el.submit.textContent = label;
    });
  });

  /* ---------------------------------------------------------------- ics --- */
  function downloadIcs() {
    var b = S.booking;
    if (!b) return;
    function d(iso) { return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function (m) { return '\\' + m; }); }
    var title = L('Échange avec Scalia');
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Scalia//Booking//FR', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:' + d(b.start) + '-scalia@scalia.do', 'DTSTAMP:' + d(new Date().toISOString()),
      'DTSTART:' + d(b.start), 'DTEND:' + d(b.end), 'SUMMARY:' + esc(title),
      // No video link yet: it comes with the reminder before the meeting.
      'DESCRIPTION:' + esc(L('Vous recevrez le lien de visioconférence avant le rendez-vous.') + '\n\nhttps://scalia.do'),
      'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
    var url = URL.createObjectURL(new Blob([lines], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'scalia.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ------------------------------------------------------------ triggers --- */
  // One opener for every booking button (sections, navbar, burger menu).
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest(TRIGGERS);
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    var nav = document.getElementById('nav');
    var burger = document.querySelector('.nav__burger');
    if (nav && nav.dataset.open === 'true' && t.closest('#menu') && burger) { burger.click(); open(burger); }
    else open(t);
  }, true);

  // Prefetch: idle after load, then whenever a booking button comes close.
  function warm() { fetchAvail(false).catch(function () {}); }
  function onIdle(fn) { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2500 }); else setTimeout(fn, 800); }
  function afterLoad() {
    onIdle(warm);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (x) { return x.isIntersecting; })) warm();
      }, { rootMargin: '100% 0px' });
      Array.prototype.forEach.call(document.querySelectorAll('[data-open-booking]'), function (x) { io.observe(x); });
    }
  }
  if (document.readyState === 'complete') afterLoad(); else window.addEventListener('load', afterLoad);
  ['pointerover', 'touchstart', 'focusin'].forEach(function (type) {
    document.addEventListener(type, function (e) { if (e.target.closest && e.target.closest(TRIGGERS)) warm(); }, { passive: true, capture: true });
  });

  // Signature: the supplied "Powered by Scalia" file replaces the text
  // version once it exists; until then (or if it fails) the text stays.
  (function () {
    var src = el.foot.getAttribute('data-powered-src');
    if (!src) return;
    var img = new Image();
    img.onload = function () {
      img.className = 'bk__powered'; img.alt = 'Powered by Scalia';
      el.foot.textContent = ''; el.foot.appendChild(img);
    };
    img.src = src;
  })();

  if (window.ScaliaI18n) window.ScaliaI18n.on('locale', function () { fmtCache = {}; if (dlg.hasAttribute('open')) render(); });
  setStep('date');
})();

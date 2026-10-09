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
  var SCALIA_TZ = 'America/Santo_Domingo';
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
    submit: $('[data-bk-submit]'), doneRecap: $('[data-bk-done-recap]'),
    add: $('[data-bk-add]'), addBtn: $('[data-bk-add-btn]'), addMenu: $('[data-bk-add-menu]'),
    types: $('[data-bk-types]'), foot: $('[data-bk-foot]')
  };

  var S = {
    data: null, at: 0, pending: null, failed: false,
    // Visitor's zone: 1. a zone chosen by hand (kept), 2. the zone of the
    // connection (scalia_timezone cookie, set by middleware.js: the IANA
    // name only), 3. the browser's, 4. Scalia's.
    tz: (function () {
      function ok(z) { try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true; } catch (e) { return false; } }
      var saved = null;
      try { saved = localStorage.getItem('scalia.tz'); } catch (e) {}
      if (saved && ok(saved)) return saved;
      var net = document.cookie.match(/(?:^|;\s*)scalia_timezone=([A-Za-z0-9_+\-\/]{1,64})(?:;|$)/);
      if (net && ok(net[1])) return net[1];
      var device = null;
      try { device = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
      return device && ok(device) ? device : 'America/Santo_Domingo';
    })(),
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
  // Slots depend on the visitor's zone (the server drops starts after
  // 20:00 on their clock): one answer per zone, a zone change refetches.
  function fetchAvail(force) {
    var tz = S.tz;
    if (S.pending && S.pendingTz === tz) return S.pending;
    if (!force && S.data && S.data.clientTimezone === tz && Date.now() - S.at < FRESH) return Promise.resolve(S.data);
    var p = fetch(API_AVAIL + '?tz=' + encodeURIComponent(tz) + (force ? '&fresh=' + Date.now().toString(36) : ''), { headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http_' + r.status); return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.slots)) throw new Error('shape');
        if (tz !== S.tz) return S.data;   // the zone changed meanwhile: that answer is not for it
        S.data = d; S.at = Date.now(); S.failed = false; index();
        return d;
      })
      .catch(function (e) { if (tz === S.tz) S.failed = true; throw e; })
      .then(function (d) { if (S.pending === p) S.pending = null; return d; }, function (e) { if (S.pending === p) S.pending = null; throw e; });
    S.pending = p; S.pendingTz = tz;
    return p;
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
    var min = S.data ? S.data.durationMin : 60;
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
    try { localStorage.setItem('scalia.tz', z); } catch (e) {}   // a manual choice is kept
    tzPanel(false);
    el.tzEdit.focus({ preventScroll: true });
    if (z === S.tz) return;
    // Another zone: other days, other times, maybe other slots (20:00 local
    // limit). Nothing chosen survives; the calendar reloads for that zone.
    S.tz = z;
    S.data = null; S.slot = null; S.day = null; S.view = null;
    index();
    renderDate();
    fetchAvail(true).then(function () { if (S.step === 'date') renderDate(); }, function () {
      if (!S.data && S.tz === z) setStep('error');
    });
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

  // Visitor's own time first; Scalia's below when the zones differ (with
  // Scalia's date when it is another day there).
  function recapHtml(ts, tz) {
    tz = tz || S.tz;
    var scalia = (S.data && S.data.timezone) || SCALIA_TZ;
    var hm = function (z) { return fmt({ hour: '2-digit', minute: '2-digit' }, z).format(ts); };
    var other = '';
    if (scalia !== tz) {
      var sk = dayKey(ts, scalia);
      other = '<p class="bk__recap-zone bk__recap-zone--alt">' + F('Heure Scalia : {t} — {tz}', {
        t: (sk !== dayKey(ts, tz) ? fmt({ weekday: 'short', day: 'numeric', month: 'short' }, 'UTC').format(keyDate(sk)) + ' · ' : '') + hm(scalia), tz: scalia
      }) + '</p>';
    }
    return '<span class="bk__recap-cal" aria-hidden="true"><svg viewBox="0 0 16 16" width="18" height="18"><rect x="2" y="3" width="12" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2 6.5h12M5.5 1.75v2.5M10.5 1.75v2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>' +
      '<div class="bk__recap-when"><p class="bk__recap-date">' + longDay(dayKey(ts, tz)) + ' · ' + hm(tz) + '</p>' +
      '<p class="bk__recap-zone">' + F('Votre heure : {t} — {tz}', { t: hm(tz), tz: tz }) + '</p>' + other + '</div>';
  }
  function renderForm() {
    el.recap.innerHTML = recapHtml(Date.parse(S.slot)) + '<button type="button" class="bk__link" data-bk-back>' + L('Modifier') + '</button>';
  }
  function renderDone() {
    var b = S.booking;
    el.doneRecap.innerHTML = recapHtml(Date.parse(b.start), b.timezone);
    // "Ajouter à mon agenda": Google Calendar link, or the signed .ics for
    // Apple / Outlook (same UID as the Google invitation: no second copy).
    var c = b.calendar;
    el.add.hidden = !c;
    addMenu(false);
    if (!c) return;
    var opt = function (k) { return el.addMenu.querySelector('[data-cal="' + k + '"]'); };
    opt('google').href = c.google;
    opt('apple').href = c.ics;
    var outlook = opt('outlook');
    outlook.hidden = !c.outlook;
    if (c.outlook) outlook.href = c.outlook;
    opt('download').href = c.ics + (c.ics.indexOf('?') < 0 ? '?' : '&') + 'dl=1';
    // The likeliest calendar first, never opened on its own: Apple on
    // iPhone, iPad and Mac Safari; Outlook on Windows; Google elsewhere
    // (Android, Chrome). The .ics download always comes last.
    var ua = navigator.userAgent;
    var apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints > 1 || !/Chrome|Chromium|Edg|Firefox/.test(ua)));
    var order = apple ? ['apple', 'google', 'outlook'] : /Windows/.test(ua) ? ['outlook', 'google', 'apple'] : ['google', 'apple', 'outlook'];
    order.concat('download').forEach(function (k) { el.addMenu.appendChild(opt(k)); });
  }
  function addMenu(open) {
    el.addMenu.hidden = !open;
    el.addBtn.setAttribute('aria-expanded', String(open));
  }
  el.addBtn.addEventListener('click', function () {
    addMenu(el.addMenu.hidden);
    if (!el.addMenu.hidden) el.addMenu.querySelector('a').focus({ preventScroll: true });
  });
  el.addMenu.addEventListener('click', function (e) { if (e.target.closest('a')) setTimeout(function () { addMenu(false); }, 0); });
  el.addMenu.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); addMenu(false); el.addBtn.focus(); }
  });
  dlg.addEventListener('click', function (e) { if (!el.addMenu.hidden && !e.target.closest('[data-bk-add]')) addMenu(false); });

  function render() {
    if (S.step === 'date') renderDate();
    else if (S.step === 'form') renderForm();
    else if (S.step === 'done') renderDone();
  }

  /* ---------------------------------------------------------- open/close --- */
  function open(trigger) {
    S.trigger = trigger || null;
    if (S.step === 'done' || S.step === 'error') {
      S.slot = null; el.form.reset(); setTypes([]); clearErrors();
      S.ccManual = false; S.cc = CC_DEFAULT[locale()] || 'FR'; renderCc();
      restoreDraft();   // whatever is still unsent comes back; never the slot
    }
    el.notice.hidden = true;
    // Always from the date: a slot chosen earlier may be gone by now. The
    // form keeps what was typed.
    S.slot = null;
    setStep('date');
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
    else if (!$('[data-bk-cc-panel]').hidden) { e.preventDefault(); ccOpen(false); $('[data-bk-cc]').focus(); }
  });

  /* ------------------------------------------------------- phone country --
     [flag +code] [national number]. The default follows the site language
     (FR → France, ES → Dominican Republic, EN → United States) until the
     visitor picks a country; the number leaves as E.164 (+33612345678). */
  var DIALS = ('AD376 AE971 AF93 AG1 AI1 AL355 AM374 AO244 AR54 AS1 AT43 AU61 AW297 AX358 AZ994 BA387 BB1 BD880 BE32 BF226 BG359 BH973 BI257 BJ229 BL590 BM1 BN673 BO591 BQ599 BR55 BS1 BT975 BW267 BY375 BZ501 CA1 CD243 CF236 CG242 CH41 CI225 CK682 CL56 CM237 CN86 CO57 CR506 CU53 CV238 CW599 CY357 CZ420 DE49 DJ253 DK45 DM1 DO1 DZ213 EC593 EE372 EG20 ER291 ES34 ET251 FI358 FJ679 FK500 FM691 FO298 FR33 GA241 GB44 GD1 GE995 GF594 GG44 GH233 GI350 GL299 GM220 GN224 GP590 GQ240 GR30 GT502 GU1 GW245 GY592 HK852 HN504 HR385 HT509 HU36 ID62 IE353 IL972 IM44 IN91 IQ964 IR98 IS354 IT39 JE44 JM1 JO962 JP81 KE254 KG996 KH855 KI686 KM269 KN1 KR82 KW965 KY1 KZ7 LA856 LB961 LC1 LI423 LK94 LR231 LS266 LT370 LU352 LV371 LY218 MA212 MC377 MD373 ME382 MF590 MG261 MH692 MK389 ML223 MM95 MN976 MO853 MP1 MQ596 MR222 MS1 MT356 MU230 MV960 MW265 MX52 MY60 MZ258 NA264 NC687 NE227 NG234 NI505 NL31 NO47 NP977 NR674 NU683 NZ64 OM968 PA507 PE51 PF689 PG675 PH63 PK92 PL48 PM508 PR1 PS970 PT351 PW680 PY595 QA974 RE262 RO40 RS381 RU7 RW250 SA966 SB677 SC248 SD249 SE46 SG65 SI386 SK421 SL232 SM378 SN221 SO252 SR597 SS211 ST239 SV503 SX1 SY963 SZ268 TC1 TD235 TG228 TH66 TJ992 TL670 TM993 TN216 TO676 TR90 TT1 TV688 TW886 TZ255 UA380 UG256 US1 UY598 UZ998 VA39 VC1 VE58 VG1 VI1 VN84 VU678 WF681 WS685 YE967 YT262 ZA27 ZM260 ZW263')
    .split(' ').reduce(function (m, x) { m[x.slice(0, 2)] = x.slice(2); return m; }, {});
  var CC_DEFAULT = { fr: 'FR', es: 'DO', en: 'US' };
  var KEEP_ZERO = { IT: 1, VA: 1, SM: 1 };   // numbers that keep their leading 0
  var CC_HINT = { FR: '6 12 34 56 78', DO: '809 123 4567', US: '202 555 0123', CA: '514 555 0123', PR: '787 555 0123' };
  S.cc = CC_DEFAULT[locale()] || 'FR';
  S.ccManual = false;

  function flagOf(iso) { return String.fromCodePoint.apply(null, iso.split('').map(function (c) { return 0x1F1E6 + c.charCodeAt(0) - 65; })); }
  var regionNames = null;
  function countryName(iso) {
    try {
      if (!regionNames || regionNames.locale !== intl()) { regionNames = new Intl.DisplayNames([intl()], { type: 'region' }); regionNames.locale = intl(); }
      return regionNames.of(iso) || iso;
    } catch (e) { return iso; }
  }
  function renderCc() {
    $('[data-bk-cc-flag]').textContent = flagOf(S.cc);
    $('[data-bk-cc-dial]').textContent = '+' + DIALS[S.cc];
    el.form.elements.phone.placeholder = CC_HINT[S.cc] || '';
    $('[data-bk-cc]').setAttribute('aria-label', L('Indicatif pays') + ' : ' + countryName(S.cc) + ' +' + DIALS[S.cc]);
  }
  /* Picker UI: a bottom sheet on phones, a popover from 760px. "Pays
     fréquents" then every country by name; the search matches the name,
     the ISO code or the dialling code ("suisse", "ch", "41", "+41"). */
  var ccBtn = $('[data-bk-cc]'), ccPanel = $('[data-bk-cc-panel]'), ccSearch = $('[data-bk-cc-search]'), ccListEl = $('[data-bk-cc-list]');
  var ccBox = $('[data-ccp-panel]');
  var CC_COMMON = ['FR', 'DO', 'US', 'CH', 'LU', 'BE', 'CA', 'GB'];
  var sheetMQ = matchMedia('(max-width: 759px)');
  var ccHideT = 0;
  function ccRow(c) {
    return '<button type="button" class="bk__ccp-opt" data-cc="' + c + '" aria-current="' + (c === S.cc) + '">' +
      '<svg class="bk__ccp-check" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="bk__ccp-flag" aria-hidden="true">' + flagOf(c) + '</span><span class="bk__ccp-name">' + countryName(c) + '</span><span class="bk__ccp-dial">+' + DIALS[c] + '</span></button>';
  }
  function ccList() {
    var q = norm(ccSearch.value.trim());
    var digits = q.replace(/^\+/, '').replace(/\s/g, '');
    var all = Object.keys(DIALS);
    var byName = function (a, b) { return countryName(a).localeCompare(countryName(b), intl()); };
    if (!q) {
      ccListEl.innerHTML = '<p class="bk__ccp-sec">' + L('Pays fréquents') + '</p>' + CC_COMMON.map(ccRow).join('') +
        '<p class="bk__ccp-sec">' + L('Tous les pays') + '</p>' + all.sort(byName).map(ccRow).join('');
      return;
    }
    var rank = function (c) {
      var n = norm(countryName(c));
      if (/^\d+$/.test(digits)) return DIALS[c] === digits ? 0 : DIALS[c].indexOf(digits) === 0 ? 1 : 9;
      if (c.toLowerCase() === q) return 0;
      if (n.indexOf(q) === 0) return 1;
      return n.indexOf(q) >= 0 ? 2 : 9;
    };
    var hits = all.filter(function (c) { return rank(c) < 9; }).sort(function (a, b) { return rank(a) - rank(b) || byName(a, b); });
    ccListEl.innerHTML = hits.length ? hits.map(ccRow).join('') : '<p class="bk__ccp-empty">' + L('Aucun pays trouvé.') + '</p>';
  }
  function placePopover() {
    if (sheetMQ.matches) return;
    var r = ccBtn.getBoundingClientRect(), h = 360, w = 340;
    var above = r.bottom + 6 + h > innerHeight - 8 && r.top - 6 - h > 8;
    ccPanel.classList.toggle('is-above', above);
    ccPanel.style.setProperty('--ccp-x', Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px');
    ccPanel.style.setProperty('--ccp-y', (above ? r.top - 6 - Math.min(h, ccBox.offsetHeight || h) : r.bottom + 6) + 'px');
  }
  function ccOpen(open) {
    clearTimeout(ccHideT);
    if (open) {
      ccSearch.value = '';
      ccList();
      ccPanel.hidden = false;
      placePopover();
      ccBtn.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function () { ccPanel.classList.add('is-open'); });
      var cur = ccListEl.querySelector('[aria-current="true"]');
      // Phones: no keyboard popping up; focus the current country. Desktop:
      // straight into the search.
      if (sheetMQ.matches) { ccListEl.scrollTop = 0; setTimeout(function () { (cur || ccSearch).focus({ preventScroll: true }); }, 60); }
      else ccSearch.focus({ preventScroll: true });
    } else {
      if (ccPanel.hidden) return;
      ccPanel.classList.remove('is-open');
      ccBtn.setAttribute('aria-expanded', 'false');
      ccHideT = setTimeout(function () { ccPanel.hidden = true; ccBox.style.transform = ''; }, 220);
    }
  }
  function setCc(iso, manual) {
    if (!DIALS[iso]) return;
    S.cc = iso;
    if (manual) S.ccManual = true;
    renderCc();
  }
  function pick(c) { setCc(c, true); ccOpen(false); el.form.elements.phone.focus({ preventScroll: true }); saveDraft(); }

  ccBtn.addEventListener('click', function () { ccOpen(ccPanel.hidden || !ccPanel.classList.contains('is-open')); });
  ccSearch.addEventListener('input', function () { ccList(); ccListEl.scrollTop = 0; });
  ccListEl.addEventListener('click', function (e) { var b = e.target.closest('[data-cc]'); if (b) pick(b.getAttribute('data-cc')); });
  Array.prototype.forEach.call(ccPanel.querySelectorAll('[data-ccp-close]'), function (x) {
    x.addEventListener('click', function () { ccOpen(false); ccBtn.focus({ preventScroll: true }); });
  });
  // Keyboard: arrows move through the countries, Enter picks, Escape closes.
  ccPanel.addEventListener('keydown', function (e) {
    var opts = Array.prototype.slice.call(ccListEl.querySelectorAll('[data-cc]'));
    var i = opts.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ccOpen(false); ccBtn.focus({ preventScroll: true }); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var n = e.key === 'ArrowDown' ? (i < 0 ? 0 : Math.min(opts.length - 1, i + 1)) : (i <= 0 ? -1 : i - 1);
      if (n < 0) ccSearch.focus(); else opts[n].focus();
      return;
    }
    if (e.key === 'Enter' && document.activeElement === ccSearch) { e.preventDefault(); if (opts[0]) pick(opts[0].getAttribute('data-cc')); }
  });
  // Phones: drag the top of the sheet down to close it.
  (function () {
    var bar = $('[data-ccp-drag]'), y0 = null, dy = 0;
    bar.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; dy = 0; ccPanel.classList.add('is-dragging'); }, { passive: true });
    bar.addEventListener('touchmove', function (e) {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      ccBox.style.transform = 'translate3d(0,' + dy + 'px,0)';
    }, { passive: true });
    bar.addEventListener('touchend', function () {
      ccPanel.classList.remove('is-dragging');
      ccBox.style.transform = '';
      if (dy > 70) ccOpen(false);
      y0 = null;
    });
  })();
  // The popover follows its button; it closes if the form scrolls under it.
  $('.bk__body').addEventListener('scroll', function () { if (!sheetMQ.matches && !ccPanel.hidden) ccOpen(false); }, { passive: true });
  window.addEventListener('resize', function () { if (!ccPanel.hidden) placePopover(); });

  // A pasted international number (+41 …, 0041 …) selects its country and
  // keeps only the national part in the field. +1 stays on the current +1
  // country (Dominican area codes 809/829/849 select the Dominican Republic).
  function adoptPrefix() {
    var input = el.form.elements.phone, raw = input.value.trim();
    var m = /^(?:\+|00)\s*([\d\s().-]+)$/.exec(raw);
    if (!m) return;
    var digits = m[1].replace(/\D/g, '');
    for (var len = 4; len >= 1; len--) {
      var code = digits.slice(0, len), rest = digits.slice(len);
      var hits = Object.keys(DIALS).filter(function (c) { return DIALS[c] === code; });
      if (!hits.length || rest.length < 4) continue;
      var iso = hits.indexOf(S.cc) >= 0 ? S.cc : (code === '1' ? (/^8[024]9/.test(rest) ? 'DO' : 'US') : hits[0]);
      if (code === '1' && /^8[024]9/.test(rest)) iso = 'DO';
      setCc(iso, true);
      input.value = rest;
      saveDraft();
      return;
    }
  }
  el.form.elements.phone.addEventListener('paste', function () { setTimeout(adoptPrefix, 0); });
  el.form.elements.phone.addEventListener('blur', adoptPrefix);

  // National number → E.164. A number typed with + or 00 is taken as is.
  function e164() {
    var raw = el.form.elements.phone.value.trim();
    if (!raw) return '';
    var digits = raw.replace(/\D/g, '');
    if (/^\+/.test(raw)) return '+' + digits;
    if (/^00/.test(digits)) return '+' + digits.slice(2);
    if (digits.charAt(0) === '0' && !KEEP_ZERO[S.cc]) digits = digits.slice(1);
    return '+' + DIALS[S.cc] + digits;
  }
  function phoneValid() {
    var raw = el.form.elements.phone.value.trim();
    if (!raw) return true;
    return /^[+()0-9.\-\s]+$/.test(raw) && /^\+[1-9]\d{6,14}$/.test(e164());
  }

  /* --------------------------------------------------------------- draft --
     The form, not the slot: kept in this browser only (one key, 7 days),
     never sent anywhere before "Confirmer", erased once the booking is
     confirmed. Date and time are never kept: a slot can be taken meanwhile.
     The time zone has its own key (scalia.tz). */
  var DRAFT_KEY = 'scalia.bookingDraft';
  var DRAFT_TTL = 7 * 86400000;
  var draftT = 0;
  function saveDraft() {
    clearTimeout(draftT);
    draftT = setTimeout(function () {
      var f = el.form.elements;
      var d = { v: 1, savedAt: Date.now(), name: f.name.value, email: f.email.value, phoneCountry: S.ccManual ? S.cc : '',
        phone: f.phone.value, company: f.company.value, projectTypes: selectedTypes(), message: f.message.value };
      var empty = !d.name && !d.email && !d.phone && !d.company && !d.message && !d.projectTypes.length && !d.phoneCountry;
      try { if (empty) localStorage.removeItem(DRAFT_KEY); else localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {}
    }, 400);
  }
  function dropDraft() { clearTimeout(draftT); try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
  function restoreDraft() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) {}
    if (!d || d.v !== 1) return;
    if (!(Date.now() - d.savedAt < DRAFT_TTL)) { dropDraft(); return; }
    var f = el.form.elements;
    ['name', 'email', 'phone', 'company', 'message'].forEach(function (k) { if (typeof d[k] === 'string') f[k].value = d[k].slice(0, 1500); });
    if (Array.isArray(d.projectTypes)) setTypes(d.projectTypes);
    if (d.phoneCountry && DIALS[d.phoneCountry]) setCc(d.phoneCountry, true);
  }
  el.form.addEventListener('input', saveDraft);
  el.form.addEventListener('change', saveDraft);

  /* --------------------------------------------------------------- form --- */
  var EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}$/;
  var MESSAGES = {
    REQUIRED: 'Ce champ est requis.',
    INVALID: 'Ce champ semble incorrect.',
    EMAIL: 'Entrez une adresse email valide.',
    PHONE: 'Entrez un numéro valide.',
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
    var pc = phone && !phoneValid() ? 'PHONE' : null;
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
    saveDraft();
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
      name: f.name.value, email: f.email.value.trim(), phone: e164(), company: f.company.value, message: f.message.value,
      phoneDial: /^\s*(\+|00)/.test(f.phone.value) ? '' : DIALS[S.cc],
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
        S.booking.calendar = res.body.calendar || null;   // "Ajouter à mon agenda"
        S.at = 0;                                    // the calendar changed: refresh at next open
        setStep('done'); renderDone();
        dropDraft();   // booked: nothing left to resume
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
        Object.keys(res.body.fields).forEach(function (k) { if (k === 'start' || k === 'timezone') return; setError(k, res.body.fields[k] === 'REQUIRED' ? 'REQUIRED' : (map[k] || 'INVALID')); });
        if (res.body.fields.start || res.body.fields.timezone) { setStep('date'); render(); }
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

  if (window.ScaliaI18n) window.ScaliaI18n.on('locale', function () {
    fmtCache = {};
    if (!S.ccManual) S.cc = CC_DEFAULT[locale()] || 'FR';   // the default follows the language
    renderCc();
    if (dlg.hasAttribute('open')) render();
  });
  renderCc();
  restoreDraft();
  setStep('date');
})();

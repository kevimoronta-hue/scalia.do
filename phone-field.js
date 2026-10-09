/* ==========================================================================
   Scalia · phone field with country picker (shared component)
   The booking's picker (booking.js), same data and rules, as a component a
   page attaches to its own markup ([data-pf-*]): [flag +code] [national
   number], search by name / ISO code / dialling code, a pasted +41 … picks
   its country, and the number leaves as E.164 (+33612345678). Bottom sheet
   on phones, popover from 760px.
     var phone = ScaliaPhone.attach(rootElement, { onChange: fn });
     phone.e164(), phone.valid(), phone.dial(), phone.cc(), phone.setCc(iso)
   ========================================================================== */
(function () {
  'use strict';
  var DIALS = ('AD376 AE971 AF93 AG1 AI1 AL355 AM374 AO244 AR54 AS1 AT43 AU61 AW297 AX358 AZ994 BA387 BB1 BD880 BE32 BF226 BG359 BH973 BI257 BJ229 BL590 BM1 BN673 BO591 BQ599 BR55 BS1 BT975 BW267 BY375 BZ501 CA1 CD243 CF236 CG242 CH41 CI225 CK682 CL56 CM237 CN86 CO57 CR506 CU53 CV238 CW599 CY357 CZ420 DE49 DJ253 DK45 DM1 DO1 DZ213 EC593 EE372 EG20 ER291 ES34 ET251 FI358 FJ679 FK500 FM691 FO298 FR33 GA241 GB44 GD1 GE995 GF594 GG44 GH233 GI350 GL299 GM220 GN224 GP590 GQ240 GR30 GT502 GU1 GW245 GY592 HK852 HN504 HR385 HT509 HU36 ID62 IE353 IL972 IM44 IN91 IQ964 IR98 IS354 IT39 JE44 JM1 JO962 JP81 KE254 KG996 KH855 KI686 KM269 KN1 KR82 KW965 KY1 KZ7 LA856 LB961 LC1 LI423 LK94 LR231 LS266 LT370 LU352 LV371 LY218 MA212 MC377 MD373 ME382 MF590 MG261 MH692 MK389 ML223 MM95 MN976 MO853 MP1 MQ596 MR222 MS1 MT356 MU230 MV960 MW265 MX52 MY60 MZ258 NA264 NC687 NE227 NG234 NI505 NL31 NO47 NP977 NR674 NU683 NZ64 OM968 PA507 PE51 PF689 PG675 PH63 PK92 PL48 PM508 PR1 PS970 PT351 PW680 PY595 QA974 RE262 RO40 RS381 RU7 RW250 SA966 SB677 SC248 SD249 SE46 SG65 SI386 SK421 SL232 SM378 SN221 SO252 SR597 SS211 ST239 SV503 SX1 SY963 SZ268 TC1 TD235 TG228 TH66 TJ992 TL670 TM993 TN216 TO676 TR90 TT1 TV688 TW886 TZ255 UA380 UG256 US1 UY598 UZ998 VA39 VC1 VE58 VG1 VI1 VN84 VU678 WF681 WS685 YE967 YT262 ZA27 ZM260 ZW263')
    .split(' ').reduce(function (m, x) { m[x.slice(0, 2)] = x.slice(2); return m; }, {});
  var CC_DEFAULT = { fr: 'FR', es: 'DO', en: 'US' };
  var KEEP_ZERO = { IT: 1, VA: 1, SM: 1 };   // numbers that keep their leading 0
  var CC_HINT = { FR: '6 12 34 56 78', DO: '809 123 4567', US: '202 555 0123', CA: '514 555 0123', PR: '787 555 0123' };
  var CC_COMMON = ['FR', 'DO', 'US', 'CH', 'LU', 'BE', 'CA', 'GB'];

  function L(fr) { return window.ScaliaI18n ? window.ScaliaI18n.t(fr) : fr; }
  function intl() { return window.ScaliaI18n && window.ScaliaI18n.intl ? window.ScaliaI18n.intl() : 'fr-FR'; }
  function locale() { return window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr'; }
  function norm(x) { return x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function flagOf(iso) { return String.fromCodePoint.apply(null, iso.split('').map(function (c) { return 0x1F1E6 + c.charCodeAt(0) - 65; })); }
  var regionNames = null;
  function countryName(iso) {
    try {
      if (!regionNames || regionNames.locale !== intl()) { regionNames = new Intl.DisplayNames([intl()], { type: 'region' }); regionNames.locale = intl(); }
      return regionNames.of(iso) || iso;
    } catch (e) { return iso; }
  }

  function attach(root, opts) {
    opts = opts || {};
    function $(s) { return root.querySelector(s); }
    var input = $('[data-pf-input]'), btn = $('[data-pf-cc]'), panel = $('[data-pf-panel]'), box = $('[data-pf-box]');
    var search = $('[data-pf-search]'), list = $('[data-pf-list]');
    var sheetMQ = matchMedia('(max-width: 759px)');
    var S = { cc: CC_DEFAULT[locale()] || 'FR', manual: false };
    var hideT = 0;
    function changed() { if (opts.onChange) opts.onChange(); }

    function render() {
      $('[data-pf-flag]').textContent = flagOf(S.cc);
      $('[data-pf-dial]').textContent = '+' + DIALS[S.cc];
      input.placeholder = CC_HINT[S.cc] || '';
      btn.setAttribute('aria-label', L('Indicatif pays') + ' : ' + countryName(S.cc) + ' +' + DIALS[S.cc]);
    }
    function row(c) {
      return '<button type="button" class="pf-opt" data-cc="' + c + '" aria-current="' + (c === S.cc) + '">' +
        '<svg class="pf-check" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span class="pf-flag" aria-hidden="true">' + flagOf(c) + '</span><span class="pf-name">' + countryName(c) + '</span><span class="pf-dial">+' + DIALS[c] + '</span></button>';
    }
    function fill() {
      var q = norm(search.value.trim());
      var digits = q.replace(/^\+/, '').replace(/\s/g, '');
      var all = Object.keys(DIALS);
      var byName = function (a, b) { return countryName(a).localeCompare(countryName(b), intl()); };
      if (!q) {
        list.innerHTML = '<p class="pf-sec">' + L('Pays fréquents') + '</p>' + CC_COMMON.map(row).join('') +
          '<p class="pf-sec">' + L('Tous les pays') + '</p>' + all.sort(byName).map(row).join('');
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
      list.innerHTML = hits.length ? hits.map(row).join('') : '<p class="pf-empty">' + L('Aucun pays trouvé.') + '</p>';
    }
    function place() {
      if (sheetMQ.matches) return;
      var r = btn.getBoundingClientRect(), h = 360, w = 340;
      var above = r.bottom + 6 + h > innerHeight - 8 && r.top - 6 - h > 8;
      panel.classList.toggle('is-above', above);
      panel.style.setProperty('--pf-x', Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px');
      panel.style.setProperty('--pf-y', (above ? r.top - 6 - Math.min(h, box.offsetHeight || h) : r.bottom + 6) + 'px');
    }
    function open(on) {
      clearTimeout(hideT);
      if (on) {
        search.value = '';
        fill();
        panel.hidden = false;
        place();
        btn.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(function () { panel.classList.add('is-open'); });
        var cur = list.querySelector('[aria-current="true"]');
        if (sheetMQ.matches) { list.scrollTop = 0; setTimeout(function () { (cur || search).focus({ preventScroll: true }); }, 60); }
        else search.focus({ preventScroll: true });
      } else {
        if (panel.hidden) return;
        panel.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        hideT = setTimeout(function () { panel.hidden = true; box.style.transform = ''; }, 220);
      }
    }
    function setCc(iso, manual) {
      if (!DIALS[iso]) return;
      S.cc = iso;
      if (manual) S.manual = true;
      render();
    }
    function pick(c) { setCc(c, true); open(false); input.focus({ preventScroll: true }); changed(); }

    btn.addEventListener('click', function () { open(panel.hidden || !panel.classList.contains('is-open')); });
    search.addEventListener('input', function () { fill(); list.scrollTop = 0; });
    list.addEventListener('click', function (e) { var b = e.target.closest('[data-cc]'); if (b) pick(b.getAttribute('data-cc')); });
    Array.prototype.forEach.call(panel.querySelectorAll('[data-pf-close]'), function (x) {
      x.addEventListener('click', function () { open(false); btn.focus({ preventScroll: true }); });
    });
    panel.addEventListener('keydown', function (e) {
      var opts2 = Array.prototype.slice.call(list.querySelectorAll('[data-cc]'));
      var i = opts2.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); open(false); btn.focus({ preventScroll: true }); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var n = e.key === 'ArrowDown' ? (i < 0 ? 0 : Math.min(opts2.length - 1, i + 1)) : (i <= 0 ? -1 : i - 1);
        if (n < 0) search.focus(); else opts2[n].focus();
        return;
      }
      if (e.key === 'Enter' && document.activeElement === search) { e.preventDefault(); if (opts2[0]) pick(opts2[0].getAttribute('data-cc')); }
    });
    (function () {   // phones: drag the top of the sheet down to close it
      var bar = $('[data-pf-drag]'), y0 = null, dy = 0;
      bar.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; dy = 0; panel.classList.add('is-dragging'); }, { passive: true });
      bar.addEventListener('touchmove', function (e) {
        if (y0 === null) return;
        dy = Math.max(0, e.touches[0].clientY - y0);
        box.style.transform = 'translate3d(0,' + dy + 'px,0)';
      }, { passive: true });
      bar.addEventListener('touchend', function () {
        panel.classList.remove('is-dragging');
        box.style.transform = '';
        if (dy > 70) open(false);
        y0 = null;
      });
    })();
    window.addEventListener('scroll', function () { if (!sheetMQ.matches && !panel.hidden) open(false); }, { passive: true });
    window.addEventListener('resize', function () { if (!panel.hidden) place(); });

    // A pasted international number (+41 …, 0041 …) selects its country and
    // keeps only the national part. +1 stays on the current +1 country
    // (Dominican area codes 809/829/849 select the Dominican Republic).
    function adoptPrefix() {
      var raw = input.value.trim();
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
        changed();
        return;
      }
    }
    input.addEventListener('paste', function () { setTimeout(adoptPrefix, 0); });
    input.addEventListener('blur', adoptPrefix);

    function e164() {
      var raw = input.value.trim();
      if (!raw) return '';
      var digits = raw.replace(/\D/g, '');
      if (/^\+/.test(raw)) return '+' + digits;
      if (/^00/.test(digits)) return '+' + digits.slice(2);
      if (digits.charAt(0) === '0' && !KEEP_ZERO[S.cc]) digits = digits.slice(1);
      return '+' + DIALS[S.cc] + digits;
    }
    function valid() {
      var raw = input.value.trim();
      return !!raw && /^[+()0-9.\-\s]+$/.test(raw) && /^\+[1-9]\d{6,14}$/.test(e164());
    }
    if (window.ScaliaI18n) window.ScaliaI18n.on('locale', function () { if (!S.manual) S.cc = CC_DEFAULT[locale()] || 'FR'; render(); });
    render();
    return {
      e164: e164, valid: valid,
      dial: function () { return /^\s*(\+|00)/.test(input.value) ? '' : DIALS[S.cc]; },
      cc: function () { return S.cc; },
      manual: function () { return S.manual; },
      setCc: setCc
    };
  }

  window.ScaliaPhone = { attach: attach, DIALS: DIALS, countryName: countryName, flagOf: flagOf };
})();

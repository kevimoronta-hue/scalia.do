/* ==========================================================================
   Scalia · Voices (client gallery under the identity section)
   Two rails of 9:16 cards drifting in opposite directions.

   DATA: one entry per client. Add a person by adding an object.
     id        unique slug, also the photo file prefix
     name      person (HTML text, never translated)
     company   company (HTML text, never translated)
     role      optional, shown under the company when set
     type      "video" (Wistia testimonial) | "photo"
     wistiaId  Wistia media hashed id, for type "video"
     photo     image base path WITHOUT size/extension. The card expects
               <photo>-480 / -960 in .avif and .webp
               at 9:16 (e.g. 960×1707). null = portrait not supplied yet.
     poster    video poster base path, same convention as photo. When null,
               the Wistia thumbnail is fetched once the section nears the screen.
     quote     short testimonial for photo cards (videos speak for themselves)
     focus     object-position of the face, e.g. "50% 28%"
     rail      1 = top rail (drifts right), 2 = bottom rail (drifts left)

   Portraits, quotes and identities are published with the clients' approval.

   MOTION: one engine (see "engine" below). Each rail clips a track of
   identical copies; ONE value per rail, the track's offset, drawn as a
   transform: drift, drag, momentum and loop all move that value and
   nothing else. No scroller, no scroll position: the page never moves.
   ========================================================================== */
(function () {
  'use strict';

  // CAPTIONS: WebVTT per language, UTF-8, same timecodes in every language.
  // FR comes from Wistia's own transcription (proper nouns proof-read);
  // EN / ES are faithful translations of it. The player follows the site
  // language live (see setTrack in the player).
  var VOICES = [
    { id: 'marcela-ledesma',   name: 'Marcela Ledesma',   company: 'Esolutions Latam',     role: '', type: 'photo', photo: '/assets/voices/marcela-ledesma', focus: '50% 22%', rail: 1, 
      quote: 'Notre site reflète enfin le sérieux de notre travail. Nos clients le remarquent dès le premier échange.' },
    { id: 'nata',              name: 'Nata',              company: 'Nata Burguers',        role: '', type: 'photo', photo: '/assets/voices/nata', focus: '50% 22%', rail: 1, 
      quote: 'Une présence qui donne envie avant même de passer la porte. Exactement l’image que je voulais.' },
    { id: 'benjamin-herisson', name: 'Benjamin Hérisson', company: 'Bhevia Pharma',        role: '', type: 'video', wistiaId: '428vac09p5', poster: '/assets/voices/benjamin-herisson-poster', captions: { fr: '/assets/voices/captions/benjamin-herisson.fr.vtt', en: '/assets/voices/captions/benjamin-herisson.en.vtt', es: '/assets/voices/captions/benjamin-herisson.es.vtt' }, rail: 1 },
    { id: 'adrien-vernerey',   name: 'Adrien Vernerey',   company: 'Vernerey Paysage',     role: '', type: 'photo', photo: '/assets/voices/adrien-vernerey', focus: '50% 22%', rail: 1, 
      quote: 'Scalia a compris notre métier. Le site met nos réalisations en valeur avec la même exigence que nos jardins.' },
    { id: 'francisco-david',   name: 'Francisco David',   company: 'Fraco',                role: '', type: 'photo', photo: '/assets/voices/francisco-david', focus: '50% 22%', rail: 2, 
      quote: 'Un accompagnement clair du début à la fin. Nous savions toujours où en était le projet.' },
    { id: 'corentin-lavenan',  name: 'Corentin Lavenan',  company: 'Skaleos',              role: '', type: 'video', wistiaId: 'wodu23wpny', poster: '/assets/voices/corentin-lavenan-poster', captions: { fr: '/assets/voices/captions/corentin-lavenan.fr.vtt', en: '/assets/voices/captions/corentin-lavenan.en.vtt', es: '/assets/voices/captions/corentin-lavenan.es.vtt' }, rail: 2 },
    { id: 'melissa-hernandez', name: 'Melissa Hernandez', company: 'Miscore',              role: '', type: 'photo', photo: '/assets/voices/melissa-hernandez', focus: '50% 22%', rail: 2, 
      quote: 'Élégant, rapide et simple à comprendre. Notre offre n’a jamais été aussi lisible.' },
    { id: 'rachel-pruden',     name: 'Rachel Pruden',     company: 'L’Éclat des Flots',   role: '', type: 'video', wistiaId: 'f0qwxyvc58', poster: '/assets/voices/rachel-pruden-poster', captions: { fr: '/assets/voices/captions/rachel-pruden.fr.vtt', en: '/assets/voices/captions/rachel-pruden.en.vtt', es: '/assets/voices/captions/rachel-pruden.es.vtt' }, rail: 2 },
    { id: 'rafael-montero',    name: 'Rafael Montero',    company: 'Dora Electroservices', role: '', type: 'photo', photo: '/assets/voices/rafael-montero', focus: '50% 22%', rail: 2, 
      quote: 'Nos clients nous trouvent plus facilement et nous contactent en confiance.' }
  ];

  boot();

  function boot() {
  var PUBLISHED = VOICES;   // all cards, in order
  // Below this many cards two drifting rails would loop the same faces: the
  // section then shows one calm, centred row (swipeable on phones) instead.
  var MIN_FOR_RAILS = 6;
  var STATIC = PUBLISHED.length < MIN_FOR_RAILS;

  var SPEED = { mobile: 20, desktop: 26 };    // px per second: an editorial drift, not a ticker
  var RESUME_DELAY = 1000;
  var RAMP_IN = 900, RAMP_OUT = 380;

  var root = document.getElementById('voix');
  if (!root || root.__voicesBooted) return;      // one engine per page: never a second set of listeners
  root.__voicesBooted = true;
  var rails = Array.prototype.slice.call(root.querySelectorAll('[data-voices-rail]'));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var desktopMQ = matchMedia('(min-width: 1024px)');

  function L(fr) { return window.ScaliaI18n ? window.ScaliaI18n.t(fr) : fr; }
  function isVideo(v) { return v.type === 'video' && !!v.wistiaId; }

  /* --------------------------------------------------------------- render -- */
  var SVG_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 7.2v9.6a.6.6 0 0 0 .9.52l7.6-4.8a.6.6 0 0 0 0-1.04L9.9 6.68a.6.6 0 0 0-.9.52Z" fill="currentColor"/></svg>';
  var SVG_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function initials(name) { return name.split(/\s+/).map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase(); }

  // Responsive 9:16 image (photo or local poster). Card width tops out at
  // ~300 CSS px, so 480w covers 1x/1.5x and 960w covers 2x/3x.
  function picture(base, v) {
    var sizes = '(min-width: 1024px) 300px, (min-width: 768px) 34vw, 66vw';
    var set = function (ext) { return base + '-480.' + ext + ' 480w, ' + base + '-960.' + ext + ' 960w'; };
    return '<picture class="voice__img">' +
      '<source type="image/avif" srcset="' + set('avif') + '" sizes="' + sizes + '">' +
      '<source type="image/webp" srcset="' + set('webp') + '" sizes="' + sizes + '">' +
      '<img src="' + base + '-480.webp" width="480" height="853" alt="" loading="lazy" decoding="async" style="object-position:' + esc(v.focus || '50% 30%') + '">' +
      '</picture>';
  }

  // A quote in the site language (i18n dictionaries), French as source.
  function quoteText(v) { return L(v.quote); }

  function cardHTML(v) {
    var video = isVideo(v);
    var media;
    if (video && v.poster) media = picture(v.poster, v);
    else if (v.photo) media = picture(v.photo, v);
    else media = '';
    var pending = !media || (video && !v.poster);
    return '<article class="voice" data-voice="' + esc(v.id) + '" data-type="' + (video ? 'video' : 'photo') + '"' + (pending ? ' data-pending' : '') + '>' +
      '<div class="voice__media">' +
        '<div class="voice__matter" aria-hidden="true"><span class="voice__mono">' + esc(initials(v.name)) + '</span></div>' +
        media +
      '</div>' +
      '<div class="voice__shade" aria-hidden="true"></div>' +
      '<div class="voice__meta">' +
        (v.quote && !video ? '<blockquote class="voice__quote">' + esc(quoteText(v)) + '</blockquote>' : '') +
        '<p class="voice__name">' + esc(v.name) + '</p>' +
        (v.company ? '<p class="voice__company">' + esc(v.company) + '</p>' : '') +
        (v.role ? '<p class="voice__role">' + esc(v.role) + '</p>' : '') +
      '</div>' +
      (video ? '<button class="voice__play" type="button" data-voice-play><span class="voice__play-icon">' + SVG_PLAY + '</span></button>' : '') +
      '</article>';
  }

  function label() {
    Array.prototype.forEach.call(root.querySelectorAll('.voice'), function (card) {
      var v = byId[card.getAttribute('data-voice')];
      var play = card.querySelector('[data-voice-play]');
      if (play) play.setAttribute('aria-label', L('Lire le témoignage vidéo') + ' : ' + v.name + (v.company ? ', ' + v.company : ''));
      var q = card.querySelector('.voice__quote');
      if (q) q.textContent = quoteText(v);
    });
    if (current && current.close) current.close.setAttribute('aria-label', L('Fermer la vidéo') + ' : ' + current.v.name);
  }

  var byId = {};
  VOICES.forEach(function (v) { byId[v.id] = v; });

  /* ---------------------------------------------------------------- rails -- */
  if (STATIC) root.classList.add('voices--static');
  var state = rails.map(function (el) {
    var n = +el.getAttribute('data-voices-rail');
    var track = el.querySelector('.voices__track');
    var list = STATIC ? (n === 1 ? PUBLISHED : [])
      : PUBLISHED.filter(function (v) { return (v.rail || 1) === n; });
    if (!list.length) { el.hidden = true; return null; }
    if (STATIC) el.classList.add('voices__rail--static');
    track.innerHTML = '<div class="voices__set" role="list">' +
      list.map(function (v) { return '<div role="listitem">' + cardHTML(v) + '</div>'; }).join('') + '</div>';
    return {
      n: n, el: el, track: track, orig: track.firstElementChild,
      dir: n === 1 ? 1 : -1,     // 1 = drifts right, -1 = drifts left
      x: 0, P: 0, gap: 0,        // track offset (px), period (set + gap)
      k: 0, kFrom: 0, kTo: 0, kT0: 0, kMs: 0,   // drift factor, eased
      v: 0, glide: null,         // release momentum (px/ms), eased slide
      fTo: 0, fShown: 0, fV: 0, fT: 0, fNew: false, fXt: false,   // drag: finger target / drawn offset (px), finger speed (px/ms), last event time, new event?, extrapolated?
      resumeT: 0,
      hover: false, focus: false, press: false, drag: false, playing: false, visible: false
    };
  }).filter(Boolean);

  label();
  document.documentElement.addEventListener('scalia:locale', label);

  /* --------------------------------------------------------------- engine --
     ONE source of truth per rail: r.x, the track's horizontal offset (px).
     The rail only clips (overflow hidden): it is not a scroller, nothing in
     it has a scroll position, so nothing here can ever move the page. The
     track holds identical copies of the set; the picture at x and at x ± P
     (one period: set + gap) is the same, so the loop keeps x inside one
     period by whole periods: invisible, DOM untouched, height untouched.
     ONE rAF loop for both rails, alive only while something moves. Per
     frame it writes the tracks' transforms and nothing else. */
  var TAU = 260, V_FLICK = 0.08, V_MAX = 3.5, V_STOP = 0.02;   // release momentum
  var raf = 0, lastNow = 0;

  function speed() { return desktopMQ.matches ? SPEED.desktop : SPEED.mobile; }   // px per second
  function paint(r) { r.track.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,0,0)'; }
  // x stays in [-1.5P, -0.5P): half a period of copies on the left, the rest
  // on the right. Never while a video plays (its stage rides on the track).
  function wrap(r) {
    if (!r.P || r.playing) return;
    var k = Math.floor(r.x / r.P + 0.5) + 1;
    if (k) r.x -= k * r.P;
  }
  function move(r, dx) { if (!r.P || !dx) return; r.x += dx; wrap(r); paint(r); }

  // Drift factor r.k, eased from where it stands: never a jump in speed.
  function setK(r, to, ms) {
    r.kFrom = r.k; r.kTo = to; r.kT0 = performance.now(); r.kMs = ms || 0;
    if (!ms) r.k = to;
    wake();
  }
  function stepK(r, now) {
    if (r.k === r.kTo) return;
    var p = r.kMs ? Math.min(1, (now - r.kT0) / r.kMs) : 1;
    var e = r.kTo > r.kFrom ? p * p * (3 - 2 * p) : 1 - Math.pow(1 - p, 3);
    r.k = p >= 1 ? r.kTo : r.kFrom + (r.kTo - r.kFrom) * e;
  }
  function tick(now) {
    raf = 0;
    var dt = lastNow ? Math.min(50, now - lastNow) : 16;
    lastNow = now;
    var again = false;
    state.forEach(function (r) {
      if (!r.P) return;
      if (r.drag) { drawDrag(r, now, dt); again = true; return; }   // the finger has it
      stepK(r, now);
      var dx = r.dir * speed() * r.k * dt / 1000;
      if (r.v) {
        dx += r.v * dt;
        r.v *= Math.exp(-dt / TAU);
        if (Math.abs(r.v) < V_STOP) { r.v = 0; settle(r); }
      }
      if (r.glide) {
        var g = r.glide, p = Math.min(1, (now - g.t0) / g.ms), e = 1 - Math.pow(1 - p, 3);
        dx += g.total * e - g.done; g.done = g.total * e;
        if (p >= 1) r.glide = null;
      }
      move(r, dx);
      if (r.glide || r.v || (r.visible && (r.k || r.kTo))) again = true;
    });
    if (again) raf = requestAnimationFrame(tick); else lastNow = 0;
  }
  function wake() { if (!raf) { lastNow = 0; raf = requestAnimationFrame(tick); } }

  // Drag, drawn on the screen's own frames (pointermove only records): one
  // transform write per frame, at whatever rate the display runs. A frame
  // with a new finger event draws the finger's real position. The first
  // frame without one extrapolates at the finger's speed, by at most one
  // frame; further empty frames hold still. The next real event puts the
  // rail back exactly under the finger (1:1), and so does a finger that has
  // stopped (no event for 50 ms).
  function drawDrag(r, now, dt) {
    var want;
    if (r.fNew) { want = r.fTo; r.fNew = false; r.fXt = false; }
    else if (!r.fXt && r.fV && now - r.fT < 50) { want = r.fTo + r.fV * Math.max(0, Math.min(now - r.fT, dt)); r.fXt = true; }
    else if (r.fShown !== r.fTo && now - r.fT >= 50) want = r.fTo;   // the finger has stopped: back exactly under it
    else return;
    move(r, want - r.fShown);
    r.fShown = want;
  }
  // The rail exactly under the finger (release): no extrapolation left.
  function settleDrag(r) { move(r, r.fTo - r.fShown); r.fShown = r.fTo; }

  // Horizontal shift (px) that brings a card fully inside its rail.
  function inView(r, card) {
    var b = r.el.getBoundingClientRect(), c = card.getBoundingClientRect();
    var fade = parseFloat(getComputedStyle(r.el).getPropertyValue('--fade')) || 0;
    var pad = Math.min(fade + 12, Math.max(0, (b.width - c.width) / 2));
    if (c.left < b.left + pad) return b.left + pad - c.left;
    if (c.right > b.right - pad) return b.right - pad - c.right;
    return 0;
  }

  /* -------------------------------------------------------- pause / resume --
     One rule, one timer per rail. Anything holding the rail stops the drift
     (a finger at once; hover, focus or a video ease it out). The drift comes
     back RESUME_DELAY after the last hold has ended and the momentum is over,
     easing in from where the rail stands. */
  function wanted(r) {
    return reduce || r.hover || r.focus || r.press || r.drag || r.v || r.glide || r.playing || !r.visible ? 0 : 1;
  }
  function settle(r, immediate) {
    clearTimeout(r.resumeT);
    if (wanted(r) === 0) return setK(r, 0, immediate || r.press ? 0 : RAMP_OUT);
    r.resumeT = setTimeout(function () { if (wanted(r) === 1) setK(r, 1, RAMP_IN); }, immediate ? 0 : RESUME_DELAY);
  }

  /* ----------------------------------------------------------- interaction --
     ONE gesture system: pointer events (finger, pen and mouse alike).
     CSS gives the rail touch-action: pan-y, so a vertical swipe belongs to
     the browser (the page scrolls natively and we get pointercancel), and a
     horizontal one comes to us: the rail follows 1:1, the page does not
     move. Axis lock: the first 8px decide. Release: a short momentum, then
     the drift returns. */
  function velocity(s, tUp) {
    var n = s.length;
    if (n < 4 || tUp - s[n - 1] > 60) return 0;           // held still before letting go
    var i = n - 2;
    while (i >= 2 && s[n - 1] - s[i - 1] <= 80) i -= 2;   // the last ~80 ms
    var v = (s[n - 2] - s[i]) / Math.max(1, s[n - 1] - s[i + 1]);
    return Math.abs(v) > V_FLICK ? Math.max(-V_MAX, Math.min(V_MAX, v)) : 0;
  }

  if (!STATIC) state.forEach(function (r) {
    var el = r.el, g = null, moved = 0;

    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { r.hover = true; settle(r); } });
    el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { r.hover = false; settle(r); } });

    // Keyboard focus holds the rail and brings the card into view.
    el.addEventListener('focusin', function (e) {
      var kb = true;
      try { kb = e.target.matches(':focus-visible'); } catch (_) {}
      if (!kb) return;
      r.focus = true; settle(r, true);
      var card = e.target.closest('.voice');
      if (card && !r.playing) move(r, inView(r, card));
    });
    el.addEventListener('focusout', function (e) {
      if (!el.contains(e.relatedTarget)) { r.focus = false; settle(r); }
    });

    el.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || e.button !== 0 || r.playing || g) return;
      g = { id: e.pointerId, mouse: e.pointerType === 'mouse', x0: e.clientX, y0: e.clientY, x: e.clientX, on: false, s: [] };
      moved = 0;
      r.press = true; r.v = 0; r.glide = null;
      settle(r, true);                               // stops at once, exactly where it is
    });
    el.addEventListener('pointermove', function (e) {
      if (!g || e.pointerId !== g.id) return;
      if (!g.on) {
        var ax = Math.abs(e.clientX - g.x0), ay = Math.abs(e.clientY - g.y0), slop = g.mouse ? 3 : 8;
        if (ax < slop && ay < slop) return;
        if (!g.mouse && ay >= ax) return end(e);   // vertical: the page's
        g.on = true; r.drag = true;
        r.fTo = r.fShown = 0; r.fV = 0; r.fNew = r.fXt = false;
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        el.classList.add('is-dragging');
      }
      var dx = e.clientX - g.x;
      g.x = e.clientX;
      moved += Math.abs(dx);
      g.s.push(e.clientX, e.timeStamp);
      if (g.s.length > 24) g.s.splice(0, 2);
      // Record only: the frame loop draws it.
      r.fTo += dx; r.fT = performance.now(); r.fNew = true;   // same clock as the frames
      var s = g.s, n = s.length, i = n - 2;
      while (i >= 2 && s[n - 1] - s[i - 1] <= 50) i -= 2;   // finger speed over the last ~50 ms
      r.fV = s[n - 1] > s[i + 1] ? (s[n - 2] - s[i]) / (s[n - 1] - s[i + 1]) : 0;
      wake();
    });
    function end(e) {
      if (!g || e.pointerId !== g.id) return;
      var d = g; g = null;
      r.press = false;
      if (d.on) {
        settleDrag(r);
        r.drag = false;
        el.classList.remove('is-dragging');
        if (e.type === 'pointerup' && !reduce) r.v = velocity(d.s, e.timeStamp);
      }
      settle(r); wake();
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', function (e) {
      if (e.target === el) end(e);
    });
    // A drag never ends in a click on the card under it.
    el.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // Trackpad: a sideways two-finger swipe moves the rail; up / down stays the page's.
    el.addEventListener('wheel', function (e) {
      if (r.playing || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      r.v = 0; r.glide = null;
      setK(r, 0, 0);
      move(r, -e.deltaX * (e.deltaMode === 1 ? 16 : 1));
      settle(r);                                     // resumes RESUME_DELAY after the last one
    }, { passive: false });
  });

  /* --------------------------------------------------------- Scalia player --
     Wistia is only the video host. Its public media JSON lists the encoded
     MP4 renditions; the right one plays in a native <video> wrapped in
     Scalia's own controls. No Wistia script, iframe, skin or branding.
       · the 3 tiny JSON files are fetched once the section is ~600px away
       · video bytes are requested only on play (preload="none" until then)
       · one player exists at a time
     The player never lives inside a card (a looping rail can wrap a card a
     whole set away): it is a stage laid over the card inside the frozen rail,
     and slides with the rail while the card is brought fully into view. */
  var MEDIA_JSON = 'https://fast.wistia.com/embed/medias/';
  var RENDITIONS = { md_mp4_video: 1, hd_mp4_video: 1, iphone_video: 1, mp4_video: 1 };
  var sources = {};   // wistiaId -> Promise<[{ url, width }]>

  function getSources(id) {
    if (sources[id]) return sources[id];
    sources[id] = fetch(MEDIA_JSON + encodeURIComponent(id) + '.json').then(function (res) {
      if (!res.ok) throw new Error('media ' + res.status);
      return res.json();
    }).then(function (data) {
      var list = ((data.media && data.media.assets) || []).filter(function (a) {
        return RENDITIONS[a.type] && a.url && (!a.container || a.container === 'mp4');
      }).map(function (a) {
        return { url: a.url.replace(/\.bin(\?.*)?$/, '.mp4'), width: a.width || 0 };
      }).sort(function (x, y) { return x.width - y.width; });
      if (!list.length) throw new Error('no mp4');
      sources[id].resolved = list;
      return list;
    });
    sources[id].catch(function () { delete sources[id]; });
    return sources[id];
  }
  // Smallest rendition that is sharp at the card's device-pixel width.
  function pick(list, cssWidth) {
    var need = Math.max(360, cssWidth * Math.min(window.devicePixelRatio || 1, 2.5));
    for (var i = 0; i < list.length; i++) if (list[i].width >= need) return list[i].url;
    return list[list.length - 1].url;
  }
  function prefetchSources() { VOICES.forEach(function (v) { if (isVideo(v)) getSources(v.wistiaId).catch(function () {}); }); }

  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.5 6.6v10.8a.7.7 0 0 0 1.06.6l8.6-5.4a.7.7 0 0 0 0-1.2L9.56 6a.7.7 0 0 0-1.06.6Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="6" width="3.4" height="12" rx="1" fill="currentColor"/><rect x="13.6" y="6" width="3.4" height="12" rx="1" fill="currentColor"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3z" fill="currentColor"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3z" fill="currentColor"/><path d="m15.5 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    cc: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.6 10.3a2.2 2.2 0 1 0 0 3.4M16.6 10.3a2.2 2.2 0 1 0 0 3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9.5V5h4.5M19 9.5V5h-4.5M5 14.5V19h4.5M19 14.5V19h-4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    unfull: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.5 5v4.5H5M14.5 5v4.5H19M9.5 19v-4.5H5M14.5 19v-4.5H19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  // Captions: the file for the site language when it exists, French otherwise.
  var CAP_LABEL = { fr: 'Français', en: 'English', es: 'Español' };
  var capsOn = true;   // remembered for the visit: one choice applies to every video
  function capLang(v) {
    var loc = window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr';
    return v.captions && v.captions[loc] ? loc : 'fr';
  }
  function capSrc(v) { return v.captions ? v.captions[capLang(v)] || null : null; }
  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }

  var current = null;   // { v, rail, stage, video, cards, idleT, io }

  function railOf(card) { for (var i = 0; i < state.length; i++) if (state[i].el.contains(card)) return state[i]; return null; }

  // The copy of a voice (original or loop clone) sitting most inside its rail.
  function visibleCopy(r, id) {
    var b = r.el.getBoundingClientRect(), best = null, score = -1;
    Array.prototype.forEach.call(r.el.querySelectorAll('.voice[data-voice="' + id + '"]'), function (c) {
      var x = c.getBoundingClientRect();
      var s = Math.max(0, Math.min(x.right, b.right) - Math.max(x.left, b.left));
      if (s > score) { score = s; best = c; }
    });
    return best;
  }

  function buildStage(v, posterSrc) {
    var stage = document.createElement('div');
    stage.className = 'vplayer';
    stage.setAttribute('data-state', 'loading');
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', L('Témoignage vidéo') + ' : ' + v.name + (v.company ? ', ' + v.company : ''));
    stage.innerHTML =
      '<video class="vplayer__video" playsinline webkit-playsinline preload="none" disablepictureinpicture disableremoteplayback' +
        (posterSrc ? ' poster="' + esc(posterSrc) + '"' : '') + '></video>' +
      '<button class="vplayer__surface" type="button" tabindex="-1" aria-hidden="true"><span class="vplayer__big">' + ICON.play + '</span></button>' +
      '<span class="vplayer__spinner" aria-hidden="true"></span>' +
      '<p class="vplayer__error" role="status">' + esc(L('Vidéo indisponible pour le moment.')) + '</p>' +
      '<p class="vplayer__captions" aria-hidden="true"><span></span></p>' +
      '<div class="vplayer__top">' +
        '<p class="vplayer__who"><span class="vplayer__name">' + esc(v.name) + '</span>' +
          (v.company ? '<span class="vplayer__company">' + esc(v.company) + '</span>' : '') + '</p>' +
        '<button class="vplayer__btn vplayer__close" type="button" data-voice-close>' + SVG_CLOSE + '</button>' +
      '</div>' +
      '<div class="vplayer__bar">' +
        '<div class="vplayer__scrub"><span class="vplayer__rail" aria-hidden="true"><span class="vplayer__buf"></span><span class="vplayer__fill"></span></span>' +
          '<input class="vplayer__range" type="range" min="0" max="1000" step="1" value="0"></div>' +
        '<div class="vplayer__row">' +
          '<button class="vplayer__btn" type="button" data-act="toggle">' + ICON.pause + '</button>' +
          '<span class="vplayer__time" aria-hidden="true">0:00</span>' +
          '<span class="vplayer__gap"></span>' +
          (v.captions ? '<button class="vplayer__btn vplayer__cc" type="button" data-act="cc" aria-pressed="true">' + ICON.cc + '</button>' : '') +
          '<button class="vplayer__btn" type="button" data-act="mute">' + ICON.sound + '</button>' +
          '<button class="vplayer__btn" type="button" data-act="full">' + ICON.full + '</button>' +
        '</div>' +
      '</div>';
    return stage;
  }

  function openVideo(card) {
    var v = byId[card.getAttribute('data-voice')];
    var r = railOf(card);
    if (!v || !isVideo(v) || !r) return;
    if (current && current.v === v && current.rail === r) return;
    closeVideo();
    r.playing = true; settle(r, true);              // a playing video holds its rail: no drift, no drag under it

    var b = r.track.getBoundingClientRect(), c = card.getBoundingClientRect();
    var img = card.querySelector('.voice__img img');
    var stage = buildStage(v, img && (img.currentSrc || img.src));
    var mine = current = { v: v, rail: r, stage: stage, video: stage.querySelector('video'), cards: [], idleT: 0, io: null };
    // In the track: the stage rides on the track's transform.
    stage.style.cssText = 'left:' + (c.left - b.left) + 'px;top:' + (c.top - b.top) + 'px;width:' + c.width + 'px;height:' + c.height + 'px';
    r.track.appendChild(stage);
    mine.cards = Array.prototype.slice.call(r.el.querySelectorAll('.voice[data-voice="' + v.id + '"]'));
    mine.cards.forEach(function (k) { k.classList.add('is-playing'); });
    wire(mine, c.width);

    // Rail and stage glide together until the card sits fully in view.
    var d = STATIC ? 0 : inView(r, card);           // the static row: the visitor swipes it
    if (d) {
      if (reduce) move(r, d);
      else { r.glide = { total: d, done: 0, t0: performance.now(), ms: 520 }; wake(); }
    }
    if (window.scaliaTrack) window.scaliaTrack('testimonial_play', { video: v.wistiaId });
    stage.querySelector('[data-act="toggle"]').focus({ preventScroll: true });
  }

  function wire(mine, cssWidth) {
    var stage = mine.stage, video = mine.video, v = mine.v;
    var range = stage.querySelector('.vplayer__range');
    var fill = stage.querySelector('.vplayer__fill'), buf = stage.querySelector('.vplayer__buf');
    var time = stage.querySelector('.vplayer__time');
    var bToggle = stage.querySelector('[data-act="toggle"]'), bMute = stage.querySelector('[data-act="mute"]'), bFull = stage.querySelector('[data-act="full"]');
    var seeking = false;
    var bCC = stage.querySelector('[data-act="cc"]');
    var capBox = stage.querySelector('.vplayer__captions'), capText = capBox.firstChild;
    var trackEl = null, track = null, nativeFs = false;

    // Captions are drawn by the player (above the control bar, never under
    // it). Exactly one <track> exists at a time, for the site language: on a
    // language change it is swapped in place, the video itself is untouched
    // (no reload, same time, same play / mute / fullscreen state). The native
    // track stays hidden except inside the iPhone system player.
    function cue() {
      var c = track && track.activeCues && track.activeCues[0];
      capText.textContent = c ? c.text : '';
      capBox.classList.toggle('is-on', capsOn && !!c);
    }
    function nativeMode() { return nativeFs ? (capsOn ? 'showing' : 'disabled') : 'hidden'; }
    function setTrack() {
      var lang = capLang(v), src = capSrc(v);
      if (trackEl && trackEl.getAttribute('srclang') === lang) return;
      if (trackEl) {
        track.removeEventListener('cuechange', cue);
        track.mode = 'disabled';
        trackEl.remove();
      }
      trackEl = track = null;
      capText.textContent = '';
      capBox.classList.remove('is-on');
      if (!src) return;
      trackEl = document.createElement('track');
      trackEl.kind = 'captions';
      trackEl.srclang = lang;
      trackEl.label = CAP_LABEL[lang] || lang;
      trackEl.src = src;
      trackEl.addEventListener('load', cue);
      video.appendChild(trackEl);
      track = trackEl.track;
      track.mode = nativeMode();   // also triggers loading the cues
      track.addEventListener('cuechange', cue);
    }
    function setCaps(on) {
      capsOn = on;
      if (bCC) bCC.setAttribute('aria-pressed', on ? 'true' : 'false');
      stage.classList.toggle('has-captions', on);
      if (track) track.mode = nativeMode();
      cue();
    }
    video.addEventListener('webkitbeginfullscreen', function () { nativeFs = true; if (track) track.mode = nativeMode(); });
    video.addEventListener('webkitendfullscreen', function () { nativeFs = false; if (track) track.mode = nativeMode(); cue(); });
    if (bCC) bCC.addEventListener('click', function () { setCaps(!capsOn); wake(); });
    setTrack();
    setCaps(capsOn);   // the visitor's choice persists across videos and languages
    mine.onLocale = function () { labels(); setTrack(); cue(); };

    function set(st) { stage.setAttribute('data-state', st); }
    function labels() {
      var playing = !video.paused && !video.ended;
      bToggle.innerHTML = playing ? ICON.pause : ICON.play;
      bToggle.setAttribute('aria-label', L(playing ? 'Mettre en pause' : 'Lire'));
      bMute.innerHTML = video.muted ? ICON.muted : ICON.sound;
      bMute.setAttribute('aria-label', L(video.muted ? 'Activer le son' : 'Couper le son'));
      var fs = fsElement() === stage;
      bFull.innerHTML = fs ? ICON.unfull : ICON.full;
      bFull.setAttribute('aria-label', L(fs ? 'Quitter le plein écran' : 'Plein écran'));
      range.setAttribute('aria-label', L('Progression de la vidéo'));
      range.setAttribute('aria-valuetext', fmt(video.currentTime) + ' / ' + fmt(video.duration));
      stage.querySelector('[data-voice-close]').setAttribute('aria-label', L('Fermer la vidéo') + ' : ' + v.name);
      if (bCC) bCC.setAttribute('aria-label', L('Sous-titres'));
    }
    mine.labels = labels;
    function progress() {
      var d = video.duration || 0, k = d ? video.currentTime / d : 0;
      fill.style.transform = 'scaleX(' + k + ')';
      if (!seeking) range.value = Math.round(k * 1000);
      time.textContent = d ? '-' + fmt(d - video.currentTime) : fmt(video.currentTime);
      if (video.buffered.length && d) buf.style.transform = 'scaleX(' + (video.buffered.end(video.buffered.length - 1) / d) + ')';
    }

    // Controls fade after a still moment while playing; any touch brings them back.
    function wake() {
      stage.classList.remove('is-idle');
      clearTimeout(mine.idleT);
      mine.idleT = setTimeout(function () { if (!video.paused && !seeking) stage.classList.add('is-idle'); }, 2600);
    }
    function play() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { set('paused'); labels(); });   // refused: the big play button waits
    }
    function toggle() { if (video.paused || video.ended) play(); else video.pause(); }

    video.addEventListener('playing', function () { set('playing'); labels(); wake(); });
    video.addEventListener('pause', function () { if (!video.ended) set('paused'); labels(); wake(); });
    video.addEventListener('waiting', function () { set('loading'); });
    video.addEventListener('timeupdate', progress);
    video.addEventListener('progress', progress);
    video.addEventListener('loadedmetadata', progress);
    video.addEventListener('volumechange', labels);
    video.addEventListener('ended', function () { if (current === mine) closeVideo(); });
    video.addEventListener('error', function () { set('error'); });

    stage.querySelector('.vplayer__surface').addEventListener('click', function () {
      if (stage.classList.contains('is-idle')) { wake(); return; }   // first tap only reveals
      toggle();
    });
    bToggle.addEventListener('click', toggle);
    bMute.addEventListener('click', function () { video.muted = !video.muted; wake(); });
    bFull.addEventListener('click', function () {
      if (fsElement() === stage) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
      else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();   // iPhone: system player
    });
    range.addEventListener('input', function () {
      seeking = true;
      if (video.duration) {
        video.currentTime = range.value / 1000 * video.duration;
        fill.style.transform = 'scaleX(' + range.value / 1000 + ')';
      }
      wake();
    });
    range.addEventListener('change', function () { seeking = false; wake(); });
    stage.addEventListener('pointermove', wake);
    stage.addEventListener('focusin', wake);
    stage.addEventListener('keydown', function (e) {
      var tag = e.target.tagName;
      if ((e.key === ' ' || e.key === 'k') && tag !== 'BUTTON' && tag !== 'INPUT') { e.preventDefault(); toggle(); }
      else if (e.key === 'm') { video.muted = !video.muted; }
      else if (e.key === 'c' && bCC) { bCC.click(); }
      else if (e.key === 'f') { bFull.click(); }
      else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && tag !== 'INPUT' && video.duration) {
        e.preventDefault(); video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + (e.key === 'ArrowRight' ? 5 : -5)));
      }
      wake();
    });
    mine.onFs = function () { labels(); stage.classList.toggle('is-fullscreen', fsElement() === stage); };
    document.addEventListener('fullscreenchange', mine.onFs);
    document.addEventListener('webkitfullscreenchange', mine.onFs);

    // Scrolled away: pause (the stage stays, the visitor resumes on return).
    if ('IntersectionObserver' in window) {
      mine.io = new IntersectionObserver(function (en) { if (!en[0].isIntersecting && !video.paused && fsElement() !== stage) video.pause(); }, { threshold: 0.15 });
      mine.io.observe(stage);
    }
    labels();

    // Play inside the tap. Sources are usually prefetched, so play() runs in
    // the same user gesture (required for sound on iOS).
    var ready = sources[v.wistiaId];
    function start(list) {
      if (current !== mine) return;
      video.src = pick(list, cssWidth);
      video.preload = 'auto';
      play();
    }
    if (ready && ready.resolved) start(ready.resolved);
    else getSources(v.wistiaId).then(start).catch(function () { if (current === mine) set('error'); });
  }

  function closeVideo() {
    if (!current) return;
    var c = current; current = null;
    clearTimeout(c.idleT);
    if (c.io) c.io.disconnect();
    document.removeEventListener('fullscreenchange', c.onFs);
    document.removeEventListener('webkitfullscreenchange', c.onFs);
    if (fsElement() === c.stage) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (_) {} }
    try { c.video.pause(); c.video.removeAttribute('src'); c.video.load(); } catch (_) {}   // free the stream
    var hadFocus = c.stage.contains(document.activeElement);
    c.stage.remove();
    c.cards.forEach(function (k) { k.classList.remove('is-playing'); });
    c.rail.playing = false;
    if (hadFocus) {
      var back = visibleCopy(c.rail, c.v.id);
      // Clones are inert: fall back to the original card's button.
      var btn = back && !back.closest('[inert]') ? back.querySelector('[data-voice-play]')
        : c.rail.el.querySelector('.voices__set:first-child .voice[data-voice="' + c.v.id + '"] [data-voice-play]');
      if (btn) btn.focus({ preventScroll: true });
    }
    settle(c.rail);   // eases back in after RESUME_DELAY
  }

  root.addEventListener('click', function (e) {
    var play = e.target.closest('[data-voice-play]');
    if (play) { openVideo(play.closest('.voice')); return; }
    if (e.target.closest('[data-voice-close]')) closeVideo();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current && !fsElement()) closeVideo(); });
  // One listener for the whole page: the open player (if any) follows the language.
  document.documentElement.addEventListener('scalia:locale', function () { if (current && current.onLocale) current.onLocale(); });


  /* ------------------------------------------------------------ lifecycle --
     Layout runs once at start, then only if a card or the window WIDTH really
     changes (rotation, desktop window). It reads two widths, adds copies if a
     wider screen needs them (it never removes or rebuilds any), and keeps
     each rail's place. A phone's URL bar or keyboard changes only the height:
     nothing to do, nothing read. */
  var railsEl = root.querySelector('.voices__rails');
  var lastW = 0, lastCard = 0, rzRaf = 0;

  function clone(set) {
    var c = set.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.setAttribute('inert', '');
    c.removeAttribute('role');
    Array.prototype.forEach.call(c.querySelectorAll('[role="listitem"]'), function (li) { li.removeAttribute('role'); });
    return c;
  }
  function cardW() { var c = root.querySelector('.voice'); return c ? Math.round(c.getBoundingClientRect().width) : 0; }
  function layout() {
    var keep = state.map(function (r) { return r.P ? r.x / r.P : null; });   // place, in periods
    lastW = window.innerWidth; lastCard = cardW();
    state.forEach(function (r) {
      r.gap = parseFloat(getComputedStyle(r.track).columnGap) || 0;
      r.P = r.orig.getBoundingClientRect().width + r.gap;
    });
    // Both rails share ONE band: as wide as the container, never wider than
    // the shortest set, so nobody shows twice in a rail.
    var band = railsEl.getBoundingClientRect().width || lastW;
    state.forEach(function (r) { if (r.P) band = Math.min(band, r.P - r.gap); });
    railsEl.style.setProperty('--band', Math.floor(band) + 'px');
    var widest = Math.max(lastW, screen.width || 0, screen.height || 0);
    state.forEach(function (r, i) {
      if (!r.P) return;
      var need = Math.ceil(widest / r.P) + 3;     // [-1.5P, -0.5P) + the widest band
      while (r.track.children.length < need) r.track.appendChild(clone(r.orig));
      // First layout: the rails start out of phase, as they always have.
      r.x = keep[i] !== null ? keep[i] * r.P : -(r.dir > 0 ? 0.63 : 0.74) * r.P;
      wrap(r); paint(r);
    });
  }

  if (!STATIC) {
    layout();
    window.addEventListener('resize', function () {
      if (rzRaf) return;
      rzRaf = requestAnimationFrame(function () {
        rzRaf = 0;
        if (window.innerWidth === lastW && !finePointer) return;   // height only (URL bar, keyboard)
        if (window.innerWidth === lastW && cardW() === lastCard) return;
        closeVideo();
        layout();
      });
    }, { passive: true });
  }

  // ONE observer: the section near the screen → rails drift (and the three
  // tiny video JSON files are fetched once); away → everything stops.
  function show(on) {
    state.forEach(function (r) {
      r.visible = on;
      if (on) settle(r, true);
      else { clearTimeout(r.resumeT); r.v = 0; r.glide = null; setK(r, 0, 0); }
    });
  }
  var prefetched = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var on = entries[entries.length - 1].isIntersecting;
      if (on && !prefetched) { prefetched = true; prefetchSources(); }
      if (!STATIC) show(on);
    }, { rootMargin: '200px 0px' }).observe(root);
  } else {
    prefetchSources();
    if (!STATIC) show(true);
  }

  // Back / forward cache: the page is frozen as is, nothing re-runs on
  // return (the guard above), the loop simply restarts where it stood.
  window.addEventListener('pagehide', function () {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; lastNow = 0;
    closeVideo();
    state.forEach(function (r) { clearTimeout(r.resumeT); r.press = r.drag = false; r.v = 0; r.glide = null; r.el.classList.remove('is-dragging'); });
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && !STATIC) state.forEach(function (r) { if (r.visible) settle(r, true); });
  });

  }   // boot
})();

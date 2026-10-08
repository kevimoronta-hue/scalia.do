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

   Placeholder portraits and quotes are flagged as drafts (see below) and never
   render outside a local preview until the client has validated them.

   MOTION: each rail is one Web Animation on its track (compositor, no per-frame
   JS while it drifts). Hover, drag, focus and video playback only change that
   rail's playbackRate / currentTime. A short rAF runs only while a speed ramp
   or a release glide is in progress.
   ========================================================================== */
(function () {
  'use strict';

  // DRAFTS: `photoDraft` / `quoteDraft` mark a card whose real photo or
  // client-approved quote is not in yet. Every card is shown everywhere; until
  // its real content arrives a draft card shows only the client's real name
  // and company on the Scalia matter (initials), never a placeholder face or
  // quote. The placeholder portraits and quotes live in voices.drafts.json and
  // assets/voices/drafts/ (both git-ignored) and are merged in on a local /
  // LAN preview only. To publish a card: add the real photo
  // (assets/voices/<id>-480/-960) and the approved quote here, then set both
  // flags to false. ?drafts=0 previews production locally.
  // CAPTIONS: WebVTT per language, UTF-8, same timecodes in every language.
  // FR comes from Wistia's own transcription (proper nouns proof-read);
  // EN / ES are faithful translations of it. The player follows the site
  // language live (see setTrack in the player).
  var VOICES = [
    { id: 'marcela-ledesma',   name: 'Marcela Ledesma',   company: 'Esolutions Latam',     role: '', type: 'photo', photo: null,   photoDraft: true, focus: '50% 22%', rail: 1, quote: '', quoteDraft: true },
    { id: 'nata',              name: 'Nata',              company: 'Nata Burguers',        role: '', type: 'photo', photo: null,              photoDraft: true, focus: '50% 22%', rail: 1, quote: '', quoteDraft: true },
    { id: 'benjamin-herisson', name: 'Benjamin Hérisson', company: 'Bhevia Pharma',        role: '', type: 'video', wistiaId: '428vac09p5', poster: 'assets/voices/benjamin-herisson-poster', captions: { fr: 'assets/voices/captions/benjamin-herisson.fr.vtt', en: 'assets/voices/captions/benjamin-herisson.en.vtt', es: 'assets/voices/captions/benjamin-herisson.es.vtt' }, rail: 1 },
    { id: 'adrien-vernerey',   name: 'Adrien Vernerey',   company: 'Vernerey Paysage',     role: '', type: 'photo', photo: null,   photoDraft: true, focus: '50% 22%', rail: 1, quote: '', quoteDraft: true },
    { id: 'francisco-david',   name: 'Francisco David',   company: 'Fraco',                role: '', type: 'photo', photo: null,   photoDraft: true, focus: '50% 22%', rail: 2, quote: '', quoteDraft: true },
    { id: 'corentin-lavenan',  name: 'Corentin Lavenan',  company: 'Skaleos',              role: '', type: 'video', wistiaId: 'wodu23wpny', poster: 'assets/voices/corentin-lavenan-poster', captions: { fr: 'assets/voices/captions/corentin-lavenan.fr.vtt', en: 'assets/voices/captions/corentin-lavenan.en.vtt', es: 'assets/voices/captions/corentin-lavenan.es.vtt' }, rail: 2 },
    { id: 'melissa-hernandez', name: 'Melissa Hernandez', company: 'Miscore',              role: '', type: 'photo', photo: null, photoDraft: true, focus: '50% 22%', rail: 2, quote: '', quoteDraft: true },
    { id: 'rachel-pruden',     name: 'Rachel Pruden',     company: 'L’Éclat des Flots',   role: '', type: 'video', wistiaId: 'f0qwxyvc58', poster: 'assets/voices/rachel-pruden-poster', captions: { fr: 'assets/voices/captions/rachel-pruden.fr.vtt', en: 'assets/voices/captions/rachel-pruden.en.vtt', es: 'assets/voices/captions/rachel-pruden.es.vtt' }, rail: 2 },
    { id: 'rafael-montero',    name: 'Rafael Montero',    company: 'Dora Electroservices', role: '', type: 'photo', photo: null,    photoDraft: true, focus: '50% 22%', rail: 2, quote: '', quoteDraft: true }
  ];

  var LOCAL = /^(localhost|127\.|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.(local|test|localhost)$/.test(location.hostname);
  var SHOW_DRAFTS = LOCAL && !/[?&]drafts=0\b/.test(location.search);

  // Local preview only: merge the git-ignored placeholders, then start.
  if (SHOW_DRAFTS && window.fetch) {
    fetch('voices.drafts.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) {
        VOICES.forEach(function (v) {
          var x = d && d[v.id];
          if (!x) return;
          if (v.photoDraft && x.photo) v.photo = x.photo;
          if (v.quoteDraft && x.quote) { v.quote = x.quote; v.quoteI18n = { en: x.quote_en, es: x.quote_es }; }
        });
      })
      .catch(function () {})
      .then(boot);
  } else {
    boot();
  }

  function boot() {
  var PUBLISHED = VOICES;   // all cards, in order; drafts carry no placeholder content outside local
  // Below this many cards two drifting rails would loop the same faces: the
  // section then shows one calm, centred row (swipeable on phones) instead.
  var MIN_FOR_RAILS = 6;
  var STATIC = PUBLISHED.length < MIN_FOR_RAILS;

  var SPEED = { mobile: 20, desktop: 26 };    // px per second: an editorial drift, not a ticker
  var RESUME_DELAY = 1000;
  var RAMP_IN = 900, RAMP_OUT = 380;

  var root = document.getElementById('voix');
  if (!root) return;
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

  // A quote in the site language: its own translation when provided (local
  // drafts carry theirs), else the shared dictionary, else the French text.
  function quoteText(v) {
    var loc = window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr';
    return (loc !== 'fr' && v.quoteI18n && v.quoteI18n[loc]) || L(v.quote);
  }

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
      el: el, track: track, dir: n === 1 ? 1 : -1,   // 1 = drifts right, -1 = drifts left
      anim: null, set: 0, dur: 0,
      rate: 0, target: 0, rampRaf: 0, resumeT: 0,
      hover: false, focus: false, drag: null, glideRaf: 0, playing: null, visible: false,
      static: STATIC   // native horizontal scroll, no animation, no clones
    };
  }).filter(Boolean);

  label();
  document.documentElement.addEventListener('scalia:locale', label);

  // Clones fill the band so the loop never shows an edge. They are decoration
  // for the eye only: hidden from assistive tech and out of the tab order.
  // One loop period = one set + one gap (the gap between the set and its clone).
  function measure(r) {
    var gap = parseFloat(getComputedStyle(r.track).columnGap) || 0;
    r.gap = gap;
    r.set = r.track.firstElementChild.getBoundingClientRect().width + gap;
  }

  function build(r, band) {
    var set = r.track.firstElementChild;
    while (r.track.children.length > 1) r.track.removeChild(r.track.lastElementChild);
    if (!r.set) return;
    var copies = Math.max(1, Math.ceil(band / r.set));
    for (var i = 0; i < copies; i++) {
      var c = set.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('inert', '');
      c.removeAttribute('role');
      Array.prototype.forEach.call(c.querySelectorAll('[role="listitem"]'), function (li) { li.removeAttribute('role'); });
      r.track.appendChild(c);
    }

    var speed = desktopMQ.matches ? SPEED.desktop : SPEED.mobile;
    var keepT = r.anim ? frac(r) : 0.37 * (r.dir > 0 ? 1 : 2);   // rails start out of phase
    if (r.anim) r.anim.cancel();
    r.dur = (r.set / speed) * 1000;
    var from = r.dir > 0 ? -r.set : 0, to = r.dir > 0 ? 0 : -r.set;
    r.anim = r.track.animate(
      [{ transform: 'translate3d(' + from + 'px,0,0)' }, { transform: 'translate3d(' + to + 'px,0,0)' }],
      { duration: r.dur, iterations: Infinity, easing: 'linear' }
    );
    r.anim.currentTime = (keepT % 1) * r.dur;
    r.anim.playbackRate = r.rate;
    if (!r.visible) r.anim.pause();
  }

  function frac(r) { return r.anim && r.dur ? (((r.anim.currentTime || 0) % r.dur) + r.dur) % r.dur / r.dur : 0; }

  // Move a rail by dx CSS px (positive = to the right), 1:1 with the finger.
  function nudge(r, dx) {
    if (!r.anim || !r.set) return;
    var t = (r.anim.currentTime || 0) + r.dir * dx * (r.dur / r.set);
    r.anim.currentTime = ((t % r.dur) + r.dur) % r.dur;
  }

  // Horizontal shift (px) that brings a card fully inside its rail.
  function inView(r, card) {
    var b = r.el.getBoundingClientRect(), c = card.getBoundingClientRect();
    var fade = parseFloat(getComputedStyle(r.el).getPropertyValue('--fade')) || 0;
    var pad = Math.min(fade + 12, Math.max(0, (b.width - c.width) / 2));
    if (c.left < b.left + pad) return b.left + pad - c.left;
    if (c.right > b.right - pad) return b.right - pad - c.right;
    return 0;
  }
  // Same, eased over a short glide (used when a video opens half off screen).
  // `each(dx)` lets a stage laid over the card follow the same glide.
  function slideIntoView(r, card, each) {
    var total = inView(r, card), moved = 0, t0 = 0;
    each = each || function () {};
    if (!total) return;
    if (reduce) { nudge(r, total); each(total); return; }
    requestAnimationFrame(function step(now) {
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - k, 3), dx = total * e - moved;
      nudge(r, dx); each(dx); moved = total * e;
      if (k < 1) requestAnimationFrame(step);
    });
  }

  /* ----------------------------------------------------------- speed ramp -- */
  function wanted(r) {
    return reduce || r.hover || r.focus || r.drag || r.glideRaf || r.playing || !r.visible ? 0 : 1;
  }
  function settle(r, immediate) {
    clearTimeout(r.resumeT);
    var w = wanted(r);
    if (w === 0) return ramp(r, 0, immediate ? 0 : RAMP_OUT);
    // Coming back to motion always waits a beat, then eases in.
    r.resumeT = setTimeout(function () { if (wanted(r) === 1) ramp(r, 1, RAMP_IN); }, immediate ? 0 : RESUME_DELAY);
  }
  function ramp(r, to, ms) {
    cancelAnimationFrame(r.rampRaf);
    if (!r.anim) return;
    var from = r.rate, t0 = 0;
    if (!ms || from === to) { apply(r, to); return; }
    (function step(now) {
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / ms);
      var e = to > from ? k * k * (3 - 2 * k) : 1 - Math.pow(1 - k, 3);
      apply(r, from + (to - from) * e);
      if (k < 1) r.rampRaf = requestAnimationFrame(step);
    })(performance.now());
  }
  function apply(r, rate) {
    r.rate = rate;
    if (!r.anim) return;
    r.anim.playbackRate = rate;
    if (rate === 0) { if (r.anim.playState === 'running') r.anim.pause(); }
    else if (r.anim.playState !== 'running' && r.visible) r.anim.play();
  }

  /* ---------------------------------------------------------- interaction -- */
  state.forEach(function (r) {
    var el = r.el;
    if (r.static) return;   // the browser scrolls it; nothing to drive

    if (finePointer) {
      el.addEventListener('mouseenter', function () { r.hover = true; settle(r); });
      el.addEventListener('mouseleave', function () { r.hover = false; settle(r); });
    }

    // Keyboard: focusing a card holds the rail and brings the card into view.
    // Only keyboard focus holds the rail; a mouse or touch focus must not.
    el.addEventListener('focusin', function (e) {
      var kb = true;
      try { kb = e.target.matches(':focus-visible'); } catch (_) {}
      if (!kb) return;
      r.focus = true; settle(r, true);
      var card = e.target.closest('.voice');
      if (card && !r.playing) nudge(r, inView(r, card));
    });
    el.addEventListener('focusout', function (e) {
      if (!el.contains(e.relatedTarget)) { r.focus = false; settle(r); }
    });

    // Drag / swipe. touch-action: pan-y leaves vertical scrolling to the
    // browser; a horizontal gesture comes to us as pointer moves.
    var moved = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || r.playing) return;   // a playing video holds its rail still
      cancelAnimationFrame(r.glideRaf); r.glideRaf = 0;
      r.drag = { id: e.pointerId, x: e.clientX, t: e.timeStamp, v: 0, captured: false };
      moved = 0;
      settle(r, true);
    });
    el.addEventListener('pointermove', function (e) {
      var d = r.drag;
      if (!d || d.id !== e.pointerId) return;
      var dx = e.clientX - d.x, dt = Math.max(1, e.timeStamp - d.t);
      moved += Math.abs(dx);
      if (!d.captured && moved > 4) { d.captured = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} el.classList.add('is-dragging'); }
      nudge(r, dx);
      d.v = 0.8 * (dx / dt) + 0.2 * d.v;   // px/ms, lightly smoothed
      d.x = e.clientX; d.t = e.timeStamp;
    });
    function release(e) {
      var d = r.drag;
      if (!d || d.id !== e.pointerId) return;
      r.drag = null;
      el.classList.remove('is-dragging');
      var v = e.type === 'pointercancel' ? 0 : d.v;
      if (Math.abs(v) > 0.05 && e.timeStamp - d.t < 80) glide(r, v);
      else settle(r);
    }
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    // A drag never ends in a click on the card under the finger.
    el.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  // Release momentum: short exponential decay, then the rail breathes again.
  function glide(r, v) {
    var last = 0;
    r.glideRaf = requestAnimationFrame(function step(now) {
      if (last) { var dt = Math.min(32, now - last); nudge(r, v * dt); v *= Math.pow(0.0035, dt / 1000); }
      last = now;
      if (Math.abs(v) > 0.01 && !r.drag) r.glideRaf = requestAnimationFrame(step);
      else { r.glideRaf = 0; settle(r); }
    });
  }

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
    r.playing = true; settle(r, true);

    var b = r.el.getBoundingClientRect(), c = card.getBoundingClientRect();
    var img = card.querySelector('.voice__img img');
    var stage = buildStage(v, img && (img.currentSrc || img.src));
    var mine = current = { v: v, rail: r, stage: stage, video: stage.querySelector('video'), cards: [], idleT: 0, io: null };
    var x = c.left - b.left + (r.static ? r.el.scrollLeft : 0);
    stage.style.cssText = 'left:' + x + 'px;top:' + (c.top - b.top) + 'px;width:' + c.width + 'px;height:' + c.height + 'px';
    r.el.appendChild(stage);
    mine.cards = Array.prototype.slice.call(r.el.querySelectorAll('.voice[data-voice="' + v.id + '"]'));
    mine.cards.forEach(function (k) { k.classList.add('is-playing'); });
    wire(mine, c.width);

    // Rail and stage glide together until the card sits fully in view.
    if (r.static) {
      var d = inView(r, card);
      if (d) r.el.scrollBy({ left: -d, behavior: reduce ? 'auto' : 'smooth' });
    } else {
      slideIntoView(r, card, function (dx) { x += dx; stage.style.left = x + 'px'; });
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

  /* ------------------------------------------------------------ lifecycle -- */
  // Both rails share ONE band: as wide as the container, never wider than the
  // shortest set, so the rails stay aligned and nobody shows twice in a rail.
  var railsEl = root.querySelector('.voices__rails');
  var lastKey = '';
  function buildAll() {
    if (STATIC) return;   // static row: CSS only
    state.forEach(measure);
    var container = railsEl.getBoundingClientRect().width || window.innerWidth;
    var band = container;
    state.forEach(function (r) { if (r.set) band = Math.min(band, r.set - r.gap); });
    railsEl.style.setProperty('--band', Math.floor(band) + 'px');
    lastKey = key();
    state.forEach(function (r) { build(r, band); });
  }
  function key() { return state.map(function (r) { return Math.round(r.track.firstElementChild.getBoundingClientRect().width); }).join() + '|' + Math.round(railsEl.getBoundingClientRect().width); }
  buildAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildAll);

  // Rebuild only when a card size or the container width really changes
  // (breakpoint, rotation, window resize). Mobile URL-bar moves do not resize
  // the cards (svh), so they never trigger it.
  var rzT;
  function maybeRebuild() {
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      if (key() === lastKey) return;
      closeVideo();
      buildAll();
    }, 140);
  }
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(maybeRebuild);
    ro.observe(railsEl);
    state.forEach(function (r) { ro.observe(r.track.firstElementChild); });
  } else {
    window.addEventListener('resize', maybeRebuild);
  }

  // Off screen, rails stop entirely (no compositor work, no battery).
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var r = state.filter(function (s) { return s.el === e.target; })[0];
        if (!r) return;
        r.visible = e.isIntersecting;
        if (!r.visible) { clearTimeout(r.resumeT); ramp(r, 0, 0); }
        else settle(r, true);
      });
    }, { rootMargin: '80px 0px' });
    state.forEach(function (r) { io.observe(r.el); });
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { prefetchSources(); obs.disconnect(); }
    }, { rootMargin: '600px 0px' }).observe(root);
  } else {
    state.forEach(function (r) { r.visible = true; settle(r, true); });
    prefetchSources();
  }
  }   // boot
})();

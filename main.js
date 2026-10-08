/* ==========================================================================
   Scalia · page layer on top of the ScrollCraft engine.
   The engine owns pinning and --sc-p. This file owns the bespoke parts:
   navbar state, hero media, the credibility spine, the optimisation wiring,
   the mobile menu and the Calendly panel.
   ========================================================================== */
(function () {
  'use strict';

  // Localized label helper (French source string in, active language out).
  function L(fr) { return window.ScaliaI18n ? window.ScaliaI18n.t(fr) : fr; }

  /* ------------------------------------------------------------ settings --
     One 9:16 film in two weights. Posters are set in the HTML <picture>. */
  var HERO_MEDIA = {
    mobile:  { webm: 'assets/video/hero-720.webm',  mp4: 'assets/video/hero-720.mp4' },
    desktop: { webm: 'assets/video/hero-1080.webm', mp4: 'assets/video/hero-1080.mp4' }
  };
  /* Booking: one Calendly event per site language (same calendar and
     availability). Calendly does not translate custom event titles,
     descriptions or questions, hence three events. Until the EN and ES
     events exist they fall back to the current (FR) event. */
  var CALENDLY_URLS = {
    fr: 'https://calendly.com/contact-scalia/30min',
    en: 'https://calendly.com/contact-scalia/30min',   // TODO(scalia): EN event URL
    es: 'https://calendly.com/contact-scalia/30min'    // TODO(scalia): ES event URL
  };

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktopMQ = matchMedia('(min-width: 1024px)');
  var mobileVideoMQ = matchMedia('(max-width: 767px)');   // phones get the 720p file
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };

  /* ---------------------------------------------- pin only where it helps --
     The optimisation map pins on desktop. On phones and tablets it is a plain
     vertical list, so no sticky stretch to scroll through. */
  var opt = document.getElementById('axes');
  if (opt && !desktopMQ.matches) opt.setAttribute('data-sc-act', 'flow');

  ScrollCraft.mount(document.body);

  // Crossing the desktop breakpoint changes the act structure; rebuild cleanly.
  var wasDesktop = desktopMQ.matches;
  desktopMQ.addEventListener('change', function (e) {
    if (e.matches !== wasDesktop) location.reload();
  });

  /* ============================================================== NAVBAR == */
  var nav = document.getElementById('nav');
  var hero = document.getElementById('hero');
  var root = document.documentElement;
  var reasons = document.getElementById('reasons');
  var reasonItems = reasons ? Array.prototype.slice.call(reasons.children) : [];
  if (reasons && !reduce) reasons.classList.add('is-live');

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });

  var whyCards = Array.prototype.slice.call(document.querySelectorAll('.why__card'));
  var toneEls = Array.prototype.slice.call(document.querySelectorAll('main > section, body > footer'));
  var LIGHT = /\bsurface-(ivory|pearl)\b/;
  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY;
    var vh = window.innerHeight;

    // 1. Shell after ~24px. Pure state toggle, the CSS does the transition.
    var scrolled = y > 24 ? 'true' : 'false';
    if (nav.dataset.scrolled !== scrolled) nav.dataset.scrolled = scrolled;
    // Phones / tablets: the glass materialises over the first 48px of
    // scroll (eased 0 -> 1), see .nav__glass in styles.css.
    var nk = Math.min(1, Math.max(0, y / 48));
    nk = (nk * nk * (3 - 2 * nk)).toFixed(3);
    if (nav._k !== nk) { nav._k = nk; nav.style.setProperty('--nav-k', nk); }

    // Glass tone follows the section under the bar. Later sections stack over
    // earlier ones (sheets), so the last match in document order wins.
    var probe = nav.offsetHeight / 2, tone = 'dark';
    for (var s3 = 0; s3 < toneEls.length; s3++) {
      var r3 = toneEls[s3].getBoundingClientRect();
      if (r3.top <= probe && r3.bottom > probe) tone = LIGHT.test(toneEls[s3].className) ? 'light' : 'dark';
    }
    if (nav.dataset.tone !== tone) nav.dataset.tone = tone;

    // 2. Hero exit seam: the champagne line on the ivory sheet opens from
    //    its centre while the sheet rises over the film.
    if (hero) {
      var travel = Math.max(1, hero.offsetHeight - vh);
      var hp = clamp01(y / travel);
      root.style.setProperty('--seam', reduce ? 1 : clamp01((hp - 0.2) / 0.6).toFixed(3));
    }

    // 3. Credibility spine: fill to the reading line, mark the active reason.
    if (reasons && !reduce) {
      var r = reasons.getBoundingClientRect();
      var line = vh * 0.58;
      reasons.style.setProperty('--fill', clamp01((line - r.top) / r.height).toFixed(3));
      var active = -1;
      for (var i = 0; i < reasonItems.length; i++) {
        if (reasonItems[i].getBoundingClientRect().top < line) active = i;
      }
      for (var j = 0; j < reasonItems.length; j++) {
        reasonItems[j].classList.toggle('is-active', j === active);
        reasonItems[j].classList.toggle('is-past', j < active);
      }
    }

    // 3b. Why stack: each card steps back as the next one slides over it.
    if (whyCards.length && !reduce) {
      for (var w2 = 0; w2 < whyCards.length - 1; w2++) {
        var a2 = whyCards[w2].getBoundingClientRect();
        var b2 = whyCards[w2 + 1].getBoundingClientRect();
        var cover = clamp01(1 - (b2.top - a2.top) / a2.height);
        if (whyCards[w2]._cover !== cover) {
          whyCards[w2]._cover = cover;
          whyCards[w2].style.setProperty('--cover', cover.toFixed(3));
        }
      }
    }

    // 3c. WhatsApp button: see fab.js.

    // 4. Current section in the desktop nav.
    var current = -1;
    for (var k = 0; k < sections.length; k++) {
      if (sections[k] && sections[k].getBoundingClientRect().top < vh * 0.4) current = k;
    }
    navLinks.forEach(function (a, n) {
      if (n === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });

    // 5. Optimisation wire endpoints follow their axis.
    if (wires.length) {
      var p = opt ? parseFloat(opt.style.getPropertyValue('--sc-p')) || 0 : 0;
      for (var w = 0; w < wires.length; w++) {
        var k2 = reduce ? 1 : clamp01((p - wires[w].t) / 0.07);
        wires[w].live.style.setProperty('--w', k2.toFixed(3));
        wires[w].end.classList.toggle('on', k2 >= 1);
      }
    }
  }
  function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);

  /* ======================================================= MOBILE MENU == */
  var burger = nav.querySelector('.nav__burger');
  var menu = document.getElementById('menu');
  var scrim = document.getElementById('menu-scrim');

  function setMenu(open) {
    nav.dataset.open = open ? 'true' : 'false';
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', L(open ? 'Fermer le menu' : 'Ouvrir le menu'));
    root.classList.toggle('is-locked', open);
    if (open) {
      menu.removeAttribute('inert');
      var first = menu.querySelector('a');
      if (first) setTimeout(function () { first.focus(); }, 60);
    } else {
      menu.setAttribute('inert', '');
    }
  }
  burger.addEventListener('click', function () { setMenu(nav.dataset.open !== 'true'); });
  scrim.addEventListener('click', function () { setMenu(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.dataset.open === 'true') { setMenu(false); burger.focus(); }
    // keep Tab inside the menu while it is open
    if (e.key === 'Tab' && nav.dataset.open === 'true') {
      var f = [burger].concat(Array.prototype.slice.call(menu.querySelectorAll('a, button')));
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  desktopMQ.addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* ========================================================= HERO VIDEO ==
     The poster <img> paints first (it is frame 0 of the film). Sources are
     attached once, then the video fades in on its first real frame. No source
     is fetched under reduced motion or Save-Data: the poster holds. */
  var video = document.getElementById('hero-video');
  var toggle = document.getElementById('hero-toggle');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var heroMode = '';
  var userPaused = false;
  var heroVisible = true;

  function attachSources() {
    var mode = mobileVideoMQ.matches ? 'mobile' : 'desktop';
    // Never downgrade: once the sharper file is loaded, keep it.
    if (mode === heroMode || (heroMode === 'desktop' && mode === 'mobile')) return false;
    heroMode = mode;
    var m = HERO_MEDIA[mode];
    while (video.firstChild) video.removeChild(video.firstChild);
    [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(function (f) {
      if (!m[f[0]]) return;
      var s = document.createElement('source');
      s.src = m[f[0]]; s.type = f[1];
      video.appendChild(s);
    });
    video.preload = 'auto';
    video.load();
    return true;
  }
  function playHero() {
    if (userPaused || !heroVisible || !video.firstChild) return;
    var pr = video.play();
    if (pr && pr.catch) pr.catch(function () { setPaused(true); });   // autoplay refused: poster holds
  }
  function setPaused(paused) {
    toggle.dataset.paused = paused ? 'true' : 'false';
    toggle.setAttribute('aria-label', L(paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause'));
  }

  toggle.hidden = false;
  if (reduce || saveData) {
    setPaused(true);
  } else {
    attachSources();
    playHero();
  }
  video.addEventListener('playing', function () { hero.classList.add('is-playing'); setPaused(false); });
  video.addEventListener('pause', function () { setPaused(true); });
  toggle.addEventListener('click', function () {
    if (video.paused) {
      userPaused = false;
      if (!video.firstChild) attachSources();
      playHero();
    } else {
      userPaused = true;
      video.pause();
    }
  });
  mobileVideoMQ.addEventListener('change', function () {
    if (video.firstChild && attachSources()) playHero();
  });
  // Pause while the hero is off screen; resume when it comes back.
  var film = hero.querySelector('.hero__film');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      if (!heroVisible) { if (!video.paused) video.pause(); }
      else playHero();
    }, { threshold: 0.01 }).observe(film);
  }

  /* Back from the background (app switch, tab switch, BFCache).
     The browser pauses the film itself when the page is hidden, and nothing
     restarted it: the IntersectionObserver does not fire again (the hero
     never left the screen), and a BFCache restore re-runs no script. The
     film then stayed on its last decoded frame, painted from a video layer
     sized for the viewport before the switch (toolbars may have changed),
     which reads as a frozen, zoomed image. On return we re-measure
     visibility, refresh the scroll-driven state and play again; if the
     browser refuses, the poster (frame 0) comes back instead of a stale
     frame. Reduced motion, Save-Data and a visitor's own pause are kept. */
  function heroOnScreen() {
    var r = film.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  }
  function resumeHero() {
    if (document.visibilityState === 'hidden') return;
    requestFrame();   // seam / hero exit values follow the current scroll again
    if (reduce || saveData || userPaused || !video.firstChild) return;
    heroVisible = heroOnScreen();
    if (!heroVisible) return;   // off screen: the observer restarts it later
    if (video.error) { heroMode = ''; attachSources(); }   // a dropped stream: reload the source once
    var pr = video.play();
    if (pr && pr.catch) pr.catch(function () {
      hero.classList.remove('is-playing');   // show the poster, never a frozen frame
      setPaused(true);
    });
  }
  function suspendHero() { if (!video.paused) video.pause(); }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') suspendHero(); else resumeHero();
  });
  window.addEventListener('pagehide', suspendHero);
  window.addEventListener('pageshow', function (e) { if (e.persisted) resumeHero(); });
  document.addEventListener('resume', resumeHero);   // Chrome page lifecycle (frozen tab)

  /* ================================================= OPTIMISATION WIRES ==
     Orthogonal connectors from the symbol to each axis. Geometry is measured
     on resize only, never on scroll. */
  var wires = [];
  var svg = document.getElementById('opt-wires');
  var map = document.getElementById('opt-map');
  var core = map && map.querySelector('.opt__core img');
  var NS = 'http://www.w3.org/2000/svg';

  function layoutWires() {
    wires = [];
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!svg || !map || !desktopMQ.matches || !core) return;
    var m = map.getBoundingClientRect();
    var c = core.getBoundingClientRect();
    var cy = c.top + c.height / 2 - m.top;
    svg.setAttribute('viewBox', '0 0 ' + m.width + ' ' + m.height);

    Array.prototype.forEach.call(map.querySelectorAll('.axis'), function (axis, i) {
      var a = axis.getBoundingClientRect();
      var title = axis.querySelector('.axis__title').getBoundingClientRect();
      var left = axis.dataset.side === 'l';
      var sx = left ? c.left - m.left - 18 : c.right - m.left + 18;
      var nx = left ? a.right - m.left + 18 : a.left - m.left - 18;
      var ny = title.top + title.height / 2 - m.top;
      var mx = (sx + nx) / 2 + (left ? 1 : -1) * (i >> 1) * 10;   // stagger the risers
      var d = 'M' + sx + ' ' + cy + 'H' + mx + 'V' + ny + 'H' + nx;

      var base = document.createElementNS(NS, 'path');
      base.setAttribute('d', d); base.setAttribute('class', 'base');
      var live = document.createElementNS(NS, 'path');
      live.setAttribute('d', d); live.setAttribute('class', 'live'); live.setAttribute('pathLength', '1');
      var end = document.createElementNS(NS, 'circle');
      end.setAttribute('cx', nx); end.setAttribute('cy', ny); end.setAttribute('r', 3.5); end.setAttribute('class', 'end');
      svg.appendChild(base); svg.appendChild(live); svg.appendChild(end);
      wires.push({ live: live, end: end, t: parseFloat(getComputedStyle(axis).getPropertyValue('--t')) || 0 });
    });
    requestFrame();
  }
  var rT;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(layoutWires, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutWires);
  window.addEventListener('load', layoutWires);
  layoutWires();

  /* ============================================================ CALENDLY ==
     Nothing from Calendly loads until someone asks for it. */
  var cal = document.getElementById('cal');
  var calBody = cal.querySelector('.cal__body');
  var calFrame = document.getElementById('cal-frame');
  var calFallback = document.getElementById('cal-fallback');
  var calLoaded = false;
  var lastTrigger = null;

  function calendlyUrl() {
    var loc = window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr';
    return CALENDLY_URLS[loc] || CALENDLY_URLS.fr;
  }

  // Calendly is only contacted after a click on a booking button. Its own
  // privacy / cookie notice is left visible (no hide_gdpr_banner).
  function openCal(trigger) {
    lastTrigger = trigger;
    if (typeof cal.showModal === 'function') cal.showModal(); else cal.setAttribute('open', '');
    var url = calendlyUrl();
    calFallback.href = url;
    var loadedFrame = calFrame.querySelector('iframe');
    if (loadedFrame) loadedFrame.title = L('Calendrier de réservation Scalia');
    if (calLoaded === url) return;   // same URL already loaded: reuse it
    calLoaded = false;
    calFrame.textContent = '';
    calBody.dataset.state = 'loading';
    var iframe = document.createElement('iframe');
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    iframe.src = url + sep + 'embed_type=Inline&embed_domain=' + encodeURIComponent(location.hostname);
    iframe.title = L('Calendrier de réservation Scalia');
    iframe.loading = 'eager';
    var timer = setTimeout(function () { if (!calLoaded) calBody.dataset.state = 'error'; }, 12000);
    iframe.addEventListener('load', function () { clearTimeout(timer); calLoaded = url; calBody.dataset.state = 'ready'; });
    iframe.addEventListener('error', function () { clearTimeout(timer); calBody.dataset.state = 'error'; });
    calFrame.appendChild(iframe);
  }
  function closeCal() { if (cal.open) cal.close(); }
  cal.addEventListener('close', function () { if (lastTrigger) lastTrigger.focus(); });
  cal.addEventListener('click', function (e) { if (e.target === cal) closeCal(); });   // backdrop
  // One opener for every booking trigger (sections, navbar, burger menu).
  // From the burger menu: close the menu first (restores page scroll), and
  // hand focus back to the burger when Calendly closes, since the menu
  // button itself is hidden by then.
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open-calendly], [data-action="open-calendly"]');
    if (t) {
      e.preventDefault();
      if (menu.contains(t)) { setMenu(false); openCal(burger); }
      else openCal(t);
    }
    if (e.target.closest('[data-close-calendly]')) closeCal();
  });

  /* ============================================================ REVEALS ==
     One observer for the whole page. Each element reveals once. Children of
     a [data-reveal-group] get a short stagger unless they set their own. */
  // Desktop grids stagger within a row only: a second row enters late
  // already, so it does not also wait for the cards above it. Computed on
  // load and on breakpoint or resize, never per frame.
  var rvItems = [];
  Array.prototype.forEach.call(document.querySelectorAll('[data-reveal-group]'), function (g) {
    var list = [];
    Array.prototype.forEach.call(g.querySelectorAll('[data-reveal]'), function (el) {
      if (!el.style.getPropertyValue('--rv-d')) list.push(el);
    });
    if (list.length) rvItems.push(list);
  });
  function staggerReveals() {
    rvItems.forEach(function (list) {
      var row = -1, top = null;
      list.forEach(function (el, i) {
        var n = i;
        if (desktopMQ.matches) {
          var t = el.offsetTop;
          row = t === top ? row + 1 : 0; top = t; n = row;
        }
        el.style.setProperty('--rv-d', (n * 55) + 'ms');
      });
    });
  }
  staggerReveals();
  var rvTimer = 0;
  window.addEventListener('resize', function () { clearTimeout(rvTimer); rvTimer = setTimeout(staggerReveals, 150); });
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target._rvMasks) e.target._rvMasks.forEach(function (m) { m.classList.add('is-in'); });
        if (e.target.hasAttribute('data-reveal')) e.target.classList.add('is-in');
        rio.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    // A masked headline is fully clipped, so the observer would never see it
    // intersect: watch its parent instead and reveal it from there.
    Array.prototype.forEach.call(revealEls, function (el) {
      if (el.getAttribute('data-reveal') === 'mask') {
        var host = el.parentElement;
        host._rvMasks = (host._rvMasks || []).concat(el);
        rio.observe(host);
      } else {
        rio.observe(el);
      }
    });
  } else {
    Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('is-in'); });
  }

  /* ============================================================ PRICING ==
     Prices are data, not markup: one offer, one amount per currency.
     The navbar € / $ switch changes only the figure; the language switch
     changes only the copy (ScaliaI18n). */
  var I18N = window.ScaliaI18n;
  var PRICING = {
    landing: { EUR: 700, USD: 700 }   // validated amounts
  };
  // Currency changes only the figure; the card, its copy and its art stay the
  // same. Written form is fixed per currency in every language: 700 € / 700 $.
  var WRITE = {
    EUR: function (n) { return n + '\u00a0€'; },
    USD: function (n) { return n + '\u00a0$'; }
  };

  function renderPrices() {
    var currency = I18N ? I18N.currency() : 'EUR';
    var intl = I18N ? I18N.intl() : 'fr-FR';
    Array.prototype.forEach.call(document.querySelectorAll('[data-price]'), function (el) {
      var amount = (PRICING[el.getAttribute('data-offer')] || {})[currency];
      if (typeof amount !== 'number' || !WRITE[currency]) return;
      el.querySelector('[data-price-value]').textContent = WRITE[currency](new Intl.NumberFormat(intl).format(amount));
      // Read aloud as the validated wording: "700 € — taxes applicables incluses".
      el.setAttribute('aria-label', WRITE[currency](new Intl.NumberFormat(intl).format(amount)) + ' — ' + L('taxes applicables incluses'));
    });
  }
  renderPrices();
  if (I18N) { I18N.on('currency', renderPrices); I18N.on('locale', renderPrices); }

  /* ---------------------------------------------------- pricing CTA nudge --
     The price card's CTA wakes up now and then: a 1.5px lift, scale 1.015,
     a halo swell and one shimmer pass (~1s), then 7-12s of calm. Only while
     the button is on screen and the tab visible; never while it is hovered,
     focused or pressed. Off entirely under reduced motion (the halo stays). */
  (function () {
    var cta = document.querySelector('.art-card--price .art-card__cta');
    if (!cta || reduce || !('IntersectionObserver' in window)) return;
    var onScreen = false, timer = 0;
    function later(first) { clearTimeout(timer); timer = setTimeout(nudge, first ? 2400 : 7000 + Math.random() * 5000); }
    function nudge() {
      if (!onScreen) return;
      if (document.hidden || cta.matches(':hover, :focus-visible, :active')) { later(); return; }
      cta.classList.remove('is-nudge');
      void cta.offsetWidth;   // restart the keyframes
      cta.classList.add('is-nudge');
      later();
    }
    function calm() { cta.classList.remove('is-nudge'); }
    cta.addEventListener('animationend', function (e) { if (e.animationName === 'cta-nudge') calm(); });
    ['pointerenter', 'pointerdown', 'focus'].forEach(function (t) { cta.addEventListener(t, calm); });
    new IntersectionObserver(function (en) {
      onScreen = en[0].isIntersecting;
      if (onScreen) later(true); else { clearTimeout(timer); calm(); }
    }, { threshold: 0.6 }).observe(cta);
  })();

  /* --------------------------------------------------------------- misc -- */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = String(new Date().getFullYear());

  requestFrame();
})();

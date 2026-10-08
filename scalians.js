/* ==========================================================================
   Les Scalians · page script
   Navbar state, mobile menu and the shared reveal observer. Nothing runs
   per frame except the 24px navbar check.
   ========================================================================== */
(function () {
  'use strict';

  function L(fr) { return window.ScaliaI18n ? window.ScaliaI18n.t(fr) : fr; }

  var root = document.documentElement;
  var nav = document.getElementById('nav');
  var desktopMQ = matchMedia('(min-width: 1024px)');

  /* -------------------------------------------------------------- navbar -- */
  var toneEls = Array.prototype.slice.call(document.querySelectorAll('main > section, body > footer'));
  var LIGHT = /\bsurface-(ivory|pearl)\b/;
  var ticking = false;
  function frame() {
    ticking = false;
    var scrolled = window.scrollY > 24 ? 'true' : 'false';
    if (nav.dataset.scrolled !== scrolled) nav.dataset.scrolled = scrolled;
    // Phones / tablets: the glass materialises over the first 48px of
    // scroll (eased 0 -> 1), see .nav__glass in styles.css.
    var nk = Math.min(1, Math.max(0, window.scrollY / 48));
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
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  frame();

  /* --------------------------------------------------------- mobile menu -- */
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
    if (nav.dataset.open !== 'true') return;
    if (e.key === 'Escape') { setMenu(false); burger.focus(); }
    if (e.key === 'Tab') {
      var f = [burger].concat(Array.prototype.slice.call(menu.querySelectorAll('a, button')));
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  desktopMQ.addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* ------------------------------------------------------------- reveals --
     Same contract as the home page: each [data-reveal] reveals once. Masked
     headlines are watched through their parent (a fully clipped element
     never intersects). Group children get a 90ms stagger. */
  // Desktop grids stagger within a row only (the second row of directors
  // no longer waits 180/270ms on top of entering later). Computed on load and
  // on resize, never per frame.
  var rvItems = [];
  Array.prototype.forEach.call(document.querySelectorAll('[data-reveal-group]'), function (g) {
    var list = [];
    Array.prototype.forEach.call(g.children, function (el) {
      if (el.hasAttribute('data-reveal') && !el.style.getPropertyValue('--rv-d')) list.push(el);
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
        el.style.setProperty('--rv-d', (n * 90) + 'ms');
      });
    });
  }
  staggerReveals();
  var rvTimer = 0;
  window.addEventListener('resize', function () { clearTimeout(rvTimer); rvTimer = setTimeout(staggerReveals, 150); });
  var els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(els, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target._rvMasks) e.target._rvMasks.forEach(function (m) { m.classList.add('is-in'); });
        if (e.target.hasAttribute('data-reveal')) e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    Array.prototype.forEach.call(els, function (el) {
      if (el.getAttribute('data-reveal') === 'mask') {
        var host = el.parentElement;
        host._rvMasks = (host._rvMasks || []).concat(el);
        io.observe(host);
      } else {
        io.observe(el);
      }
    });
  }

  /* --------------------------------------------------------- back arrow --
     Legal pages: go back when the previous page is on this site, otherwise
     follow the link (home). Works without JS thanks to the href. */
  var back = document.getElementById('nav-back');
  if (back) {
    back.addEventListener('click', function (e) {
      var sameSite = false;
      try { sameSite = document.referrer && new URL(document.referrer).origin === location.origin; } catch (err) {}
      if (sameSite && history.length > 1) { e.preventDefault(); history.back(); }
    });
  }

  var yr = document.getElementById('year');
  if (yr) yr.textContent = String(new Date().getFullYear());
})();

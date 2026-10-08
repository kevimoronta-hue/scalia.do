/* ==========================================================================
   Scalia · WhatsApp floating button (home and Les Scalians)
   Shown once the first screen is behind the visitor, hidden over the footer
   and while the mobile menu is open. A rare, quiet nudge while it is shown:
   first ~6s after it appears, then every 14-22s; skipped while hovered,
   focused or pressed, when the tab is hidden, and under reduced motion.
   One scroll listener, throttled to a frame; no work while idle.
   ========================================================================== */
(function () {
  'use strict';
  var fab = document.getElementById('wa-fab');
  if (!fab) return;
  var nav = document.getElementById('nav');
  var foot = document.querySelector('body > footer');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var on = false, timer = 0, ticking = false;

  function nudge(show) {
    clearTimeout(timer);
    if (reduce) return;
    if (!show) { fab.classList.remove('is-nudge'); return; }
    timer = setTimeout(function tick() {
      if (!on) return;
      if (!document.hidden && !fab.matches(':hover, :focus-visible, :active')) {
        fab.classList.remove('is-nudge');
        void fab.offsetWidth;   // restart the keyframes
        fab.classList.add('is-nudge');
      }
      timer = setTimeout(tick, 14000 + Math.random() * 8000);
    }, 6000);
  }

  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var footTop = foot ? foot.getBoundingClientRect().top : Infinity;
    var show = window.scrollY > vh * 0.9 && footTop > vh - 40 && !(nav && nav.dataset.open === 'true');
    if (show !== on) { on = show; fab.classList.toggle('is-visible', show); nudge(show); }
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  if (nav && 'MutationObserver' in window) new MutationObserver(request).observe(nav, { attributes: true, attributeFilter: ['data-open'] });
  fab.addEventListener('animationend', function (e) { if (e.animationName === 'fab-nudge') fab.classList.remove('is-nudge'); });
  ['pointerenter', 'pointerdown', 'focus'].forEach(function (t) { fab.addEventListener(t, function () { fab.classList.remove('is-nudge'); }); });
  update();
})();

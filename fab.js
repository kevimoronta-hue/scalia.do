/* ==========================================================================
   Scalia · WhatsApp floating button (home and Les Scalians)
   One rule, nothing else decides (not the footer, not the menu):
     home          shown once the first screen is behind the visitor, then
                   stays until the last pixel of the page
     Les Scalians  (data-show="always") shown from the first frame
   Once shown it never hides again. A quiet nudge while it is shown: 5s after
   it appears, then every 5s; skipped while hovered, focused or pressed,
   when the tab is hidden, and under reduced motion.
   ========================================================================== */
(function () {
  'use strict';
  var fab = document.getElementById('wa-fab');
  if (!fab) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var always = fab.getAttribute('data-show') === 'always';
  var on = false, timer = 0, ticking = false;
  // One nudge every 5s (start to start). The nudge itself lasts 2.4s, so a
  // calm 2.6s always separates two of them.
  var EVERY = 5000;

  function nudge() {
    clearTimeout(timer);
    if (reduce) return;
    timer = setTimeout(function tick() {
      if (!document.hidden && !fab.matches(':hover, :focus-visible, :active')) {
        fab.classList.remove('is-nudge');
        void fab.offsetWidth;   // restart the keyframes
        fab.classList.add('is-nudge');
      }
      timer = setTimeout(tick, EVERY);
    }, EVERY);
  }

  function show() {
    if (on) return;
    on = true;
    fab.classList.add('is-visible');
    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', request);
    nudge();
  }
  // The single condition on the home page: scrolled past 90% of a screen.
  function update() {
    ticking = false;
    if (window.scrollY > window.innerHeight * 0.9) show();
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  if (always) show();
  else {
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }
  fab.addEventListener('animationend', function (e) { if (e.animationName === 'fab-nudge') fab.classList.remove('is-nudge'); });
  ['pointerenter', 'pointerdown', 'focus'].forEach(function (t) { fab.addEventListener(t, function () { fab.classList.remove('is-nudge'); }); });
})();

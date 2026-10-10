/* ==========================================================================
   Scalia · FAQ (homepage)
   Accordion: each question opens and closes on its own (several can be
   open). Under it, the conversation with Scaly, the Scalia AI agent:
   · the conversation lives in this tab only (sessionStorage,
     scalia.scalyConversation) and survives a refresh, not the session;
   · each message → POST /api/faq { locale, messages } with the last
     turns; the answer is added under the previous one;
   · the server decides the text and whether to offer the booking under that
     answer (data-open-booking, handled by booking.js); once shown, a button
     stays where it was in the conversation;
   · two scrolls, never mixed: the conversation scrolls inside its own box
     ("Scrolling" below); the page is written at most once per keyboard
     cycle, by the phone keyboard state machine ("Phone keyboard" below).
   ========================================================================== */
(function () {
  'use strict';
  var root = document.getElementById('faq');
  if (!root) return;

  function L(fr) { return window.ScaliaI18n ? window.ScaliaI18n.t(fr) : fr; }
  function locale() { return window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr'; }
  // The € / $ chosen with the site's switch (ScaliaI18n, the single source).
  function currency() { return window.ScaliaI18n ? window.ScaliaI18n.currency() : (document.documentElement.getAttribute('data-currency') || 'EUR'); }

  /* ----------------------------------------------------------- accordion */
  root.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-faq-toggle]');
    if (!btn) return;
    var item = btn.closest('.faq__item');
    var open = !item.classList.contains('is-open');
    // One answer open at a time: opening this one closes the others.
    if (open) Array.prototype.forEach.call(root.querySelectorAll('.faq__item.is-open'), function (other) {
      other.classList.remove('is-open');
      var b = other.querySelector('[data-faq-toggle]');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  });

  /* -------------------------------------------------------- conversation */
  var chat = root.querySelector('[data-faq-chat]');
  if (!chat) return;
  var card = chat.querySelector('.scaly__card');
  var log = chat.querySelector('[data-faq-log]'), form = chat.querySelector('[data-faq-form]');
  var input = chat.querySelector('#faq-input'), send = chat.querySelector('[data-faq-send]');
  var err = chat.querySelector('#faq-err'), reset = chat.querySelector('[data-faq-reset]');
  var prompts = chat.querySelector('[data-faq-prompts]');

  var KEY = 'scalia.scalyConversation';
  var SEND_MAX = 12, KEEP_MAX = 40, MAX_LEN = 500;
  var WELCOME = 'Salut 👋 Moi c’est Scaly. Tu veux savoir quoi ? Si je peux t’aider sur Scalia, ton site ou ton projet, vas-y.';
  var UNAVAILABLE = 'Je bug un peu là 😅 Réessaie dans quelques secondes, ou si tu veux tu peux directement parler de ton projet avec Scalia.';
  // Scaly's head (assets/scaly-head.webp), as the mark on his messages.
  var HEAD = '<img class="faq-msg__mark" src="assets/scaly-head.webp" width="18" height="18" alt="" aria-hidden="true" decoding="async">';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches;

  // { role: 'user'|'assistant', content, cta?, local?, welcome? }
  // local = shown but never sent (unavailable, too many messages).
  var msgs = load(), busy = false, typing = null;

  function valid(m) { return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'; }
  function load() {
    try {
      sessionStorage.removeItem('scalia.faqConversation');   // previous version's key
      var o = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (o && Array.isArray(o.messages)) return o.messages.filter(valid).slice(-KEEP_MAX);
    } catch (e) { /* storage blocked or unreadable: start fresh */ }
    return [];
  }
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify({ v: 1, messages: msgs.slice(-KEEP_MAX) })); } catch (e) { /* ignore */ }
  }
  function forget() { try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  function welcome() { return { role: 'assistant', content: L(WELCOME), welcome: true }; }
  function onlyWelcome() { return msgs.every(function (m) { return m.welcome; }); }

  function el(tag, cls, text) {
    var x = document.createElement(tag);
    if (cls) x.className = cls;
    if (text != null) x.textContent = text;
    return x;
  }
  function agentLabel() {
    var p = el('p', 'faq-msg__label');
    p.innerHTML = HEAD;
    p.appendChild(el('span', null, 'Scaly'));
    return p;
  }
  function node(m) {
    var agent = m.role === 'assistant';
    var x = el('div', 'faq-msg faq-msg--' + (agent ? 'agent' : 'user') + (m.local ? ' faq-msg--note' : ''));
    if (agent) x.appendChild(agentLabel());
    else x.appendChild(el('p', 'faq__sr', L('Toi') + ' :'));
    x.appendChild(el('p', 'faq-msg__text', m.content));
    if (agent && m.cta) {
      var b = el('button', 'btn btn--primary btn--sm faq-msg__cta', L('Parler de mon projet'));
      b.type = 'button';
      b.setAttribute('data-open-booking', '');
      x.appendChild(b);
    }
    return x;
  }
  /* ----------------------------------------------------------- scrolling
     One rule: the log follows its last message unless the reader scrolled
     up in it. Only log.scrollTop is ever written, never the page's scroll.
     · pinned: true until the reader scrolls up, true again at the bottom;
     · toEnd(): after a new message, smooth inside the log;
     · a ResizeObserver re-pins when the log's own height changes (the field
       grows to a second line, the prompts go away), so the last message
       never slides under the field. */
  var pinned = true, lastTop = 0;
  function atEnd() { return log.scrollHeight - log.scrollTop - log.clientHeight < 24; }
  log.addEventListener('scroll', function () {
    if (log.scrollTop < lastTop - 2) pinned = atEnd();      // the reader went up
    else if (atEnd()) pinned = true;
    lastTop = log.scrollTop;
  }, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(function () { if (pinned) log.scrollTop = log.scrollHeight; }).observe(log);
  function toEnd(smooth) {
    pinned = true;
    if (log.scrollHeight <= log.clientHeight) return;
    if (smooth && !reduce && log.scrollTo) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
    else log.scrollTop = log.scrollHeight;
  }
  function chrome() {
    var fresh = onlyWelcome();
    reset.hidden = fresh;
    prompts.hidden = !fresh;
  }
  // A fresh conversation starts at the top of the box; a restored one
  // opens on its latest exchange.
  function render() {
    log.textContent = '';
    msgs.forEach(function (m) { log.appendChild(node(m)); });
    if (typing) log.appendChild(typing);
    chrome();
    log.setAttribute('aria-label', L('Conversation avec Scaly, l’agent IA de Scalia'));
    if (onlyWelcome()) { pinned = false; log.scrollTop = 0; } else toEnd(false);
  }
  function add(m) {
    msgs.push(m);
    if (msgs.length > KEEP_MAX) msgs = msgs.slice(-KEEP_MAX);
    save();
    var n = node(m);
    if (typing && typing.parentNode) log.insertBefore(n, typing); else log.appendChild(n);
    chrome();
    toEnd(true);
  }
  function showTyping(on) {
    if (on) {
      typing = el('div', 'faq-msg faq-msg--agent faq-msg--typing');
      typing.appendChild(agentLabel());
      var p = el('p', 'faq-msg__text faq-msg__wait');
      p.innerHTML = '<span class="faq__dots" aria-hidden="true"><i></i><i></i><i></i></span>';
      p.appendChild(el('span', null, L('Scaly réfléchit…')));
      typing.appendChild(p);
      log.appendChild(typing);
      toEnd(true);
    } else if (typing) {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      typing = null;
    }
  }

  function setError(msg) {
    err.textContent = msg ? L(msg) : '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  // The field grows with the text (up to ~4 lines) and only ever shrinks
  // back when it is emptied: no collapse-and-measure on each key, so typing
  // never changes the layout under the caret.
  function grow() {
    if (!input.value) { input.style.height = ''; return; }
    if (input.scrollHeight > input.clientHeight + 1) input.style.height = Math.min(input.scrollHeight + 2, 120) + 'px';
  }

  function submit(text) {
    if (busy) return;
    var typed = text == null;
    var q = (typed ? input.value : text).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (!q) { setError('Écris ton message.'); if (!touch) input.focus(); return; }
    if (q.length > MAX_LEN) { setError('Ton message est trop long (500 caractères max).'); if (!touch) input.focus(); return; }
    setError('');
    busy = true;
    send.disabled = true;
    add({ role: 'user', content: q });
    if (typed) { input.value = ''; grow(); }
    // Phones: sending closes the keyboard (the state machine below brings
    // the page back once it is gone).
    if (touch) input.blur();
    showTyping(true);
    var history = msgs.filter(function (m) { return !m.local; }).slice(-SEND_MAX)
      .map(function (m) { return { role: m.role, content: m.content }; });
    fetch('/api/faq/', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ locale: locale(), currency: currency(), messages: history })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
    }).then(function (res) {
      var b = res.body || {};
      showTyping(false);
      if (b.mock && window.console) console.info('[faq] FAQ_AI_MODE=mock (local)');
      if (res.status === 200 && typeof b.text === 'string') {
        add({ role: 'assistant', content: b.text, cta: !!b.cta, local: b.kind === 'unavailable' || undefined });
        return;
      }
      if (res.status === 429) {
        add({ role: 'assistant', content: L('Doucement 😅 Tu as envoyé beaucoup de messages. Réessaie dans quelques minutes, ou parle directement de ton projet avec Scalia.'), cta: true, local: true });
        return;
      }
      if (res.status === 422 && b.error === 'TOO_LONG') { setError('Ton message est trop long (500 caractères max).'); return; }
      add({ role: 'assistant', content: L(UNAVAILABLE), cta: true, local: true });
    }, function () {
      showTyping(false);
      add({ role: 'assistant', content: L(UNAVAILABLE), cta: true, local: true });
    }).then(function () { busy = false; send.disabled = false; });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
  // Desktop: clicking send keeps the caret in the field.
  send.addEventListener('mousedown', function (e) { if (!touch && document.activeElement === input) e.preventDefault(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submit(); }
  });
  input.addEventListener('input', function () { grow(); if (err.textContent) setError(''); });
  prompts.addEventListener('click', function (e) {
    var b = e.target.closest('[data-faq-prompt]');
    if (b) submit(b.textContent);
  });
  reset.addEventListener('click', function () {
    if (busy) return;
    forget();
    msgs = [welcome()];
    setError('');
    render();
    // Touch screens: no keyboard popping up on its own.
    if (!touch) input.focus();
  });
  // A conversation that is still only the greeting follows the language.
  document.documentElement.addEventListener('scalia:locale', function () {
    if (onlyWelcome()) msgs = [welcome()];
    render();
  });

  /* ------------------------------------------------------ phone keyboard
     Touch screens with visualViewport only. One state, one page write.
     RESTING        nothing to do; the card is wherever the page puts it.
     KEYBOARD_OPEN  the field has focus. The browser itself scrolls the
                    field above the keyboard; we add nothing. We only note
                    where the page was just before (restY) and the visible
                    height at rest (restH), and whether the keyboard really
                    showed (the visible height dropped).
     RESTORING      the field lost focus (send, Done, tap outside) or the
                    keyboard went away: wait for visualViewport to be back
                    near restH, then, in the next frame, put the page back
                    at restY once (smooth unless reduced motion) → RESTING.
     Nothing to restore if the keyboard never showed (hardware keyboard) or
     if the reader scrolled the page themself while typing. A focus during
     RESTORING keeps the first resting point. visualViewport is read, never
     used to scroll on each resize; no timers. */
  var vv = touch && window.visualViewport;
  var RESTING = 0, KEYBOARD_OPEN = 1, RESTORING = 2;
  var state = RESTING, restY = 0, restH = 0, shown = false, moved = false, downY = null;
  var SHOWN = 150, BACK = 100;   // px: a keyboard is far taller; toolbars move less

  function open() {
    if (state === RESTING) {
      restY = downY !== null ? downY : window.scrollY;
      restH = vv.height;
    }
    downY = null;
    state = KEYBOARD_OPEN; shown = false; moved = false;
  }
  function close() {
    if (state !== KEYBOARD_OPEN) return;
    if (!shown || moved) { state = RESTING; return; }
    state = RESTORING;
    settle();
  }
  function settle() {
    if (state !== RESTORING || vv.height < restH - BACK) return;
    state = RESTING;
    requestAnimationFrame(function () {
      if (Math.abs(window.scrollY - restY) > 2) window.scrollTo({ top: restY, behavior: reduce ? 'auto' : 'smooth' });
    });
  }
  if (vv) {
    // Where the page is before the browser scrolls for the keyboard.
    input.addEventListener('touchstart', function () { if (state === RESTING) downY = window.scrollY; }, { passive: true });
    input.addEventListener('focus', open);
    input.addEventListener('blur', close);
    vv.addEventListener('resize', function () {
      if (state === KEYBOARD_OPEN) {
        if (vv.height < restH - SHOWN) shown = true;
        else if (shown) close();               // keyboard hidden, field still focused (Android back)
      } else if (state === RESTORING) settle();
    });
    // The reader scrolling the page (not the conversation) while typing.
    document.addEventListener('touchmove', function (e) {
      if (state === KEYBOARD_OPEN && !log.contains(e.target)) moved = true;
    }, { passive: true });
  }

  if (!msgs.length) msgs = [welcome()];
  render();
})();

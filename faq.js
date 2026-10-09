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
   · new messages scroll the conversation box only, never the page;
   · phones: while the keyboard is open (visualViewport), the card shrinks
     to the visible area above it; when it closes, the card settles back
     into view once. See "Phone keyboard" below.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.getElementById('faq');
  if (!root) return;

  function L(fr) { return window.ScaliaI18n ? window.ScaliaI18n.t(fr) : fr; }
  function locale() { return window.ScaliaI18n ? window.ScaliaI18n.locale() : 'fr'; }

  /* ----------------------------------------------------------- accordion */
  root.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-faq-toggle]');
    if (!btn) return;
    var item = btn.closest('.faq__item');
    var open = !item.classList.contains('is-open');
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
  // Scaly's smiling eyes (the glow on his visor), as the mark on his messages.
  var EYES = '<svg viewBox="0 0 22 8" width="16" height="6" aria-hidden="true"><path d="M2 6.5Q5.5 1 9 6.5M13 6.5Q16.5 1 20 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    p.innerHTML = EYES;
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
  function toEnd(smooth) {
    if (log.scrollHeight <= log.clientHeight) return;
    if (smooth && !reduce && log.scrollTo) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
    else log.scrollTop = log.scrollHeight;
  }
  function chrome() {
    var fresh = onlyWelcome();
    reset.hidden = fresh;
    prompts.hidden = !fresh;
  }
  function render() {
    log.textContent = '';
    msgs.forEach(function (m) { log.appendChild(node(m)); });
    if (typing) log.appendChild(typing);
    chrome();
    log.setAttribute('aria-label', L('Conversation avec Scaly, l’agent IA de Scalia'));
    toEnd(false);
  }
  function add(m) {
    msgs.push(m);
    if (msgs.length > KEEP_MAX) msgs = msgs.slice(-KEEP_MAX);
    save();
    var n = node(m);
    if (typing && typing.parentNode) log.insertBefore(n, typing); else log.appendChild(n);
    chrome();
    if (kb) fit();
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
  function grow() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    if (kb) fit();
  }

  function submit(text) {
    if (busy) return;
    var typed = text == null;
    var q = (typed ? input.value : text).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (!q) { setError('Écris ton message.'); input.focus(); return; }
    if (q.length > MAX_LEN) { setError('Ton message est trop long (500 caractères max).'); input.focus(); return; }
    setError('');
    busy = true;
    send.disabled = true;
    add({ role: 'user', content: q });
    if (typed) { input.value = ''; grow(); }
    showTyping(true);
    var history = msgs.filter(function (m) { return !m.local; }).slice(-SEND_MAX)
      .map(function (m) { return { role: m.role, content: m.content }; });
    fetch('/api/faq/', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ locale: locale(), messages: history })
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
    // Phones: no keyboard popping up on its own.
    if (!coarse) input.focus();
  });
  // A conversation that is still only the greeting follows the language.
  document.documentElement.addEventListener('scalia:locale', function () {
    if (onlyWelcome()) msgs = [welcome()];
    render();
  });

  /* ------------------------------------------------------ phone keyboard
     Why: the layout viewport does not shrink when a phone keyboard opens
     (iOS Safari, Android Chrome ≥ 108), only the visual viewport does. The
     browser scrolls just enough to show the field; the rest of a card taller
     than the visible area stays hidden under the fixed navbar, and when the
     keyboard closes nothing scrolls back, so the card stays parked too high.
     Fix: while the keyboard is open (visualViewport shorter than its
     resting height and focus in the card), the conversation box gets
     exactly the height left above the keyboard and the card's bottom is
     aligned with the visible bottom; when it closes, the card scrolls once
     into view, softly. Driven by visualViewport resize events, no timers. */
  var vv = window.visualViewport;
  var coarse = window.matchMedia ? matchMedia('(pointer: coarse)').matches : false;
  var kb = false, rest = vv ? vv.height : 0, restW = vv ? vv.width : 0, frame = 0;

  function navBottom() {
    var n = document.querySelector('.nav');
    if (!n) return 0;
    var r = n.getBoundingClientRect();
    return r.bottom > 0 ? r.bottom : 0;
  }
  function scrollPage(dy, smooth) {
    if (Math.abs(dy) < 2) return;
    var h = document.documentElement, prev = h.style.scrollBehavior;
    if (!smooth || reduce) h.style.scrollBehavior = 'auto';      // html is scroll-behavior: smooth
    window.scrollBy({ top: dy, left: 0, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    h.style.scrollBehavior = prev;
  }
  // Keyboard open: give the log the room left, then align the card bottom.
  function fit() {
    var visTop = Math.max(vv.offsetTop, navBottom()) + 8;
    var visBottom = vv.offsetTop + vv.height - 8;
    var other = card.getBoundingClientRect().height - log.getBoundingClientRect().height;
    var room = Math.max(96, Math.floor(visBottom - visTop - other));
    card.style.setProperty('--scaly-kb-log', room + 'px');
    scrollPage(card.getBoundingClientRect().bottom - visBottom, false);
    toEnd(false);
  }
  // Keyboard closed: one soft scroll so the whole card (or its end) shows.
  function settle() {
    var r = card.getBoundingClientRect();
    var top = navBottom() + 12, bottom = window.innerHeight - 12, dy = 0;
    if (r.bottom > bottom) dy = r.bottom - bottom;
    if (r.top - dy < top) dy = r.top - top;
    if (r.height > bottom - top) dy = r.bottom - bottom;   // taller than the screen: keep the field and last messages
    scrollPage(dy, true);
    toEnd(false);
  }
  function update() {
    frame = 0;
    if (Math.abs(vv.width - restW) > 1) { restW = vv.width; rest = vv.height; }   // rotation
    if (!kb && vv.height > rest) rest = vv.height;
    var open = coarse && rest - vv.height > 120 && (kb || chat.contains(document.activeElement));
    if (open && !kb) { kb = true; card.classList.add('is-kb'); }
    if (open) { fit(); return; }
    if (kb) {
      kb = false;
      card.classList.remove('is-kb');
      card.style.removeProperty('--scaly-kb-log');
      settle();
    }
  }
  if (vv && coarse) {
    vv.addEventListener('resize', function () { if (!frame) frame = requestAnimationFrame(update); });
  }

  if (!msgs.length) msgs = [welcome()];
  render();
})();

/* ==========================================================================
   Scalia · FAQ (homepage)
   Accordion: each question opens and closes on its own (several can be
   open). Under it, the conversation with the Scalia AI agent:
   · the conversation lives in this tab only (sessionStorage,
     scalia.faqConversation) and survives a refresh, not the session;
   · each message → POST /api/faq { locale, messages } with the last
     turns; the answer is added under the previous one;
   · the server decides the text and whether to offer the booking under that
     answer (data-open-booking, handled by booking.js); once shown, a button
     stays where it was in the conversation;
   · new messages scroll the conversation box only, never the page.
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
  var log = chat.querySelector('[data-faq-log]'), form = chat.querySelector('[data-faq-form]');
  var input = chat.querySelector('#faq-input'), send = chat.querySelector('[data-faq-send]');
  var err = chat.querySelector('#faq-err'), reset = chat.querySelector('[data-faq-reset]');

  var KEY = 'scalia.faqConversation';
  var SEND_MAX = 12, KEEP_MAX = 40, MAX_LEN = 500;
  var WELCOME = 'Bonjour 👋 Je suis l’agent IA de Scalia. Tu peux me poser tes questions sur Scalia, ton site web ou ton projet. Qu’est-ce que tu aimerais savoir ?';
  var SPARK = '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M6 0.5 7.1 4.9 11.5 6 7.1 7.1 6 11.5 4.9 7.1 0.5 6 4.9 4.9Z" fill="currentColor"/></svg>';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // { role: 'user'|'assistant', content, cta?, local?, welcome? }
  // local = shown but never sent (unavailable, too many messages).
  var msgs = load(), busy = false, typing = null;

  function valid(m) { return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'; }
  function load() {
    try {
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
    p.innerHTML = SPARK;
    p.appendChild(el('span', null, L('Agent IA Scalia')));
    return p;
  }
  function node(m) {
    var agent = m.role === 'assistant';
    var x = el('div', 'faq-msg faq-msg--' + (agent ? 'agent' : 'user') + (m.local ? ' faq-msg--note' : ''));
    if (agent) x.appendChild(agentLabel());
    else x.appendChild(el('p', 'faq__sr', L('Vous') + ' :'));
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
  function render() {
    log.textContent = '';
    msgs.forEach(function (m) { log.appendChild(node(m)); });
    if (typing) log.appendChild(typing);
    reset.hidden = onlyWelcome();
    log.setAttribute('aria-label', L('Conversation avec l’agent IA de Scalia'));
    toEnd(false);
  }
  function add(m) {
    msgs.push(m);
    if (msgs.length > KEEP_MAX) msgs = msgs.slice(-KEEP_MAX);
    save();
    var n = node(m);
    if (typing && typing.parentNode) log.insertBefore(n, typing); else log.appendChild(n);
    reset.hidden = onlyWelcome();
    toEnd(true);
  }
  function showTyping(on) {
    if (on) {
      typing = el('div', 'faq-msg faq-msg--agent faq-msg--typing');
      typing.appendChild(agentLabel());
      var p = el('p', 'faq-msg__text faq-msg__wait');
      p.innerHTML = '<span class="faq__dots" aria-hidden="true"><i></i><i></i><i></i></span>';
      p.appendChild(el('span', null, L('L’agent IA réfléchit…')));
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
  }
  function unavailable() {
    return L('L’agent IA est momentanément indisponible. Tu peux réessayer dans quelques instants ou parler directement de ton projet avec Scalia.');
  }

  function submit() {
    if (busy) return;
    var q = input.value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (!q) { setError('Écrivez votre message.'); input.focus(); return; }
    if (q.length > MAX_LEN) { setError('Votre message est trop long (500 caractères maximum).'); input.focus(); return; }
    setError('');
    busy = true;
    send.disabled = true;
    add({ role: 'user', content: q });
    input.value = '';
    grow();
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
        add({ role: 'assistant', content: L('Tu as envoyé beaucoup de messages. Réessaie dans quelques minutes, ou parle directement de ton projet avec Scalia.'), cta: true, local: true });
        return;
      }
      if (res.status === 422 && b.error === 'TOO_LONG') { setError('Votre message est trop long (500 caractères maximum).'); return; }
      add({ role: 'assistant', content: unavailable(), cta: true, local: true });
    }, function () {
      showTyping(false);
      add({ role: 'assistant', content: unavailable(), cta: true, local: true });
    }).then(function () { busy = false; send.disabled = false; });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submit(); }
  });
  input.addEventListener('input', function () { grow(); if (err.textContent) setError(''); });
  reset.addEventListener('click', function () {
    if (busy) return;
    forget();
    msgs = [welcome()];
    setError('');
    render();
    input.focus();
  });
  // A conversation that is still only the greeting follows the language.
  document.documentElement.addEventListener('scalia:locale', function () {
    if (onlyWelcome()) msgs = [welcome()];
    render();
  });

  if (!msgs.length) msgs = [welcome()];
  render();
})();

/* ==========================================================================
   Scalia Portal · sign-in pages
   /portal/login/    email + password, "forgot password" (new link by email)
   /portal/welcome/  link from an invitation or a new-password email
                     (?token=…): the client chooses their password, the
                     one-time token is used, then they land on their project.
   No password ever travels anywhere but to /api/portal (same origin).
   ========================================================================== */
(function () {
  'use strict';
  var P = window.Portal, L = P.L, $ = P.$;
  var q = new URLSearchParams(location.search);

  function show(name) {
    P.$$('[data-view]').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== name; });
    var h = $('[data-view="' + name + '"] h1');
    if (h) { h.setAttribute('tabindex', '-1'); }
  }
  // Only a path on this site, never another domain.
  function next(role) {
    var n = q.get('next') || '';
    if (/^\/(portal|admin)(\/|$)/.test(n) && !/^\/\//.test(n)) {
      if (role !== 'admin' && /^\/admin/.test(n)) return '/portal/';
      return n;
    }
    return role === 'admin' ? '/admin/' : '/portal/';
  }

  /* --------------------------------------------------------------- login */
  var login = $('[data-login]');
  if (login) {
    login.addEventListener('submit', function (e) {
      e.preventDefault();
      $('[data-form-alert]', login).classList.remove('pt-alert--info');
      var email = login.email.value.trim(), pw = login.password.value;
      if (!email || !pw) return P.formError(login, { code: 'REQUIRED', field: !email ? 'email' : 'password' });
      P.busy(login.querySelector('[type="submit"]'), P.portalApi('login', { email: email, password: pw }, { noRedirect: true })).then(function (r) {
        location.replace(next(r.role));
      }, function (err) {
        login.password.value = '';
        P.formError(login, { code: err.code });
      });
    });
    var forgot = $('[data-forgot]');
    P.$$('[data-to]').forEach(function (b) {
      b.addEventListener('click', function () {
        var to = b.getAttribute('data-to');
        show(to);
        if (to === 'forgot' && login.email.value) forgot.email.value = login.email.value;
        var f = $('[data-view="' + to + '"] input[type="email"]'); if (f) f.focus();
      });
    });
    forgot.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = forgot.email.value.trim();
      if (!email) return P.formError(forgot, { code: 'REQUIRED', field: 'email' });
      P.busy(forgot.querySelector('[type="submit"]'), P.portalApi('forgot', { email: email, locale: P.locale() }, { noRedirect: true })).then(function () {
        $('[data-sent]', forgot).hidden = false;
        $('[data-form-alert]', forgot).hidden = true;
      }, function (err) { P.formError(forgot, err); });
    });
    if (q.get('forgot')) show('forgot');
    // Back here after an automatic sign-out (portal-core.js watchIdle).
    if (q.get('expired')) {
      var al = $('[data-form-alert]', login);
      al.textContent = L('Vous avez été déconnecté après une période d’inactivité. Reconnectez-vous pour continuer.');
      al.classList.add('pt-alert--info');
      al.hidden = false;
    }
  }

  /* ------------------------------------------------------------- welcome */
  var pwForm = $('[data-password]');
  if (pwForm) {
    // The token leaves the address bar at once (history, screenshots). It is
    // kept for this tab only (sessionStorage) so a reload, or iOS reopening
    // the page, does not lose it; cleared once the password is saved.
    var KEY = 'scalia_welcome_token';
    var store = function (v) { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch (e) {} };
    var token = q.get('token');
    if (token) store(token);
    else try { token = sessionStorage.getItem(KEY); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + (q.get('lang') ? '?lang=' + q.get('lang') : '')); } catch (e) {}
    var invite = true;
    // Salutation set by Scalia (users.gender): ES Bienvenido / Bienvenida,
    // FR Bienvenu / Bienvenue, neutral wording when not specified.
    var GREET = {
      m: ['Bienvenu, {name}.', 'Bienvenu.'],
      f: ['Bienvenue, {name}.', 'Bienvenue.'],
      '': ['Nous vous souhaitons la bienvenue, {name}.', 'Nous vous souhaitons la bienvenue.']
    };
    var fill = function (name) {
      var g = GREET[gender] || GREET[''];
      $('[data-welcome-eyebrow]').textContent = L('Espace client Scalia');
      $('[data-welcome-title]').textContent = invite
        ? (name ? L(g[0], { name: name.split(' ')[0] }) : L(g[1]))
        : L('Choisissez un nouveau mot de passe.');
    };
    var who = '', gender = '';
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) show('invalid');
    else {
      P.portalApi('token-info', { token: token }, { noRedirect: true }).then(function (r) {
        invite = r.type === 'invite';
        who = r.name || '';
        gender = r.gender || '';
        if (r.locale && !q.get('lang')) P.preferLocale(r.locale);
        $('[data-username]').value = r.email || '';
        fill(who);
        show('password');
        pwForm.password.focus();
      }, function () { show('invalid'); });
    }
    P.onLocale(function () { if (!$('[data-view="password"]').hidden) fill(who); });
    pwForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = pwForm.password.value, b = pwForm.confirm.value;
      if (a.length < 10) return P.formError(pwForm, { code: 'PASSWORD_WEAK', field: 'password' });
      if (a !== b) return P.formError(pwForm, { code: 'PASSWORD_MISMATCH', field: 'confirm' });
      P.busy(pwForm.querySelector('[type="submit"]'), P.portalApi('accept', { token: token, password: a }, { noRedirect: true })).then(function (r) {
        store(null);
        location.replace(r.role === 'admin' ? '/admin/' : '/portal/');
      }, function (err) {
        if (err.code === 'LINK_INVALID') { store(null); return show('invalid'); }
        P.formError(pwForm, err);
      });
    });
  }

  P.onLocale(function () { P.applyStatic(); });
  P.applyStatic();
})();

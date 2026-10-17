/* ==========================================================================
   Scalia Portal · admin (/admin/, /admin/project/?id=)
   Overview of projects, clients, and the project sheet where a whole
   update takes 30 seconds: stage → progress → update → next step → save.
   The page holds no data until the API confirms the admin role (database
   profiles.role); a client who opens /admin is sent back to /portal.
   ========================================================================== */
(function () {
  'use strict';
  var P = window.Portal, L = P.L, esc = P.esc, $ = P.$, $$ = P.$$;
  var app = $('[data-app]');
  var q = new URLSearchParams(location.search);
  var isProject = /^\/admin\/project\/?$/.test(location.pathname);
  var team = [];
  var state = {};

  var LOCALES = [['es', 'Espagnol'], ['fr', 'Français'], ['en', 'Anglais']];
  var GENDERS = [['', 'Neutre (non précisé)'], ['m', 'Homme · Bienvenido'], ['f', 'Femme · Bienvenida']];
  var CURRENCIES = ['EUR', 'USD', 'DOP'];
  var SITE_LANGS = ['es', 'fr', 'en', 'de', 'it', 'pt'];

  function opts(list, cur) {
    return list.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? L(o[1]) : o;
      return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');
  }
  function field(name, label, control, hint) {
    return '<div class="pt-field" data-field="' + name + '"><label class="pt-label" for="f-' + name + '">' + esc(L(label)) + '</label>' + control + (hint ? '<p class="hint">' + esc(L(hint)) + '</p>' : '') + '</div>';
  }
  function input(name, type, value, extra) {
    return '<input class="pt-input" id="f-' + name + '" name="' + name + '" type="' + type + '" value="' + esc(value == null ? '' : value) + '"' + (extra || '') + '>';
  }
  function select(name, list, cur) { return '<select class="pt-select" id="f-' + name + '" name="' + name + '">' + opts(list, cur) + '</select>'; }
  // Scalia contact choices; one without WhatsApp only offers email to the client.
  function teamOpts(team) { return team.map(function (t) { return [t.id, t.name + (t.whatsapp ? '' : ' · ' + L('sans WhatsApp'))]; }); }
  function textarea(name, value, extra) { return '<textarea class="pt-textarea" id="f-' + name + '" name="' + name + '"' + (extra || '') + '>' + esc(value || '') + '</textarea>'; }
  function badgePay(state_) {
    return state_ === 'paid' ? '<span class="pt-badge pt-badge--paid">' + esc(L('Payé')) + '</span>'
      : state_ === 'partial' ? '<span class="pt-badge pt-badge--pending">' + esc(L('Paiement partiel')) + '</span>'
        : '<span class="pt-badge pt-badge--internal">' + esc(L('Non payé')) + '</span>';
  }

  /* ------------------------------------------------------------- dialogs */
  function dialog(title, body, submitLabel, onSubmit) {
    var d = document.createElement('dialog');
    d.className = 'ad-dialog';
    d.setAttribute('aria-label', title);
    d.innerHTML = '<form novalidate><h2>' + esc(title) + '</h2><p class="pt-alert" data-form-alert role="alert" hidden></p>' + body +
      '<div class="pt-actions" style="margin-top:6px"><button class="btn btn--primary btn--lg" type="submit">' + esc(submitLabel) + '</button>' +
      '<button class="btn btn--secondary btn--lg" type="button" data-close>' + esc(L('Annuler')) + '</button></div></form>';
    document.body.appendChild(d);
    var form = d.querySelector('form');
    d.querySelector('[data-close]').addEventListener('click', function () { d.close(); });
    d.addEventListener('close', function () { d.remove(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      P.busy(form.querySelector('[type="submit"]'), Promise.resolve().then(function () { return onSubmit(form); })).then(function (r) {
        if (r !== false) d.close();
      }, function (err) { P.formError(form, err); });
    });
    d.showModal();
    var first = form.querySelector('input,select,textarea'); if (first) first.focus();
    return d;
  }

  // Irreversible deletion: says what goes, and asks to type the name.
  function deleteDialog(title, lines, name, run) {
    var d = dialog(title,
      '<div class="pt-alert">' + lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>' +
      field('confirm', L('Pour confirmer, tapez « {name} »', { name: name }), input('confirm', 'text', '', ' autocomplete="off" autocapitalize="off" spellcheck="false" required')),
      L('Supprimer définitivement'),
      function (f) { return run(f.confirm.value); });
    var b = d.querySelector('[type="submit"]');
    b.className = 'btn btn--secondary btn--danger btn--lg';
    return d;
  }

  function newClientDialog() {
    dialog(L('Nouveau client'),
      field('company', 'Entreprise', input('company', 'text', '', ' required autocomplete="organization"')) +
      field('contactName', 'Nom du contact', input('contactName', 'text', '', ' required autocomplete="name"')) +
      field('email', 'Email', input('email', 'email', '', ' required autocomplete="email" inputmode="email"'), 'Le client recevra une invitation pour créer son mot de passe.') +
      '<div class="pt-row pt-row--2">' + field('phone', 'Téléphone', input('phone', 'tel', '', ' autocomplete="tel"')) + field('locale', 'Langue', select('locale', LOCALES, 'es')) + '</div>' +
      field('gender', 'Salutation', select('gender', GENDERS, ''), 'Accord du « Bienvenido / Bienvenida » dans le portail et les emails.'),
      L('Créer et inviter'),
      function (f) {
        return P.adminApi('client-create', { company: f.company.value, contactName: f.contactName.value, email: f.email.value, phone: f.phone.value, locale: f.locale.value, gender: f.gender.value }).then(function (r) {
          if (r.mailSent === false) P.toast(L('Client créé, mais l’email n’est pas parti : utilisez « Renvoyer l’invitation ».'), 'err');
          else P.toast(L('Client créé. Invitation envoyée à {email}.', { email: f.email.value.trim() }));
          setTimeout(function () { newProjectDialog(r.id, f.company.value, f.locale.value); }, 50);
        });
      });
  }

  function newProjectDialog(orgId, company, locale) {
    dialog(L('Nouveau projet') + (company ? ' · ' + company : ''),
      field('name', 'Nom du projet', input('name', 'text', '', ' required')) +
      field('type', 'Type de projet', input('type', 'text', L('Site web'))) +
      '<div class="pt-row pt-row--2">' + field('currency', 'Devise', select('currency', CURRENCIES, 'EUR')) + field('totalAmount', 'Montant total', input('totalAmount', 'text', '', ' inputmode="decimal" required')) + '</div>' +
      '<div class="pt-row pt-row--2">' + field('startDate', 'Début', input('startDate', 'date', new Date().toISOString().slice(0, 10))) + field('estimatedDeliveryDate', 'Livraison estimée', input('estimatedDeliveryDate', 'date', '')) + '</div>' +
      '<div class="pt-row pt-row--2">' + field('contactId', 'Contact Scalia', select('contactId', teamOpts(team), team[0] && team[0].id)) +
      field('preferredLocale', 'Langue du portail', select('preferredLocale', LOCALES, locale || 'es')) + '</div>',
      L('Créer le projet'),
      function (f) {
        return P.adminApi('project-create', {
          organizationId: orgId, name: f.name.value, type: f.type.value, currency: f.currency.value, totalAmount: f.totalAmount.value,
          startDate: f.startDate.value, estimatedDeliveryDate: f.estimatedDeliveryDate.value, contactId: f.contactId.value || null, preferredLocale: f.preferredLocale.value
        }).then(function (p) { location.href = '/admin/project/?id=' + encodeURIComponent(p.id); });
      });
  }

  function editClientDialog(c) {
    var k = c.contacts[0] || {};
    dialog(L('Modifier le client'),
      field('company', 'Entreprise', input('company', 'text', c.company, ' required')) +
      (k.userId ? field('contactName', 'Nom du contact', input('contactName', 'text', k.name, ' required')) +
        '<div class="pt-row pt-row--2">' + field('phone', 'Téléphone', input('phone', 'tel', k.phone)) + field('locale', 'Langue', select('locale', LOCALES, k.locale)) + '</div>' +
        field('gender', 'Salutation', select('gender', GENDERS, k.gender || '')) : ''),
      L('Enregistrer'),
      function (f) {
        return P.adminApi('client-update', { id: c.id, company: f.company.value, contact: k.userId ? { userId: k.userId, name: f.contactName.value, phone: f.phone.value, locale: f.locale.value, gender: f.gender.value } : null })
          .then(function () { P.toast(L('Enregistré.')); loadOverview(); });
      });
  }

  /* ------------------------------------------------------------ overview */
  function loadOverview() {
    return Promise.all([P.adminApi('overview'), P.adminApi('clients')]).then(function (r) {
      state.projects = r[0].projects;
      state.clients = r[1].clients;
      team = r[1].team;
      renderOverview();
    });
  }
  function renderOverview() {
    var tab = q.get('tab') === 'clients' ? 'clients' : 'projects';
    $$('[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var head = '<div class="ad-title"><h1>' + esc(tab === 'clients' ? L('Clients') : L('Projets')) + '</h1>' +
      '<button class="btn btn--primary" type="button" data-new-client>+ ' + esc(L('Nouveau client')) + '</button></div>';
    var body;
    if (tab === 'projects') {
      body = state.projects.length ? '<div class="ad-list">' + state.projects.map(function (p) {
        return '<a class="ad-item" href="/admin/project/?id=' + encodeURIComponent(p.id) + '"><div><p class="ad-item__name">' + esc(p.company) + '</p><p class="ad-item__sub">' + esc(p.name) + ' · ' + esc(P.stageName(p.currentStage)) + '</p></div>' +
          '<p class="ad-item__pct">' + p.progress + ' %</p>' +
          '<div class="pt-meter pt-meter--light" aria-hidden="true"><span style="--v:' + p.progress + '"></span></div>' +
          '<div class="ad-item__meta">' + badgePay(p.money.state) + '<span class="pt-badge pt-badge--internal">' + esc(P.money(p.money.paid, p.currency)) + ' / ' + esc(P.money(p.money.total, p.currency)) + '</span>' +
          (p.status !== 'active' ? '<span class="pt-badge pt-badge--internal">' + esc(L(P.PROJECT_STATUS[p.status])) + '</span>' : '') +
          p.openActions.map(function (a) { return '<span class="pt-badge pt-badge--open">' + esc(L('Action requise')) + ' · ' + esc(a) + '</span>'; }).join('') + '</div></a>';
      }).join('') + '</div>' : '<div class="pt-card"><p class="pt-h2">' + esc(L('Aucun projet pour le moment.')) + '</p><p class="pt-muted" style="margin-top:6px">' + esc(L('Commencez par créer un client : son projet suivra.')) + '</p></div>';
    } else {
      body = state.clients.length ? '<div class="ad-list">' + state.clients.map(function (c) {
        return '<div class="ad-item" data-client="' + esc(c.id) + '"><div><p class="ad-item__name">' + esc(c.company) + '</p>' +
          c.contacts.map(function (k) { return '<p class="ad-item__sub">' + esc(k.name) + ' · ' + esc(k.email) + ' · ' + esc(k.locale.toUpperCase()) + (k.gender ? ' · ' + esc(L(k.gender === 'm' ? 'Homme' : 'Femme')) : '') + '</p>'; }).join('') + '</div><span></span>' +
          '<div class="ad-item__meta">' + c.projects.map(function (p) { return '<a class="pt-badge pt-badge--open" href="/admin/project/?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a>'; }).join('') + '</div>' +
          '<div class="ad-item__meta"><button class="btn btn--secondary btn--sm" type="button" data-new-project>+ ' + esc(L('Nouveau projet')) + '</button>' +
          (c.contacts[0] ? '<button class="btn btn--secondary btn--sm" type="button" data-resend="' + esc(c.contacts[0].userId) + '">' + esc(L('Renvoyer l’invitation')) + '</button>' : '') +
          '<button class="btn btn--secondary btn--sm" type="button" data-edit>' + esc(L('Modifier')) + '</button>' +
          '<button class="btn btn--secondary btn--sm btn--danger" type="button" data-delete-client>' + esc(L('Supprimer')) + '</button></div></div>';
      }).join('') + '</div>' : '<div class="pt-card"><p class="pt-h2">' + esc(L('Aucun client pour le moment.')) + '</p></div>';
    }
    app.removeAttribute('aria-busy');
    app.innerHTML = head + body;
    $('[data-new-client]', app).addEventListener('click', newClientDialog);
    $$('[data-client]', app).forEach(function (el) {
      var c = state.clients.find(function (x) { return x.id === el.getAttribute('data-client'); });
      $('[data-new-project]', el).addEventListener('click', function () { newProjectDialog(c.id, c.company, c.contacts[0] && c.contacts[0].locale); });
      $('[data-edit]', el).addEventListener('click', function () { editClientDialog(c); });
      $('[data-delete-client]', el).addEventListener('click', function () {
        deleteDialog(L('Supprimer le client'), [
          !c.projects.length ? L('« {name} » sera supprimé (aucun projet).', { name: c.company })
            : c.projects.length === 1 ? L('« {name} » sera supprimé avec son projet : étapes, mises à jour, paiements, documents et fichiers.', { name: c.company })
              : L('« {name} » sera supprimé avec ses {n} projets : étapes, mises à jour, paiements, documents et fichiers.', { name: c.company, n: c.projects.length }),
          L('Ses accès au portail sont supprimés aussi. Cette action est irréversible.')
        ], c.company, function (confirm) {
          return P.adminApi('client-delete', { id: c.id, confirm: confirm }).then(function () { return loadOverview().then(function () { P.toast(L('Client supprimé.')); }); });
        });
      });
      var rs = $('[data-resend]', el);
      if (rs) rs.addEventListener('click', function () {
        P.busy(rs, P.adminApi('invite-resend', { userId: rs.getAttribute('data-resend') })).then(function (r) {
          P.toast(r.sent === 'invite' ? L('Invitation renvoyée.') : L('Lien pour un nouveau mot de passe envoyé.'));
        }, function (e) { P.toast(P.errorText(e.code), 'err'); });
      });
    });
  }

  /* -------------------------------------------------------- project sheet */
  var pid = q.get('id');
  function loadProject() {
    return Promise.all([P.adminApi('project&id=' + encodeURIComponent(pid)), team.length ? null : P.adminApi('clients')]).then(function (r) {
      state.b = r[0];
      if (r[1]) team = r[1].team;
      renderProject();
    });
  }
  function reload(msg) { return loadProject().then(function () { if (msg) P.toast(msg); }); }

  function renderProject() {
    var b = state.b, p = b.project, m = b.money;
    document.title = (b.organization ? b.organization.name + ' · ' : '') + p.name + ' · Scalia';
    var cur = b.stages.find(function (s) { return s.stage_key === b.currentStage; }) || b.stages[0];
    var openActions = b.actions.filter(function (a) { return a.status === 'open'; });

    var html = '<div class="ad-title"><div><p class="pt-eyebrow">' + esc(b.organization ? b.organization.name : '') + '</p><h1 style="margin-top:6px">' + esc(p.name) + '</h1></div>' +
      '<div class="pt-actions"><a class="btn btn--secondary" href="/portal/?project=' + encodeURIComponent(p.id) + '">' + esc(L('Voir comme le client')) + '</a></div></div>';

    html += '<div class="ad-section">';
    // Progress summary
    html += '<section class="pt-hero" aria-label="' + esc(L('Avancement')) + '"><p class="pt-hero__company">' + esc(P.stageName(b.currentStage)) + ' · ' + esc(L(P.PROJECT_STATUS[p.status])) + '</p>' +
      '<div class="pt-hero__progress" style="margin-top:12px"><p class="pt-hero__pct tnum">' + b.progress + '<small>%</small></p><p class="pt-hero__pctlabel pt-hero__pctlabel--wide">' + badgePay(m.state) + '<span class="tnum">' + esc(P.money(m.paid, m.currency)) + ' / ' + esc(P.money(m.total, m.currency)) + '</span></p></div>' +
      '<div class="pt-meter" aria-hidden="true"><span style="--v:' + b.progress + '"></span></div></section>';

    // Quick update
    html += '<section class="ad-sheet" aria-labelledby="ad-quick"><h2 class="pt-h2" id="ad-quick">' + esc(L('Mise à jour rapide')) + '</h2><form data-quick novalidate class="pt-stack" style="gap:14px">' +
      '<p class="pt-alert" data-form-alert role="alert" hidden></p>' +
      '<div class="pt-row pt-row--3">' + field('stage', 'Étape', select('stage', P.STAGES.map(function (k) { return [k, P.STAGES.indexOf(k) + 1 + '. ' + P.stageName(k)]; }), cur.stage_key)) +
      field('stageStatus', 'Statut de l’étape', select('stageStatus', Object.keys(P.STATUS_NAMES).map(function (k) { return [k, P.STATUS_NAMES[k]]; }), cur.status)) +
      field('progress', 'Progression de l’étape', '<div class="ad-range"><input id="f-progress" name="progress" type="range" min="0" max="100" step="5" value="' + (cur.status === 'completed' ? 100 : cur.progress) + '"><output class="tnum" data-out>' + (cur.status === 'completed' ? 100 : cur.progress) + ' %</output></div>') + '</div>' +
      field('update', 'Dernière mise à jour (visible par le client)', textarea('update', '', ' rows="3" maxlength="2000" placeholder="' + esc(L('Ex. : Homepage finalisée.')) + '"')) +
      field('nextStep', 'Prochaine étape', textarea('nextStep', p.next_step, ' rows="2" maxlength="600"')) +
      '<div class="pt-actions"><button class="btn btn--primary btn--lg" type="submit">' + esc(L('Enregistrer')) + '</button></div></form></section>';

    // Action required
    html += '<section class="ad-sheet" aria-labelledby="ad-act"><h2 class="pt-h2" id="ad-act">' + esc(L('Action requise du client')) + '</h2>' +
      (openActions.length ? '<ul class="ad-rows">' + openActions.map(function (a) {
        return '<li><div><b>' + esc(a.title) + '</b>' + (a.description ? '<p class="pt-muted pt-small">' + esc(a.description) + '</p>' : '') + '<p class="pt-muted pt-small">' + esc(P.date(a.created_at)) + '</p></div>' +
          '<div class="ad-rows__btns"><button class="btn btn--secondary btn--sm" type="button" data-resolve="' + esc(a.id) + '">' + esc(L('Marquer comme résolue')) + '</button></div></li>';
      }).join('') + '</ul>' : '<p class="pt-empty" style="padding-top:0">' + esc(L('Rien n’est attendu du client. Le bloc n’apparaît pas sur son portail.')) + '</p>') +
      '<form data-action-add novalidate class="pt-stack" style="gap:12px;margin-top:16px"><p class="pt-alert" data-form-alert role="alert" hidden></p>' +
      field('title', 'Ce que Scalia attend', input('title', 'text', '', ' maxlength="160" placeholder="' + esc(L('Ex. : Valider la maquette')) + '"')) +
      field('description', 'Détail (facultatif)', textarea('description', '', ' rows="2" maxlength="800"')) +
      '<div class="pt-actions"><button class="btn btn--secondary" type="submit">+ ' + esc(L('Ajouter l’action')) + '</button></div></form></section>';

    // Stages
    html += '<section class="ad-sheet" aria-labelledby="ad-stages"><h2 class="pt-h2" id="ad-stages">' + esc(L('Les 5 étapes')) + '</h2>' +
      b.stages.map(function (s, i) {
        var v = s.status === 'completed' ? 100 : s.progress;
        return '<div class="ad-stage" data-stage="' + esc(s.stage_key) + '"><p class="ad-stage__name">' + (i + 1) + '. ' + esc(P.stageName(s.stage_key)) + '</p>' +
          '<select class="pt-select" aria-label="' + esc(L('Statut')) + '" data-s-status>' + opts(Object.keys(P.STATUS_NAMES).map(function (k) { return [k, P.STATUS_NAMES[k]]; }), s.status) + '</select>' +
          '<div class="ad-range"><input type="range" min="0" max="100" step="5" value="' + v + '" aria-label="' + esc(L('Progression')) + '" data-s-progress><output class="tnum">' + v + ' %</output></div></div>';
      }).join('') + '</section>';

    // Payments
    html += '<section class="ad-sheet" aria-labelledby="ad-pay"><h2 class="pt-h2" id="ad-pay">' + esc(L('Paiements')) + '</h2>' +
      '<dl class="pt-money" style="margin-bottom:16px"><div><dt>' + esc(L('Projet')) + '</dt><dd class="tnum">' + esc(P.money(m.total, m.currency)) + '</dd></div><div class="is-paid"><dt>' + esc(L('Payé')) + '</dt><dd class="tnum">' + esc(P.money(m.paid, m.currency)) + '</dd></div><div><dt>' + esc(L('Restant')) + '</dt><dd class="tnum">' + esc(P.money(m.remaining, m.currency)) + '</dd></div></dl>' +
      '<div class="pt-actions" style="margin:-4px 0 16px"><button class="btn btn--secondary btn--sm" type="button" data-price-edit>' + esc(L('Modifier le prix')) + '</button></div>' +
      (b.payments.length ? '<ul class="ad-rows">' + b.payments.map(function (x) {
        var paid = x.status === 'paid';
        return '<li><div><b>' + esc(x.label) + '</b> · <span class="tnum">' + esc(P.money(x.amount, x.currency)) + '</span><p class="pt-small pt-muted"><span class="pt-badge ' + (paid ? 'pt-badge--paid' : 'pt-badge--pending') + '">' + esc(paid ? L('Payé') : L('En attente')) + '</span> ' + esc(paid ? P.date(x.paid_at) : '') + (x.notes ? ' · ' + esc(x.notes) : '') + '</p></div>' +
          '<div class="ad-rows__btns"><button class="btn btn--secondary btn--sm" type="button" data-pay-toggle="' + esc(x.id) + '" data-to="' + (paid ? 'pending' : 'paid') + '">' + esc(paid ? L('Marquer en attente') : L('Marquer payé')) + '</button>' +
          '<button class="btn btn--secondary btn--sm btn--danger" type="button" data-pay-del="' + esc(x.id) + '">' + esc(L('Supprimer')) + '</button></div></li>';
      }).join('') + '</ul>' : '') +
      '<form data-pay-add novalidate class="pt-stack" style="gap:12px;margin-top:16px"><p class="pt-alert" data-form-alert role="alert" hidden></p>' +
      '<div class="pt-row pt-row--3">' + field('label', 'Libellé', input('label', 'text', '', ' maxlength="120" placeholder="' + esc(L('Ex. : Acompte')) + '"')) +
      field('amount', 'Montant', input('amount', 'text', '', ' inputmode="decimal" placeholder="' + esc(p.currency) + '"')) +
      field('status', 'Statut', select('status', [['paid', 'Payé'], ['pending', 'En attente']], 'paid')) + '</div>' +
      '<div class="pt-row pt-row--2">' + field('paidAt', 'Date du paiement', input('paidAt', 'date', new Date().toISOString().slice(0, 10))) + field('notes', 'Note (facultatif)', input('notes', 'text', '', ' maxlength="500"')) + '</div>' +
      '<div class="pt-actions"><button class="btn btn--secondary" type="submit">+ ' + esc(L('Enregistrer le paiement')) + '</button></div></form></section>';

    // Documents
    html += '<section class="ad-sheet" aria-labelledby="ad-docs"><h2 class="pt-h2" id="ad-docs">' + esc(L('Contrat et documents')) + '</h2>' +
      (b.documents.length ? '<ul class="ad-rows">' + b.documents.map(function (d) {
        return '<li><div><a class="pt-link" style="min-height:0" href="/api/portal/?a=file&id=' + encodeURIComponent(d.id) + '">' + esc(d.title) + '</a><p class="pt-small pt-muted">' + esc(L(P.CATEGORIES[d.category])) + ' · ' + esc(P.date(d.created_at)) + ' · ' + esc(P.size(d.size_bytes)) +
          (d.visible_to_client ? '' : ' <span class="pt-badge pt-badge--internal">' + esc(L('Interne')) + '</span>') + '</p></div>' +
          '<div class="ad-rows__btns"><button class="btn btn--secondary btn--sm" type="button" data-doc-vis="' + esc(d.id) + '" data-to="' + (d.visible_to_client ? '0' : '1') + '">' + esc(d.visible_to_client ? L('Rendre interne') : L('Rendre visible')) + '</button>' +
          '<button class="btn btn--secondary btn--sm btn--danger" type="button" data-doc-del="' + esc(d.id) + '">' + esc(L('Supprimer')) + '</button></div></li>';
      }).join('') + '</ul>' : '<p class="pt-empty" style="padding-top:0">' + esc(L('Aucun document pour le moment.')) + '</p>') +
      '<form data-doc-add novalidate class="pt-stack" style="gap:12px;margin-top:16px"><p class="pt-alert" data-form-alert role="alert" hidden></p>' +
      field('file', 'Fichier (PDF, image, ZIP… 50 Mo max.)', '<input class="pt-input" id="f-file" name="file" type="file">') +
      '<div class="pt-row pt-row--2">' + field('title', 'Titre', input('title', 'text', '', ' maxlength="160"')) +
      field('category', 'Catégorie', select('category', Object.keys(P.CATEGORIES).map(function (k) { return [k, P.CATEGORIES[k]]; }), b.documents.some(function (d) { return d.category === 'contract'; }) ? 'project' : 'contract')) + '</div>' +
      '<label class="pt-check"><input type="checkbox" name="visible" checked> ' + esc(L('Visible par le client')) + '</label>' +
      '<div class="ad-progress" hidden data-up-progress><span></span></div>' +
      '<div class="pt-actions"><button class="btn btn--secondary" type="submit">' + esc(L('Déposer le fichier')) + '</button></div></form></section>';

    // Updates history
    html += '<section class="ad-sheet" aria-labelledby="ad-hist"><h2 class="pt-h2" id="ad-hist">' + esc(L('Historique des mises à jour')) + '</h2>' +
      (b.updates.length ? '<ul class="ad-rows">' + b.updates.map(function (u) {
        return '<li><div><p style="white-space:pre-line">' + esc(u.content) + '</p><p class="pt-small pt-muted">' + esc(P.date(u.created_at)) + (u.visible_to_client ? '' : ' <span class="pt-badge pt-badge--internal">' + esc(L('Interne')) + '</span>') + '</p></div><span></span></li>';
      }).join('') + '</ul>' : '<p class="pt-empty" style="padding-top:0">' + esc(L('Aucune mise à jour pour le moment.')) + '</p>') +
      '<form data-note-add novalidate class="pt-stack" style="gap:12px;margin-top:16px"><p class="pt-alert" data-form-alert role="alert" hidden></p>' +
      field('content', 'Note interne (jamais visible par le client)', textarea('content', '', ' rows="2" maxlength="2000"')) +
      '<div class="pt-actions"><button class="btn btn--secondary" type="submit">+ ' + esc(L('Ajouter la note')) + '</button></div></form></section>';

    // Details
    html += '<section class="ad-sheet" aria-labelledby="ad-det"><h2 class="pt-h2" id="ad-det">' + esc(L('Détails du projet')) + '</h2><form data-details novalidate class="pt-stack" style="gap:14px"><p class="pt-alert" data-form-alert role="alert" hidden></p>' +
      '<div class="pt-row pt-row--2">' + field('name', 'Nom du projet', input('name', 'text', p.name, ' required')) + field('type', 'Type de projet', input('type', 'text', p.type)) + '</div>' +
      '<div class="pt-row pt-row--3">' + field('status', 'Statut du projet', select('status', Object.keys(P.PROJECT_STATUS).map(function (k) { return [k, P.PROJECT_STATUS[k]]; }), p.status)) +
      field('currency', 'Devise', b.payments.length ? '<select class="pt-select" id="f-currency" name="currency" disabled>' + opts(CURRENCIES, p.currency) + '</select>' : select('currency', CURRENCIES, p.currency)) + field('totalAmount', 'Montant total', input('totalAmount', 'text', p.total_amount, ' inputmode="decimal"')) + '</div>' +
      '<div class="pt-row pt-row--2">' + field('startDate', 'Début', input('startDate', 'date', p.start_date || '')) + field('estimatedDeliveryDate', 'Livraison estimée', input('estimatedDeliveryDate', 'date', p.estimated_delivery_date || '')) + '</div>' +
      '<div class="pt-row pt-row--2">' + field('domain', 'Domaine', input('domain', 'text', p.domain, ' placeholder="exemple.com"')) +
      field('contactId', 'Contact Scalia', select('contactId', [['', '—']].concat(teamOpts(team)), p.contact_id || '')) + '</div>' +
      '<div class="pt-row pt-row--2">' + field('preferredLocale', 'Langue du portail', select('preferredLocale', LOCALES, p.preferred_locale)) +
      '<fieldset class="pt-field" data-field="languages" style="border:0;padding:0;margin:0"><legend class="pt-label">' + esc(L('Langues du site')) + '</legend><div class="pt-actions">' +
      SITE_LANGS.map(function (l) { return '<label class="pt-check"><input type="checkbox" name="languages" value="' + l + '"' + ((p.languages || []).indexOf(l) > -1 ? ' checked' : '') + '> ' + esc(L(P.LANG_NAMES[l])) + '</label>'; }).join('') + '</div></fieldset></div>' +
      (b.payments.length ? '<p class="pt-muted pt-small">' + esc(L('La devise ne peut plus changer : des paiements sont enregistrés.')) + '</p>' : '') +
      '<div class="pt-actions"><button class="btn btn--primary" type="submit">' + esc(L('Enregistrer les détails')) + '</button>' +
      (p.status !== 'completed' ? '<button class="btn btn--secondary" type="button" data-close-project>' + esc(L('Clôturer le projet')) + '</button>' : '') + '</div></form></section>';

    // Deletion, last and apart
    html += '<section class="ad-sheet" aria-labelledby="ad-del"><h2 class="pt-h2" id="ad-del">' + esc(L('Supprimer le projet')) + '</h2>' +
      '<p class="pt-muted" style="margin:6px 0 14px">' + esc(L('Pour un projet de test ou créé par erreur. Tout ce qui le concerne est effacé, le client ne le voit plus.')) + '</p>' +
      '<div class="pt-actions"><button class="btn btn--secondary btn--danger" type="button" data-delete-project>' + esc(L('Supprimer le projet')) + '</button></div></section>';

    html += '</div>';
    app.removeAttribute('aria-busy');
    app.innerHTML = html;
    bindProject();
  }

  function bindProject() {
    var b = state.b, p = b.project;
    // Quick update: the stage selector loads that stage's values.
    var qf = $('[data-quick]', app);
    var out = $('[data-out]', qf);
    function syncQuick() {
      var s = b.stages.find(function (x) { return x.stage_key === qf.stage.value; });
      qf.stageStatus.value = s.status;
      qf.progress.value = s.status === 'completed' ? 100 : s.progress;
      out.textContent = qf.progress.value + ' %';
    }
    qf.stage.addEventListener('change', syncQuick);
    qf.progress.addEventListener('input', function () {
      out.textContent = qf.progress.value + ' %';
      if (+qf.progress.value === 100) qf.stageStatus.value = 'completed';
      else if (qf.stageStatus.value === 'completed' || (qf.stageStatus.value === 'upcoming' && +qf.progress.value > 0)) qf.stageStatus.value = 'in_progress';
    });
    qf.stageStatus.addEventListener('change', function () {
      if (qf.stageStatus.value === 'completed') qf.progress.value = 100;
      if (qf.stageStatus.value === 'upcoming') qf.progress.value = 0;
      out.textContent = qf.progress.value + ' %';
    });
    qf.addEventListener('submit', function (e) {
      e.preventDefault();
      P.busy(qf.querySelector('[type="submit"]'), P.adminApi('quick-update', {
        projectId: p.id, stage: qf.stage.value, stageStatus: qf.stageStatus.value, progress: +qf.progress.value,
        update: qf.update.value, nextStep: qf.nextStep.value
      })).then(function () { return reload(L('Projet mis à jour.')); }, function (err) { P.formError(qf, err); });
    });

    // Stage rows: saved on change.
    $$('[data-stage]', app).forEach(function (row) {
      var key = row.getAttribute('data-stage');
      var st = $('[data-s-status]', row), rg = $('[data-s-progress]', row), o = $('output', row);
      function save(body) {
        P.adminApi('stage-update', Object.assign({ projectId: p.id, stage: key }, body)).then(function () { return reload(L('Étape enregistrée.')); }, function (err) { P.toast(P.errorText(err.code), 'err'); });
      }
      st.addEventListener('change', function () { save({ status: st.value }); });
      rg.addEventListener('input', function () { o.textContent = rg.value + ' %'; });
      rg.addEventListener('change', function () { save(+rg.value === 100 ? { status: 'completed' } : { progress: +rg.value, status: st.value === 'completed' || st.value === 'upcoming' ? (+rg.value > 0 ? 'in_progress' : 'upcoming') : st.value }); });
    });

    // Actions
    $$('[data-resolve]', app).forEach(function (btn) {
      btn.addEventListener('click', function () {
        P.busy(btn, P.adminApi('action-resolve', { id: btn.getAttribute('data-resolve') })).then(function () { return reload(L('Action résolue.')); }, function (err) { P.toast(P.errorText(err.code), 'err'); });
      });
    });
    var af = $('[data-action-add]', app);
    af.addEventListener('submit', function (e) {
      e.preventDefault();
      P.busy(af.querySelector('[type="submit"]'), P.adminApi('action-add', { projectId: p.id, title: af.title.value, description: af.description.value }))
        .then(function () { return reload(L('Action ajoutée : le client la voit sur son portail.')); }, function (err) { P.formError(af, err); });
    });

    // Payments
    // Price: discounts or options change it at any time; each change is
    // kept in the internal history (service.updateProject).
    $('[data-price-edit]', app).addEventListener('click', function () {
      dialog(L('Modifier le prix'),
        field('totalAmount', 'Nouveau prix du projet', input('totalAmount', 'text', p.total_amount, ' inputmode="decimal" required'), L('En {currency}. Déjà payé : {paid}.', { currency: p.currency, paid: P.money(state.b.money.paid, p.currency) })) +
        field('priceReason', 'Motif (interne, facultatif)', input('priceReason', 'text', '', ' maxlength="200" placeholder="' + esc(L('Ex. : réduction 10 %, option blog, traduction')) + '"')),
        L('Enregistrer le prix'),
        function (f) {
          return P.adminApi('project-update', { id: p.id, fields: { totalAmount: f.totalAmount.value, priceReason: f.priceReason.value } })
            .then(function () { return reload(L('Prix mis à jour.')); });
        });
    });
    $$('[data-pay-toggle]', app).forEach(function (btn) {
      btn.addEventListener('click', function () {
        P.busy(btn, P.adminApi('payment-update', { id: btn.getAttribute('data-pay-toggle'), fields: { status: btn.getAttribute('data-to') } })).then(function () { return reload(L('Paiement mis à jour.')); }, function (err) { P.toast(P.errorText(err.code), 'err'); });
      });
    });
    $$('[data-pay-del]', app).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm(L('Supprimer ce paiement ?'))) return;
        P.busy(btn, P.adminApi('payment-delete', { id: btn.getAttribute('data-pay-del') })).then(function () { return reload(L('Paiement supprimé.')); }, function (err) { P.toast(P.errorText(err.code), 'err'); });
      });
    });
    var pf = $('[data-pay-add]', app);
    pf.status.addEventListener('change', function () { pf.paidAt.disabled = pf.status.value !== 'paid'; });
    pf.addEventListener('submit', function (e) {
      e.preventDefault();
      P.busy(pf.querySelector('[type="submit"]'), P.adminApi('payment-add', { projectId: p.id, label: pf.label.value, amount: pf.amount.value, status: pf.status.value, paidAt: pf.status.value === 'paid' ? pf.paidAt.value : '', notes: pf.notes.value }))
        .then(function () { return reload(L('Paiement enregistré.')); }, function (err) { P.formError(pf, err); });
    });

    // Documents
    $$('[data-doc-vis]', app).forEach(function (btn) {
      btn.addEventListener('click', function () {
        P.busy(btn, P.adminApi('document-update', { id: btn.getAttribute('data-doc-vis'), fields: { visibleToClient: btn.getAttribute('data-to') === '1' } })).then(function () { return reload(L('Document mis à jour.')); }, function (err) { P.toast(P.errorText(err.code), 'err'); });
      });
    });
    $$('[data-doc-del]', app).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm(L('Supprimer ce document ? Le fichier sera effacé.'))) return;
        P.busy(btn, P.adminApi('document-delete', { id: btn.getAttribute('data-doc-del') })).then(function () { return reload(L('Document supprimé.')); }, function (err) { P.toast(P.errorText(err.code), 'err'); });
      });
    });
    var df = $('[data-doc-add]', app);
    df.file.addEventListener('change', function () {
      var f = df.file.files[0];
      if (f && !df.title.value) df.title.value = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    });
    df.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = df.file.files[0];
      if (!f) return P.formError(df, { code: 'REQUIRED', field: 'file' });
      if (f.size > 50 * 1024 * 1024) return P.formError(df, { code: 'FILE_TOO_LARGE', field: 'file' });
      var bar = $('[data-up-progress]', df), fill = $('span', bar);
      var btn = df.querySelector('[type="submit"]');
      P.busy(btn, P.adminApi('document-upload-url', { projectId: p.id, fileName: f.name, size: f.size }).then(function (u) {
        bar.hidden = false;
        return new Promise(function (resolve, reject) {
          var x = new XMLHttpRequest();
          x.open(u.method || 'PUT', u.uploadUrl);
          // Headers signed by the server (type decided server-side, never by the browser).
          Object.keys(u.headers || {}).forEach(function (k) { x.setRequestHeader(k, u.headers[k]); });
          x.setRequestHeader('Content-Type', (u.headers && u.headers['x-content-type']) || 'application/octet-stream');
          x.upload.onprogress = function (ev) { if (ev.lengthComputable) fill.style.width = Math.round(ev.loaded / ev.total * 100) + '%'; };
          x.onload = function () { x.status >= 200 && x.status < 300 ? resolve(u) : reject(Object.assign(new Error('UPLOAD'), { code: 'UPLOAD_MISSING', field: 'file' })); };
          x.onerror = function () { reject(Object.assign(new Error('NETWORK'), { code: 'NETWORK' })); };
          x.send(f);
        });
      }).then(function (u) {
        return P.adminApi('document-add', { projectId: p.id, path: u.path, title: df.title.value, category: df.category.value, visibleToClient: df.visible.checked });
      })).then(function () { return reload(L('Fichier déposé.')); }, function (err) { bar.hidden = true; P.formError(df, err); });
    });

    // Internal note
    var nf = $('[data-note-add]', app);
    nf.addEventListener('submit', function (e) {
      e.preventDefault();
      P.busy(nf.querySelector('[type="submit"]'), P.adminApi('update-add', { projectId: p.id, content: nf.content.value, visibleToClient: false }))
        .then(function () { return reload(L('Note ajoutée.')); }, function (err) { P.formError(nf, err); });
    });

    // Details
    var tf = $('[data-details]', app);
    function fields() {
      return {
        name: tf.name.value, type: tf.type.value, status: tf.status.value, currency: tf.currency.disabled ? undefined : tf.currency.value, totalAmount: tf.totalAmount.value,
        startDate: tf.startDate.value, estimatedDeliveryDate: tf.estimatedDeliveryDate.value, domain: tf.domain.value, contactId: tf.contactId.value || null,
        preferredLocale: tf.preferredLocale.value, languages: $$('input[name="languages"]:checked', tf).map(function (i) { return i.value; })
      };
    }
    tf.addEventListener('submit', function (e) {
      e.preventDefault();
      P.busy(tf.querySelector('[type="submit"]'), P.adminApi('project-update', { id: p.id, fields: fields() })).then(function () { return reload(L('Détails enregistrés.')); }, function (err) { P.formError(tf, err); });
    });
    $('[data-delete-project]', app).addEventListener('click', function () {
      deleteDialog(L('Supprimer le projet'), [
        L('« {name} » sera supprimé avec ses étapes, mises à jour, paiements, documents et fichiers.', { name: p.name }),
        L('Cette action est irréversible.')
      ], p.name, function (confirm) {
        return P.adminApi('project-delete', { id: p.id, confirm: confirm }).then(function () { location.replace('/admin/?deleted=1'); });
      });
    });
    var cl = $('[data-close-project]', app);
    if (cl) cl.addEventListener('click', function () {
      if (!confirm(L('Clôturer ce projet ? Il sera affiché comme livré au client.'))) return;
      P.busy(cl, P.adminApi('project-update', { id: p.id, fields: { status: 'completed' } })).then(function () { return reload(L('Projet clôturé.')); }, function (err) { P.toast(P.errorText(err.code), 'err'); });
    });
  }

  /* ---------------------------------------------------------------- boot */
  function fail(e) {
    if (e.code === 'FORBIDDEN') { location.replace('/portal/'); return; }
    app.removeAttribute('aria-busy');
    app.innerHTML = '<div class="pt-card"><p class="pt-h2">' + esc(L('Impossible de charger les données.')) + '</p><p class="pt-muted" style="margin-top:8px">' + esc(P.errorText(e.code)) + '</p>' +
      '<div class="pt-actions" style="margin-top:16px"><button class="btn btn--primary" type="button" data-retry>' + esc(L('Réessayer')) + '</button></div></div>';
    $('[data-retry]', app).addEventListener('click', function () { location.reload(); });
  }

  /* -------------------------------------------------------------- profile */
  // Name, role and WhatsApp of the signed-in admin: what clients see under
  // "Your contact at Scalia", with the "Write on WhatsApp" button.
  var me = null;
  function profileHint() { $('[data-profile-hint]').hidden = !me || !!me.whatsapp; }
  function profileDialog() {
    dialog(L('Mon profil'),
      field('name', 'Nom', input('name', 'text', me.name, ' required autocomplete="name" maxlength="120"')) +
      field('title', 'Fonction', input('title', 'text', me.title, ' maxlength="120" placeholder="' + esc(L('Ex. : Chef de projet')) + '"'), 'Affichée au client sous votre nom.') +
      field('whatsapp', 'Numéro WhatsApp', input('whatsapp', 'tel', me.whatsapp, ' autocomplete="tel" inputmode="tel" placeholder="+1 809 555 1234"'), 'Format international (+ indicatif). Vos clients verront un bouton « Écrire sur WhatsApp ».'),
      L('Enregistrer'),
      function (f) {
        return P.adminApi('profile-update', { name: f.name.value, title: f.title.value, whatsapp: f.whatsapp.value }).then(function (r) {
          me = r; profileHint();
          P.toast(r.whatsapp ? L('Profil enregistré. Lien WhatsApp : wa.me/{n}', { n: r.whatsapp.slice(1) }) : L('Profil enregistré.'));
          if (isProject && state.b) loadProject(); else if (!isProject) loadOverview();
        });
      });
  }
  $('[data-profile]').addEventListener('click', function () { if (me) profileDialog(); });
  $('[data-profile-open]').addEventListener('click', function () { if (me) profileDialog(); });

  $('[data-logout]').hidden = false;
  $('[data-logout]').addEventListener('click', P.logout);
  P.applyStatic();
  P.adminApi('me').then(function (r) {
    me = r;
    P.watchIdle();
    $('[data-profile]').hidden = false;
    profileHint();
    P.preferLocale(me.locale);
    return isProject ? (pid ? loadProject() : Promise.reject({ code: 'NOT_FOUND' })) : loadOverview().then(function () {
      if (/[?&]deleted=1/.test(location.search)) { history.replaceState(null, '', location.pathname); P.toast(L('Projet supprimé.')); }
    });
  }).catch(fail);
  P.onLocale(function () {
    P.applyStatic();
    if (isProject && state.b) renderProject();
    else if (!isProject && state.projects) renderOverview();
  });
})();

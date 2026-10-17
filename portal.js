/* ==========================================================================
   Scalia Portal · client dashboard (/portal/)
   One page, in reading order: project + progress, what Scalia needs from
   the client (only when there is something), the five stages, latest
   update + next step, payments, contract and documents, details, contact.
   Read-only: the client changes nothing here.
   ========================================================================== */
(function () {
  'use strict';
  var P = window.Portal, L = P.L, esc = P.esc;
  var app = P.$('[data-app]');
  var data = null;
  var projectId = new URLSearchParams(location.search).get('project');

  var ICON = {
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>',
    bell: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3a4.5 4.5 0 0 0-4.5 4.5c0 4-1.8 5.5-1.8 5.5h12.6s-1.8-1.5-1.8-5.5A4.5 4.5 0 0 0 10 3zM8.3 15.8a1.9 1.9 0 0 0 3.4 0"/></svg>',
    file: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5z"/><path d="M11.5 2.5v4h4"/></svg>',
    sign: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5z"/><path d="M11.5 2.5v4h4M7.5 13.5c1-1.2 1.8-1.2 2.4 0 .5.9 1.2.9 2.6-.4"/></svg>',
    down: '<svg class="pt-file__go" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10"/></svg>',
    chev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>',
    mail: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11v8h-11zM2.5 4.5L8 9l5.5-4.5"/></svg>',
    wa: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13l.8-2.6A5.5 5.5 0 1 1 6 12.6z"/></svg>'
  };

  function load() {
    P.portalApi('me' + (projectId ? '&project=' + encodeURIComponent(projectId) : '')).then(function (d) {
      if (d.admin && !d.current && !projectId) { location.replace('/admin/'); return; }
      data = d;
      P.preferLocale(d.current ? d.current.project.locale : d.profile && d.profile.locale);
      P.$('[data-logout]').hidden = false;
      render();
    }, function (e) {
      app.removeAttribute('aria-busy');
      app.innerHTML = '<div class="pt-card"><p class="pt-h2">' + esc(L('Impossible de charger votre projet.')) + '</p><p class="pt-muted" style="margin-top:8px">' + esc(P.errorText(e.code)) + '</p>' +
        '<div class="pt-actions" style="margin-top:18px"><button class="btn btn--primary" type="button" data-retry>' + esc(L('Réessayer')) + '</button></div></div>';
      P.$('[data-retry]', app).addEventListener('click', function () { location.reload(); });
    });
  }

  /* -------------------------------------------------------------- blocks */
  function hero(c) {
    var p = c.project;
    var status = p.status === 'completed' ? L('Projet livré') : p.status === 'on_hold' ? L('Projet en pause') : L('Étape en cours : {stage}', { stage: P.stageName(p.currentStage) });
    return '<section class="pt-hero" aria-labelledby="pt-name">' +
      (c.company ? '<p class="pt-hero__company">' + esc(c.company) + '</p>' : '') +
      '<h2 class="pt-hero__name" id="pt-name">' + esc(p.name) + '</h2>' +
      '<div class="pt-hero__meta"><span class="pt-chip"><i aria-hidden="true"></i>' + esc(status) + '</span>' +
      (p.estimatedDeliveryDate && p.status !== 'completed' ? '<span class="pt-chip">' + esc(L('Livraison estimée : {date}', { date: P.date(p.estimatedDeliveryDate) })) + '</span>' : '') + '</div>' +
      '<div class="pt-hero__progress"><p class="pt-hero__pct tnum">' + c.progress + '<small>%</small></p><p class="pt-hero__pctlabel">' + esc(L('{n} % du projet complété', { n: c.progress })) + '</p></div>' +
      '<div class="pt-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + c.progress + '" aria-label="' + esc(L('Avancement du projet')) + '"><span style="--v:' + c.progress + '"></span></div>' +
      '</section>';
  }

  function actions(c) {
    return c.actions.map(function (a) {
      return '<section class="pt-action" role="region" aria-label="' + esc(L('Action requise')) + '"><span class="pt-action__icon" aria-hidden="true">' + ICON.bell + '</span><div>' +
        '<p class="pt-action__label">' + esc(L('Action requise')) + '</p>' +
        '<p class="pt-action__title">' + esc(a.title) + '</p>' +
        (a.description ? '<p class="pt-action__desc">' + esc(a.description) + '</p>' : '') + '</div></section>';
    }).join('');
  }

  function timeline(c) {
    var items = c.stages.map(function (s, i) {
      var running = s.status === 'in_progress' || s.status === 'waiting_client';
      return '<li class="pt-step" data-status="' + esc(s.status) + '"' + (running ? ' aria-current="step"' : '') + '>' +
        '<span class="pt-step__dot" aria-hidden="true">' + (s.status === 'completed' ? ICON.check : '0' + (i + 1)) + '</span>' +
        '<div class="pt-step__body"><p class="pt-step__name"><span class="sr-only">' + esc(L('Étape {n}', { n: i + 1 })) + ' · </span>' + esc(P.stageName(s.key)) + '</p>' +
        '<p class="pt-step__status">' + esc(P.statusName(s.status)) + (running && s.progress ? ' · <span class="tnum">' + s.progress + ' %</span>' : '') + '</p>' +
        (running && s.progress ? '<div class="pt-meter pt-meter--light pt-step__bar" aria-hidden="true"><span style="--v:' + s.progress + '"></span></div>' : '') +
        (s.note ? '<p class="pt-step__note">' + esc(s.note) + '</p>' : '') +
        '</div></li>';
    }).join('');
    return '<section class="pt-card" aria-labelledby="pt-steps"><div class="pt-head"><h2 class="pt-h2" id="pt-steps">' + esc(L('Les étapes du projet')) + '</h2></div><ol class="pt-steps">' + items + '</ol></section>';
  }

  function updates(c) {
    var p = c.project;
    var body = c.latestUpdate
      ? '<p class="pt-update">' + esc(c.latestUpdate.content) + '</p><p class="pt-update-date">' + esc(P.date(c.latestUpdate.createdAt)) + ' · ' + esc(L('Équipe Scalia')) + '</p>'
      : '<p class="pt-empty">' + esc(L('Pas encore de mise à jour. Scalia publiera ici l’avancement de votre projet.')) + '</p>';
    var next = p.nextStep ? '<div class="pt-next"><p class="pt-eyebrow">' + esc(L('Prochaine étape')) + '</p><p>' + esc(p.nextStep) + '</p></div>' : '';
    var older = c.updates.slice(1);
    var history = older.length ? '<details class="pt-history"><summary>' + esc(L('Mises à jour précédentes')) + ICON.chev + '</summary><ul>' +
      older.map(function (u) { return '<li><time datetime="' + esc(u.createdAt) + '">' + esc(P.date(u.createdAt)) + '</time>' + esc(u.content) + '</li>'; }).join('') + '</ul></details>' : '';
    return '<section class="pt-card" aria-labelledby="pt-upd"><p class="pt-eyebrow" id="pt-upd" style="margin-bottom:12px">' + esc(L('Dernière mise à jour')) + '</p>' + body + next + history + '</section>';
  }

  function payments(c) {
    var m = c.payments;
    var ratio = m.total > 0 ? Math.min(100, Math.round(m.paid / m.total * 100)) : 0;
    var list = m.items.length ? '<ul class="pt-paylist">' + m.items.map(function (x) {
      var paid = x.status === 'paid';
      return '<li><b>' + esc(x.label) + '</b><span class="amt">' + esc(P.money(x.amount, x.currency)) + '</span>' +
        '<small><span class="pt-badge ' + (paid ? 'pt-badge--paid' : 'pt-badge--pending') + '">' + esc(paid ? L('Payé') : L('En attente')) + '</span>' +
        (paid && x.paidAt ? esc(P.date(x.paidAt)) : '') + '</small></li>';
    }).join('') + '</ul>' : '<p class="pt-empty">' + esc(L('Aucun paiement enregistré pour le moment.')) + '</p>';
    return '<section class="pt-card" aria-labelledby="pt-pay"><div class="pt-head"><h2 class="pt-h2" id="pt-pay">' + esc(L('Paiements')) + '</h2></div>' +
      '<dl class="pt-money"><div><dt>' + esc(L('Projet')) + '</dt><dd class="tnum">' + esc(P.money(m.total, m.currency)) + '</dd></div>' +
      '<div class="is-paid"><dt>' + esc(L('Payé')) + '</dt><dd class="tnum">' + esc(P.money(m.paid, m.currency)) + '</dd></div>' +
      '<div><dt>' + esc(L('Restant')) + '</dt><dd class="tnum">' + esc(P.money(m.remaining, m.currency)) + '</dd></div></dl>' +
      '<div class="pt-meter pt-meter--light pt-paybar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + ratio + '" aria-label="' + esc(L('Part déjà payée')) + '"><span style="--v:' + ratio + '"></span></div>' +
      list + '</section>';
  }

  function fileRow(d, contract) {
    var meta = [contract ? L('Contrat') : L(P.CATEGORIES[d.category] || 'Autre'), P.date(d.createdAt), P.size(d.size)].filter(Boolean).join(' · ');
    return '<a class="pt-file' + (contract ? ' pt-file--contract' : '') + '" href="/api/portal/?a=file&id=' + encodeURIComponent(d.id) + '" rel="noopener" download>' +
      '<span class="pt-file__icon" aria-hidden="true">' + (contract ? ICON.sign : ICON.file) + '</span>' +
      '<span><span class="pt-file__name">' + esc(d.title) + '</span><span class="pt-file__meta" style="display:block">' + esc(meta) + '</span></span>' +
      ICON.down + '<span class="sr-only">' + esc(L('Télécharger')) + '</span></a>';
  }
  function documents(c) {
    var contract = c.contract
      ? '<div class="pt-files">' + fileRow(c.contract, true) + '</div>'
      : '<p class="pt-empty">' + esc(L('Le contrat sera disponible ici dès qu’il sera déposé par Scalia.')) + '</p>';
    var docs = c.documents.length ? '<div class="pt-files">' + c.documents.map(function (d) { return fileRow(d, false); }).join('') + '</div>'
      : '<p class="pt-empty">' + esc(L('Aucun document disponible pour le moment.')) + '</p>';
    return '<section class="pt-card" aria-labelledby="pt-docs">' +
      '<div class="pt-head"><h2 class="pt-h2" id="pt-docs">' + esc(L('Contrat')) + '</h2></div>' + contract +
      '<div class="pt-head" style="margin-top:26px"><h2 class="pt-h2">' + esc(L('Documents')) + '</h2></div>' + docs + '</section>';
  }

  function details(c) {
    var p = c.project;
    var rows = [
      [L('Projet'), p.name], [L('Client'), c.company], [L('Type de projet'), p.type],
      [L('Début'), P.date(p.startDate)], [L('Livraison estimée'), P.date(p.estimatedDeliveryDate)],
      [L('Domaine'), p.domain], [L('Langues du site'), (p.languages || []).map(function (l) { return L(P.LANG_NAMES[l] || l.toUpperCase()); }).join(', ')],
      [L('Statut'), L(P.PROJECT_STATUS[p.status] || p.status)]
    ].filter(function (r) { return r[1]; });
    return '<section class="pt-card" aria-labelledby="pt-det"><div class="pt-head"><h2 class="pt-h2" id="pt-det">' + esc(L('Détails du projet')) + '</h2></div><dl class="pt-dl">' +
      rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl></section>';
  }

  // First words of the WhatsApp message, ready to send: who writes, about what.
  function waText(c) {
    var first = function (n) { return String(n || '').split(/\s+/)[0]; };
    var me = data.admin ? '' : first(data.profile && data.profile.name);
    return me
      ? L('Bonjour {name}, c’est {me}, au sujet du projet « {project} ».', { name: first(c.contact.name), me: me + (c.company ? ' (' + c.company + ')' : ''), project: c.project.name })
      : L('Bonjour {name}, au sujet du projet « {project} ».', { name: first(c.contact.name), project: c.project.name });
  }
  function contact(c) {
    var k = c.contact;
    if (!k || !k.name) return '';
    var initials = k.name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    var wa = String(k.whatsapp || '').replace(/[^\d]/g, '');
    return '<section class="pt-card" aria-labelledby="pt-ct"><p class="pt-eyebrow" id="pt-ct" style="margin-bottom:14px">' + esc(L('Votre contact chez Scalia')) + '</p>' +
      '<div class="pt-contact"><span class="pt-avatar" aria-hidden="true">' + esc(initials) + '</span><div><p class="pt-contact__name">' + esc(k.name) + '</p>' +
      (k.title ? '<p class="pt-contact__role">' + esc(k.title) + '</p>' : '') + '</div></div>' +
      '<div class="pt-contact__links">' +
      (k.email ? '<a class="btn btn--secondary" href="mailto:' + esc(k.email) + '">' + esc(L('Écrire un email')) + '</a>' : '') +
      (wa.length >= 8 ? '<a class="btn btn--secondary" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(waText(c)) + '" target="_blank" rel="noopener">' + esc(L('Écrire sur WhatsApp')) + '</a>' : '') +
      '</div></section>';
  }

  function switcher(d) {
    if (d.admin || !d.projects || d.projects.length < 2) return '';
    return '<div class="pt-field" style="max-width:360px"><label class="pt-label" for="pt-proj">' + esc(L('Projet')) + '</label><select class="pt-select" id="pt-proj" data-project>' +
      d.projects.map(function (p) { return '<option value="' + esc(p.id) + '"' + (d.current && d.current.project.id === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></div>';
  }

  function render() {
    P.applyStatic();
    app.removeAttribute('aria-busy');
    if (!data.current) {
      app.innerHTML = '<div class="pt-card"><p class="pt-eyebrow">' + esc(L('Espace client Scalia')) + '</p><p class="pt-h2" style="margin-top:10px">' + esc(L('Votre projet sera bientôt visible ici.')) + '</p>' +
        '<p class="pt-muted" style="margin-top:8px">' + esc(L('Scalia prépare votre espace. Vous recevrez un message dès qu’il sera prêt.')) + '</p></div>';
      return;
    }
    var c = data.current;
    var preview = data.admin ? '<p class="ad-banner">' + esc(L('Aperçu administrateur : vous voyez exactement ce que voit le client.')) + ' <a class="pt-link" href="/admin/project/?id=' + encodeURIComponent(c.project.id) + '">' + esc(L('Retour à l’admin')) + '</a></p>' : '';
    app.innerHTML = preview + switcher(data) + hero(c) + actions(c) + timeline(c) +
      '<div class="pt-grid pt-grid--2">' + updates(c) + payments(c) + '</div>' +
      documents(c) +
      '<div class="pt-grid pt-grid--2">' + details(c) + contact(c) + '</div>';
    var sel = P.$('[data-project]', app);
    if (sel) sel.addEventListener('change', function () {
      projectId = sel.value;
      history.replaceState(null, '', '/portal/?project=' + encodeURIComponent(projectId));
      load();
    });
  }

  P.$('[data-logout]').addEventListener('click', P.logout);
  P.onLocale(function () { if (data) render(); else P.applyStatic(); });
  P.applyStatic();
  load();
})();

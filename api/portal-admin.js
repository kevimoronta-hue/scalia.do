/* ==========================================================================
   /api/portal-admin/?a=<action> · Scalia admin (scalia.do/admin)
   Admins only: the role is read from the database on every request
   (session.resolve). Each action is one business function of
   server/portal/service.js, the same ones a Scalia agent will call.
   ========================================================================== */
'use strict';
const { router } = require('../server/portal/api');
const session = require('../server/portal/session');
const service = require('../server/portal/service');

async function admin(req, res) {
  const ctx = await session.resolve(req, res);
  if (!ctx) throw service.err('UNAUTHENTICATED');
  if (!ctx.admin) throw service.err('FORBIDDEN');
  return ctx;
}
const q = (req, k) => String((req.query && req.query[k]) || '');

module.exports = router({
  me: { method: 'GET', async run(req, res) { const c = await admin(req, res); return { name: [c.user.first_name, c.user.last_name].filter(Boolean).join(' '), email: c.user.email, locale: c.user.preferred_locale }; } },
  overview: { method: 'GET', async run(req, res) { return { projects: await service.adminOverview(await admin(req, res)) }; } },
  clients: { method: 'GET', async run(req, res) { return service.adminClients(await admin(req, res)); } },
  project: { method: 'GET', async run(req, res) { return service.getProjectAdmin(await admin(req, res), q(req, 'id')); } },

  'client-create': { method: 'POST', async run(req, res, b) { return service.createClient(await admin(req, res), b, session.siteUrl(req)); } },
  'client-update': { method: 'POST', async run(req, res, b) { return service.updateClient(await admin(req, res), b.id, b); } },
  'invite-resend': { method: 'POST', async run(req, res, b) { return service.resendInvite(await admin(req, res), b.userId, session.siteUrl(req)); } },

  'project-create': { method: 'POST', async run(req, res, b) { return service.createProject(await admin(req, res), b.organizationId, b); } },
  'project-update': { method: 'POST', async run(req, res, b) { return service.updateProject(await admin(req, res), b.id, b.fields || {}); } },
  'stage-update': { method: 'POST', async run(req, res, b) { return service.updateProjectStage(await admin(req, res), b.projectId, b.stage, b); } },
  'quick-update': { method: 'POST', async run(req, res, b) { return service.quickUpdate(await admin(req, res), b.projectId, b); } },
  'update-add': { method: 'POST', async run(req, res, b) { return service.addProjectUpdate(await admin(req, res), b.projectId, b.content, b.visibleToClient !== false); } },

  'payment-add': { method: 'POST', async run(req, res, b) { return service.recordPayment(await admin(req, res), b.projectId, b); } },
  'payment-update': { method: 'POST', async run(req, res, b) { return service.updatePayment(await admin(req, res), b.id, b.fields || {}); } },
  'payment-delete': { method: 'POST', async run(req, res, b) { return service.deletePayment(await admin(req, res), b.id); } },

  'action-add': { method: 'POST', async run(req, res, b) { return service.setRequiredAction(await admin(req, res), b.projectId, b); } },
  'action-resolve': { method: 'POST', async run(req, res, b) { return service.resolveRequiredAction(await admin(req, res), b.id); } },

  'document-upload-url': { method: 'POST', async run(req, res, b) { return service.requestDocumentUpload(await admin(req, res), b.projectId, b.fileName, b.size); } },
  'document-add': { method: 'POST', async run(req, res, b) { return service.uploadProjectDocument(await admin(req, res), b.projectId, b); } },
  'document-update': { method: 'POST', async run(req, res, b) { return service.updateDocument(await admin(req, res), b.id, b.fields || {}); } },
  'document-delete': { method: 'POST', async run(req, res, b) { return service.deleteDocument(await admin(req, res), b.id); } }
});

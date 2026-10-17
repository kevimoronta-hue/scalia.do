/* ==========================================================================
   Scalia Portal · projects, stages, updates, required actions.
   Client reads go through listForUser: the project must belong to an
   organization the user is a member of, inside the SQL itself.
   Anything else answers null / [] (never "exists but forbidden").
   ========================================================================== */
'use strict';
const { setClause } = require('./sql');

const PROJECT_EDITABLE = ['name', 'type', 'status', 'currency', 'total_amount_minor', 'start_date', 'estimated_delivery_date', 'domain', 'languages', 'preferred_locale', 'contact_id', 'current_stage', 'next_step'];
// Dates as text (YYYY-MM-DD): no time zone shift between drivers.
const COLS = 'p.id, p.organization_id, p.name, p.type, p.status, p.preferred_locale, p.currency, p.total_amount_minor, ' +
  "to_char(p.start_date, 'YYYY-MM-DD') as start_date, to_char(p.estimated_delivery_date, 'YYYY-MM-DD') as estimated_delivery_date, " +
  'p.domain, p.languages, p.contact_id, p.current_stage, p.next_step, p.created_at, p.updated_at, p.updated_by';

/* ------------------------------------------------------------- projects */
function create(q, p) {
  return q.one(
    'insert into projects (organization_id, name, type, status, currency, total_amount_minor, start_date, estimated_delivery_date, domain, languages, preferred_locale, contact_id, next_step, updated_by) ' +
    'values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) returning id',
    [p.organization_id, p.name, p.type || '', p.status || 'active', p.currency || 'EUR', p.total_amount_minor || 0, p.start_date || null, p.estimated_delivery_date || null,
      p.domain || '', p.languages || [], p.preferred_locale || 'es', p.contact_id || null, p.next_step || '', p.by || null]
  );
}
const byId = (q, id) => q.one('select ' + COLS + ' from projects p where p.id = $1', [id]);
const listForUser = (q, userId) => q.query(
  'select ' + COLS + ' from projects p join organization_members m on m.organization_id = p.organization_id where m.user_id = $1 order by p.created_at desc', [userId]);
const remove = (q, id) => q.one('delete from projects where id = $1 returning id', [id]);
const idsOfOrganization = (q, orgId) => q.query('select id from projects where organization_id = $1', [orgId]).then(r => r.map(x => x.id));
const listAll = q => q.query('select ' + COLS + ' from projects p order by p.updated_at desc');
async function update(q, id, patch, by) {
  const s = setClause(patch, PROJECT_EDITABLE, 3);
  const set = (s.empty ? '' : s.sql + ', ') + 'updated_at = now(), updated_by = $2';
  const row = await q.one('update projects set ' + set + ' where id = $1 returning id', [id, by || null].concat(s.values));
  return row ? byId(q, id) : null;
}

/* --------------------------------------------------------------- stages */
const STAGE_COLS = 'id, project_id, stage_key, position, status, progress, note, updated_at, updated_by';
function createStages(q, projectId, rows) {
  const values = [], params = [];
  rows.forEach((r, i) => {
    const b = i * 5;
    values.push('($' + (b + 1) + ', $' + (b + 2) + ', $' + (b + 3) + ', $' + (b + 4) + ', $' + (b + 5) + ')');
    params.push(projectId, r.stage_key, r.position, r.status, r.progress);
  });
  return q.query('insert into project_stages (project_id, stage_key, position, status, progress) values ' + values.join(', '), params);
}
const stages = (q, projectId) => q.query('select ' + STAGE_COLS + ' from project_stages where project_id = $1 order by position', [projectId]);
const stageByKey = (q, projectId, key) => q.one('select ' + STAGE_COLS + ' from project_stages where project_id = $1 and stage_key = $2', [projectId, key]);
const allStages = q => q.query('select ' + STAGE_COLS + ' from project_stages');
async function updateStage(q, projectId, key, patch, by) {
  const s = setClause(patch, ['status', 'progress', 'note'], 4);
  const set = (s.empty ? '' : s.sql + ', ') + 'updated_at = now(), updated_by = $3';
  return q.one('update project_stages set ' + set + ' where project_id = $1 and stage_key = $2 returning ' + STAGE_COLS, [projectId, key, by || null].concat(s.values));
}

/* -------------------------------------------------------------- updates */
// Internal updates (visible_to_client = false) only when asked for (admin).
const updates = (q, projectId, includeInternal, limit) => q.query(
  'select id, project_id, content, visible_to_client, created_by, created_at from project_updates where project_id = $1' +
  (includeInternal ? '' : ' and visible_to_client') + ' order by created_at desc, id limit $2', [projectId, limit || 30]);
const addUpdate = (q, projectId, content, visible, by) => q.one(
  'insert into project_updates (project_id, content, visible_to_client, created_by) values ($1, $2, $3, $4) returning *', [projectId, content, visible, by]);

/* -------------------------------------------------------------- actions */
const actions = (q, projectId, onlyOpen) => q.query(
  'select * from project_actions where project_id = $1' + (onlyOpen ? " and status = 'open'" : '') + ' order by created_at desc', [projectId]);
const openActions = q => q.query("select id, project_id, title from project_actions where status = 'open' order by created_at");
const addAction = (q, projectId, a, by) => q.one(
  'insert into project_actions (project_id, title, description, kind, created_by) values ($1, $2, $3, $4, $5) returning *', [projectId, a.title, a.description || '', a.kind || 'info', by]);
const resolveAction = (q, id, by) => q.one(
  "update project_actions set status = 'resolved', resolved_at = now(), resolved_by = $2 where id = $1 and status = 'open' returning *", [id, by]);

module.exports = {
  create, byId, listForUser, listAll, update, remove, idsOfOrganization,
  createStages, stages, stageByKey, allStages, updateStage,
  updates, addUpdate, actions, openActions, addAction, resolveAction
};

/* Scalia Portal · payments. Amounts in integer minor units (cents). */
'use strict';
const { setClause } = require('./sql');

const COLS = "id, project_id, label, amount_minor, currency, status, to_char(paid_at, 'YYYY-MM-DD') as paid_at, notes, created_at, updated_at, updated_by";

const list = (q, projectId) => q.query('select ' + COLS + ' from payments where project_id = $1 order by created_at, id', [projectId]);
const all = q => q.query('select project_id, amount_minor, status from payments');
const count = async (q, projectId) => Number((await q.one('select count(*)::int as n from payments where project_id = $1', [projectId])).n);
const add = (q, p, by) => q.one(
  'insert into payments (project_id, label, amount_minor, currency, status, paid_at, notes, updated_by) values ($1, $2, $3, $4, $5, $6, $7, $8) returning ' + COLS,
  [p.project_id, p.label, p.amount_minor, p.currency, p.status, p.paid_at || null, p.notes || '', by]);
async function update(q, id, patch, by) {
  const s = setClause(patch, ['label', 'amount_minor', 'status', 'paid_at', 'notes'], 3);
  const set = (s.empty ? '' : s.sql + ', ') + 'updated_at = now(), updated_by = $2';
  return q.one('update payments set ' + set + ' where id = $1 returning ' + COLS, [id, by].concat(s.values));
}
const remove = (q, id) => q.one('delete from payments where id = $1 returning id', [id]);

module.exports = { list, all, count, add, update, remove };

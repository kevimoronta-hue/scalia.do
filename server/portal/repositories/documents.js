/* ==========================================================================
   Scalia Portal · documents (metadata; the files are in Vercel Blob).
   byIdForUser: the client's own organization AND visible_to_client, in the
   SQL. A document of another client and an internal document answer the
   same thing: nothing (→ 404).
   ========================================================================== */
'use strict';
const { setClause } = require('./sql');

const COLS = 'd.id, d.project_id, d.title, d.category, d.blob_pathname, d.file_name, d.mime_type, d.size_bytes, d.visible_to_client, d.uploaded_by, d.created_at, d.updated_at';

const list = (q, projectId, includeInternal) => q.query(
  'select ' + COLS + ' from documents d where d.project_id = $1' + (includeInternal ? '' : ' and d.visible_to_client') + ' order by d.created_at desc', [projectId]);
const byId = (q, id) => q.one('select ' + COLS + ' from documents d where d.id = $1', [id]);
const byIdForUser = (q, userId, id) => q.one(
  'select ' + COLS + ' from documents d join projects p on p.id = d.project_id join organization_members m on m.organization_id = p.organization_id ' +
  'where d.id = $1 and m.user_id = $2 and d.visible_to_client', [id, userId]);
const add = (q, d, by) => q.one(
  'insert into documents (project_id, title, category, blob_pathname, file_name, mime_type, size_bytes, visible_to_client, uploaded_by, updated_by) ' +
  'values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) returning *',
  [d.project_id, d.title, d.category, d.blob_pathname, d.file_name, d.mime_type, d.size_bytes, d.visible_to_client, by]);
async function update(q, id, patch, by) {
  const s = setClause(patch, ['title', 'category', 'visible_to_client'], 3);
  const set = (s.empty ? '' : s.sql + ', ') + 'updated_at = now(), updated_by = $2';
  return q.one('update documents set ' + set + ' where id = $1 returning *', [id, by].concat(s.values));
}
const remove = (q, id) => q.one('delete from documents where id = $1 returning *', [id]);
// Stored files of projects about to be deleted (their rows go with the project).
const pathsOfProjects = (q, projectIds) => projectIds.length ? q.query('select blob_pathname from documents where project_id = any($1::uuid[])', [projectIds]).then(r => r.map(x => x.blob_pathname)) : Promise.resolve([]);

module.exports = { list, byId, byIdForUser, add, update, remove, pathsOfProjects };

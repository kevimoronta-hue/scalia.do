/* Scalia Portal · organizations (the client company) and their members. */
'use strict';

const create = (q, name, by) => q.one('insert into organizations (name, created_by, updated_by) values ($1, $2, $2) returning *', [name, by]);
const byId = (q, id) => q.one('select * from organizations where id = $1', [id]);
const rename = (q, id, name, by) => q.one('update organizations set name = $2, updated_at = now(), updated_by = $3 where id = $1 returning *', [id, name, by]);
const all = q => q.query('select * from organizations order by lower(name)');
const addMember = (q, orgId, userId) => q.query('insert into organization_members (organization_id, user_id) values ($1, $2) on conflict do nothing', [orgId, userId]);
const allMembers = q => q.query('select organization_id, user_id from organization_members');
const firstOfUser = (q, userId) => q.one('select o.* from organizations o join organization_members m on m.organization_id = o.id where m.user_id = $1 order by m.created_at limit 1', [userId]);

module.exports = { create, byId, rename, all, addMember, allMembers, firstOfUser };

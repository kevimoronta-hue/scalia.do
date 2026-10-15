/* Scalia Portal · tiny SQL helpers shared by the repositories.
   Column names always come from the code (whitelists), values always as
   parameters ($1, $2…), never concatenated. */
'use strict';

// "set a = $1, b = $2" from a patch, keeping only allowed columns.
function setClause(patch, allowed, start) {
  const cols = Object.keys(patch).filter(k => allowed.includes(k) && patch[k] !== undefined);
  return {
    sql: cols.map((c, i) => c + ' = $' + (start + i)).join(', '),
    values: cols.map(c => patch[c]),
    empty: cols.length === 0
  };
}

module.exports = { setClause };

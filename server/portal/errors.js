/* Scalia Portal · business errors. Only errors made here reach the browser
   with their code (EMAIL_EXISTS, NOT_FOUND…); anything else (database,
   Google, Blob, a bug) is answered as SERVER_ERROR and logged
   (server/portal/api.js). */
'use strict';

const STATUS = { UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, RATE_LIMITED: 429, NOT_CONFIGURED: 503 };

function portalError(code, field, status) {
  const e = new Error(code);
  e.code = code;
  e.expose = true;
  if (field) e.field = field;
  e.status = status || STATUS[code] || 400;
  return e;
}

module.exports = { portalError };

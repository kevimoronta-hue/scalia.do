/* ==========================================================================
   Scalia Portal · configuration (server only, never sent to the browser)
   Database: the Postgres connection string Vercel adds when a Postgres
   database (Neon, Vercel Marketplace) is connected to the project. Neon's
   integration names it DATABASE_URL (pooled) and also POSTGRES_URL; both
   are accepted, DATABASE_URL first.
   Blob: BLOB_READ_WRITE_TOKEN, added by Vercel when a Blob store is
   connected to the project.
   Local tests: PORTAL_MOCK=1 (refused on Vercel and in production).
   ========================================================================== */
'use strict';
const os = require('os');
const path = require('path');

function onVercelOrProd() {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === 'production');
}
let warned = false;
function mock() {
  if (process.env.PORTAL_MOCK !== '1') return false;
  if (onVercelOrProd()) {
    if (!warned) { warned = true; console.error('[portal] PORTAL_MOCK ignored: production environment'); }
    return false;
  }
  return true;
}
function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}
// Migrations: a direct (non-pooled) connection when the integration gives one.
function migrationUrl() {
  return process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || databaseUrl();
}
function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || '';
}
// Local test data (database, files, emails), one folder.
function mockDir() {
  return process.env.PORTAL_MOCK_DIR || path.join(os.tmpdir(), 'scalia-portal-mock');
}
// The portal works with the database alone; documents also need Blob
// (server/portal/storage.js answers NOT_CONFIGURED without it).
function configured() {
  return mock() || !!databaseUrl();
}

module.exports = { mock, databaseUrl, migrationUrl, blobToken, mockDir, configured, onVercelOrProd };

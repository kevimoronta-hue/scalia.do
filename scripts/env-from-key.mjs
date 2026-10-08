/* ==========================================================================
   Scalia Booking · write .env.local from a service-account key file
     node scripts/env-from-key.mjs /path/to/key.json
   For local tests only. Reads the JSON key, writes the Google variables to
   .env.local (git-ignored, permissions 600) and prints nothing secret.
   Existing lines of .env.local for other variables are kept.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
if (!file) { console.log('Usage: node scripts/env-from-key.mjs /path/to/key.json'); process.exit(1); }

let key;
try { key = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log('Cannot read this JSON file.'); process.exit(1); }
if (key.type !== 'service_account' || !key.client_email || !key.private_key) { console.log('Not a service-account key file.'); process.exit(1); }
try { crypto.createPrivateKey(key.private_key); } catch (e) { console.log('The private key in this file is not valid.'); process.exit(1); }

const target = path.join(ROOT, '.env.local');
const set = {
  GOOGLE_SERVICE_ACCOUNT_EMAIL: key.client_email,
  GOOGLE_PRIVATE_KEY: JSON.stringify(key.private_key),     // one line, \n escaped
  GOOGLE_IMPERSONATE: process.env.GOOGLE_IMPERSONATE || 'contact@scalia.do'
};
let lines = [];
try { lines = fs.readFileSync(target, 'utf8').split(/\r?\n/).filter(l => l && !/^(GOOGLE_SERVICE_ACCOUNT_EMAIL|GOOGLE_PRIVATE_KEY|GOOGLE_IMPERSONATE)=/.test(l)); } catch (e) {}
for (const k of Object.keys(set)) lines.push(k + '=' + set[k]);
fs.writeFileSync(target, lines.join('\n') + '\n', { mode: 0o600 });
fs.chmodSync(target, 0o600);
console.log('.env.local written for ' + key.client_email.replace(/^[^@]+/, '•••') + ' (impersonating ' + set.GOOGLE_IMPERSONATE + ').');

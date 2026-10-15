/* ==========================================================================
   Scalia Portal · local test backend helper (PORTAL_MOCK=1 only).
     node scripts/portal-mock.mjs admin <email> <password>   create an admin
     node scripts/portal-mock.mjs reset                      empty everything
     node scripts/portal-mock.mjs mails                      list the .eml files
   With Supabase, an admin is created in the dashboard instead (README).
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

process.env.PORTAL_MOCK = '1';
const require = createRequire(import.meta.url);
const mock = require('../server/portal/mock.js');
const [cmd, email, password] = process.argv.slice(2);

if (cmd === 'reset') {
  mock.reset();
  for (const f of fs.existsSync(mock.DIR) ? fs.readdirSync(mock.DIR) : []) if (f.endsWith('.eml')) fs.unlinkSync(path.join(mock.DIR, f));
  console.log('Portal mock emptied: ' + mock.DIR);
} else if (cmd === 'admin' && email && password) {
  const link = await mock.auth.generateLink('invite', email, { full_name: 'Scalia Admin', locale: 'fr' });
  const s = await mock.auth.verify(link.tokenHash, 'invite');
  await mock.auth.setPassword(s.accessToken, password);
  mock.promote(email);
  console.log('Admin ready: ' + email);
} else if (cmd === 'mails') {
  for (const f of fs.existsSync(mock.DIR) ? fs.readdirSync(mock.DIR).filter(f => f.endsWith('.eml')).sort() : []) console.log(path.join(mock.DIR, f));
} else {
  console.log('Usage: node scripts/portal-mock.mjs admin <email> <password> | reset | mails');
}

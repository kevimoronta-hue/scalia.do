/* ==========================================================================
   Scalia · country and time zone from the network (Vercel Routing Middleware)
   Vercel resolves both from the connection and passes them as
   x-vercel-ip-country and x-vercel-ip-timezone. This writes the two-letter
   country code to scalia_country (first-visit language, read by
   i18n/boot.js) and the IANA zone name, e.g. "Europe/Paris", to
   scalia_timezone (booking times, read by booking.js after a zone chosen by
   hand). Nothing else: the IP address, city or coordinates are never read,
   stored or sent anywhere. Pages only; assets and /api are untouched.
   ========================================================================== */
export const config = {
  matcher: ['/', '/scalians/:path*', '/mentions-legales/:path*', '/confidentialite/:path*']
};

const MAX_AGE = 86400;

function zoneOf(tz) {
  if (typeof tz !== 'string' || tz.length > 64 || !/^[A-Za-z][A-Za-z0-9_+\-]*(?:\/[A-Za-z0-9_+\-]+){0,2}$/.test(tz)) return null;
  let r;
  try { r = new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone; } catch (e) { return null; }
  // Same name in another case → the canonical spelling; an alias (Asia/Kolkata) stays as given.
  return r && r.toLowerCase() === tz.toLowerCase() ? r : tz;
}
function cookie(header, name) {
  const m = new RegExp('(?:^|;\\s*)' + name + '=([^;]*)').exec(header);
  return m ? m[1] : null;
}

export default function middleware(request) {
  const jar = request.headers.get('cookie') || '';
  const set = [];

  const country = String(request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  if (/^[A-Z]{2}$/.test(country) && cookie(jar, 'scalia_country') !== country) {
    set.push('scalia_country=' + country + '; Path=/; Max-Age=' + MAX_AGE + '; SameSite=Lax; Secure');
  }
  let zone = null;
  try { zone = zoneOf(decodeURIComponent(request.headers.get('x-vercel-ip-timezone') || '')); } catch (e) {}
  if (zone && cookie(jar, 'scalia_timezone') !== zone) {
    set.push('scalia_timezone=' + zone + '; Path=/; Max-Age=' + MAX_AGE + '; SameSite=Lax; Secure');
  }

  if (!set.length) return;                                       // nothing new: continue unchanged
  const headers = new Headers({ 'x-middleware-next': '1' });    // continue to the page
  for (const c of set) headers.append('set-cookie', c);
  return new Response(null, { headers });
}

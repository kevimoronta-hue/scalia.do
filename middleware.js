/* ==========================================================================
   Scalia · country and time zone from the network (Vercel Routing Middleware)
   Vercel resolves both from the connection and passes them as
   x-vercel-ip-country and x-vercel-ip-timezone. This writes the two-letter
   country code to scalia_country (first-visit language, read by
   i18n/boot.js) and the IANA zone name, e.g. "Europe/Paris", to
   scalia_timezone (booking times, read by booking.js after a zone chosen by
   hand). Nothing else: the IP address, city or coordinates are never read,
   stored or sent anywhere. Pages only; assets and /api are untouched.
   Portal pages (/portal/, /admin/): without a session cookie, straight to
   the sign-in page. The cookie is not trusted for anything else: who may
   see which data is decided by /api/portal* and the database.
   Both cookies arrive with the page itself, so i18n/boot.js reads them on
   the very first visit. Pages are no-store (vercel.json): a revalidated
   page (304) would come back without these Set-Cookie headers.
   ========================================================================== */
export const config = {
  matcher: ['/', '/fr/:path*', '/en/:path*', '/es/:path*', '/scalians/:path*', '/mentions-legales/:path*', '/confidentialite/:path*', '/portal/:path*', '/admin/:path*']
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

// Pages that need a signed-in visitor (sign-in and welcome pages excepted).
const PRIVATE = /^\/(?:portal\/(?!login\/|welcome\/)|admin\/)/;

export default function middleware(request) {
  const jar = request.headers.get('cookie') || '';
  const set = [];

  const url = new URL(request.url);
  if (PRIVATE.test(url.pathname) && !cookie(jar, 'scalia_pr')) {
    const to = new URL('/portal/login/', url);
    to.searchParams.set('next', url.pathname + url.search);
    return new Response(null, { status: 307, headers: { Location: to.toString(), 'Cache-Control': 'no-store' } });
  }

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

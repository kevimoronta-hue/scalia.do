/* ==========================================================================
   Scalia · country for the first-visit language (Vercel Routing Middleware)
   Vercel resolves the visitor's country from the connection and passes it
   as x-vercel-ip-country. This writes that two-letter code, and nothing
   else, to the scalia_country cookie on page requests, where i18n/boot.js
   reads it before the first paint. The IP address itself is never read,
   stored or sent anywhere. Pages only; assets and /api are untouched.
   ========================================================================== */
export const config = {
  matcher: ['/', '/scalians/:path*', '/mentions-legales/:path*', '/confidentialite/:path*']
};

export default function middleware(request) {
  const country = String(request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return;                       // unknown: continue unchanged
  const had = /(?:^|;\s*)scalia_country=([A-Z]{2})/.exec(request.headers.get('cookie') || '');
  if (had && had[1] === country) return;                         // already up to date
  return new Response(null, {
    headers: {
      'x-middleware-next': '1',                                  // continue to the page
      'set-cookie': 'scalia_country=' + country + '; Path=/; Max-Age=86400; SameSite=Lax; Secure'
    }
  });
}

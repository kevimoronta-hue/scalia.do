import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  // Match all locales
  matcher: ['/', '/(es|en|fr)/:path*', '/((?!_next|_vercel|.*\\..*).*)']
};

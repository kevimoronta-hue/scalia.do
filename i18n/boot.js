/* ==========================================================================
   Scalia · i18n boot (runs in <head>, before first paint)
   Decides the locale and the currency as early as possible so the page is
   never shown in the wrong language:
     1. ?lang=fr|en|es in the URL (shared links, hreflang alternates)
     2. the visitor's saved choice (localStorage)
     3. the visitor's country:
          a. edge value, when the host provides it: <meta name="scalia-country">
             or a `scalia_country` cookie set by edge middleware (none today:
             the site is static and not deployed yet)
          b. otherwise the device time zone, mapped to a country (native,
             no network call, no third-party API)
     4. the browser's preferred languages
     5. French
   A manual choice is saved and always wins over detection on later visits.
   ========================================================================== */
(function () {
  'use strict';
  var d = document.documentElement;
  var me = document.currentScript;
  var ROOT = (me && me.getAttribute('data-root')) || '';
  var LOCALES = ['fr', 'en', 'es'];
  var KEY_LOCALE = 'scalia.locale';
  var KEY_CURRENCY = 'scalia.currency';

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function has(l) { return LOCALES.indexOf(l) > -1; }

  // Country -> locale. Markets not listed fall through to the browser language.
  var FR = 'FR BE CH LU MC CA HT SN CI CM MA DZ TN ML BF NE TG BJ GA CG CD MG RE GP MQ GF YT PF NC PM BL MF WF';
  var ES = 'ES MX CO AR CL PE VE EC GT CU BO DO HN PY SV NI CR PA UY PR GQ';
  var EN = 'US GB IE AU NZ SG JM TT BS BB BZ GY ZA NG GH KE UG ZW ZM BW MW MT';
  var COUNTRY = {};
  FR.split(' ').forEach(function (c) { COUNTRY[c] = 'fr'; });
  ES.split(' ').forEach(function (c) { COUNTRY[c] = 'es'; });
  EN.split(' ').forEach(function (c) { COUNTRY[c] = 'en'; });
  // Multilingual markets: the browser language decides when it is one of ours.
  var MULTI = { BE: 1, CH: 1, LU: 1 };

  // Time zone -> country, for the markets above (the device clock is the only
  // location signal a static page has without asking the visitor).
  var TZ = {
    'Europe/Paris': 'FR', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH', 'Europe/Luxembourg': 'LU', 'Europe/Monaco': 'MC',
    'America/Martinique': 'MQ', 'America/Guadeloupe': 'GP', 'America/Cayenne': 'GF', 'Indian/Reunion': 'RE', 'Indian/Mayotte': 'YT',
    'Pacific/Tahiti': 'PF', 'Pacific/Noumea': 'NC', 'America/Miquelon': 'PM', 'America/Port-au-Prince': 'HT',
    'America/Toronto': 'CA', 'America/Montreal': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA',
    'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA', 'America/Moncton': 'CA', 'America/Whitehorse': 'CA',
    'Africa/Dakar': 'SN', 'Africa/Abidjan': 'CI', 'Africa/Douala': 'CM', 'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ',
    'Africa/Tunis': 'TN', 'Africa/Bamako': 'ML', 'Africa/Ouagadougou': 'BF', 'Africa/Niamey': 'NE', 'Africa/Lome': 'TG',
    'Africa/Porto-Novo': 'BJ', 'Africa/Libreville': 'GA', 'Africa/Brazzaville': 'CG', 'Africa/Kinshasa': 'CD', 'Indian/Antananarivo': 'MG',
    'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES',
    'America/Santo_Domingo': 'DO', 'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Merida': 'MX', 'America/Monterrey': 'MX',
    'America/Matamoros': 'MX', 'America/Chihuahua': 'MX', 'America/Ciudad_Juarez': 'MX', 'America/Ojinaga': 'MX', 'America/Mazatlan': 'MX',
    'America/Bahia_Banderas': 'MX', 'America/Hermosillo': 'MX', 'America/Tijuana': 'MX',
    'America/Bogota': 'CO', 'America/Argentina/Buenos_Aires': 'AR', 'America/Buenos_Aires': 'AR', 'America/Argentina/Cordoba': 'AR',
    'America/Argentina/Mendoza': 'AR', 'America/Argentina/Salta': 'AR', 'America/Argentina/Ushuaia': 'AR', 'America/Santiago': 'CL',
    'America/Punta_Arenas': 'CL', 'America/Lima': 'PE', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC', 'America/Guatemala': 'GT',
    'America/Havana': 'CU', 'America/La_Paz': 'BO', 'America/Tegucigalpa': 'HN', 'America/Asuncion': 'PY', 'America/El_Salvador': 'SV',
    'America/Managua': 'NI', 'America/Costa_Rica': 'CR', 'America/Panama': 'PA', 'America/Montevideo': 'UY', 'America/Puerto_Rico': 'PR',
    'Africa/Malabo': 'GQ',
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Phoenix': 'US',
    'America/Anchorage': 'US', 'Pacific/Honolulu': 'US', 'America/Detroit': 'US', 'America/Boise': 'US', 'America/Indiana/Indianapolis': 'US',
    'America/Kentucky/Louisville': 'US', 'America/Juneau': 'US', 'America/Adak': 'US',
    'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU', 'Australia/Darwin': 'AU', 'Pacific/Auckland': 'NZ',
    'Asia/Singapore': 'SG', 'America/Jamaica': 'JM', 'America/Port_of_Spain': 'TT', 'America/Nassau': 'BS', 'America/Barbados': 'BB',
    'America/Belize': 'BZ', 'America/Guyana': 'GY', 'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH',
    'Africa/Nairobi': 'KE', 'Africa/Kampala': 'UG', 'Africa/Harare': 'ZW', 'Africa/Lusaka': 'ZM', 'Africa/Gaborone': 'BW',
    'Africa/Blantyre': 'MW', 'Europe/Malta': 'MT'
  };

  function edgeCountry() {
    var m = document.querySelector('meta[name="scalia-country"]');
    var v = m && m.content;
    if (!v) { var c = document.cookie.match(/(?:^|;\s*)scalia_country=([A-Za-z]{2})/); v = c && c[1]; }
    return v ? v.toUpperCase() : null;
  }
  function tzCountry() {
    try { return TZ[Intl.DateTimeFormat().resolvedOptions().timeZone] || null; } catch (e) { return null; }
  }
  function browserLocale() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var two = String(list[i]).slice(0, 2).toLowerCase();
      if (has(two)) return two;
    }
    return null;
  }
  function countryLocale(c) {
    if (!c) return null;
    var b = browserLocale();
    if (MULTI[c] && b) return b;                 // Belgium, Switzerland, Luxembourg
    if (c === 'US' && b === 'es') return 'es';   // Spanish-speaking households in the US
    return COUNTRY[c] || null;
  }

  var locale, source, country = null;
  var q = null;
  try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  var saved = read(KEY_LOCALE);
  if (has(q)) { locale = q; source = 'url'; }
  else if (has(saved)) { locale = saved; source = 'saved'; }
  else {
    var edge = edgeCountry();
    country = edge || tzCountry();
    locale = countryLocale(country);
    source = locale ? (edge ? 'edge' : 'timezone') : null;
    if (!locale) { locale = browserLocale(); source = locale ? 'browser' : null; }
    if (!locale) { locale = 'fr'; source = 'default'; }
  }

  var currency = read(KEY_CURRENCY);
  if (currency !== 'EUR' && currency !== 'USD') currency = 'EUR';

  d.lang = locale;
  d.setAttribute('data-locale', locale);
  d.setAttribute('data-currency', currency);
  window.SCALIA_I18N_BOOT = { locale: locale, source: source, country: country, currency: currency, root: ROOT };

  // French is in the HTML. Other locales: fetch the dictionary now and keep
  // the page hidden until it is applied (with a safety release).
  if (locale !== 'fr') {
    d.classList.add('i18n-wait');
    var s = document.createElement('script');
    s.src = ROOT + 'i18n/' + locale + '.js';
    s.id = 'i18n-dict-' + locale;
    document.head.appendChild(s);
    setTimeout(function () { d.classList.remove('i18n-wait'); }, 2500);
  }
})();

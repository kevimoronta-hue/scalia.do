/* ==========================================================================
   Scalia Booking · business rules
   Every scheduling rule lives here and nowhere else. Times are wall-clock
   times in BOOKING.timezone (Scalia's own zone); the API converts them to
   exact instants, and visitors see them in their own zone.
   ========================================================================== */
'use strict';

const BOOKING = {
  // Scalia's working zone (IANA). Opening hours below are read in this zone.
  timezone: process.env.BOOKING_TIMEZONE || 'America/Santo_Domingo',

  // Open days and hours. 1 = Monday … 7 = Sunday. Several ranges per day are
  // allowed, e.g. [['09:00', '12:00'], ['14:00', '18:00']].
  hours: {
    1: [['09:00', '18:00']],
    2: [['09:00', '18:00']],
    3: [['09:00', '18:00']],
    4: [['09:00', '18:00']],
    5: [['09:00', '18:00']]
  },

  durationMin: 60,      // length of a meeting
  stepMin: 30,          // spacing of the proposed start times
  bufferBeforeMin: 0,   // kept free before a meeting
  bufferAfterMin: 15,   // kept free after a meeting
  minNoticeMin: 240,    // earliest booking: 4 h from now
  maxDays: 7,           // how far ahead the calendar opens
  maxPerDay: 6,         // meetings per day at most (0 = no limit)

  // Closed dates (YYYY-MM-DD, in BOOKING.timezone): holidays, travel…
  blockedDates: [],

  // Calendars whose events make Scalia busy. The first one also receives
  // the bookings. "primary" = the main calendar of the connected account.
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  busyCalendars: (process.env.GOOGLE_BUSY_CALENDARS || '').split(',').map(s => s.trim()).filter(Boolean),

  // Create a Google Meet link with every booking.
  meet: process.env.BOOKING_MEET !== 'off',

  // "Que souhaitez-vous créer ?": the only values the form may send, with
  // their wording for Scalia's calendar and emails. At least one is required.
  projectTypes: {
    landing_page: { fr: 'Landing page', en: 'Landing page', es: 'Landing page' },
    multi_page: { fr: 'Site multi-pages', en: 'Multi-page website', es: 'Sitio web multipágina' },
    visual_identity: { fr: 'Identité visuelle / design graphique', en: 'Visual identity / graphic design', es: 'Identidad visual / diseño gráfico' },
    logo: { fr: 'Création ou refonte de logo', en: 'Logo creation or redesign', es: 'Creación o rediseño de logotipo' },
    other: { fr: 'Autre', en: 'Other', es: 'Otro' }
  },
  projectTypeRequired: true,

  // Reminder with the video link, sent by /api/reminders (see that file):
  // a meeting is reminded once it starts within this many minutes. Called
  // every 10 minutes, the email leaves 65 to 55 minutes before the start.
  reminderLeadMin: 65,

  // Emails
  fromName: 'Scalia',
  fromEmail: process.env.BOOKING_FROM || 'contact@scalia.do',
  notifyEmail: process.env.BOOKING_NOTIFY || 'contact@scalia.do',

  // Availability answers may be reused this long by the CDN. A booking is
  // always re-checked against Google Calendar, so this can never double-book.
  cacheSeconds: 20
};

module.exports = { BOOKING };

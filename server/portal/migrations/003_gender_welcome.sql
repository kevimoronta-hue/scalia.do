-- ==========================================================================
-- Scalia Portal · migration 003 · salutation + welcome email
-- users.gender: how the portal greets the person, set by an admin.
--   ''  not specified (neutral wording)
--   m   man   (ES "Bienvenido", FR "Bienvenu")
--   f   woman (ES "Bienvenida", FR "Bienvenue")
-- mail_events.event_type gains portal_welcome: the "your portal is ready"
-- email sent once, when an invited client chooses their password.
-- ==========================================================================
alter table users add column gender text not null default '' check (gender in ('', 'm', 'f'));

alter table mail_events drop constraint mail_events_event_type_check;
alter table mail_events add constraint mail_events_event_type_check check (event_type in (
  'application_admin', 'application_candidate', 'booking_admin', 'booking_client', 'portal_invite', 'password_reset', 'portal_welcome'));

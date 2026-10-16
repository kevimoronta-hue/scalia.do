-- ==========================================================================
-- Scalia · migration 002 · mail_events: one row per email that must leave
-- at most once (server/mail-events.js).
-- event_key is unique: two requests for the same email cannot both claim it
-- (INSERT … ON CONFLICT, atomic). Statuses:
--   processing  claimed, being sent, or sent without confirmation (timeout):
--               never sent again automatically
--   completed   the provider accepted the email
--   failed      the provider refused it (definite error): a retry may send
-- Rows are kept for diagnosis; delete old ones with
--   delete from mail_events where created_at < now() - interval '180 days';
-- ==========================================================================
create table mail_events (
  id                  uuid primary key default gen_random_uuid(),
  event_key           text not null unique check (length(event_key) between 3 and 200),
  event_type          text not null check (event_type in ('application_admin', 'application_candidate', 'booking_admin', 'booking_client', 'portal_invite', 'password_reset')),
  recipient           text not null default '' check (length(recipient) <= 254),
  status              text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  attempts            integer not null default 1,
  provider            text not null default '' check (length(provider) <= 20),
  provider_message_id text not null default '' check (length(provider_message_id) <= 200),
  error               text not null default '' check (length(error) <= 200),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index mail_events_created_idx on mail_events (created_at);
create index mail_events_status_idx on mail_events (status, updated_at);

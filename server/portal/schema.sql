-- ==========================================================================
-- Scalia Portal · full database schema (snapshot of server/portal/migrations)
-- Reference only: the database is created and evolved by the migrations
-- (npm run portal:migrate). Keep this file equal to all migrations in order.
-- Money: integer minor units (cents), e.g. 700 EUR = 70000.
-- ==========================================================================

-- ------------------------------------------------------------------- users
create table users (
  id               uuid primary key default gen_random_uuid(),
  email            text not null check (email = lower(email) and length(email) between 3 and 254),
  password_hash    text,                                  -- Argon2id; null until the invitation is accepted
  role             text not null default 'client' check (role in ('admin', 'client')),
  preferred_locale text not null default 'es' check (preferred_locale in ('es', 'fr', 'en')),
  first_name       text not null default '' check (length(first_name) <= 80),
  last_name        text not null default '' check (length(last_name) <= 120),
  phone            text not null default '' check (length(phone) <= 40),
  whatsapp         text not null default '' check (length(whatsapp) <= 40),
  title            text not null default '' check (length(title) <= 120),   -- shown when an admin is a project contact
  is_active        boolean not null default false,        -- true once the password is set
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references users (id) on delete set null
);
create unique index users_email_key on users (email);

-- -------------------------------------------------------- auth: sessions
-- Only the SHA-256 of the cookie value is stored.
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id) on delete cascade,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_used_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);
create index sessions_expires_idx on sessions (expires_at);

-- ------------------------------------------- auth: invitation / reset tokens
create table auth_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  type        text not null check (type in ('invite', 'reset')),
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now(),
  created_by  uuid references users (id) on delete set null
);
create index auth_tokens_user_idx on auth_tokens (user_id, type);

-- Fixed-window counters for login / forgot / token checks (brute force).
create table rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         integer not null
);

-- ----------------------------------------------------------- organizations
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 160),
  created_by  uuid references users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references users (id) on delete set null
);

create table organization_members (
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on organization_members (user_id);

-- ---------------------------------------------------------------- projects
create table projects (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations (id) on delete cascade,
  name                     text not null check (length(name) between 1 and 160),
  type                     text not null default '' check (length(type) <= 80),
  status                   text not null default 'active' check (status in ('active', 'on_hold', 'completed')),
  preferred_locale         text not null default 'es' check (preferred_locale in ('es', 'fr', 'en')),
  currency                 text not null default 'EUR' check (currency in ('EUR', 'USD', 'DOP')),
  total_amount_minor       bigint not null default 0 check (total_amount_minor >= 0),
  start_date               date,
  estimated_delivery_date  date,
  domain                   text not null default '' check (length(domain) <= 120),
  languages                text[] not null default '{}',
  contact_id               uuid references users (id) on delete set null,
  current_stage            text not null default 'brief' check (current_stage in ('brief', 'mockup', 'development', 'review', 'delivery')),
  next_step                text not null default '' check (length(next_step) <= 600),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  updated_by               uuid references users (id) on delete set null
);
create index projects_org_idx on projects (organization_id);

-- The five Scalia stages, created with each project.
create table project_stages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  stage_key   text not null check (stage_key in ('brief', 'mockup', 'development', 'review', 'delivery')),
  position    smallint not null check (position between 1 and 5),
  status      text not null default 'upcoming' check (status in ('upcoming', 'in_progress', 'waiting_client', 'completed')),
  progress    smallint not null default 0 check (progress between 0 and 100),
  note        text not null default '' check (length(note) <= 400),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references users (id) on delete set null,
  unique (project_id, stage_key)
);
create index project_stages_project_idx on project_stages (project_id);

create table project_updates (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects (id) on delete cascade,
  content           text not null check (length(content) between 1 and 2000),
  visible_to_client boolean not null default true,
  created_by        uuid references users (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index project_updates_project_idx on project_updates (project_id, created_at desc);

create table payments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects (id) on delete cascade,
  label        text not null check (length(label) between 1 and 120),
  amount_minor bigint not null check (amount_minor > 0),
  currency     text not null check (currency in ('EUR', 'USD', 'DOP')),
  status       text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at      date,
  notes        text not null default '' check (length(notes) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references users (id) on delete set null
);
create index payments_project_idx on payments (project_id);

-- Files live in Vercel Blob (private store) under blob_pathname.
create table documents (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects (id) on delete cascade,
  title             text not null check (length(title) between 1 and 160),
  category          text not null default 'other' check (category in ('contract', 'mockup', 'branding', 'project', 'invoice', 'delivery', 'other')),
  blob_pathname     text not null unique,
  file_name         text not null check (length(file_name) between 1 and 160),
  mime_type         text not null default '',
  size_bytes        bigint not null default 0,
  visible_to_client boolean not null default true,
  uploaded_by       uuid references users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid references users (id) on delete set null
);
create index documents_project_idx on documents (project_id);

-- "Action required": what Scalia is waiting for from the client.
-- kind = 'approval' is reserved for a client validation button (V2).
create table project_actions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  title       text not null check (length(title) between 1 and 160),
  description text not null default '' check (length(description) <= 800),
  kind        text not null default 'info' check (kind in ('info', 'approval')),
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_by  uuid references users (id) on delete set null,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references users (id) on delete set null
);
create index project_actions_project_idx on project_actions (project_id, status);

-- ------------------------------------------------- 002 · mail_events (emails sent at most once)
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

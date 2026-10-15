-- ==========================================================================
-- Scalia · client project portal: database schema (Supabase Postgres)
-- Run once in Supabase → SQL Editor (it can be run again safely).
-- Every table has Row Level Security: a client reads only the projects of
-- the organizations they belong to, an admin reads and writes everything.
-- The API also checks permissions (server/portal/service.js), so access is
-- refused twice: in the API and in the database.
-- ==========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
-- One row per auth user, created by the trigger below.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  phone       text not null default '',
  whatsapp    text not null default '',
  title       text not null default '',              -- shown when the admin is a project contact
  role        text not null default 'client' check (role in ('admin', 'client')),
  locale      text not null default 'es' check (locale in ('es', 'fr', 'en')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------- organizations
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 160),
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists organization_members_user_idx on public.organization_members (user_id);

-- ---------------------------------------------------------------- projects
create table if not exists public.projects (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations (id) on delete cascade,
  name                     text not null check (length(name) between 1 and 160),
  type                     text not null default '',
  status                   text not null default 'active' check (status in ('active', 'on_hold', 'completed')),
  preferred_locale         text not null default 'es' check (preferred_locale in ('es', 'fr', 'en')),
  currency                 text not null default 'EUR' check (currency in ('EUR', 'USD', 'DOP')),
  total_amount             numeric(12, 2) not null default 0 check (total_amount >= 0),
  start_date               date,
  estimated_delivery_date  date,
  domain                   text not null default '',
  languages                text[] not null default '{}',
  contact_id               uuid references public.profiles (id) on delete set null,
  current_stage            text not null default 'brief' check (current_stage in ('brief', 'mockup', 'development', 'review', 'delivery')),
  next_step                text not null default '',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  updated_by               uuid references auth.users (id)
);
create index if not exists projects_org_idx on public.projects (organization_id);

-- The five Scalia stages, created with each project (service.createProject).
create table if not exists public.project_stages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  stage_key   text not null check (stage_key in ('brief', 'mockup', 'development', 'review', 'delivery')),
  position    smallint not null check (position between 1 and 5),
  status      text not null default 'upcoming' check (status in ('upcoming', 'in_progress', 'waiting_client', 'completed')),
  progress    smallint not null default 0 check (progress between 0 and 100),
  note        text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id),
  unique (project_id, stage_key)
);

create table if not exists public.project_updates (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  content           text not null check (length(content) between 1 and 2000),
  visible_to_client boolean not null default true,
  created_by        uuid references auth.users (id),
  created_at        timestamptz not null default now()
);
create index if not exists project_updates_project_idx on public.project_updates (project_id, created_at desc);

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  label       text not null check (length(label) between 1 and 120),
  amount      numeric(12, 2) not null check (amount > 0),
  currency    text not null check (currency in ('EUR', 'USD', 'DOP')),
  status      text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at     date,
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);
create index if not exists payments_project_idx on public.payments (project_id);

-- Files live in the private Storage bucket "portal", under <project id>/.
create table if not exists public.documents (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  title             text not null check (length(title) between 1 and 160),
  category          text not null default 'other' check (category in ('contract', 'mockup', 'branding', 'project', 'invoice', 'delivery', 'other')),
  storage_path      text not null unique,
  file_name         text not null,
  mime_type         text not null default '',
  size_bytes        bigint not null default 0,
  visible_to_client boolean not null default true,
  uploaded_by       uuid references auth.users (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists documents_project_idx on public.documents (project_id);

-- "Action required": what Scalia is waiting for from the client.
-- kind = 'approval' is reserved for a client validation button (V2).
create table if not exists public.project_actions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null check (length(title) between 1 and 160),
  description text not null default '',
  kind        text not null default 'info' check (kind in ('info', 'approval')),
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id)
);
create index if not exists project_actions_project_idx on public.project_actions (project_id, status);

-- ----------------------------------------------------------------- helpers
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_read_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.projects pr
    join public.organization_members m on m.organization_id = pr.organization_id
    where pr.id = p and m.user_id = auth.uid()
  );
$$;

-- updated_at / updated_by on every change (the light audit trail).
create or replace function public.touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if to_jsonb(new) ? 'updated_by' and auth.uid() is not null then
    new := jsonb_populate_record(new, jsonb_build_object('updated_by', auth.uid()));
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'organizations', 'projects', 'project_stages', 'payments', 'documents'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch()', t);
  end loop;
end $$;

-- A profile for every new auth user (invitation). Role is always "client":
-- an admin is promoted by hand (see server/portal/README.md).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, locale)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'locale' in ('es', 'fr', 'en') then new.raw_user_meta_data ->> 'locale' else 'es' end
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ------------------------------------------------------ row level security
alter table public.profiles             enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects             enable row level security;
alter table public.project_stages       enable row level security;
alter table public.project_updates      enable row level security;
alter table public.payments             enable row level security;
alter table public.documents            enable row level security;
alter table public.project_actions      enable row level security;

-- Policies are dropped and recreated so this file can be run again.
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles', 'organizations', 'organization_members', 'projects', 'project_stages', 'project_updates', 'payments', 'documents', 'project_actions')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles: yourself, the Scalia team (project contacts), admins see all.
-- Nobody but an admin can write (a client can never change their role).
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or role = 'admin' or public.is_admin());
create policy profiles_admin_write on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy organizations_read on public.organizations for select to authenticated
  using (public.is_admin() or exists (select 1 from public.organization_members m where m.organization_id = organizations.id and m.user_id = auth.uid()));
create policy organizations_admin_write on public.organizations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy members_read on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy members_admin_write on public.organization_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy projects_read on public.projects for select to authenticated
  using (public.can_read_project(id));
create policy projects_admin_write on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy stages_read on public.project_stages for select to authenticated
  using (public.can_read_project(project_id));
create policy stages_admin_write on public.project_stages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payments_read on public.payments for select to authenticated
  using (public.can_read_project(project_id));
create policy payments_admin_write on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy actions_read on public.project_actions for select to authenticated
  using (public.can_read_project(project_id));
create policy actions_admin_write on public.project_actions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Updates and documents: internal rows (visible_to_client = false) are
-- admin-only, even for a member of the organization.
create policy updates_read on public.project_updates for select to authenticated
  using (public.is_admin() or (visible_to_client and public.can_read_project(project_id)));
create policy updates_admin_write on public.project_updates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy documents_read on public.documents for select to authenticated
  using (public.is_admin() or (visible_to_client and public.can_read_project(project_id)));
create policy documents_admin_write on public.documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ storage
-- Private bucket: no public URL. Files are read through short-lived signed
-- URLs that the API creates with the reader's own session, so the policy
-- below decides: admins, or members for a document visible to the client.
insert into storage.buckets (id, name, public, file_size_limit)
values ('portal', 'portal', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists portal_files_read on storage.objects;
drop policy if exists portal_files_admin_insert on storage.objects;
drop policy if exists portal_files_admin_update on storage.objects;
drop policy if exists portal_files_admin_delete on storage.objects;

create policy portal_files_read on storage.objects for select to authenticated
  using (bucket_id = 'portal' and (public.is_admin() or exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name and d.visible_to_client and public.can_read_project(d.project_id)
  )));
create policy portal_files_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'portal' and public.is_admin());
create policy portal_files_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'portal' and public.is_admin());
create policy portal_files_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'portal' and public.is_admin());

-- ============================================================================
-- Tolerancing SaaS — initial schema
-- Authoritative data model from CLAUDE.md.
--
-- Ownership root = organization (a solo user is an org of one — never
-- user-owned, to avoid painful migrations). Row-Level Security restricts every
-- row to members of its organization. Subscription state is writable only by
-- the service role (Stripe webhook) — never trusted from the client.
--
-- Apply with: Supabase Dashboard → SQL Editor (paste & run), or the Supabase
-- CLI (`supabase db push`). Safe to run once on a fresh project.
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Profile row keyed to the auth provider's user (auth.users).
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  role            text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by      uuid references public.users (id) on delete set null,
  name            text not null,
  -- hole_shaft_fit / thread_fit / bolt_torque / linear_stack / allocation / press_fit / …
  module_type     text not null,
  data            jsonb not null default '{}'::jsonb,  -- inputs + results; new modules need no schema change
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz                          -- soft delete
);

create table if not exists public.library_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- fit_preset / process_capability / material / tolerance_default / part / …
  type            text not null,
  name            text not null,
  data            jsonb not null default '{}'::jsonb,
  created_by      uuid references public.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null unique references public.organizations (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text not null default 'free'   check (plan in ('free', 'pro', 'team', 'business')),
  status                 text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  seats                  integer not null default 1,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

create index if not exists memberships_user_id_idx       on public.memberships (user_id);
create index if not exists memberships_org_id_idx        on public.memberships (organization_id);
create index if not exists projects_org_updated_idx      on public.projects (organization_id, updated_at desc);
create index if not exists projects_active_idx           on public.projects (organization_id) where deleted_at is null;
create index if not exists library_items_org_type_idx    on public.library_items (organization_id, type);

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER → bypass RLS, so membership checks used
-- inside policies do not recurse through the policies of the tables they read).
-- ----------------------------------------------------------------------------

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.memberships m
  where m.organization_id = org and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.shares_org_with(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships me
    join public.memberships them on them.organization_id = me.organization_id
    where me.user_id = auth.uid() and them.user_id = target
  );
$$;

-- Keep updated_at fresh on mutation.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists library_items_touch on public.library_items;
create trigger library_items_touch before update on public.library_items
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- New-user provisioning: profile + organization-of-one + owner membership +
-- free subscription. Runs as definer so it can write across tables on signup.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id   uuid;
  display_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.users (id, email, name)
  values (new.id, new.email, display_name);

  insert into public.organizations (name)
  values (display_name || '''s workspace')
  returning id into new_org_id;

  insert into public.memberships (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  insert into public.subscriptions (organization_id, plan, status, seats)
  values (new_org_id, 'free', 'active', 1);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Row-Level Security
-- A user can only read/write rows whose organization_id they belong to.
-- ----------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.users         enable row level security;
alter table public.memberships   enable row level security;
alter table public.projects      enable row level security;
alter table public.library_items enable row level security;
alter table public.subscriptions enable row level security;

-- organizations -------------------------------------------------------------
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select using (public.is_org_member(id));

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update using (public.org_role(id) in ('owner', 'admin'))
  with check (public.org_role(id) in ('owner', 'admin'));
-- (insert/delete intentionally omitted: orgs are created by the signup trigger;
--  multi-org creation is a later phase.)

-- users ---------------------------------------------------------------------
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select using (id = auth.uid() or public.shares_org_with(id));

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- memberships ---------------------------------------------------------------
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
  for select using (public.is_org_member(organization_id));

drop policy if exists memberships_write on public.memberships;
create policy memberships_write on public.memberships
  for all using (public.org_role(organization_id) in ('owner', 'admin'))
  with check (public.org_role(organization_id) in ('owner', 'admin'));

-- projects ------------------------------------------------------------------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (public.is_org_member(organization_id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete using (public.org_role(organization_id) in ('owner', 'admin'));

-- library_items -------------------------------------------------------------
drop policy if exists library_items_select on public.library_items;
create policy library_items_select on public.library_items
  for select using (public.is_org_member(organization_id));

drop policy if exists library_items_write on public.library_items;
create policy library_items_write on public.library_items
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- subscriptions -------------------------------------------------------------
-- Members may read their org's plan. No client write policy → writes are
-- denied by default; only the service role (Stripe webhook) can mutate.
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select using (public.is_org_member(organization_id));

-- ----------------------------------------------------------------------------
-- Grants (Supabase sets sensible defaults, but be explicit so this migration
-- is self-contained. RLS still gates every row.)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

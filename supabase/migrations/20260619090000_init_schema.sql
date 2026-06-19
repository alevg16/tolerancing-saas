-- =====================================================================
-- Tolerancing SaaS — initial schema
-- Ownership root = organization. A solo user is an org of one.
-- Module payloads are JSONB so new calculator modules need no migration.
-- RLS itself is defined in the companion migration (…_rls_and_policies.sql).
-- =====================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh on UPDATE.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- organizations — the ownership root for every tenant-scoped row.
-- ---------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- users — profile row keyed 1:1 to the Supabase auth user.
-- The id IS auth.users.id; rows are provisioned by handle_new_user().
-- ---------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  name        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- memberships — which user belongs to which org, and in what role.
-- This is the table every RLS policy ultimately checks.
-- ---------------------------------------------------------------------
create table public.memberships (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references public.users (id) on delete cascade,
  role             text not null default 'member'
                     check (role in ('owner', 'admin', 'member')),
  created_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_org_id_idx  on public.memberships (organization_id);

-- ---------------------------------------------------------------------
-- projects — a saved analysis. Inputs/results live in data (JSONB).
-- module_type is free text on purpose: new modules add no schema change.
-- Soft-deleted via deleted_at (kept visible to members so "trash" works).
-- ---------------------------------------------------------------------
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  created_by       uuid references public.users (id) on delete set null,
  name             text not null check (length(trim(name)) > 0),
  module_type      text not null,   -- hole_shaft_fit | linear_stack | allocation | press_fit | …
  data             jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index projects_org_id_idx        on public.projects (organization_id);
create index projects_created_by_idx    on public.projects (created_by);
-- Fast listing of the live (non-deleted) projects in an org.
create index projects_org_active_idx    on public.projects (organization_id) where deleted_at is null;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- library_items — the shared company standards library (org-scoped).
-- type is free text for the same extensibility reason as module_type.
-- ---------------------------------------------------------------------
create table public.library_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  type             text not null,   -- fit_preset | process_capability | material | tolerance_default | part | …
  name             text not null check (length(trim(name)) > 0),
  data             jsonb not null default '{}'::jsonb,
  created_by       uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index library_items_org_id_idx on public.library_items (organization_id);
create index library_items_type_idx   on public.library_items (organization_id, type);

create trigger library_items_set_updated_at
  before update on public.library_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- subscriptions — Stripe-synced billing state, one row per org.
-- Written by the Stripe webhook (service_role, which bypasses RLS).
-- Never trust the client: features are gated server-side from this row.
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null unique references public.organizations (id) on delete cascade,
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  plan                  text not null default 'free'
                          check (plan in ('free', 'pro', 'team', 'business')),
  status                text not null default 'active'
                          check (status in ('active', 'past_due', 'canceled')),
  seats                 integer not null default 1 check (seats >= 1),
  current_period_end    timestamptz,
  updated_at            timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

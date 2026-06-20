-- ============================================================================
-- Module tier overrides — which calculator modules are free vs pro.
-- Global product configuration: one row per module_type. The app reads the
-- effective tier as (override ?? code default). Readable by everyone (it is
-- not sensitive); only the service role (the admin server action) may write —
-- there is deliberately NO client write policy, exactly like `subscriptions`.
-- Builds on 0001_init.sql.
-- ============================================================================

create table if not exists public.module_tiers (
  module_type text primary key,
  tier        text not null check (tier in ('free', 'pro')),
  updated_at  timestamptz not null default now()
);

alter table public.module_tiers enable row level security;

drop policy if exists module_tiers_select on public.module_tiers;
create policy module_tiers_select on public.module_tiers
  for select using (true);

-- No insert/update/delete policy: writes go through the service role only.

-- =====================================================================
-- Tolerancing SaaS — Row-Level Security
-- Rule: a user may read/write a row only if they belong (via memberships)
--       to that row's organization_id.
--
-- Membership lookups go through SECURITY DEFINER helper functions. This
-- is deliberate: a policy ON memberships that SELECTs FROM memberships
-- would recurse infinitely. The helpers run with the definer's rights so
-- they bypass RLS, breaking the recursion cleanly.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER → bypass RLS, no recursion).
-- ---------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org uuid, allowed text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role = any(allowed)
  );
$$;

-- True if the current user shares at least one org with target_user.
-- Used so members can see each other's profiles.
create or replace function public.shares_org(target_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships me
    join public.memberships them on them.organization_id = me.organization_id
    where me.user_id = auth.uid()
      and them.user_id = target_user
  );
$$;

-- ---------------------------------------------------------------------
-- Provisioning: when an auth user is created, mirror a profile row and
-- give them an org-of-one with an owner membership. This is what makes
-- ownership org-rooted from the very first signup (never user-rooted).
-- Disable this trigger if you'd rather create the org during onboarding.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.users (id, email, name)
  values (new.id, new.email, display_name);

  insert into public.organizations (name)
  values (coalesce(
    new.raw_user_meta_data ->> 'organization_name',
    display_name || '''s organization'
  ))
  returning id into new_org_id;

  insert into public.memberships (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- create_organization — bootstrap a NEW org for the caller (e.g. Team
-- tier creating a second workspace). SECURITY DEFINER inserts the org
-- and the caller's owner membership atomically, sidestepping the
-- chicken-and-egg where RLS would block the first membership insert.
-- Call from the client with: supabase.rpc('create_organization', { org_name }).
-- ---------------------------------------------------------------------
create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;
  if length(trim(coalesce(org_name, ''))) = 0 then
    raise exception 'org_name is required';
  end if;

  insert into public.organizations (name)
  values (org_name)
  returning id into new_org_id;

  insert into public.memberships (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- =====================================================================
-- Enable RLS. Once enabled with no matching policy, access defaults to
-- DENY — so every table below is locked down unless a policy permits it.
-- (service_role, used by the Stripe webhook / server, bypasses RLS.)
-- =====================================================================
alter table public.organizations  enable row level security;
alter table public.users          enable row level security;
alter table public.memberships    enable row level security;
alter table public.projects       enable row level security;
alter table public.library_items  enable row level security;
alter table public.subscriptions  enable row level security;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
create policy users_select_self_or_coworkers
  on public.users for select to authenticated
  using (id = auth.uid() or public.shares_org(id));

create policy users_update_self
  on public.users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- organizations  (created via create_organization() / signup trigger)
-- ---------------------------------------------------------------------
create policy organizations_select_members
  on public.organizations for select to authenticated
  using (public.is_org_member(id));

create policy organizations_update_admins
  on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner', 'admin']))
  with check (public.has_org_role(id, array['owner', 'admin']));

create policy organizations_delete_owner
  on public.organizations for delete to authenticated
  using (public.has_org_role(id, array['owner']));

-- ---------------------------------------------------------------------
-- memberships  (owners/admins manage the roster)
-- ---------------------------------------------------------------------
create policy memberships_select_members
  on public.memberships for select to authenticated
  using (public.is_org_member(organization_id));

create policy memberships_insert_admins
  on public.memberships for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy memberships_update_admins
  on public.memberships for update to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy memberships_delete_admins
  on public.memberships for delete to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------
-- projects  (any member of the org)
-- ---------------------------------------------------------------------
create policy projects_select_members
  on public.projects for select to authenticated
  using (public.is_org_member(organization_id));

create policy projects_insert_members
  on public.projects for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and created_by = auth.uid()
  );

create policy projects_update_members
  on public.projects for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy projects_delete_members
  on public.projects for delete to authenticated
  using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------
-- library_items  (any member of the org)
-- ---------------------------------------------------------------------
create policy library_items_select_members
  on public.library_items for select to authenticated
  using (public.is_org_member(organization_id));

create policy library_items_insert_members
  on public.library_items for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy library_items_update_members
  on public.library_items for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy library_items_delete_members
  on public.library_items for delete to authenticated
  using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------
-- subscriptions  (members read; only the server writes)
-- No INSERT/UPDATE/DELETE policy => the Stripe webhook must use the
-- service_role key, which bypasses RLS. Clients can read but never
-- forge billing state.
-- ---------------------------------------------------------------------
create policy subscriptions_select_members
  on public.subscriptions for select to authenticated
  using (public.is_org_member(organization_id));

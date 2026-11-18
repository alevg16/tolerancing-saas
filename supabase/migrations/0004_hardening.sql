-- ============================================================================
-- P1 hardening — launch-readiness fixes. Builds on 0001–0003.
--
--   1. Stripe webhook idempotency        (stripe_events ledger)
--   2. One report-settings row per org   (partial unique index)
--   3. Teams security invariants         (invite email match, owner-role
--                                         ceiling, last-owner protection)
--
-- Idempotent: safe to run on a project that already has 0001–0003 applied.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Stripe webhook idempotency
-- A processed-event ledger. The webhook records each event id before handling
-- it; a redelivery of the same id is skipped. Service-role only (RLS on, no
-- client policy) — exactly like `subscriptions`.
-- ----------------------------------------------------------------------------
create table if not exists public.stripe_events (
  id           text primary key,          -- Stripe event id (evt_…)
  type         text,
  received_at  timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- No insert/update/select/delete policy: only the service role touches this.

-- ----------------------------------------------------------------------------
-- 2. Exactly one report-settings singleton per organization
-- `report_settings` is stored as a library_items row; nothing stopped a second
-- one being created under a race, after which maybeSingle() would error. Enforce
-- one row per org for that type.
-- ----------------------------------------------------------------------------
-- Collapse any duplicates that already slipped in (keep the newest), so the
-- unique index can be created on an existing project.
delete from public.library_items a
  using public.library_items b
 where a.type = 'report_settings'
   and b.type = 'report_settings'
   and a.organization_id = b.organization_id
   and (a.created_at < b.created_at
        or (a.created_at = b.created_at and a.ctid < b.ctid));

create unique index if not exists library_items_report_settings_uniq
  on public.library_items (organization_id)
  where type = 'report_settings';

-- ----------------------------------------------------------------------------
-- 3. Teams security
-- ----------------------------------------------------------------------------

-- 3a. Redeeming an invite: enforce the addressed email (if any), so a leaked
--     link addressed to alice@acme can't be redeemed by someone else. Also set
--     a transaction-local flag so the membership guard (3c) allows this insert
--     to grant an owner role when the invite legitimately does.
create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv          public.invitations;
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'must be authenticated'; end if;

  select * into inv from public.invitations where token = invite_token;
  if not found then raise exception 'invalid invitation'; end if;
  if inv.accepted_at is not null then raise exception 'invitation already used'; end if;
  if inv.expires_at < now() then raise exception 'invitation expired'; end if;
  if inv.email is not null and lower(inv.email) <> caller_email then
    raise exception 'this invitation is for a different email address';
  end if;

  -- Legitimised: this specific insert may grant the invite's role (incl. owner).
  perform set_config('app.bypass_owner_guard', '1', true);

  insert into public.memberships (organization_id, user_id, role)
  values (inv.organization_id, auth.uid(), inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.invitations
     set accepted_at = now(), accepted_by = auth.uid()
   where id = inv.id;

  return inv.organization_id;
end;
$$;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- 3b. Owner-role ceiling on invitation creation: an admin may invite members
--     and admins, but only an owner may mint an invite that grants ownership.
drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
  for insert with check (
    public.org_role(organization_id) in ('owner', 'admin')
    and invited_by = auth.uid()
    and (role <> 'owner' or public.org_role(organization_id) = 'owner')
  );

-- 3c. Membership invariants, enforced at the row level regardless of app path:
--       • only an existing owner may grant the owner role (admins can't
--         self-escalate someone to owner) — except the zero-owner bootstrap
--         and a legitimised accept_invitation (3a);
--       • an organization can never be left with zero owners (no demoting or
--         removing the last owner) — while still allowing org-cascade deletes.
create or replace function public.memberships_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_count int;
  bypass      text := current_setting('app.bypass_owner_guard', true);
begin
  -- Owner-role ceiling (on grant to owner only).
  if (tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.role is distinct from 'owner'))
     and new.role = 'owner'
     and coalesce(bypass, '') <> '1'
  then
    select count(*) into owner_count
      from public.memberships
      where organization_id = new.organization_id and role = 'owner';
    if owner_count >= 1 and coalesce(public.org_role(new.organization_id), '') <> 'owner' then
      raise exception 'only an owner can grant the owner role';
    end if;
  end if;

  -- Last-owner protection.
  if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner' then
    select count(*) into owner_count
      from public.memberships
      where organization_id = old.organization_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'an organization must keep at least one owner';
    end if;
  elsif tg_op = 'DELETE' and old.role = 'owner'
        and exists (select 1 from public.organizations where id = old.organization_id) then
    select count(*) into owner_count
      from public.memberships
      where organization_id = old.organization_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'an organization must keep at least one owner';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists memberships_guard_trg on public.memberships;
create trigger memberships_guard_trg
  before insert or update or delete on public.memberships
  for each row execute function public.memberships_guard();

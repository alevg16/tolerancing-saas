-- ============================================================================
-- Invitations — shareable, single-use links to join an organization.
-- Builds on 0001_init.sql (uses its is_org_member / org_role helpers).
-- ============================================================================

create table if not exists public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email           text,                       -- optional label; link works regardless
  role            text not null default 'member' check (role in ('owner', 'admin', 'member')),
  token           text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by      uuid references public.users (id) on delete set null,
  accepted_at     timestamptz,
  accepted_by     uuid references public.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '14 days')
);

create index if not exists invitations_org_idx   on public.invitations (organization_id);
create index if not exists invitations_token_idx on public.invitations (token);

alter table public.invitations enable row level security;

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
  for select using (public.is_org_member(organization_id));

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
  for insert with check (
    public.org_role(organization_id) in ('owner', 'admin')
    and invited_by = auth.uid()
  );

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
  for update using (public.org_role(organization_id) in ('owner', 'admin'))
  with check (public.org_role(organization_id) in ('owner', 'admin'));

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
  for delete using (public.org_role(organization_id) in ('owner', 'admin'));

-- Redeem a token and join the org. SECURITY DEFINER so a not-yet-member can run it.
create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations;
begin
  if auth.uid() is null then raise exception 'must be authenticated'; end if;

  select * into inv from public.invitations where token = invite_token;
  if not found then raise exception 'invalid invitation'; end if;
  if inv.accepted_at is not null then raise exception 'invitation already used'; end if;
  if inv.expires_at < now() then raise exception 'invitation expired'; end if;

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

-- Preview an invite (workspace name + role) before joining, without membership.
create or replace function public.invitation_preview(invite_token text)
returns table (organization_name text, role text, valid boolean)
language sql
security definer
set search_path = public
as $$
  select o.name, i.role,
         (i.accepted_at is null and i.expires_at > now()) as valid
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = invite_token;
$$;
revoke all on function public.invitation_preview(text) from public, anon;
grant execute on function public.invitation_preview(text) to authenticated;

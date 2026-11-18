# Supabase backend — Tolerancing SaaS

Multi-tenant schema (org-rooted) + Row-Level Security for the Phase 1 spine.

## What's here

```
supabase/
  migrations/
    0001_init.sql         tables, indexes, helper fns, updated_at triggers,
                          signup auto-provisioning (org-of-one + owner + free sub),
                          RLS policies
    0002_invitations.sql  invitations table + RLS, accept_invitation /
                          invitation_preview RPCs
    0003_module_tiers.sql module_tiers overrides (which modules are free vs pro)
    0004_hardening.sql    Stripe webhook idempotency ledger, report-settings
                          singleton index, teams security (invite email match,
                          owner-role ceiling, last-owner protection)
  seed.sql                (empty — rows are auto-provisioned on signup)
```

Apply in order (`0001` → `0004`). `0004` is idempotent and safe to run on a
project that already has `0001`–`0003`.

## Applying migrations

- **Supabase Dashboard → SQL Editor**: paste each file in order and run.
- **Supabase CLI**: `supabase db push` (or `supabase db reset` locally, which
  re-runs every migration then `seed.sql`).

## Ownership model

The root of ownership is the **organization** — a solo user is an org of one,
never user-owned, to avoid painful migrations later. Every row carries an
`organization_id`, and RLS restricts reads/writes to members of that org via the
`is_org_member()` / `org_role()` SECURITY DEFINER helpers.

`subscriptions` and `stripe_events` have **no client write policy** — only the
service role (the Stripe webhook) may mutate them. Features are gated
server-side from the synced subscription state, never trusted from the client.

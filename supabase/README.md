# Supabase backend — Tolerancing SaaS

Multi-tenant schema (org-rooted) + Row-Level Security for the Phase 1 spine.

## What's here

```
supabase/
  migrations/
    20260619090000_init_schema.sql        tables, indexes, updated_at triggers
    20260619090100_rls_and_policies.sql   helper fns, auto-provisioning, RLS policies
  seed.sql                                 (empty — rows are auto-provisioned on signup)
```

## Tables

| table           | purpose                                              | tenant key        |
|-----------------|------------------------------------------------------|-------------------|
| `organizations` | ownership root (a solo user is an org of one)        | `id`              |
| `users`         | profile, 1:1 with `auth.users`                        | via `memberships` |
| `memberships`   | user ↔ org + role (`owner`/`admin`/`member`)          | `organization_id` |
| `projects`      | saved analyses; inputs/results in `data` JSONB        | `organization_id` |
| `library_items` | shared company standards library                      | `organization_id` |
| `subscriptions` | Stripe-synced billing state (one per org)             | `organization_id` |

`module_type` (projects) and `type` (library_items) are free text so new
calculator modules need **no migration** — payloads go in the JSONB `data` column.

`invitations` and `project_revisions` from CLAUDE.md are deferred ("Later") and
not created yet.

## The RLS model

Every tenant table enforces: **you can touch a row only if you're a member of its
`organization_id`.** Membership is checked through SECURITY DEFINER helpers
(`is_org_member`, `has_org_role`, `shares_org`) which bypass RLS — this avoids the
classic infinite-recursion footgun where a policy on `memberships` queries
`memberships`.

- **Reads/writes** on `projects` & `library_items`: any org member.
- **Roster** (`memberships`) and **org** updates: `owner`/`admin` only; delete org: `owner`.
- **`subscriptions`**: members can read; there is **no write policy**, so the Stripe
  webhook must write with the `service_role` key (which bypasses RLS). Never trust the
  client for billing state.

### Provisioning on signup
`handle_new_user()` fires on `auth.users` insert and creates: the profile row, an
org-of-one, and an `owner` membership. To create additional orgs from the app, call
the RPC:

```ts
const { data: orgId } = await supabase.rpc('create_organization', { org_name: 'Acme' })
```

## Apply the migrations

This repo has no Supabase project linked yet and the CLI isn't installed here, so do
the setup step on your own machine:

```bash
# 1. install the CLI (pick one)
npm i -g supabase            # or: scoop install supabase / brew install supabase

# 2. from the project root that contains this supabase/ folder
supabase init                # generates config.toml if you don't have one
                             # (keep this migrations/ folder)

# --- local (Docker) ---
supabase start
supabase db reset            # applies both migrations + seed.sql

# --- or push to a hosted project ---
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

No CLI? Open the Supabase dashboard → **SQL Editor** and run the two migration files
in filename order (`…090000` then `…090100`).

## Smoke-testing RLS

After creating two users in two different orgs, confirm isolation — e.g. sign in as
user A and select projects; you must see only org A's rows. With the `service_role`
key (server-side only) RLS is bypassed by design.

# CLAUDE.md — Tolerancing SaaS

## Project overview
Web-based SaaS: a suite of engineering tolerance-analysis tools for mechanical engineers and teams.
- **Free calculators** = top-of-funnel hook (commodity, e.g. hole/shaft fit).
- **Paid core** = stacked-tolerance / assembly / tolerance-allocation analysis, with saved projects, a shared company standards library, and branded report export.
- **Customer**: mechanical / precision engineering teams (B2B). Tiers: Free / Pro / Team / Business.
- **Goal**: ~CHF 500–1,500/mo MRR in year 1 (validation); ~6–8k/mo over 3 years = a sellable asset.

## Current state
Working calculators (frontend, currently stateless — no accounts/persistence yet):
- ISO 286 hole/shaft fit calculator (named-fit dropdown clearance→interference, shaft a→u, hole D→U, tolerance-zone diagram, cross-section pictogram).
- Linear stack / gap module (worst-case / RSS / Monte Carlo; yield prediction: Cpk / PPM / % yield).
- Bolt-torque calculator (VDI 2230; friction breakdown, preload utilization, property-class lookup).
- Thread tolerances: **NOT built** — deferred pending ISO 965 verification.

## Phase 1 goal (now)
Build the SaaS **spine** around the 2–3 strongest modules. **Do NOT add new calculator modules until the spine ships and customers pay.**
1. Auth (accounts) — via Backend-as-a-Service, never hand-rolled.
2. Saved projects (persistence).
3. Teams + shared company standards library.
4. Branded PDF / report export.
5. Stripe billing + freemium gating.

## Architecture
- **One stack-math engine, multiple use-case front-ends.** Do not reimplement the math per module.
- **Frontend**: [FILL IN — your existing calculator UI, e.g. React].
- **Backend**: Supabase (Postgres + Auth + Storage + Row-Level Security) recommended; Firebase is the alternative.
- **Billing**: Stripe — Checkout (subscriptions) + Customer Portal (self-serve) + webhooks (sync subscription state). Gate features server-side from the synced state; never trust the client.
- **Module payloads**: store analysis inputs/results as **JSONB** so new modules need no schema change.

## Data model (authoritative — set up before real data)
Ownership root = **organization** (a solo user is an org of one — never user-owned, to avoid painful migrations).
- **organizations**: id, name, created_at
- **users**: id, email, name, created_at  *(profile keyed to the auth provider's user)*
- **memberships**: id, organization_id→organizations, user_id→users, role (owner/admin/member), created_at
- **projects**: id, organization_id→organizations, created_by→users, name, module_type (hole_shaft_fit / linear_stack / allocation / press_fit / …), data (JSONB), created_at, updated_at, deleted_at *(soft delete)*
- **library_items**: id, organization_id→organizations, type (fit_preset / process_capability / material / tolerance_default / part / …), name, data (JSONB), created_by, created_at, updated_at
- **subscriptions**: id, organization_id→organizations, stripe_customer_id, stripe_subscription_id, plan (free/pro/team/business), status (active/past_due/canceled), seats, current_period_end, updated_at
- Later: **invitations** (org, email, role, token, expires_at); **project_revisions** (project_id, snapshot JSONB, created_by, created_at)
- **Enforce Row-Level Security**: a user can only read/write rows whose organization_id they belong to.

## Non-negotiable principles
- **Accuracy is the moat.** Verify engineering values against the standard (ISO 286, ISO 965, VDI 2230). Never present unverified/estimated values as authoritative — flag estimates (amber "estimate — verify vs ISO 286-2" badge) or route through manual entry. Interference fits (p/s/r) and very-loose (c) use verified table data / manual entry.
- **Spine before breadth.** No new calculator modules until the spine ships and customers pay.
- **Charge from day one.**
- **Org-rooted ownership + Row-Level Security** for multi-tenancy.

## Constraints
- Solo developer; ~15–20h/week build phase, ~2–3h/week ongoing target.
- Swiss-based: employer Nebenbeschäftigung approval required before any commercial launch.
- Non-compete: nothing touching vacuum/semiconductor valves.
- Clean IP: all code written on own time/equipment, outside employer scope.

## Conventions
- [FILL IN — language, framework, formatting, test approach. Or run `/init` to let Claude Code detect and expand this section.]

## Backend status (Supabase) — DONE
The data model above is live in Supabase. See `supabase/` for the migrations:
- `migrations/…_init_schema.sql` — the 6 tables, indexes, updated_at triggers.
- `migrations/…_rls_and_policies.sql` — RLS helpers, signup auto-provisioning, per-table policies.
- `supabase/README.md` — how to apply and smoke-test.
RLS rule enforced everywhere: a user may read/write a row only if they belong (via `memberships`) to that row's `organization_id`. A new signup auto-gets a profile + an org-of-one + an `owner` membership.

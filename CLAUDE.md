# CLAUDE.md — Tolerancing SaaS

## Project overview
Web-based SaaS: a suite of engineering tolerance-analysis tools for mechanical engineers and teams.
- **Free calculators** = top-of-funnel hook (commodity, e.g. hole/shaft fit).
- **Paid core** = stacked-tolerance / assembly / tolerance-allocation analysis, with saved projects, a shared company standards library, and branded report export.
- **Customer**: mechanical / precision engineering teams (B2B). Tiers: Free / Pro / Team / Business.
- **Goal**: ~CHF 500–1,500/mo MRR in year 1 (validation); ~6–8k/mo over 3 years = a sellable asset.

## Current state
Working calculators (single-file React components, ported in as client components under `src/components/calculators/`):
- ISO 286 hole/shaft fit calculator (named-fit dropdown clearance→interference, shaft a→u, hole D→U, tolerance-zone diagram, cross-section pictogram).
- Linear stack / gap module (worst-case / RSS / Monte Carlo; yield prediction: Cpk / PPM / % yield).
- Bolt-torque calculator (VDI 2230; friction breakdown, preload utilization, property-class lookup).
- Thread tolerances (ISO 965): present, but tolerance **grades are formula estimates** — flagged in-UI as "verify vs ISO 965-1". Still needs table verification before being treated as authoritative.

**Spine (Phase 1) — scaffolded:** Next.js app, Supabase auth, org-rooted data model + RLS, and saved projects (persistence) are in place. The linear-stack module persists end-to-end (create → edit → save → reopen). Teams UI, PDF export and Stripe billing are not built yet.

## Phase 1 goal (now)
Build the SaaS **spine** around the 2–3 strongest modules. **Do NOT add new calculator modules until the spine ships and customers pay.**
1. Auth (accounts) — via Backend-as-a-Service, never hand-rolled. ✅ Supabase
2. Saved projects (persistence). ✅ projects table + workspace (linear-stack wired)
3. Teams + shared company standards library. ◻️ data model ready (memberships, library_items); UI pending
4. Branded PDF / report export. ◻️ (calculators have a print-to-PDF button as a stopgap)
5. Stripe billing + freemium gating. ◻️ subscriptions table + RLS ready; webhook/checkout pending

## Architecture
- **One stack-math engine, multiple use-case front-ends.** Do not reimplement the math per module.
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript. Calculators are self-contained client components using inline styles (no CSS framework); shared palette in `src/lib/design/tokens.ts`.
- **Backend**: Supabase (Postgres + Auth + Storage + Row-Level Security). Auth via `@supabase/ssr` (browser + server clients; session refreshed in `src/proxy.ts` — Next 16 renamed Middleware → Proxy).
- **Billing**: Stripe — Checkout (subscriptions) + Customer Portal (self-serve) + webhooks (sync subscription state). Gate features server-side from the synced state; never trust the client.
- **Module payloads**: store analysis inputs/results as **JSONB** (`projects.data`) so new modules need no schema change.

## Data model (authoritative — set up before real data)
Ownership root = **organization** (a solo user is an org of one — never user-owned, to avoid painful migrations).
- **organizations**: id, name, created_at
- **users**: id, email, name, created_at  *(profile keyed to the auth provider's user)*
- **memberships**: id, organization_id→organizations, user_id→users, role (owner/admin/member), created_at
- **projects**: id, organization_id→organizations, created_by→users, name, module_type (hole_shaft_fit / thread_fit / bolt_torque / linear_stack / …), data (JSONB), created_at, updated_at, deleted_at *(soft delete)*
- **library_items**: id, organization_id→organizations, type (fit_preset / process_capability / material / tolerance_default / part / …), name, data (JSONB), created_by, created_at, updated_at
- **subscriptions**: id, organization_id→organizations, stripe_customer_id, stripe_subscription_id, plan (free/pro/team/business), status (active/past_due/canceled), seats, current_period_end, updated_at
- Later: **invitations** (org, email, role, token, expires_at); **project_revisions** (project_id, snapshot JSONB, created_by, created_at)
- **Enforce Row-Level Security**: a user can only read/write rows whose organization_id they belong to.

The schema lives in `supabase/migrations/0001_init.sql` (tables, indexes, RLS policies, a signup trigger that provisions org-of-one + owner membership + free subscription). `subscriptions` has **no client write policy** — only the service role (Stripe webhook) may mutate it.

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

## Repo & dev
- `npm run dev` — local dev server. Needs a `.env.local` (see `.env.example`); placeholders boot the app but auth/persistence need a real Supabase project + the migration applied.
- `npm run build` / `npm run lint`.
- Layout: `src/app` (routes — `(app)` is the authenticated group), `src/components` (calculators, app shell, project workspace), `src/lib` (supabase clients, auth DAL, data layer, types, modules registry, design tokens), `supabase/migrations`.

## Conventions
- **Language**: TypeScript for app/spine code; the ported calculators stay `.jsx` (untouched math) and are not strict-typed.
- **Auth**: never hand-roll. All auth via Supabase; server-side checks via the DAL (`src/lib/auth/dal.ts`) + RLS. Treat Server Actions / Route Handlers like public endpoints — re-check auth.
- **Data access**: go through `src/lib/data/*` (server-only) so RLS is always in force; never expose the service-role key to the client.
- **Money/limits**: gate server-side from synced subscription state; never trust the client.
- **Next 16**: Middleware is `proxy.ts`; `cookies()` and route `params`/`searchParams` are async (await them).

@AGENTS.md

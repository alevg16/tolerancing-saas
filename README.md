# Tolerancing SaaS

Engineering tolerance-analysis tools for mechanical teams — ISO 286 fits, tolerance
stack-up (worst-case / RSS / Monte Carlo), ISO 965 thread fits and VDI 2230 bolt
torque — wrapped in a multi-tenant SaaS spine (accounts, organizations, saved
projects) on **Next.js 16 + Supabase**.

See [`CLAUDE.md`](./CLAUDE.md) for product context and the authoritative data model.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Supabase** — Postgres + Auth + Row-Level Security (`@supabase/ssr`)
- Calculators: self-contained React components (inline styles, `recharts`, `lucide-react`)

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project & apply the schema

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
   This creates the tables, Row-Level Security policies, and a signup trigger
   that provisions an **organization-of-one + owner membership + free
   subscription** for every new user.
3. (Optional, for the smoothest local flow) **Authentication → Providers → Email**:
   turn **off** "Confirm email" so sign-up logs you straight in. Otherwise you'll
   get a confirmation email and return through `/auth/callback`.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
**Project Settings → API**. (`.env.local` ships with harmless placeholders so the
app boots, but auth/persistence need real values.)

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

- `/` — public landing with the free ISO 286 fit calculator.
- `/login` — sign up / sign in.
- `/dashboard` — saved projects (create a **Linear Stack-Up** to see persistence end-to-end).
- `/tools` — all calculators in scratch mode.

## Project layout

```
src/
  app/
    page.tsx              landing (public, embeds the free fit tool)
    login/                auth pages
    auth/                 server actions + OAuth/confirmation callback
    (app)/                authenticated group (shell + nav)
      dashboard/          projects list + create/delete
      projects/[id]/      project workspace (save/load)
      tools/[slug]/       scratch calculators
  components/
    calculators/          the 4 ported tools + registry
    projects/             ProjectWorkspace (save bar)
    app/                  AppShell, nav, sign-out
    auth/                 LoginForm
  lib/
    supabase/             browser + server clients, proxy session refresh
    auth/dal.ts           who-is-this-request (cached) + requireUser/org
    data/projects.ts      server-only project persistence (RLS-enforced)
    modules.ts            calculator registry (slug ↔ module_type)
    types.ts              DB row types
    design/tokens.ts      shared palette/fonts
  proxy.ts                Next 16 "Proxy" (was Middleware): session + route guard
supabase/migrations/      database schema + RLS
```

## Security model

- Every table has **Row-Level Security**; a user can only touch rows in
  organizations they belong to. Server reads go through `src/lib/data/*` using the
  user's session, so RLS is always in force.
- `subscriptions` has **no client write policy** — only the Supabase service role
  (the future Stripe webhook) can change a plan. Never expose the service-role key
  to the client; gate paid features server-side from the synced state.

## Roadmap (Phase 1 spine)

- [x] Auth (Supabase)
- [x] Saved projects (persistence) — linear-stack wired end-to-end
- [ ] Teams + shared standards library (data model ready)
- [ ] Branded PDF / report export
- [ ] Stripe billing + freemium gating (subscriptions table ready)

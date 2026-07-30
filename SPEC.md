# Funded — SPEC

Household bills/goals budgeting app. React/Next.js on Vercel, Supabase backend.

This spec was seeded by folding the 3 currently-open GitHub issues into vertical
slices, rather than writing a retroactive CRD for an app that already exists.
A CRD interview is only needed for *new* future feature ideas, layered on top
of this spec.

---

## Part A — Technical Guardrails

Part A is split into two sections, and the split is load-bearing:

* **A1 — Locked invariants** are **escalation gates**. A change touching one is
  a mandatory stop-and-ask under liaison protocol Step 3. A sub-agent does not
  decide these alone.
* **A2 — Standing rules** are binding on how code gets written, but there is no
  decision for the user to make. A sub-agent follows them and proceeds without
  interrupting. Violating one is a defect, not an escalation.

If a rule is a genuine "should we?" question, it belongs in A1. If it is a
"here's how this codebase does it", it belongs in A2. Process steps belong in
`CLAUDE.md`, not here.

### A1 — Locked invariants (mandatory escalation)

* **RLS mandatory:** Every Postgres table must have Row Level Security policies.
  Established pattern — see `supabase/rls_policies.sql`,
  `supabase/secure_rls_policies.sql`, and the various `fix_*_rls*.sql`
  migrations. Any new table ships with RLS from the start; no exceptions.
  (Largely subsumed by the migration escalation trigger — a new table implies a
  migration — but stated explicitly because the consequence is data exposure.)
* **Service-role key is server-only.** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS
  entirely. Its only current use is the cron route
  (`src/app/api/cron/push-reminders/route.ts:37`). Any new use, or any code path
  that reads it outside a server-side route, requires approval first. If it
  reaches client code, every user gets full read/write on the database. Highest
  consequence rule in this spec.
* **Amounts must be normalised via `convertAmount` before comparison**
  (`src/lib/utils.ts:225`). Weekly, fortnightly and monthly frequencies coexist
  throughout the app. Comparing or summing raw amounts across frequencies
  produces silently wrong money — the figures still look plausible, so tests and
  eyeballing both miss it. Locked because the failure mode is incorrect money,
  undetected.
* **Stack changes:** adding, replacing or removing a **core dependency or
  framework** requires approval. Working within the existing stack does not.
  Current stack:
  * Next.js 16 (App Router, `src/app/*`), React 19, TypeScript, Tailwind CSS 4.
  * Supabase (`@supabase/supabase-js`, `@supabase/ssr`) for auth + Postgres.
    Client wrapper lives at `src/lib/supabase.ts`.
  * PWA with a hand-written service worker at `public/sw.js` (not
    next-pwa/Workbox-generated) plus Web Push (`web-push`, `src/lib/pushClient.ts`).
  * Supabase Edge Functions for some server-side logic (e.g.
    `supabase/functions/join-household`).
  * Migrations live in `supabase/migrations/` as timestamped SQL files — schema
    changes follow that convention rather than editing `supabase/schema.sql`
    directly.
* **Branching — absolute prohibition, not a gate:** never commit directly to
  `main`; work on milestone branches. Issue closure triggers merge. There is no
  version of this to approve, so it is listed here as forbidden rather than as a
  stop-and-ask.

### A2 — Standing rules (follow, do not escalate)

* **All date parsing goes through `parseBillDate`** (`src/lib/utils.ts:18`).
  `new Date("2026-07-30")` parses as **UTC midnight**, which is the previous day
  in Sydney — raw parsing puts every bill due-date comparison off by one.
  Server-side "what day is it" logic uses `todayInZone`
  (`src/lib/notifications/timezone.ts:8`) instead. Fails silently when broken.
* **`cacheComponents: true`** (`next.config.ts:4`). This is why route handlers
  cannot use `export const runtime` — see the explanatory comment at
  `src/app/api/cron/push-reminders/route.ts:7`. Note-level rather than locked
  because it surfaces as a build error, not a silent bug: an agent that gets it
  wrong finds out immediately.
* **Notification dismissal is mark-as-read, never delete**
  (`src/context/AppContext.tsx:2864`). The row must survive so its `dedupe_key`
  persists; otherwise both reminder generators resurrect dismissed reminders.
  Do not "tidy" this into a real delete.
* **The `isDataLoading` gate is centralised in `AppShell` — do not add
  per-component gates.** `src/components/AppShell.tsx:176` withholds *all*
  children while `session && isDataLoading`, so a component-level
  `if (isDataLoading)` guard inside a page or card is unreachable dead code. The
  rule for new dashboard content is therefore: rely on the AppShell gate, and if
  a derived value still renders against empty state, the defect is in the gate's
  inputs, not in the component.
  First corollary: **any state the gate depends on must be initialised
  pessimistically.** `isDataLoading` is `useState(true)` and must stay that way.
  `<AppProvider>` is mounted with **no props** (`src/app/layout.tsx:104` —
  server-side session prefetch was removed deliberately for #47, because reading
  `cookies()` in the root layout forces the whole app dynamic under
  `cacheComponents`), and every data array initialises to `[]`. So "data is
  already loaded" is never a legitimate starting assumption, and any initialiser
  that can evaluate `false` opens the gate against empty state.

  Second corollary: **an open gate is not the only way a computed display sees
  empty state.** A warm reload deliberately does not raise `isDataLoading`
  (`src/context/AppContext.tsx:796`) so the wheel doesn't flash over a working
  app on every token refresh — which means the gate is open for the whole
  reload. Writes during that window must not transiently empty loaded state.
  `if (res.data)` is not sufficient: `[]` is truthy, and a successful RLS query
  with no token applied returns zero rows and no error. See issue #74.

  **The canary:** empty state computes to exactly **85** in
  `calculateHealthScore` (`src/lib/utils.ts:88`) —
  `(100 × 0.4) + (50 × 0.3) + (100 × 0.3)` — which clears the `>= 80` threshold
  in `src/components/HealthScoreCard.tsx:34`. So an unexplained "Fully Funded"
  is a reliable symptom that something has handed the dashboard empty arrays.
  Two separate mechanisms have produced it; treat it as a signal to look at
  loading state, not at the scoring formula.
* **Layout — fixed-position/overflow:** never nest a `position: fixed` element
  inside a container with `overflow: hidden`. Breaks on iOS Safari in particular.
  Note-level rather than locked because this class of change carries
  `needs-manual-test` and reaches the user on-device before merge anyway.
* **Next.js viewport API:** use the official `export const viewport: Viewport`
  export for viewport/theme-color config. Never hand-roll `<meta name="viewport">`
  or theme-color meta tags in `layout.tsx`.
* **Mobile-first, PWA-installed context:** primary usage is an installed PWA on
  mobile (iOS Safari + Android Chromium). Design mobile-first; use
  safe-area-inset padding for anything docked to a screen edge; verify touch
  targets and layout at common mobile widths before desktop. A design principle,
  not a gate — there is nothing here to approve.
* **Versioning discipline:** the in-app display version (hardcoded string,
  bottom of the Settings screen) is the source of truth — `package.json`'s
  `version` field is unused npm-tooling metadata and does not need to track it.
  Default bump is `+0.0.1` per preview build. Confirming the exact number before
  merge is a process step owned by `CLAUDE.md` §4, not an escalation trigger.

---

## Part B — Vertical Slices

### Slice 1: PWA cache-busting on deploy (Issue #71)

**Problem:** Installed PWA installs serve a stale cached app after a new
deploy — the service worker cache never busts. Root cause confirmed:
`public/sw.js` hardcodes `CACHE_NAME = 'funded-pwa-cache-v3'`; the `activate`
handler only purges old caches when that string changes, and it hasn't across
many deploys. Calling `reg.update()` in `layout.tsx` doesn't help because the
`sw.js` bytes (and thus the cache name) are static between deploys.

**Goal:** Users on an installed PWA get the current app after a deploy,
without manual cache-clearing.

**Acceptance criteria:**
- After a deploy, an already-installed PWA picks up the new app shell/assets
  without the user needing to uninstall/reinstall or manually clear the cache.
- Old caches from previous deploys are actually purged (no unbounded cache
  growth).
- Offline fallback (`/offline`) still works as before.

**Open questions (not yet decided — flag for user):**
- Exact cache-busting mechanism: bump `CACHE_NAME` per deploy using a build ID
  or commit hash, vs. switching the app shell to network-first or
  stale-while-revalidate instead of cache-first. These are the two directions
  suggested in the issue; neither is chosen yet.
- Offline behavior tradeoff: a more network-first strategy improves freshness
  but weakens offline guarantees. Needs an explicit decision on how much
  offline support matters here.

**Testing:** Service worker lifecycle behaves differently on iOS/WebKit vs.
Android/Chromium (install prompts, update timing, cache eviction). This is
platform-sensitive — label **`needs-manual-test`**, not
`needs-merge-approval`.

---

### Slice 2: Category order defaults + persistence + Goals rename (Issue #70)

**Problem:** Three related sub-scopes bundled in one issue (low priority,
currently `needs-triage` + `needs-info`):

1. **New default category orders.** Bills and Goals category lists need new
   hardcoded default orders (specific orders given in the issue — pull from
   #70 at implementation time rather than re-deriving them here).
2. **Move persistence off localStorage.** Category order is currently
   persisted client-side only, in `localStorage` under `billCategoryOrder`
   (in `src/app/bills/bills-client.tsx`) and `goalCategoryOrder` (in
   `src/app/funds/funds-client.tsx`). This needs to move to a new
   `user_preferences` table: `user_id` (PK), `bill_category_order` (jsonb),
   `goal_category_order` (jsonb), with per-user RLS. A one-time migration
   needs to backfill existing users' localStorage values into the table
   (client-side migration-on-read, most likely, since the server can't see
   localStorage).
3. **Rename Goals category.** `Short-Term` → `Wish List`, including a data
   migration for existing goals already tagged `Short-Term`.

**Acceptance criteria:**
- New Bills/Goals default orders match what's specified in #70, for
  users with no saved preference.
- Category order persists server-side in `user_preferences`, correctly
  scoped by RLS so users only see/edit their own row.
- Existing localStorage-based orders are migrated once, not silently
  discarded.
- `Short-Term` no longer appears anywhere in the Goals UI; existing goals
  previously categorized `Short-Term` show up under `Wish List` post-migration.

**Resolved (2026-07-25):**
- Goals default order confirmed as:
  `Home & Living → Vacation & Travel → Wish List → Education → Debt & Finance
  → Savings → Emergency → Other`.
- `Short-Term` → `Wish List` rename stays in scope for this ticket (bundled
  with the persistence migration, not split out).

**Testing:** This is mostly a data/migration-correctness slice (new table,
RLS, one-time backfill, rename migration) with only a light UI touch on the
reorder modal. Pipeline-verifiable in the main — label
**`needs-merge-approval`** with a light manual spot-check of the reorder UI,
rather than a full `needs-manual-test` cycle.

---

### Slice 3: Per-household timezone settings screen (Issue #37)

**Problem:** Follow-up to closed issue #34, which added a `households.timezone`
column (default `Australia/Sydney`) already consumed by the daily push-reminder
cron via `todayInZone()` in `src/lib/notifications/timezone.ts`. There is
currently no UI for a household to view or change that value — it can only be
set at the DB level.

**Goal:** A Settings screen where a household can view and change its
timezone, which the existing cron then just picks up (no cron code changes
needed — it already reads the column).

**Acceptance criteria:**
- Settings UI shows the household's current timezone.
- User can change it via a searchable IANA timezone dropdown/picker.
- Save writes to `households.timezone`, respecting existing RLS (no policy
  changes anticipated — flag if implementation finds otherwise, since that
  would trip the Part A RLS guardrail).
- Only valid IANA zone values are accepted (must be valid input to
  `Intl.DateTimeFormat`).
- Fallback stays `Australia/Sydney` if unset, matching #34's existing default.
- No changes required to the cron/notification code path itself.

**Open questions (flag for user decision):**
- Who is allowed to change the household timezone — any household member, or
  admin-only? Not specified in the issue.

**Testing:** The timezone picker is UI-heavy (searchable dropdown, likely
needs safe-area/layout care on mobile) — label **`needs-manual-test`**.

---

## Part C — Suggested Milestone Order (for confirmation, not final)

Proposed order, open to the user's call:

1. **Slice 1 (Issue #71) first.** It's a live bug affecting anyone with the
   app already installed — highest user-facing risk of the three, and it's
   self-contained (touches only `sw.js` + layout registration code, no schema
   work). Recommend resolving the open "cache strategy vs. offline tradeoff"
   question with the user before or at kickoff, since it changes the
   implementation shape.
2. **Slice 3 (Issue #37) second.** Small, well-scoped, no blocking unknowns
   except the admin-vs-any-member permission question, which is a quick
   decision rather than a design problem. Independent of the other two
   slices — can be reordered freely.
3. **Slice 2 (Issue #70) last.** Lowest priority per the issue itself, and it
   has two open `needs-info` questions that should be resolved with the user
   before work starts (the `Debt & Finance` ordering gap and whether the
   rename is in-scope). Also the most structurally involved of the three
   (new table + RLS + two migrations), so worth sequencing after the other
   two are out of the way.

Slices 1 and 3 have no dependency on each other or on Slice 2, so 1↔3 order
could flip without cost. Slice 2 is blocked on `needs-info` answers regardless
of where it sits in the queue.

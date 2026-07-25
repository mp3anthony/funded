# Funded — SPEC

Household bills/goals budgeting app. React/Next.js on Vercel, Supabase backend.

This spec was seeded by folding the 3 currently-open GitHub issues into vertical
slices, rather than writing a retroactive CRD for an app that already exists.
A CRD interview is only needed for *new* future feature ideas, layered on top
of this spec.

---

## Part A — Technical Guardrails (Locked Invariants)

These are binding constraints. Per the liaison protocol, any change touching
one of these is a mandatory escalation trigger, not something a sub-agent
decides on its own.

* **RLS mandatory:** Every Postgres table must have Row Level Security policies.
  This is already the established pattern in this repo — see
  `supabase/rls_policies.sql`, `supabase/secure_rls_policies.sql`, and the
  various `fix_*_rls*.sql` migrations. Any new table ships with RLS from the
  start; no exceptions.
* **Next.js viewport API:** Use the official `export const viewport: Viewport`
  export for viewport/theme-color config. Never hand-roll `<meta name="viewport">`
  or theme-color meta tags in `layout.tsx`.
* **Layout — fixed-position/overflow:** Never nest a `position: fixed` element
  inside a container with `overflow: hidden`. (Breaks on iOS Safari in
  particular.)
* **Mobile-first, PWA-installed context:** Primary usage is an installed PWA
  on mobile (iOS Safari + Android Chromium). Design mobile-first; use
  safe-area-inset padding for anything docked to a screen edge; verify touch
  targets and layout at common mobile widths before desktop.
* **Versioning discipline:** The in-app display version (hardcoded string,
  bottom of the Settings screen) is the source of truth — `package.json`'s
  `version` field is unused npm-tooling metadata and does not need to track
  it. Default bump is `+0.0.1` per preview build. The exact version number is
  confirmed with the user immediately before merging — never merged silently.
* **Stack (observed, not to be casually changed):**
  * Next.js 16 (App Router, `src/app/*`), React 19, TypeScript, Tailwind CSS 4.
  * Supabase (`@supabase/supabase-js`, `@supabase/ssr`) for auth + Postgres.
    Client wrapper lives at `src/lib/supabase.ts`.
  * PWA with a hand-written service worker at `public/sw.js` (not
    next-pwa/Workbox-generated) plus Web Push (`web-push`, `src/lib/pushClient.ts`).
  * Supabase Edge Functions exist for some server-side logic (e.g.
    `supabase/functions/join-household`).
  * Migrations live in `supabase/migrations/` as timestamped SQL files —
    schema changes should follow that convention rather than editing
    `supabase/schema.sql` directly.
* **Branching:** Never commit directly to `main`; work on milestone branches.
  Issue closure triggers merge. (Restated from the liaison protocol, since it's
  a hard invariant in practice, not just a process note.)

Open item for the user to confirm: this list was assembled by reading the old
`CLAUDE.md` plus a skim of `package.json`, `src/`, and `supabase/`. It's
probably not exhaustive — flag anything else that should be locked here.

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

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
  (`src/context/AppContext.tsx:3503-3510`). The row must survive so its `dedupe_key`
  persists; otherwise both reminder generators resurrect dismissed reminders.
  Do not "tidy" this into a real delete.
* **The `isDataLoading` gate is centralised in `AppShell` — do not add
  per-component gates.** `src/components/AppShell.tsx:182` withholds *all*
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
  (`src/context/AppContext.tsx:838-850`) so the wheel doesn't flash over a working
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

*Rewritten 2026-09-02 in a full triage pass — every open GitHub issue folded
into a slice below, decisions recorded in each issue's own comment thread.
Slices for #70 (closed) and the old undecided #71/#37 open questions have
been superseded/resolved. Part A is untouched.*

### Slice 1: Single-household-per-user enforcement (Issue #93)

**Problem:** `join-household` edge function doesn't enforce single-household
membership server-side — only a client-side guard exists (added at #75).
Blocked until now on the multi-household-vs-single-household schema question
deferred at #75's build time.

**Decision (2026-09-02):** One household per user, Anthony's explicit
sign-off, Part A schema-change escalation trigger cleared.

**Scope:**
- Add a `UNIQUE` constraint on `household_members.user_id` (deferred at #75,
  now unblocked).
- Add a real server-side "does this user already belong to any household"
  check in the `join-household` edge function, not just the existing
  client-side guard.

**Acceptance criteria:**
- A user who already belongs to a household cannot join a second one, even by
  calling the edge function directly (bypassing the client guard).
- The `UNIQUE` constraint makes a duplicate-membership row impossible at the
  DB level.
- Existing single-household users are unaffected; migration applies cleanly
  against current data (should be a no-op check — no user has ever had 2
  memberships, per #75's own investigation).

**Related:** #94 (recovery UI for an already-duplicated member) — closed,
folded into this. Once the `UNIQUE` constraint lands, that state becomes
literally impossible, so a recovery UI for it is speculative, not a safety
net.

**Testing:** Server-side logic + a migration, no new UI surface — fully
pipeline-verifiable. Label **`needs-merge-approval`**.

---

### Slice 2: Warm-reload empty-query race (Issue #74)

**Problem:** A warm reload (token refresh, tab refocus) can transiently
overwrite loaded `bills`/`funds`/`payHistory`/`members`/`billSplits` with `[]`
when a successful-but-empty RLS query races an auth token that hasn't been
applied yet. `AppShell`'s gate stays open during a warm reload (deliberately,
to avoid a full-screen loading wheel on every token refresh), so the
dashboard renders against the momentarily-empty state — the household health
rank flaps to 85/"Fully Funded" and then snaps back on the next successful
load.

**Decision (2026-09-02):** Option 4 from the issue — treat an empty
query-batch result as suspect only when the previous in-memory state was
non-empty, then re-fetch once to confirm before committing the overwrite.
Build this as a reusable helper (`AppContext.tsx`) since #89 needs the same
pattern.

**Acceptance criteria:** the issue's own acceptance criteria and testing
checklist stand as written — no change needed there. In short: no rank flap
across a warm reload with unchanged data, a genuine cross-device deletion is
still reflected, no new loading wheel introduced, and a genuinely empty
household still renders correctly.

**Testing:** Race-condition/timing bug — hard to fully pipeline-verify.
Label **`needs-manual-test`**, with the checklist already written into the
issue (throttled-connection refocus test is the one that most needs a human
device, not just DOM inspection).

---

### Slice 3: joinHousehold stale-members-snapshot (Issue #89)

**Problem:** `joinHousehold`'s cleanup step decides whether to cascade-delete
the old household based on a cached `members` React state snapshot
(`backupState.members`), which can be empty due to the same race class as
Slice 2 — silently skipping cleanup instead of erroring.

**Decision (2026-09-02):** Apply the same re-fetch-to-confirm helper built
for Slice 2, rather than re-deriving the pattern. **Sequence directly after
Slice 2.**

**Acceptance criteria:**
- Before deciding to skip/perform the old-household cleanup, the check is
  backed by a live DB read (via Slice 2's helper), not a possibly-stale
  cached snapshot.
- No behavior change for the common case (fresh, non-raced snapshot).

**Testing:** Same race-condition class as Slice 2 — label
**`needs-manual-test`** unless the shared helper's own test coverage from
Slice 2 is judged sufficient to downgrade this one to
`needs-merge-approval` (call at kickoff once Slice 2's helper shape is known).

---

### Slice 4: Cross-user notification write on same-tab switch (Issue #90)

**Problem:** The client-side notification-generation `useEffect` in
`AppContext.tsx` is gated on `session`, `notificationSettings`, and
`isDataLoading` — not `isOnboarded`. During a same-tab user-switch race, it
can fire with the new user's session but the old user's still-resident
household data, writing a notification row shaped like
`{ user_id: B, household_id: A }`. Data-hygiene only, no observed user-facing
symptom (RLS still gates what each client actually reads back).

**Decision (2026-09-02):** Fix now — add the missing `isOnboarded` gate to
the effect. Same class of same-tab hazard #75 already closed elsewhere in
this file.

**Acceptance criteria:** the effect does not fire until `isOnboarded` is
true for the current session, closing the window where stale household data
can be attributed to the wrong user.

**Testing:** Same-tab user-switch race — must be tested in a single tab
without reloading (a fresh load papers over this exact class of bug, per the
standing lesson from #75). Label **`needs-manual-test`**.

---

### Slice 5: Empty-household health score display (Issue #87)

**Problem:** A household with zero bills, zero goals, and zero contributions
computes to exactly 85/"Fully Funded" under the current scoring formula —
correct arithmetic, but a misleading message for a household that was never
set up, as opposed to one that's genuinely fully funded.

**Decision (2026-09-02):** Add a distinct "not set up yet" state. When bills
= 0 AND goals = 0 AND contributions = 0, override the numeric score display
with that message instead of computing/showing 85.

**Acceptance criteria:**
- A genuinely empty household (steady-state, fully loaded, no race involved)
  shows a "not set up yet" message, not "Fully Funded".
- A household with any bill, goal, or contribution set up computes and
  displays the real score as before.
- No change to the underlying `calculateHealthScore` formula or its use
  elsewhere — this is a display-layer override, not a scoring change.
- Kept independent of Slice 2/#73/#82 — those are loading-race bugs that
  transiently produce the same 85 value; this issue is the deliberate
  steady-state case only.

**Testing:** Pure UI/display logic, deterministic given input state — fully
pipeline-verifiable. Label **`needs-merge-approval`**.

---

### Slice 6: Remove dead HouseholdHealth.tsx (Issue #112)

**Problem:** `src/components/HouseholdHealth.tsx` exports a "Household
Health" card that is never imported anywhere in the app (confirmed by a
repo-wide grep during #110) — the live dashboard section with that name is
actually in `HealthScoreCard.tsx`. #95 previously fixed this dead file's data
source as if it were live, before the dead-code status was noticed.

**Decision (2026-09-02):** Delete it. Confirmed unused; no functional
change.

**Acceptance criteria:** file removed, no import references remain, `tsc`/
lint/build all clean with an identical or lower error/warning count vs. the
pre-change baseline.

**Testing:** Deletion of unreferenced code — fully pipeline-verifiable.
Label **`needs-merge-approval`**.

---

### Slice 7: PWA cache-busting on deploy (Issue #71)

**Problem:** Installed PWA installs serve a stale cached app after a new
deploy — the service worker cache never busts. Root cause confirmed:
`public/sw.js` hardcodes `CACHE_NAME = 'funded-pwa-cache-v3'`; the `activate`
handler only purges old caches when that string changes, and it hasn't across
many deploys. Calling `reg.update()` in `layout.tsx` doesn't help because the
`sw.js` bytes (and thus the cache name) are static between deploys.

**Decision (2026-09-02):** Both recommended directions, combined:
1. Inject the build/commit hash into `CACHE_NAME` so `activate` purges the
   old cache every release, instead of relying on a hand-bumped `v3` string.
2. Serve the app shell **stale-while-revalidate** for navigations (not
   network-first) — keeps offline working off the last-good cached version
   while still picking up new builds without a manual reinstall.

**Acceptance criteria:**
- After a deploy, an already-installed PWA picks up the new app shell/assets
  without the user needing to uninstall/reinstall or manually clear the cache.
- Old caches from previous deploys are actually purged (no unbounded cache
  growth).
- Offline fallback (`/offline`) still works as before; offline behavior is
  otherwise unchanged (stale-while-revalidate, not network-first, so a
  cached last-good version still serves offline).

**Testing:** Service worker lifecycle behaves differently on iOS/WebKit vs.
Android/Chromium (install prompts, update timing, cache eviction) —
platform-sensitive. Label **`needs-manual-test`**, using the checklist
already written into the issue.

---

### Slice 8: Per-household timezone settings screen (Issue #37)

**Problem:** Follow-up to closed issue #34, which added a `households.timezone`
column (default `Australia/Sydney`) already consumed by the daily push-reminder
cron via `todayInZone()` in `src/lib/notifications/timezone.ts`. There is
currently no UI for a household to view or change that value — it can only be
set at the DB level.

**Decision (2026-09-02):** Owner-only edit access — matches the existing
ownership-gated pattern used for leave/delete-household.

**Acceptance criteria:**
- Settings UI shows the household's current timezone to all members.
- Only the household owner can change it, via a searchable IANA timezone
  dropdown/picker; non-owners see it read-only.
- Save writes to `households.timezone`, respecting existing RLS (no policy
  changes anticipated — flag if implementation finds otherwise, since that
  would trip the Part A RLS guardrail).
- Only valid IANA zone values are accepted (must be valid input to
  `Intl.DateTimeFormat`).
- Fallback stays `Australia/Sydney` if unset, matching #34's existing default.
- No changes required to the cron/notification code path itself.

**Testing:** The timezone picker is UI-heavy (searchable dropdown, likely
needs safe-area/layout care on mobile), plus a permission boundary
(owner-vs-member) to verify in a single session without reloading. Label
**`needs-manual-test`**.

---

### Slice 9: Notifications overhaul — delivery time, new reminder types (Issue #97)

**Problem:** Was blocked on Slice 8's per-household-timezone decision.
Backed by two parallel research passes (this codebase's actual notification
system/schema, and how YNAB/Monarch/Copilot/Rocket Money/Simplifi/
EveryDollar/PocketGuard/Honeydue handle notification timing).

**Decision (2026-09-02, recorded in the issue):**
- **One time-of-day picker per user** ("notify me around X o'clock"),
  building on the existing per-user `notification_settings` table. No
  competitor app researched offers true time-of-day scheduling — a genuine
  differentiator, not parity work.
- **New reminder types in this ticket:** payday "log your pay", and
  goal/fund milestone reached.

**Acceptance criteria:**
- Each user can set their own preferred notify hour, independent of other
  household members (Honeydue's per-person-preference-on-a-shared-item
  pattern is the closest researched analog).
- Payday and milestone reminders fire through the existing reminder-generator
  path, respecting the existing dedupe/mark-as-read rules (Part A2).
- No regression to existing reminder types (manual-bill, auto-pay, lodge-
  payment).

**Depends on:** Slice 8 (per-household timezone) must land first — this
slice's per-user hour needs a resolved household timezone to compute an
actual send time against.

**Testing:** New settings UI (time picker) plus new server-side reminder
logic — mixed surface. Label **`needs-manual-test`** for the picker UI;
the reminder-generation logic itself is pipeline-verifiable via direct
Supabase checks, per the standard established at #101/#106.

---

### Slice 10: Push reliability — dead-subscription detection (Issue #96, half A)

**Problem:** The push-reminder cron silently has nothing to deliver when a
user never granted permission, or an existing subscription expired/was
invalidated (common on iOS) — no error, no visible signal that push isn't
actually working.

**Decision (2026-09-02):** Independent slice, no dependency on Slice 8/9.
Add a settings-page health indicator surfacing when push isn't working
(permission never granted, or an expired/invalidated subscription with no
live `push_subscriptions` row), with a re-prompt path.

**Acceptance criteria:**
- Settings screen shows a clear, non-alarming indicator when the current
  device has no live push subscription.
- A re-prompt action lets the user re-grant permission and re-register in
  one flow, without needing to reinstall the PWA.

**Testing:** Touches native permission APIs (`Notification.requestPermission`,
push subscription lifecycle) — platform-sensitive. Label
**`needs-manual-test`**.

---

### Slice 11: Push reliability — per-timezone hourly cron (Issue #96, half B)

**Problem:** The push-reminder cron is scheduled at a fixed UTC hour
(`vercel.json`, `0 20 * * *`), which only coincidentally lands at a
reasonable local time for Sydney households. There is no real per-household
or per-user schedule.

**Decision (2026-09-02):** Switch the cron from daily to hourly; each run
checks every household's current local hour (via `todayInZone`/the household
timezone from Slice 8) against each user's chosen notify hour (from Slice
9's time-of-day picker), sending only to matches.

**Depends on:** Slice 8 (household timezone) and Slice 9 (per-user notify
hour) — both must land first; this slice is the piece that makes them
actually affect delivery timing.

**Acceptance criteria:**
- Cron runs hourly, not daily (`vercel.json` schedule change).
- A household/user only receives a push when their local time matches their
  chosen notify hour, within the cron's hourly granularity.
- No duplicate sends within the same local-hour window (respects existing
  `dedupe_key` handling, Part A2).

**Testing:** Server-side scheduling logic, verifiable via direct
Supabase/log inspection across simulated timezones — pipeline-verifiable.
Label **`needs-merge-approval`**.

---

### Slice 12: Bills vs Expenses split (Issue #98)

**Problem:** Groceries/fuel are currently entered as bills purely as a
workaround so they count toward the weekly joint-account draw — there's no
real "expense" concept, and goal-contribution rules (e.g. "20% of surplus
into a goal") should also count toward that same draw. This is a schema
change — Part A escalation trigger, Anthony's sign-off recorded in the issue.

**Decisions (2026-09-02, recorded in the issue):**
- **Bill** = fixed/contractual/recurring. **Expense** = variable spend that
  still counts toward the weekly draw.
- **The weekly draw becomes bills + expenses + active goal-contribution
  rules**, not just bills — touches #106's contribution-calc logic directly.
- **Separate `expenses` table** (not a type-filter bolted onto `bills`) —
  avoids adding type-filters to every existing bills query.
- **Direct Pay expenses support both whole-item assignment AND %-split,
  chosen per expense** — new pattern; Direct Pay bills today only do
  whole-item assignment via `assignee_id`.
- Health score folds expenses into the existing budget-coverage half.
- #70's category ordering extends to expenses.
- **One-time migration script** moves existing groceries/fuel bill-rows into
  the new `expenses` table.

**This is the largest slice in this pass — recommend sub-slicing further at
kickoff** (e.g. schema + migration first, then add/edit UI, then Direct Pay
split logic, then weekly-draw calc integration, then health-score
integration) rather than building it as one PR, per Anthony's original
instruction not to build #98 as one large change.

**Acceptance criteria:** full detail recorded in the issue's decision
comment — pull from there at implementation/sub-slicing time rather than
re-deriving here.

**Testing:** Schema change + calc-logic change touching #106 — needs
disposable-test-household verification against hand-computed numbers, same
standard as #106. Likely split across `needs-manual-test` (new expense
add/edit UI, %-split picker) and `needs-merge-approval` (calc logic,
verifiable via direct Supabase query) depending on how it's sub-sliced.

---

### Slice 13: Dynamic visual/motion overhaul (Issues #99, #100)

**Problem:** Two research passes (this codebase's animation/token state, and
how YNAB/Monarch/Copilot/Rocket Money/Simplifi/EveryDollar/PocketGuard/
Honeydue handle motion) found a real installed-but-broken bug in scope:
`tailwindcss-animate` isn't installed, so the `animate-in`/`fade-in`/
`zoom-in` classes already used in 10 files — including the shared
`Dialog.tsx` modal shell used app-wide — are currently no-ops. Modals etc.
are popping in with zero animation today despite the code looking animated.

**Decisions (2026-09-02, recorded in the issue):**
- **Polish pass, not a structural design-system rebuild.** Whole app at
  once. Premium-minimal mood (Copilot Money as reference).
- Fixing the `tailwindcss-animate` install is in scope for whichever agent
  builds this.
- **#100 (dashboard overhaul) closed, folded in here** — no comparable app
  combines a swipeable carousel with a gauge for live stat tiles; keep the
  existing 4-tile grid, add number count-up/transition polish only (lowest-
  risk of the three options the research laid out).
- **Settings "App" section notification-row consolidation folded in here**
  (out-of-spec item, 2026-09-03, Anthony's explicit call to fold it into this
  slice rather than run it separately): `Notifications` (on/off toggle),
  `Notify me at` (delivery hour, #97), and `Push notifications` (device
  subscription status, #96) grew independently across two sessions and now
  read as three disconnected rows for what feels like one concern. Not a
  bug — an IA/grouping pass: consolidate into a clearer single entry point
  or visually group the three under one sub-heading, whichever the design
  pass lands on. No functional/behavioral change to any of the three
  underlying features (toggle, hour picker, re-enable flow) — presentation
  only.

**Recommendation:** the `tailwindcss-animate` install fix itself is cheap,
self-contained, and fixes an already-broken feature — worth pulling forward
as a quick preliminary fix ahead of the rest of this slice's full polish
pass, rather than bundling it into the same PR as the whole-app motion work.

**Acceptance criteria:** full detail in the issue's decision comment
(`research/issue-99-100-motion-dashboard-research.md` has the full research
writeup) — pull from there at implementation time.

**Testing:** Visual/motion changes across the whole app — inherently needs
hands-on device verification. Label **`needs-manual-test`**.

---

### Slice 14: Patch notes page (Issue #113)

**Problem (out-of-spec item, folded in per Anthony's high-priority flag):**
No in-app way for a user to see what changed between versions.

**Decision (2026-09-02):**
- A hidden in-app page, reachable from Settings, listing changes per version.
- A first-open-on-a-new-version popup pointing to what's new, deep-linking
  to the full page.
- **Per-version blurb text is hand-written per release** (a small structured
  file, e.g. `patch-notes.ts`, one short user-facing entry per version),
  written by whoever ships that release — kept separate from `HANDOFF.md`'s
  technical detail, since that's written for the Orchestrator, not end users.

**Acceptance criteria:**
- Settings has a link to a patch-notes page listing every recorded version's
  user-facing blurb, newest first.
- On first load after a version bump, a popup surfaces the newest entry
  (detecting "new version since last seen" client-side, e.g. via stored last-
  seen version string) with a link into the full page.
- Missing/empty entries degrade gracefully (no popup, page just shows what
  exists) rather than erroring.

**Testing:** New page + a one-time popup trigger tied to version-change
detection — mixed surface, but no schema/backend risk. Label
**`needs-manual-test`** for the popup timing (must verify it fires exactly
once per version bump, not on every load), `needs-merge-approval` acceptable
for the static page itself if separated out.

---

### Slice 15: In-app bug reporting (Issue #114)

**Problem (out-of-spec item, folded in per Anthony's high-priority flag):**
No way to report a bug from inside the app; Anthony flagged the open
question of how the app→GitHub path works without continuous polling.

**Decision (2026-09-02):**
- GitHub REST API call directly from a server route — user submits from an
  in-app form, a Next.js API route calls GitHub's "create issue" REST API
  directly with a stored token. Synchronous push, not a queue — no polling
  needed.
- **New server-side secret required** (a GitHub PAT or GitHub App token,
  scoped to `issues: write` on this repo only). Flag at kickoff per Part A's
  service-role-key-adjacent caution around new secrets, even though this
  isn't the Supabase service-role key itself.

**Acceptance criteria:**
- In-app bug-report form (title + description, optionally a screenshot)
  reachable from Settings.
- Submission creates a real GitHub issue on `mp3anthony/funded` via the
  server route, labeled distinctly (e.g. `from-app`) so it's identifiable as
  user-submitted vs. Orchestrator-filed.
- The GitHub token lives server-side only (env var on Vercel), never sent to
  or readable from the client.
- A failed submission (network/API error) shows a clear in-app failure
  state, not a silent no-op.

**Testing:** New server route + external API call + new secret — the
secret-handling and failure-path deserve a manual look even though the form
itself is a plain UI flow. Label **`needs-manual-test`**.

---

## Part C — Suggested Milestone Order (for confirmation, not final)

Grouped by dependency, not strict sequence — slices within a group can
reorder freely unless a specific dependency is called out.

**Group 1 — foundational fixes, low risk, no dependencies:**
1. Slice 1 (#93) — single-household-per-user (schema-level, other slices
   don't strictly depend on it, but membership semantics are cleanest locked
   down early).
2. Slice 2 (#74) — warm-reload race fix.
3. Slice 3 (#89) — joinHousehold stale snapshot. **Sequence directly after
   Slice 2** (reuses its helper).
4. Slice 4 (#90) — cross-user notification write.
5. Slice 5 (#87) — empty-household health score display.
6. Slice 6 — delete dead `HouseholdHealth.tsx`.
7. Slice 7 (#71) — PWA cache-busting. Live bug affecting anyone with the app
   already installed; self-contained, no schema work.

**Group 2 — high-priority new features (Anthony's explicit build-order
weighting):**
8. Slice 14 — patch notes page.
9. Slice 15 — in-app bug reporting.

**Group 3 — settings/notifications, sequential dependency chain:**
10. Slice 8 (#37) — per-household timezone. **Must land before Slice 9.**
11. Slice 9 (#97) — notifications overhaul. **Depends on Slice 8.**
12. Slice 10 (#96 half A) — dead-subscription detection. Independent, can
    slot in anywhere in this group.
13. Slice 11 (#96 half B) — per-timezone hourly cron. **Depends on Slices 8
    and 9 both.**

**Group 4 — larger feature/design work, sequence last:**
14. Slice 13 (#99/#100) — motion/visual overhaul, *except* pull the
    `tailwindcss-animate` install fix forward as a standalone quick fix
    ahead of this group (cheap, fixes an already-broken feature, no reason
    to wait).
15. Slice 12 (#98) — bills vs expenses split. Largest, most structurally
    involved slice in this pass (schema + migration + Direct Pay split logic
    + weekly-draw integration + health-score integration) — recommend
    sub-slicing further at its own kickoff rather than one PR. Sequenced
    last because it's the highest-risk/highest-effort item and benefits from
    everything else being settled first (in particular, doing the motion
    pass before #98 means #98's new UI ships already matching the new
    animation patterns, rather than needing a second pass).

Not sequenced into this build order (per HANDOFF): once the app is stable
under this spec, licensing + app-store distribution evaluation is next,
running in parallel with opening testing beyond Anthony/Hannah.

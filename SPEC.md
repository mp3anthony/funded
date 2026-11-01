# Funded — SPEC

Household bills/goals budgeting app. React/Next.js on Vercel, Supabase backend.

Binding requirements for the app: Part A holds the locked invariants and standing rules, Part B the vertical slices (one per issue; numbers are cited elsewhere, so they never change).

---

## Part A — Technical Guardrails

Part A is split into two sections, and the split is load-bearing:

* **A1 — Locked invariants** are **escalation gates**. A change touching one is
  a mandatory stop-and-ask under the escalation triggers in CLAUDE.md. A sub-agent does not
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
  entirely. Its current uses are the cron route
  (`src/app/api/cron/push-reminders/route.ts:37`; besides reminders it rolls
  paid bills and, since R19 #406, may also create Pending pays: a `pay_history`
  insert and a `pay_schedules.next_pay_date` advance for paydays that passed
  unlogged) and the household edge functions
  (`join-household`, `delete-household`, `leave-household`; the last moves
  `households.user_id` to a remaining owner or nulls it, ADR 0005/0006). Any new use, or any code path
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

  **The canary:** an unexplained grey "Set up your pay" (formerly "Fully Funded") means something has handed the dashboard empty arrays. See `docs/lessons.md` (Testing).
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
  merge is a process step owned by `docs/conventions.md` (Versioning), not an escalation trigger.

---

## Part B — Vertical Slices

*Rewritten 2026-09-02 in a full triage pass — every open GitHub issue folded
into a slice below, decisions recorded in each issue's own comment thread.
Part A is untouched.*

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
dashboard renders against the momentarily-empty state — the Dashboard
verdict flaps to a wrong state and then snaps back on the next successful
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

**Retired.** Built as a display override on the old health score, which the Dashboard verdict (R25, #412) replaced; an empty household now reads grey "Set up your pay" (see `docs/context/money.md`).

---

### Slice 6: Remove dead HouseholdHealth.tsx (Issue #112)

**Done.** The unused `HouseholdHealth.tsx` card was deleted; the live card it shadowed was later removed too (R25).

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
  - Amended by #249: a new household is created with the creating phone's timezone when it is a valid IANA zone, else `Australia/Sydney`. Existing households are untouched; the fallback and column default stay.
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

### Slice 11: Push reliability — per-timezone scheduled delivery (Issue #96, half B)

**Problem:** The push-reminder cron is scheduled at a fixed UTC hour
(`vercel.json`, `0 20 * * *`), which only coincidentally lands at a
reasonable local time for Sydney households. There is no real per-household
or per-user schedule.

**Decision (2026-09-02):** Run the cron more often than daily; each run
checks every household's current local hour (via `todayInZone`/the household
timezone from Slice 8) against each user's chosen notify hour (from Slice
9's time-of-day picker), sending only to matches.

**Amendment (as built, ADR 0004):** Vercel Hobby allows one cron run per day,
and an hourly `vercel.json` schedule fails silently (the deployment never
promotes). Scheduling therefore runs on Supabase `pg_cron` via `pg_net`: a job
every 15 minutes generates scheduled reminders (`/api/cron/push-reminders`)
and a job every 5 minutes delivers due ones (`/api/cron/deliver-scheduled`).
`vercel.json` keeps a single daily fallback cron (`0 15 * * *`). The
real schedule lives in the Supabase database, not the repo.

**Depends on:** Slice 8 (household timezone) and Slice 9 (per-user notify
hour) — both must land first; this slice is the piece that makes them
actually affect delivery timing.

**Acceptance criteria:**
- Scheduling runs more often than daily, via Supabase `pg_cron` (see
  Amendment), not a Vercel hourly cron.
- A household/user only receives a push when their local time matches their
  chosen notify hour, within the scheduler's granularity.
- No duplicate sends within the same local-hour window (respects existing
  `dedupe_key` handling, Part A2).

**Testing:** Server-side scheduling logic, verifiable via direct
Supabase/log inspection across simulated timezones — pipeline-verifiable.
Label **`needs-merge-approval`**.

---

### Slice 12: Bills vs Expenses split (Issue #98)

**Problem:** Groceries/fuel are currently entered as bills purely as a
workaround so they count toward the joint-account Household total — there's no
real "expense" concept, and goal-contribution rules (e.g. "20% of surplus
into a goal") should also count toward that same draw. This is a schema
change — Part A escalation trigger, Anthony's sign-off recorded in the issue.

**Decisions (2026-09-02, recorded in the issue):**
- **Bill** = fixed/contractual/recurring. **Expense** = variable spend that
  still counts toward the Household total (formerly "weekly draw").
- **The Household total (formerly "weekly draw") becomes bills + expenses + active goal-contribution
  rules**, not just bills — touches #106's contribution-calc logic directly.
- **Separate `expenses` table** (not a type-filter bolted onto `bills`) —
  avoids adding type-filters to every existing bills query.
- **Direct Pay expenses support both whole-item assignment AND %-split,
  chosen per expense** — new pattern; Direct Pay bills today only do
  whole-item assignment via `assignee_id`.
- The Dashboard verdict counts expenses as bills.
- #70's category ordering extends to expenses.
- **One-time migration script** moves existing groceries/fuel bill-rows into
  the new `expenses` table.

**This is the largest slice in this pass — recommend sub-slicing further at
kickoff** (e.g. schema + migration first, then add/edit UI, then Direct Pay
split logic, then Household total integration, then verdict integration) rather than building it as one PR, per Anthony's original
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
  read as three disconnected rows for what feels like one concern. Design
  pass done live with Anthony via the design canvas skill (2026-09-03) —
  landed on a **single "Notifications" row** (App section) opening one
  merged panel, replacing the three-row/two-dialog split.
  **A real functional merge, not presentation-only, per
  Anthony's explicit call during the design review**: today there are two
  separate "turn this on" controls for what he correctly identified as one
  concern — the `all_enabled` master toggle inside the Notifications dialog
  (`NotificationCenter.tsx`), and the "Enable push notifications" button
  inside the Push notifications dialog (`PushStatusDialog.tsx`). The merged
  panel keeps **exactly one switch** (`all_enabled`, unchanged meaning/
  storage — still gates in-app + push together, no schema change): a
  "Notify me at" row for the delivery hour (unchanged control, #97,
  untouched storage), and a **plain status row** for this device's push
  registration — "Active" when live, swapping to a single inline "Enable on
  this device" action (reusing the existing `subscribeToPush()` re-enable
  flow from #96 half A, not a new mechanism) only when this device's
  subscription needs re-registering. The dead-subscription detection logic
  itself (#96 half A) is unchanged — only where its action button lives
  moves, from its own dialog into this merged panel. Per-notification-type
  toggles (manual bill, auto-pay, lodge payment, payday, goal milestone)
  stay as they are today, nested under the same entry point, unaffected by
  this merge. Static mockups (three artboards: today's baseline, the new
  single row, the merged panel) approved by Anthony before build — see the
  design canvas from that session for the approved layout/copy.

**Recommendation:** the `tailwindcss-animate` install fix itself is cheap,
self-contained, and fixes an already-broken feature — worth pulling forward
as a quick preliminary fix ahead of the rest of this slice's full polish
pass, rather than bundling it into the same PR as the whole-app motion work.

**Acceptance criteria:** full detail in the issue's decision comment
(the research write-up was removed from the repo; the issue comment is the record).

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

**Amendment (#152, Known Issues tab):**
- The page has two tabs, "Patch Notes" (default, unchanged) and "Known Issues".
  The page title is "Updates" (renamed from "What's New" in #311).
- Known Issues lists open GitHub issues carrying the `known-issue` label
  (label only; no other filter). Claude applies the label. Only a "User-facing
  blurb" section (`##` or `###` heading) of the issue body is shown, as plain
  text. The issue title and number are never shown. An issue with the label but
  no blurb is hidden.
- The blurb must be the LAST section of the issue body. The extractor stops at
  the next heading or horizontal rule (the `---` before the "Submitted from the
  app by user ID ... (email)" footer of `from-app` issues is what keeps that
  footer out), uses the last matching heading, strips markup and bare `#123` /
  `@user` references, and caps the text at 600 characters. Blurbs must not
  contain issue references or private details.
- Data comes from the unauthenticated GitHub API through a cached route,
  `/api/known-issues` (about 15 minutes; 5 minutes after a failure). The service
  worker bypasses `/api/` so the data is never frozen per build. If GitHub is
  unreachable (including offline) the tab shows a friendly "couldn't load"
  message; when nothing is labelled it shows "Nothing known right now". Never an
  error page. If the repo goes private the fetch needs a server-side token.
- Link back: issue #152.

**Amendment (#309, display window):**
- The Patch Notes tab shows only entries from the newest entry's month
  only (measured from the newest entry, not today); this supersedes the initial
  two-month window. Older entries stay in `patch-notes.ts`. An entry whose date is not "Month YYYY" is always shown.
  The first-open popup and the Known Issues tab are unchanged. Link back: issue #309.

**Amendment (#311, #260, Updates page and Updates card):**
- The page is renamed "Updates" (visible text and docs only; the route stays
  `/patch-notes`). The Settings row reads "Updates".
- The first-open popup is replaced by the Updates card: a compact, non-blocking
  card above the bottom nav, shown once per version, with the newest entry's
  first 2 bullets, "+N more" and a "See updates" link. It stays until the
  person taps X or the link, and nothing else on the Dashboard depends on it.
  This supersedes the popup wording above, which is left as history.
  Link back: issues #311, #260.

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
- **Amendment (#261, R12):** the member-facing wording is "issue", not
  "bug" (Settings > Report an issue). The form is a two-card step flow
  (Title, Description) with an optional Screenshot row. The route path
  (`/api/bug-report`), `GITHUB_BUG_REPORT_TOKEN` and the `from-app` label
  are unchanged.

**Testing:** New server route + external API call + new secret — the
secret-handling and failure-path deserve a manual look even though the form
itself is a plain UI flow. Label **`needs-manual-test`**.

---

### Slice 16: Notification tap destinations (Issues #181, #182, #193)

**Problem (out-of-spec item, approved by Anthony 2026-09-24):** tapping a
bill reminder opens that bill's popup, but payday reminders do nothing in the
inbox, and every push with a related entity is linked to
`/bills?billId=<id>` regardless of type — so payday, "Payment Requires
Confirmation" and goal-milestone pushes land on Bills with a bogus bill id.

**Decisions (2026-09-24, grilled with Anthony):**
- One shared type → destination rule, used by both push paths (client
  app-open push + `deliver-scheduled` cron) **and** the inbox. Push and inbox
  must never diverge.
- Destinations: manual bill / auto-pay → Bills + that bill's popup
  (unchanged); payday "Log Your Pay" → Payday; "Payment Requires
  Confirmation" (lodge_payment) → Payday; goal milestone → Goals page
  (`/funds`) + that goal's popup (changed from "page only" 2026-09-27, #193);
  anything else → home.
- Payday landing: pay still loggable → Log Pay / Enter Pay Amount box for
  that schedule; tapped late (already auto-logged as pending on load) →
  Confirm box for the pending pay matching schedule **+ pay date**;
  confirmation reminder → Confirm box for that pending pay; already
  done/missing → plain Payday, no popup, no error.
- Already-delivered pushes keep their old link — accepted, not backfilled.

**Tickets:** #181 (shared rule + page routing + inbox tappable, v0.9.52,
done) → #182 (payday/confirm popups, v0.9.54) → #193 (goal popup +
fix "Funds" in the v0.9.52 patch note, v0.9.55). All
**`needs-manual-test`** — real lock-screen push taps need a device.

**Naming (2026-09-27, Anthony):** the page is the **Goals** page (bottom nav
name) — agents must call it that in patch notes, checklists and chat, not
"Funds". `/funds` route, `funds` table and code identifiers are unchanged; no
app-wide rename.

### Slice 17: Paid bills reset on their due date (Issue #187)

**Problem (approved by Anthony 2026-09-27):** a bill marked Paid never becomes
unpaid again — `markAsPaid()` rolls `due_date` forward immediately and nothing
flips the status back, so Overdue, Upcoming Bills and reminders all ignore it
forever. `invoice_date` never rolls at all.

**Decisions (2026-09-27):**
- Paid = paid for this cycle. Paying early (due date still in the future,
  household timezone) sets status only — no date change at that moment
  (silent). A bill already due today or earlier rolls at once — see the #205
  amendment below.
- On or after that due date (household timezone) the bill rolls: status back to unpaid,
  `due_date` +1 cycle, `invoice_date` +1 cycle in lockstep when present.
  Rollover is persisted server-side (reminders read DB status). Non-recurring
  bills stay Paid.
- Autopay bills cannot be marked Paid/Unpaid — action hidden.
- Mark as Unpaid = undo within the cycle, no date change (applies to a bill
  paid early, which stays Paid until its due date).
- One-off release fix: existing recurring Paid bills → unpaid at their next
  upcoming due date (never Overdue); autopay just loses Paid.
- Expenses out of scope. No schema change expected — escalate if one is needed.

**Ticket:** #187 (v0.9.56, after #193), **`needs-manual-test`**. Full
problem/checklist on the issue.

**Amendment — instant roll on pay (Issue #205, v0.9.57, approved 2026-09-28):**
- Mark as Paid on a manual recurring, non-paused bill whose due date is today
  or earlier (household timezone) rolls it immediately via `computeRollover`
  maths: status unpaid, `due_date` +1 cycle, `invoice_date` +1 cycle. The
  write is guarded on `due_date` still being the value read (no double roll).
  Paying early, one-off and paused bills: status only, as above.
- Toast "Paid for <Month> — next due <date>" with Undo (8s, pauses while
  touched/focused). Undo restores the exact pre-tap row (original dates,
  unpaid status — not Paid, which the cron would just roll again), guarded on
  the rolled `due_date` + status 'Due Soon'; if the bill has changed since,
  nothing is written and a short message says so. Once the toast has gone, a
  mis-tap is fixed by editing the bill's dates.
- The paid cycle's reminders (dedupe prefix `${id}-${oldDue}-`) are marked
  read, never deleted (A2), so Undo can't resurrect them.
- Stale screen (DB already on a different cycle than shown): re-read + "This
  bill was already updated" toast, no write.
- Full issue: https://github.com/mp3anthony/funded/issues/205

**Amendment — last paid record and Undo payment (Issue #211, v0.9.58, schema approved 2026-09-28):**
- New nullable `bills.last_paid_for` date = due date of the most recently paid
  cycle. No backfill; RLS unchanged.
- Written by every roll of a Paid manual bill: the instant roll on Mark as Paid
  (#205) and the cron / on-open catch-up roll of a bill paid early. A rollover
  sets it, never clears it. Autopay status resets don't write it. Paying early
  doesn't write it at tap time, and Mark as Unpaid never touches it, so the
  previous record survives an unpaid tap. Edits keep it. The toast Undo
  restores the pre-tap value exactly (including empty).
- Bill popup, under Paid By: "Paid for <Month>" (year only if not the current
  year, household timezone). The month comes from the due date while the bill
  is Paid, else from `last_paid_for`; empty shows nothing. Autopay bills show
  no Paid-for line.
- "Undo payment" button (permanent, one level): shown only when
  `last_paid_for` is set, the bill is manual, recurring, not paused, not Paid,
  and its due date is exactly `last_paid_for` + 1 cycle. Tap (with confirm):
  `due_date` = `last_paid_for`, `invoice_date` -1 cycle, status unpaid,
  `last_paid_for` cleared. Fresh re-read plus guarded write (due_date,
  last_paid_for, status, not paused); if anything changed: re-read, short
  message, no write. Writes no notifications (A2).
- Full issue: https://github.com/mp3anthony/funded/issues/211

**Amendment — paused bills (Issue #201):**
- Paused bills get no reminders (`generateReminders` skips them). The cron
  marks their unread bill reminders (`manual_bill`, `auto_pay`) read each run,
  never deleted (A2). Pausing also marks the pauser's rows read at once.
- Resume: if the due date has passed, it rolls to the first date on or after
  today (household timezone), counted from the base date, missed cycles
  skipped, with `invoice_date` in lockstep. A Paid bill's resume roll records
  `last_paid_for` (same rule as #211). Resume is a guarded write.
- Edits never change `is_paused`; only pause/resume does.
- Full issue: https://github.com/mp3anthony/funded/issues/201

**Amendment — invoice dates stay in step with the due date (Issue #282):**
- Active recurring autopay bills show a derived invoice date: the saved one
  moved forward by the same number of cycles as the shown due date
  (`displayedInvoiceDate`, counted from the base date with the `addCycles`
  clamp). Display only; nothing derived is stored. Saving an edit stores both
  shown dates together.
- The manual-bill roll is unchanged (both dates move in lockstep, #187).
  Paused and one-off bills show their saved invoice date.
- The bill popup hides the Invoice Date row when it is blank (the card is unchanged).
- A one-off data migration realigned stale manual invoice dates
  (`20261009120000_realign_stale_manual_invoice_dates.sql`).
- No schema change, no toggle, no notification change.
- Full issue: https://github.com/mp3anthony/funded/issues/282

**Amendment — autopay shown due date (Issues #287, #288):**
- The shown due date of an active recurring autopay bill is counted from the
  saved date with the `addCycles` clamp (Jan 31 gives Feb 28, then Mar 31), not
  stepped month by month (#287). The roll-forward cap is 5000 cycles.
- `displayedDueDate(bill, todayYmd)` decides what to show (#288). A paused autopay
  bill shows the label "Paused"; a one-off autopay bill whose saved date has passed
  shows "One-off". The saved date stays in `due_date` for the edit form.
- One-off autopay reminders follow the saved date only and stop once it passes;
  paused bills get none. The cron and the UI share `displayedDueDate`.
- Bills showing a label are left out of the Dashboard verdict (formerly the health
  score and Household Health weekly bills figure) and the contribution split, and
  appear on the Bills page only under All. The Total bar is unchanged (#267 decides).
- No schema change. `adjustAutopayBillDate` is removed.
- Full issues: https://github.com/mp3anthony/funded/issues/287 and https://github.com/mp3anthony/funded/issues/288

### Slice 18: Onboarding rework (Issue #248)

**Problem:** the old wizard forced payday and a full bill on day one, could write duplicates on Back then Next, lost its place on small screens and had no goal step.

**Decisions (grilled 2026-10-11, slice 1 of 2; slice 2 is #333):**
- Shape as rebuilt in R31/R32 (#418/#419): Welcome, then Household name and Payment mode (required), then the optional Setup hub: rows Add your pay, Add a bill, Add a goal open the normal add flows and tick when saved; "Enter app" is always available.
- First bill step is name, amount, frequency (default monthly) and due date only; saved as category Other, Manual, assigned to the current user, no splits. Goal step is name and target only (category Savings, status not started, no deadline).
- Hub rules in `src/lib/onboarding.ts`; the hub is `OnboardingHub`.
- Back never writes twice: `createHousehold` runs once (guarded); the hub saves through the normal add flows.
- The hub has a "Getting started guide" link under Enter app; it calls `completeOnboarding()` before navigating to `/getting-started`.
- `addFund` now throws on a failed insert (like `addBill`), so the goal step and Create Goal window can show the failure.
- Empty Payday, Bills and Goals pages say "Tap + beside the page title to add your first ...".
- Join path unchanged. No schema change. A reload mid-onboarding lands in the app with Direct Pay and the optional steps unset; the Dashboard card in #333 covers that.
- Full issue: https://github.com/mp3anthony/funded/issues/248

### Slice 19: Finish setting up card (Issue #333)

**Decisions (grilled 2026-10-11, planned 2026-10-12):**
- Dashboard card, first in the page flow, above the Bills and Goals cards. Owners only (joiners share the household's setup); a joiner later promoted sees it if something is missing.
- Household-wide "missing": payday = no pay schedule, bill = no bills (expenses don't count, paused bills do), goal = no goals. A deleted item brings its row back unless the card was dismissed.
- Rows open the add form on the target page via `?add=1` on Payday, Bills and Goals (param stripped once used).
- X hides it for good: `user_preferences.finish_setup_dismissed_at` (nullable timestamptz, one-way, never cleared; covered by the existing own-row policy, no RLS change). Per person, so a new household stays dismissed. Unknown or failed load keeps the card hidden.
- Pure rules in `src/lib/finishSetup.ts`; card in `FinishSetupCard.tsx`.
- Full issue: https://github.com/mp3anthony/funded/issues/333


### Slice 20: Leave / Delete household (Issue #251)

**Decisions (grilled 2026-10-11, planned 2026-10-17; A1 option A + E1 approved by Anthony 2026-10-17):**
- Regular member, or an owner while another accepted owner remains: plain leave (in-app dialog, no browser pop-up). Only owner with accepted members: pick an accepted member as the new owner, then leave, or Delete household instead. Sole member, or only pending members: Delete only (button reads "Delete household").
- Delete household shows member count and what is lost, and needs DELETE typed (case-sensitive, trimmed). `delete-household` refuses (403) while another accepted owner exists.
- Accepted = has a user id and not pending; owner = role owner and accepted. Pending rows never count as owners or candidates. Same definitions in `src/lib/householdLeave.ts`, the `leave-household` function and the migration.
- New `leave-household` edge function (service role): validates the caller is an accepted member, recomputes the rules, promotes the named owner, moves `households.user_id` to the new or oldest remaining accepted owner when the creator leaves (or nulls it if no owner remains), clears the leaver's notifications, deletes the member row by id.
- Migration `20261017120000_household_last_owner_guards` (triggers only): the last accepted owner cannot be demoted; an owner's member row cannot be deleted through the API (skipped when the household is gone or for service role).
- `updateMember` now throws on failure; Settings profile save only shows success after it works.
- ADR: `docs/adr/0005-households-user-id-follows-an-owner.md`.
- Full issue: https://github.com/mp3anthony/funded/issues/251

### Slice 21: Paused bills and Counts toward totals (Issue #267)

**Decisions (grilled 2026-10-11, planned and reviewed 2026-10-18):**
- One rule for every bill total: `countsTowardTotals` in `src/lib/billCycle.ts` (false for paused bills and bills showing a neutral `dueLabel`; dateless bills count). Used by the Bills Total Bar, the Dashboard verdict, the Impact calculator and Suggest Split. Never inline `is_paused`/`dueLabel` checks in a total.
- Paused bills of any payment type carry `dueLabel: 'Paused'` (`displayedDueDate` checks paused before payment type), so a paused manual bill shows "Paused" and appears only under the All filter.
- Row look: orange pause icon, greyed amount, "Paused" in the date slot. Muted line under the Total Bar: "N paused or finished, not counted" (only when N > 0; ignores search/category/type/due filters).
- No schema, migration or RLS change.
- Full issue: https://github.com/mp3anthony/funded/issues/267

### Slice 22: Bills with no due date (Issue #250)

**Decisions (grilled 2026-10-11, planned and reviewed 2026-10-18, A1 approved 2026-10-18):**
- Schema: `bills.due_date` is nullable (`DROP NOT NULL`) and new `bills.due_date_prompt_muted BOOLEAN NOT NULL DEFAULT false` (migration `20261018120000_add_bills_due_date_prompt_muted.sql`, applied to prod before merge). A blank due date is stored as null.
- Mark as Paid asks "When is it next due?" only for a manual, recurring, not paused, not muted bill with no due date. Save date: unpaid on the picked date (today or later, no `last_paid_for`, no Undo). Skip for now: plain Paid (stays Paid until a date is added). Don't ask again: Paid and muted. Paused and one-off dateless bills skip the question. Writes are guarded on `due_date IS NULL` and not paused.
- 30 days after `created_at` (elapsed time), an unmuted dateless bill shows an orange "Add due date" in the date slot (also replaces "Paid · no due date"); it opens the edit form at the due date. A `dueLabel` ('Paused' / 'One-off') always wins in the date slot.
- Dateless bills sort last within each category on Bills and last in the Dashboard Bills carousel, appear only under the All filter, and still count toward totals.
- Full issue: https://github.com/mp3anthony/funded/issues/250

### Slice 23: Full app redesign (Issue #377)

**Shipped on `main` (PR #425, v0.1.0, released via PR #481).** The build ran on a long-lived `redesign/full-app` branch, now gone. Look and layout live in the private design doc (see `DESIGN-REFERENCE.md`); this section keeps only what stays binding.

**Decisions (grilled page by page 2026-10-19):**
- Seven pages: Dashboard, Payday, Bills, Goals, Settings, Pop-ups, Onboarding and sign-in. This replaces the onboarding shape in Slice 18 (a hub instead of three skip screens; the household is created only once name and Payment mode are both chosen) and moves the Finish setting up card (Slice 19) into the Dashboard stats slot.
- `pay_history.amount` is nullable (migration `20261024120000_pay_history_amount_nullable`; NULL only for a Pending pay with no known amount, enforced by a CHECK) and the cron route may create Pending pays with the service-role key (see Part A1). Averages are per pay schedule, last 4 confirmed pays, at least 2.
- Payday shows one card per member in the Carousel; a member's sheet holds their pay schedules, Contribution (Joint Fund only; any member can edit it) and rules. "Contribution amounts" and `ContributionSettingsSheet` are gone from Settings; the Suggest Split panel is in `SuggestSplitPanel.tsx`, opened from the Payday header "Compare split" pill (Joint Fund only).
- Goals: Just tracking is the existing `paused` status (no schema change); paused goals stop counting toward totals, goal suggestions and milestone reminders, and the Dashboard Goals carousel. Pace on the Goals page uses only fixed-dollar rules on fixed-amount pay.
- `households` UPDATE is owner-only (migration `20261024130000_households_update_owner_only`). Only owners change name, payment mode, timezone and join code; members can view and copy the join code. App writes ask for the changed rows back and fail loudly on 0 rows (`assertRowUpdated`).
- Left out on purpose: #383 (change login email).
- Full issue: https://github.com/mp3anthony/funded/issues/377

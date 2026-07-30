# Handoff

**Last updated:** 2026-07-30
**Branch:** `docs/global-cli-tools` (unmerged — carries the CLI-tools doc commit
plus this session's `CHANGE-LOG.md` entries; Anthony wants it folded into the
next patch rather than merged standalone)
**App version:** `v0.9.3` (unchanged — no code shipped this session)

## What happened this session

**Scoping session — no code written, no builds, no merges.** Anthony raised four
new areas of work. All four were checked against `SPEC.md`, all four fell
**outside** the current spec, so per protocol Step 1 none were scoped and the CRD
was not touched. They are logged in `CHANGE-LOG.md` as `pending`.

One genuine bug was found hiding inside the fourth item and filed directly under
the Step 1 bug carve-out.

### Issue #73 filed (the only actionable output of this session)

**[#73 — Household Health rank flashes "Fully Funded" on cold open](https://github.com/mp3anthony/funded/issues/73)**
— `bug`, `needs-triage`. **This is what next session picks up.**

Anthony reported the dashboard rank flapping between "Fully Funded" and a lower
rank with no underlying data change. Diagnosed by code inspection — it is not a
scoring-threshold problem, it is a load-order problem:

- `HealthScoreCard` (`src/components/HealthScoreCard.tsx`) computes the rank on
  every render from `useApp()` state, and never consults `isDataLoading`.
- `src/app/page-client.tsx:71` renders it unconditionally, no loading gate.
- On a cold open those arrays are still empty. `calculateHealthScore`
  (`src/lib/utils.ts:88`) against empty state scores **85** —
  `(100 × 0.4) + (50 × 0.3) + (100 × 0.3)` — which clears the `>= 80`
  "Fully Funded" threshold. So every cold open flashes Fully Funded before real
  data lands, then snaps to the true rank. Perceived value depends purely on
  render/network timing, hence the apparent randomness.
- The flag already exists and is already used correctly by the notification
  generator (`src/context/AppContext.tsx:2921`); the dashboard just never
  adopted it.

Full arithmetic, file/line refs, acceptance criteria and testing checklist are in
the issue body — **no re-investigation needed**. Notably in scope: the four stat
tiles and the Contributors list on the same card read the same unloaded state and
must be gated too.

Fenced off as **out of scope** inside the issue on purpose (all logged to
`CHANGE-LOG.md` instead): whether an empty household *should* settle on 85, rank
hysteresis near the 80 boundary, and the gauge redesign. Also noted as an
optional tidy-up: the dead `allInFuture` branch at `src/lib/utils.ts:108` returns
the same value as the `else` it guards — safe to delete, must not change output.

### Investigation done but NOT yet filed — notification delivery bug

Worth knowing before the notifications CRD, because it is a defect rather than a
feature request and should probably be its own issue:

Anthony reports getting **no** push notifications on Android or iOS — instead a
notification appears 5–10 seconds *after* opening the app. Cause found:

- There are **two** reminder generators. The server cron
  (`src/app/api/cron/push-reminders/route.ts`) and a client-side copy in
  `src/context/AppContext.tsx:2921` that runs on app load, creates the
  notification, then fires a push at the user's own device. That client path is
  the 5–10 second symptom.
- `vercel.json` schedules the cron `0 20 * * *` — **20:00 UTC**, i.e. ~6am
  Sydney, not any sensible local evening. Vercel crons are UTC-only.
- Push only lands if a live `push_subscriptions` row exists. If permission was
  never granted or iOS expired the subscription, the cron creates the row and
  delivers nothing silently — the user only sees it on next app open.

Not filed as an issue yet — deliberately left for Anthony to decide whether it
goes in before or as part of the notifications CRD work.

### Issue #71 body cleaned up

`#71` pointed at `docs/decisions/pwa-stale-cache-nav-slowness.md` for its full
findings. **There is no `docs/` directory in this repo** — Anthony deleted it
deliberately. Confirmed there is no glossary anywhere either, so the issue's
`Glossary entry: Service worker cache version` line was a second dead pointer.

Both dead references removed from the issue body. The *content* that mattered was
preserved and moved inline as an **"Already ruled out (with evidence)"** section —
Vercel 503 load-shedding, code regression, full-page reloads, Supabase accounts —
so nobody re-investigates eliminated dead ends.

Lost for good: the doc's "quick re-diagnosis procedure". Not recoverable, and not
needed — root cause is confirmed and written into the issue.

Swept the repo and all other issues for further references to the deleted docs:
none live.

### Out-of-spec items logged to `CHANGE-LOG.md` (7 entries, all `pending`)

1. **Notifications overhaul** — user-chosen delivery time (e.g. 6pm local),
   per-timezone scheduling, new reminder types beyond the current
   manual-bill/auto-pay/lodge-payment set (e.g. payday "log your pay").
2. **Bills vs Expenses** — "is this a bill or an expense?" on add, expenses
   tracked separately.
3. **Dynamic visual overhaul** — motion/interaction pass across the app.
4. **Dashboard overhaul** — replace the four static stat tiles with a swipeable
   dynamic gauge carrying the health-rank colours.
5. **Health score design question** — should an empty household score 85?
6. **Direct Pay unverified** — awaiting outsourced testers.

## Key findings to carry into the CRD

- **Notifications depend on #37.** "Notify me at 6pm my local time" needs a
  timezone the user can actually set. Right now every household is hardcoded to
  `Australia/Sydney`. #37 stops being optional and becomes the foundation.
- **The mechanism works and is cheap:** run the cron **hourly** instead of daily,
  and process each household only when its local hour matches its chosen notify
  hour. No new infrastructure.
- **Per-household vs per-user timezone is undecided.** `households.timezone` is
  per-household; Anthony's phrasing suggested it may want to be per-user (two
  people, one household, different cities). Materially different build — flagged,
  not answered.
- **Bills-vs-Expenses is the biggest of the four.** Not just an add-screen
  toggle — dashboard totals, contribution splits, the reminder generator and the
  #70 category ordering all read `bills` and each needs a deliberate decision.
- **Direct Pay genuinely is untested logic, not just untested UI** —
  `calculateHealthScore`'s budget-coverage half runs a completely different
  calculation in Direct Pay mode (sums `billSplits` rather than contributions).
  Waiting on real direct-pay testers is the right call.

## What's next (Anthony's stated order — reordered at end of this session)

### → NEXT SESSION: finalise `SPEC.md` Part A guardrails

This is a **conversation, not a build**. Anthony answers, the Orchestrator edits
`SPEC.md` Part A and deletes the "probably not exhaustive" note at the bottom of
it. Expect ~20 minutes.

Why it matters: Part A is the **escalation boundary**. Anything listed there means
a sub-agent must stop and ask before touching it. Too little on the list and
agents silently change things that break the app; too much and Anthony gets
interrupted constantly. That trade is his call, not the Orchestrator's.

**Part 1 — confirm the 7 existing entries.** RLS mandatory · Next.js viewport API ·
no `fixed` inside `overflow:hidden` · mobile-first PWA · versioning discipline ·
stack · branching. Straight yes/no per entry; all 7 expected to stand.

**Part 2 — rule on 6 candidates.** These already behave like invariants in the
codebase but are not written down. Investigation is **already done — do not
re-derive**. For each, Anthony says **lock it** (agents must escalate), **note it**
(written down, no escalation) or **bin it**:

1. **`cacheComponents: true`** (`next.config.ts:4`) — this is why route handlers
   cannot use `export const runtime`. Already explained in a comment at
   `src/app/api/cron/push-reminders/route.ts:7`. A sub-agent adding an API route
   would hit this blind.
2. **All date parsing goes through `parseBillDate`** (`src/lib/utils.ts:18`).
   Exists because `new Date("2026-07-30")` parses as **UTC midnight** — the
   previous day in Sydney — which would put every bill due-date comparison off by
   one. Server-side day logic uses `todayInZone` instead. Silent when broken.
3. **Service-role key is server-only.** Used in the cron route to bypass RLS. If
   it ever reaches client code, every user gets full database access. Highest
   consequence rule on this list.
4. **Notification dismissal is mark-as-read, never delete**
   (`src/context/AppContext.tsx:2867`). The row must survive so its `dedupe_key`
   persists, otherwise dismissed reminders resurrect. Someone "tidying" this into
   a real delete reintroduces the bug.
5. **Amounts must be normalised via `convertAmount` before comparison.**
   Weekly/fortnightly/monthly coexist throughout. Comparing raw amounts across
   frequencies produces silently wrong money.
6. **Computed displays must gate on `isDataLoading`.** This is #73's lesson
   generalised, to stop the same class of bug recurring elsewhere.

### → SESSION AFTER: `CHANGE-LOG.md` triage + CRD interview

Anthony puts the client hat on, triages the 7 pending entries, then the `crd`
skill is run live. Covers the dynamic/interactive overhaul (the swipeable gauge is
**one of several ideas** — Anthony has more to bring), the dashboard, bills-vs-
expenses, and the notifications feature.

### → QUEUED BUILD WORK (nothing blocking it)

- **Issue #73** — health score cold-open flash. **The only shovel-ready ticket.**
  Small, isolated, no Part A invariants touched, fully specified. Was originally
  slated for next session; Anthony moved the guardrails work ahead of it. Can be
  pulled forward any time.
- **Notification delivery bug** — diagnosed above, not yet filed. Anthony to
  decide whether it goes in on its own or folds into the notifications CRD work.
- **#71** PWA stale cache — two open implementation-shape questions (cache-busting
  mechanism, offline tradeoff) to resolve at kickoff.
- **#37** household timezone UI — one open question (any member vs admin-only).
  Note this is now **load-bearing** for the notifications feature.

## Reference

- Protocol: [`CLAUDE.md`](CLAUDE.md) — read first.
- Working spec: [`SPEC.md`](SPEC.md) — Part A guardrails + Slices 1 (#71) and
  3 (#37) still open. Part C order now largely superseded by the list above.
- Out-of-spec inbox: [`CHANGE-LOG.md`](CHANGE-LOG.md) — **no longer empty**,
  7 pending entries awaiting Anthony's triage in client hat (session after next).
- Issue #73: https://github.com/mp3anthony/funded/issues/73 (open — shovel-ready)
- Issue #71: https://github.com/mp3anthony/funded/issues/71 (open — body cleaned
  up this session)
- Issue #37: https://github.com/mp3anthony/funded/issues/37 (open)

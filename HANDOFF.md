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

## What's next (Anthony's stated order)

1. **Issue #73** — health score cold-open flash. Next session. Small, isolated,
   no Part A invariants touched, fully specified in the issue.
2. **CRD interview** — session after that. Covers the dynamic/interactive
   overhaul (the gauge is one of several ideas Anthony has, more to come),
   dashboard, bills-vs-expenses, and the notifications feature. Run the `crd`
   skill live.
3. Then, slotted per the CRD outcome: notification delivery bug (above),
   **#71** PWA stale cache, **#37** household timezone UI.

Still outstanding from prior sessions:
- **Confirm `SPEC.md` Part A guardrails** — still flagged as "probably not
  exhaustive", Anthony hasn't done a pass yet.

## Reference

- Protocol: [`CLAUDE.md`](CLAUDE.md) — read first.
- Working spec: [`SPEC.md`](SPEC.md) — Part A guardrails + Slices 1 (#71) and
  3 (#37) still open. Part C order now largely superseded by the list above.
- Out-of-spec inbox: [`CHANGE-LOG.md`](CHANGE-LOG.md) — **no longer empty**,
  7 pending entries awaiting Anthony's triage in client hat.
- Issue #73: https://github.com/mp3anthony/funded/issues/73 (open — next up)
- Issue #71: https://github.com/mp3anthony/funded/issues/71 (open)
- Issue #37: https://github.com/mp3anthony/funded/issues/37 (open)

# Handoff

**Last updated:** 2026-07-30
**Branch:** `main` — nothing in flight. Next session branches from clean `main`.
**App version:** `v0.9.4` (shipped)

## → START HERE NEXT SESSION

Nothing is half-finished. Last session closed cleanly: PR #76 merged, #73 closed,
`SPEC.md` Part A finalised.

**One decision opens the session, then it's straight into a build:**

> **#74 or #75 first?** Both are filed, diagnosed, and unblocked by anything except
> this call. #74 also needs Anthony to pick between four approaches before it can be
> built — ask for both answers at once.

The honest case for each:

- **#75 item 1 is the only thing that can hard-break the app** — a permanent loading
  wheel, currently safe only by accident. Nobody has hit it, but if they do the app
  is unusable, not just wrong-looking.
- **#74 is the one Anthony actually reported** — but he has not seen the symptom "in
  a while", and the cosmetic worst case is a wrong rank for a moment. Certain defect,
  unknown frequency.

Orchestrator's lean: **#75 item 1 first** (hard-break beats cosmetic), then #74. Put
it to Anthony rather than assuming — he raised #74, and it's his call whether the
thing he noticed or the thing that could brick a session goes first.

---

## Current state

- `SPEC.md` **Part A is final** — A1 (5 escalation gates) / A2 (8 standing rules).
  Do not reopen unless Anthony raises something new.
- **PR #76 merged**, `v0.9.4` on `main`. Loading-gate hardening: `isDataLoading` now
  initialises `useState(true)`, and `loadData`'s pre-`try` early return only clears
  it once auth has resolved.
- **#73 closed** — verified on device, no "Fully Funded" flash on a genuine
  force-quit-and-reopen.
- **#74 and #75 open**, both `needs-triage`, both fully diagnosed. No investigation
  needed — read the issue bodies, not the code.

### `SPEC.md` Part A at a glance

**A1 — mandatory escalation, stop and ask Anthony.** RLS mandatory · service-role key
server-only · `convertAmount` normalisation before comparing amounts · stack changes
(adding/replacing a core dependency or framework) · branching (absolute prohibition,
never commit to `main`).

**A2 — follow, do not escalate.** `parseBillDate`/`todayInZone` for all date parsing ·
`cacheComponents` and its `export const runtime` consequence · notification dismissal
as mark-as-read · the centralised `isDataLoading` gate · no `fixed` inside
`overflow:hidden` · Next.js viewport API · mobile-first PWA · versioning discipline.

## The open tickets

**[#74 — successful-but-empty query results wipe loaded household data](https://github.com/mp3anthony/funded/issues/74)**
· `bug`, `needs-triage` · **needs Anthony's approach decision before building.**

`if (billsRes.data)` at `src/context/AppContext.tsx:846` — `[]` is truthy, so a query
that succeeds with **zero rows** overwrites loaded arrays with empty ones. Same
pattern for `funds`, `paydays`, `members`, `bill_splits`. On a warm reload the gate
is deliberately not raised (`:796`, so the wheel doesn't flash over a working app),
so the dashboard is rendering throughout. Score snaps to 85, reads "Fully Funded",
next load restores it. RLS returns exactly that shape — empty, no error — when the
auth token isn't applied yet; there is already a comment acknowledging that race in
another context at `:768`.

The obvious patch ("only overwrite when non-empty") is **wrong** — it would freeze a
bill deleted on another device. Four approaches are laid out in the issue body.

**Evidentiary status, stated carefully:** the code defect is certain. The
*frequency* of the RLS-empty condition is not. Anthony's warm-resume testing on #76
was clean, but his original report was two days apart and he has not seen the quirk
recently — so recent absence is weak evidence either way. Do not treat a clean test
as refuting this, and do not treat the original report as proving it is frequent.

**[#75 — pre-existing hazards in the auth/`loadData` path](https://github.com/mp3anthony/funded/issues/75)**
· `bug`, `needs-triage`. Three defects, none introduced by #76:

1. **Permanent loading wheel — the only hard-break on the board.**
   `AppContext.tsx:754` raises `isDataLoading` but does not itself run `loadData`;
   clearing depends on the effect at `:886` re-firing off `session` identity. A
   repeated `INITIAL_SESSION`/`SIGNED_IN` carrying the *same* session object leaves
   the flag true with nothing in flight → spinner forever. Safe today **only by
   accident** — supabase-js happens to hand out a fresh object per emission.
2. No `.catch` on `getSession()` at `:727`.
3. A transient membership/households query error sets `isOnboarded` false, routing an
   **already-onboarded** user to "create or join" — same visible symptom as #49,
   which was only ever fixed for the render-gap case. **Worth checking first whether
   that lets them create a second household**; if so that becomes the headline
   severity of the whole issue.

**[#71](https://github.com/mp3anthony/funded/issues/71)** PWA stale cache — two open
implementation-shape questions (cache-busting mechanism, offline tradeoff) to resolve
at kickoff.

**[#37](https://github.com/mp3anthony/funded/issues/37)** household timezone UI — one
open question (any member vs admin-only). Now **load-bearing** for notifications:
"notify me at 6pm my local time" needs a timezone the user can set, and every
household is currently hardcoded to `Australia/Sydney`. **Per-household vs per-user is
undecided** and materially changes the build.

**Notification delivery bug — diagnosed, still NOT filed.** Anthony gets no push on
Android or iOS; instead a notification appears 5–10s *after* opening the app. Two
reminder generators exist: the server cron
(`src/app/api/cron/push-reminders/route.ts`) and a client-side copy in
`src/context/AppContext.tsx` that runs on app load — the client path is the
5–10s symptom. `vercel.json` schedules the cron `0 20 * * *` = 20:00 **UTC** ≈ 6am
Sydney; Vercel crons are UTC-only. Push only lands if a live `push_subscriptions` row
exists, so if permission was never granted or iOS expired the subscription, the cron
delivers nothing silently. **Anthony to decide: own issue, or folds into the
notifications CRD.**

## Traps — confirmed, do not repeat

- **The 85 canary.** Empty state computes to exactly **85** in `calculateHealthScore`
  (`src/lib/utils.ts:88`) — `(100 × 0.4) + (50 × 0.3) + (100 × 0.3)` — clearing the
  `>= 80` threshold at `src/components/HealthScoreCard.tsx:34`. An unexplained "Fully
  Funded" **always** means something handed the dashboard empty arrays. Look at
  loading state, never at the scoring formula.
- **Never add a per-component `isDataLoading` guard.** `AppShell.tsx:182` withholds
  *all* children while `session && isDataLoading`, so a component-level guard is
  unreachable dead code. This is A2. #73's original body prescribed exactly this and
  was wrong.
- **`<AppProvider>` is mounted with no props** (`src/app/layout.tsx:104`). Server-side
  session prefetch was removed deliberately for #47 — reading `cookies()` in the root
  layout forces the whole app dynamic under `cacheComponents`. So `initialSession` is
  always `null` and `initialIsOnboarded` always `false`. Two separate wrong diagnoses
  came from forgetting this; both are documented in #73's body.
- **`allInFuture` at `src/lib/utils.ts:108` is NOT safe to remove**, despite #73's
  original claim. `overdueBills` filters the stored `status` **string** while
  `allInFuture` parses `dueDate` — independent. `mapBillFromDb`
  (`src/context/AppContext.tsx:423-438`) only ever *upgrades* status to `"Overdue"`,
  never clears a stored `"Overdue"` on a future date, and `:426`'s `else if` skips the
  derivation entirely for `payment_type === "auto"`. An auto-pay bill with stored
  `"Overdue"` and a future due date scores **100** with the flag, **80** without — an
  8-point swing across the 80 boundary. (The underlying mapping asymmetry is arguably
  its own latent bug. Unfiled.)
- **Line references in comments go stale within a single session.** Three rounds of
  stale refs happened while building #76, each caused by the previous fix adding
  lines. Always re-grep after editing; never carry a number forward.
- **Use `Write` + `--body-file` for GitHub issue bodies.** Heredocs break on markdown
  of any real length.

## Open process items

- **Protocol labels don't match the repo.** `CLAUDE.md` §3 names `needs-manual-test`,
  `needs-merge-approval` and `out-of-spec`; **none exist.** `ready-for-testing`
  ("Preview is live and waiting on on-device testing") is the de facto equivalent of
  the first and was used for PR #76. Earlier `out-of-spec` turns were logged to
  `CHANGE-LOG.md` but never labelled, because the label doesn't exist. Anthony to
  choose: rename the protocol to match the repo, or create the two genuinely missing
  labels. Five minutes, undecided.
- **`CHANGE-LOG.md` count discrepancy, unresolved.** An earlier handoff said "7
  pending entries" in three places but listed only **6**. Verify the real count at
  triage.
- **A verification limit on #76, accepted knowingly.** The token-refresh check was
  meant to observe a *resident* app through a background token renewal. The OS evicted
  the PWA during the wait, so what was actually observed was another cold start
  (black → wheel → dashboard, correct). Residual risk judged low: the hazard was
  `TOKEN_REFRESHED` raising the loading flag, and `AppContext.tsx:754` deliberately
  only raises it for `INITIAL_SESSION`/`SIGNED_IN` — pre-existing and untouched by
  #76.

## Then: `CHANGE-LOG.md` triage + CRD interview

Anthony puts the client hat on, triages the pending entries (count unverified, see
above), then the `crd` skill runs live. Covers the dynamic/interactive overhaul (the
swipeable gauge is **one of several ideas** — he has more to bring), the dashboard,
bills-vs-expenses, and notifications.

Findings to carry in:

- **The notifications mechanism works and is cheap:** run the cron **hourly** instead
  of daily and process each household only when its local hour matches its chosen
  notify hour. No new infrastructure. Depends on #37.
- **Bills-vs-Expenses is the biggest pending item.** Not just an add-screen toggle —
  dashboard totals, contribution splits, the reminder generator and #70's category
  ordering all read `bills`, and each needs a deliberate decision.
- **Direct Pay is untested *logic*, not just untested UI.** `calculateHealthScore`'s
  budget-coverage half runs a completely different calculation in Direct Pay mode
  (sums `billSplits` rather than contributions). Waiting on real direct-pay testers is
  the right call.

## Reference

- Protocol: [`CLAUDE.md`](CLAUDE.md) — read first.
- Working spec: [`SPEC.md`](SPEC.md) — **Part A final (A1/A2)**. Part B Slices 1 (#71)
  and 3 (#37) still open. Part C order superseded by the list above.
- Out-of-spec inbox: [`CHANGE-LOG.md`](CHANGE-LOG.md) — pending entries awaiting
  Anthony's triage in client hat; count unverified.
- Merged: PR #76 https://github.com/mp3anthony/funded/pull/76 (`v0.9.4`)
- Closed: #73 https://github.com/mp3anthony/funded/issues/73 (kept as the written
  record of the health-score investigation and its two wrong diagnoses)
- Open: #74, #75, #71, #37

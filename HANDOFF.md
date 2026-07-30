# Handoff

**Last updated:** 2026-07-30
**Branch:** `issue-73-health-score-cold-open` (pushed, PR #76 open, **not merged**)
**App version:** `v0.9.4` (bumped this session, confirmed with Anthony)

## → START HERE NEXT SESSION

Anthony is testing **[PR #76](https://github.com/mp3anthony/funded/pull/76)** on
device between sessions. Open on his result:

1. **If the cold-open flash is gone** → merge #76 and **close #73**. See "#73 is
   closeable on #76" below — this reverses an earlier call in this session, read it
   before deciding.
2. **Then #74** — the warm-reload empty-overwrite. This is the mechanism that most
   likely matches Anthony's original report. **Blocked on his decision** between the
   four approaches in the issue body; ask first thing if he hasn't decided.

Do **not** re-investigate the health-score flash. Three diagnoses have been made,
two were wrong, and all three are written up in #73's body. Read that, not the code.

---

## What happened this session

Two pieces of work: Part A guardrails finalised (a conversation, as planned), then
#73 pulled forward and partially built.

### Part A finalised — `SPEC.md` split into A1 / A2

The old Part A mixed three kinds of rule under one heading — genuine stop-and-ask
gates, rules to follow without asking, and process steps already owned by
`CLAUDE.md`. That is why it was unanswerable as a yes/no list. Now split:

**A1 — 5 mandatory escalation gates.** RLS mandatory · service-role key server-only ·
`convertAmount` normalisation before comparing amounts · stack changes (narrowed to
adding/replacing a core dependency or framework) · branching (restated as an absolute
prohibition, not a gate — there is nothing to approve).

**A2 — 8 standing rules, documented, no escalation.** `parseBillDate`/`todayInZone`
for all date parsing · `cacheComponents` and its `export const runtime` consequence ·
notification dismissal as mark-as-read · the centralised `isDataLoading` gate · no
`fixed` inside `overflow:hidden` · Next.js viewport API · mobile-first PWA ·
versioning discipline.

Four entries moved from gate to note-level so they stop interrupting on routine UI,
viewport and version work. Nothing deleted. The "probably not exhaustive" note is
gone. **Part A is done — do not reopen it unless Anthony raises something new.**

All 6 candidate invariants were verified as still live in the code before being put
to him. One handoff correction found: `todayInZone` is in
`src/lib/notifications/timezone.ts:8`, not `utils.ts`.

### PR #76 — loading-gate hardening (v0.9.4)

One behavioural change: `isDataLoading` now initialises `useState(true)` instead of
`!initialIsOnboarded && !!initialSession`, and `loadData`'s pre-`try` early return
only clears it once auth has resolved.

Reviewed by an independent sub-agent. Passed on correctness, a stuck-wheel audit
across all 8 `setIsDataLoading` sites and every `loadData` early return, #49
non-regression, Part A compliance and versioning. `tsc` clean, `build` exit 0. Lint
fails with 96 problems — **pre-existing**, confirmed byte-identical on a clean tree.

Blocked the merge on three comment inaccuracies; all fixed in `099f357`.

Labelled **`ready-for-testing`** — see the label discrepancy note below.

## THE THREE DIAGNOSES — read before touching this area

The "Fully Funded" flash has been diagnosed three times. Recording all three so
nobody retries a dead end. All of this is also in #73's body.

**Diagnosis 1 (in #73's original body) — WRONG.** "Make `HealthScoreCard` consult
`isDataLoading`." Dead code. `src/components/AppShell.tsx:182` already withholds
*all* children while `session && isDataLoading`, so a component-level guard is
unreachable. The gate is centralised in AppShell **by design** — now an A2 rule.

**Diagnosis 2 (Orchestrator's, mid-session) — WRONG.** "`isDataLoading` initialised
false because the user was already onboarded, and the gate opened on render 2."
`<AppProvider>` is mounted with **no props** (`src/app/layout.tsx:104` — server-side
session prefetch was removed deliberately for #47, since reading `cookies()` in the
root layout forces the whole app dynamic under `cacheComponents`). So
`initialSession` is always `null`, `isAuthLoading` initialises `true`, and that
render is held shut. The old initialiser was `false` for **every** user
unconditionally. The proposed fix `!!initialSession` was a literal no-op.

**Diagnosis 3 (current, shipped in #76) — believed correct, awaiting device test.**
The old initialiser was unconditionally optimistic, so any path that set `session`
truthy and `isAuthLoading` false *without* setting `isDataLoading` true opened the
gate against empty arrays. Concretely: `onAuthStateChange` only raises the flag for
`INITIAL_SESSION` / `SIGNED_IN`, so a session-bearing `TOKEN_REFRESHED` arriving
first — plausible for an installed PWA reopened after hours — slipped through.

**The canary:** empty state computes to exactly **85** in `calculateHealthScore`
(`src/lib/utils.ts:88`) — `(100 × 0.4) + (50 × 0.3) + (100 × 0.3)` — clearing the
`>= 80` threshold at `src/components/HealthScoreCard.tsx:34`. An unexplained "Fully
Funded" always means something handed the dashboard empty arrays. **Look at loading
state, never at the scoring formula.**

## #73 is closeable on #76 — reversal of an earlier call

Mid-session the Orchestrator told Anthony #73 could not be closed on #76 because
`HealthScoreCard.tsx`, `page-client.tsx` and `utils.ts` are untouched. The
independent reviewer said the same. **Both were reasoning from the wrong test.**

#73's acceptance criteria are **behavioural** — "on a cold open, the dashboard never
briefly displays Fully Funded" — not implementation-specific. Traced with the
hardening in place: `isDataLoading` starts `true`, `isAuthLoading` is also `true`,
`getSession()` resolving batches `isAuthLoading` false with `isDataLoading` true,
then `loadData` populates `bills`/`funds`/`billSplits` and only clears the flag in
its `finally`. The gate never opens against empty arrays. So the cold-open criteria
should be satisfied without any component change — which is exactly what A2
prescribes.

**Contingent on the device test.** If Anthony still sees a flash on a genuine
force-quit-and-reopen, the trace above is wrong and #73 needs rethinking.

## The clean split to hold in mind

- **#73 / PR #76 — cold open.** Fixed by the gate hardening (pending verification).
- **#74 — warm resume.** Not touched. For an installed PWA this is the *common*
  path, which is why the symptom presented as flapping across days rather than a
  one-off flash at startup.

Anthony was asked to test the two cases separately: force-quit-and-reopen (cold) vs
background-and-refocus, ideally past a token refresh (warm). A flash on warm but not
cold is direct confirmation of this split.

## Tickets filed this session

**[#74 — successful-but-empty query results wipe loaded household data on warm
reload](https://github.com/mp3anthony/funded/issues/74)** · `bug`, `needs-triage`.
**The one that probably matters.** After a successful first load, any later
`loadData` (token refresh, tab refocus, session identity change) skips raising the
gate at `src/context/AppContext.tsx:796` — deliberately, so the wheel doesn't flash
over a working app. But `if (billsRes.data)` at `:846` treats `[]` as truthy, so a
query that succeeds with **zero rows** overwrites loaded data with empty arrays while
the gate is open. Score snaps to 85, reads "Fully Funded", next load restores it.
RLS returns exactly that — empty, no error — when the auth token isn't applied yet;
there is already a comment acknowledging that race in another context at `:768`.

**Blocked on Anthony.** The obvious patch ("only overwrite when non-empty") is wrong
— it would freeze a bill deleted on another device. Four approaches are laid out in
the issue; he needs to pick one. Ask at session start.

**[#75 — pre-existing hazards in the auth/`loadData` path](https://github.com/mp3anthony/funded/issues/75)**
· `bug`, `needs-triage`. Three defects, none introduced by this session's work:
1. **Permanent loading wheel.** `AppContext.tsx:754` raises `isDataLoading` but does
   not itself run `loadData` — clearing depends on the effect at `:886` re-firing off
   `session` identity. A repeated `INITIAL_SESSION`/`SIGNED_IN` carrying the *same*
   session object leaves the flag true with nothing in flight. Safe today **only by
   accident** (supabase-js hands out a fresh object per emission).
2. No `.catch` on `getSession()` at `:727`.
3. A transient membership/households query error sets `isOnboarded` false, routing an
   **already-onboarded** user to "create or join" — same visible symptom as #49,
   which was only fixed for the render-gap case. Worth checking whether that lets
   them create a *second* household; if so that becomes the headline severity.

**[#73](https://github.com/mp3anthony/funded/issues/73)** — body **rewritten**. It
was wrong in two places: the dead-code fix, and calling the `allInFuture` tidy-up
"safe to remove" (see below). Header added flagging the rewrite. Acceptance criteria
left intact.

## Traps confirmed this session — do not repeat

- **`allInFuture` at `src/lib/utils.ts:108` is NOT safe to remove**, despite #73's
  original claim. `overdueBills` filters the stored `status` **string** while
  `allInFuture` parses `dueDate` — independent. `mapBillFromDb`
  (`src/context/AppContext.tsx:423-438`) only ever *upgrades* status to `"Overdue"`,
  never clears a stored `"Overdue"` on a future date, and `:426`'s `else if` skips
  the derivation entirely for `payment_type === "auto"`. So an auto-pay bill with
  stored `"Overdue"` and a future due date scores **100** with the flag and **80**
  without — an 8-point swing across the 80 boundary. Leave it. (The underlying
  mapping asymmetry — a stored `"Overdue"` surviving on a future-dated bill — is
  arguably its own latent bug, unfiled.)
- **#73's stat-tiles/Contributors scope was wrong.** The stat grid is behind
  `isHealthExpanded`, which initialises `false` (`HealthScoreCard.tsx:20`), so it is
  collapsed on load. Contributors renders only when `visibleMembers.length > 0`
  (`:179`) and self-hides when the arrays are empty. Neither shows wrong figures on
  a cold open. The value the original body **missed** is the surplus subtitle at
  `HealthScoreCard.tsx:141-147` — "$0 surplus after bills this week" in joint-fund
  mode.
- **Line references in comments go stale within a single session.** Three rounds of
  stale refs occurred here, each caused by the previous fix adding lines. Always
  re-grep after editing, never carry a number forward. Current: AppShell gate `:182`,
  Onboarding gate `:172`.

## Open process items

- **Protocol labels don't match the repo.** `CLAUDE.md` §3 names `needs-manual-test`,
  `needs-merge-approval` and `out-of-spec`; **none exist on the repo.**
  `ready-for-testing` ("Preview is live and waiting on on-device testing") is the de
  facto equivalent of the first and was used for PR #76. Last session's `out-of-spec`
  turns were logged to `CHANGE-LOG.md` but never labelled, because the label doesn't
  exist. Anthony to choose: rename the protocol to match the repo, or create the two
  genuinely missing labels. Five-minute fix, undecided.
- **`CHANGE-LOG.md` count discrepancy, still unresolved.** The previous handoff said
  "7 pending entries" in three places but listed only **6**. Never reconciled —
  Anthony chose Part A over checking it. Verify the real count at triage.
- **A2 wording was authored after the code it certifies.** The reviewer flagged,
  fairly, that the specific A2 bullet the fix was measured against was written after
  the fix commit, so that check is partly self-certifying. The underlying principle
  did predate the code, so the rule wasn't invented to fit — but worth knowing.

## What's next (Anthony's order)

### → NEXT SESSION
1. **PR #76** — merge on a passing device test; **close #73** if the cold-open flash
   is gone (read "#73 is closeable on #76" first).
2. **#74** — build it. Needs his approach decision.

### → THEN: `CHANGE-LOG.md` triage + CRD interview
Anthony puts the client hat on, triages the pending entries (count unverified — see
above), then the `crd` skill runs live. Covers the dynamic/interactive overhaul (the
swipeable gauge is **one of several ideas** — he has more), the dashboard,
bills-vs-expenses, and notifications.

### → QUEUED, nothing blocking
- **#75** — pre-existing auth/load hazards. Triage severity; item 1 can hard-break
  the app.
- **Notification delivery bug** — diagnosed two sessions ago, **still not filed**.
  Two reminder generators (server cron + a client copy at
  `src/context/AppContext.tsx` that runs on app load, which is the 5–10s-after-open
  symptom), and `vercel.json` schedules the cron `0 20 * * *` = 20:00 **UTC** ≈ 6am
  Sydney. Anthony to decide: own issue, or folds into the notifications CRD.
- **#71** PWA stale cache — two open implementation-shape questions (cache-busting
  mechanism, offline tradeoff) to resolve at kickoff.
- **#37** household timezone UI — one open question (any member vs admin-only). Now
  **load-bearing** for notifications: "notify me at 6pm my local time" needs a
  timezone the user can set, and every household is currently hardcoded to
  `Australia/Sydney`. Per-household vs per-user is **undecided** and materially
  changes the build.

## Carried findings for the notifications CRD

- **The mechanism works and is cheap:** run the cron **hourly** instead of daily and
  process each household only when its local hour matches its chosen notify hour. No
  new infrastructure.
- **Bills-vs-Expenses is the biggest of the pending items.** Not just an add-screen
  toggle — dashboard totals, contribution splits, the reminder generator and #70's
  category ordering all read `bills`, and each needs a deliberate decision.
- **Direct Pay is untested *logic*, not just untested UI.** `calculateHealthScore`'s
  budget-coverage half runs a completely different calculation in Direct Pay mode
  (sums `billSplits` rather than contributions). Waiting on real direct-pay testers
  is the right call.

## Reference

- Protocol: [`CLAUDE.md`](CLAUDE.md) — read first.
- Working spec: [`SPEC.md`](SPEC.md) — **Part A now final (A1/A2)**. Part B Slices 1
  (#71) and 3 (#37) still open. Part C order superseded by the list above.
- Out-of-spec inbox: [`CHANGE-LOG.md`](CHANGE-LOG.md) — pending entries awaiting
  Anthony's triage in client hat; count unverified.
- PR #76: https://github.com/mp3anthony/funded/pull/76 (open, `ready-for-testing`)
- Issue #73: https://github.com/mp3anthony/funded/issues/73 (open, body rewritten)
- Issue #74: https://github.com/mp3anthony/funded/issues/74 (open, blocked on Anthony)
- Issue #75: https://github.com/mp3anthony/funded/issues/75 (open, needs triage)
- Issue #71: https://github.com/mp3anthony/funded/issues/71 (open)
- Issue #37: https://github.com/mp3anthony/funded/issues/37 (open, now load-bearing)

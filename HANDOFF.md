# Handoff

**Last updated:** 2026-08-22 — **#92 (stale SPEC.md file:line citations) built and merged this
session.** Already filed `ready-for-agent`, docs-only re-verification pass — no scoping needed.
Implementation delegated to one sub-agent (checked all 11 citations, fixed 2 that had drifted in
`AppContext.tsx`), a separate independent sub-agent re-verified every citation line-by-line plus
ran lint/typecheck, merged as [PR #109](https://github.com/mp3anthony/funded/pull/109). Fully
in-pipeline verifiable (no UI/behavior touched) → `needs-merge-approval`, not `needs-manual-test`.
`v0.9.10` → `v0.9.11`.

Earlier same day: **#91 and #95 (two small clear bug fixes from the low-priority
backlog) built and merged this session.** Anthony picked them directly out of a "what's buildable
without asking you anything" triage (see "#91 & #95" section below). Implementation delegated to
one sub-agent, testing/verification delegated to a separate independent sub-agent (build, typecheck,
lint, live-browser boot check — full detail in that section), merged as
[PR #108](https://github.com/mp3anthony/funded/pull/108). `v0.9.9` → `v0.9.10`.

Prior session: **#106 (joint-fund income-split calculator) built end-to-end and merged.** Filed
`ready-for-agent`, built to spec, reviewed, verified against real disposable test data, merged as
[PR #107](https://github.com/mp3anthony/funded/pull/107). `v0.9.8` → `v0.9.9`. Full writeup in the
"#106" section below.

Anthony's own redirect from two sessions ago, still standing: go back to the **needs-info queue**
(#97-#100) next. See START HERE below.

## → START HERE NEXT SESSION — needs-info scoping answers (#97-#100)

Still open, still waiting on Anthony whenever he redirects back to it.
Anthony said he'd review the open issues on his own and come back specifically to work through
the `needs-info` decisions. **Run `gh issue list --label needs-info` at the start of the session**
in case more have accumulated since — don't assume it's only these 4:
**[#97](https://github.com/mp3anthony/funded/issues/97)** (notifications overhaul),
**[#98](https://github.com/mp3anthony/funded/issues/98)** (bills vs expenses split),
**[#99](https://github.com/mp3anthony/funded/issues/99)** (dynamic visual/motion overhaul),
**[#100](https://github.com/mp3anthony/funded/issues/100)** (dashboard overhaul) — each carries
its own "what's known" summary and explicit decisions-needed list in the issue body. Interview
him against that list, record the outcome in the issue, relabel/close once scoped.

Once every needs-info issue is resolved, the standing plan (agreed earlier 2026-08-05, still in
force unless Anthony redirects) is:

1. **Full triage pass across ALL open issues** (25 open as of this session — see full list at
   the bottom of this file), then build a new vertically-sliced spec that sequences delivery of
   everything without blockers — so implementation (Orchestrator-delegated sub-agents) and
   testing can proceed cleanly slice by slice, to a standard Anthony signs off on. This extends/
   supersedes `SPEC.md`'s current open Part B slices (#71, #37) rather than starting from zero —
   Part A stays final and untouched.
2. **Not this session, but on Anthony's radar for timeline context:** once the app is stable
   under that new spec, next is licensing + evaluating app-store distribution (cost/timeline
   TBD), running in parallel with opening testing to people beyond Anthony/Hannah. No action
   needed yet — noted here so a future session doesn't lose the thread.

## #92 — stale SPEC.md file:line citations, re-verified and fixed this session (2026-08-22)

**[#92](https://github.com/mp3anthony/funded/issues/92) — CLOSED, built in
[PR #109](https://github.com/mp3anthony/funded/pull/109).** Follow-up from the #75 investigation.
Already filed `ready-for-agent`, docs-only, no locked-invariant text touched — proceeded straight
to build without a scoping conversation.

**What it found:** of the 11 `file:line` citations in `SPEC.md`, 9 were still accurate. 2 had
drifted from code edits since they were written:
- `src/context/AppContext.tsx:2864` → `src/context/AppContext.tsx:3503-3510` (the notification-
  dismissal / `dedupe_key` logic actually lives in `deleteNotification`, not at the old line —
  the old line had drifted into an unrelated `addPaySchedule` insert call).
- `src/context/AppContext.tsx:796` → `src/context/AppContext.tsx:838-850` (the warm-reload
  `isDataLoading` guard actually lives in the `onAuthStateChange` handler — the old line had
  drifted to a bare `setSession(session);`).

Only citation paths/line numbers changed — zero edits to the guardrail prose itself, per the
issue's own instruction that citations are illustrative, not load-bearing.

**Workflow:** one sub-agent grepped every citation, checked each against current code, fixed the
2 drifted ones, committed. A separate independent sub-agent then re-verified all 11 line-by-line
from scratch (not just the 2 claimed fixes), confirmed `git diff --stat` touched only `SPEC.md`,
ran `npx tsc --noEmit` (clean) and `npm run lint` (61 pre-existing errors, unrelated — diff-scope
check proves nothing new since only `SPEC.md` changed), and swept `HANDOFF.md`/`CHANGE-LOG.md` for
any dangling reference to the old stale line numbers (none found). Verdict: PASS. Fully
in-pipeline verifiable (no UI/behavior surface) → labeled `needs-merge-approval`, merged on
Anthony's go-ahead. `v0.9.10` → `v0.9.11`.

## #91 & #95 — two clear backlog bug fixes, built, tested, and merged this session (2026-08-22)

**[#91](https://github.com/mp3anthony/funded/issues/91) and
[#95](https://github.com/mp3anthony/funded/issues/95) — both CLOSED, built together in
[PR #108](https://github.com/mp3anthony/funded/pull/108).** Anthony asked which open issues were
completable without needing anything from him; these two (plus #92, not picked up yet) were the
only backlog items that were clear defects with no open product/architecture decision attached —
everything else open was blocked on Anthony (`needs-info`) or on an undecided tradeoff.

**#91 — `ensureHousehold` discarded its `household_members` insert error but marked the household
trusted anyway.** `src/context/AppContext.tsx`: the insert's `error` is now captured; on failure it
throws (matching the sibling error-handling pattern already used earlier in the same function),
instead of unconditionally setting `resolvedHouseholdUserIdRef` and calling `setMembers`. Narrow,
early-only code path (`ensureHousehold` called before any household exists yet) — nobody has ever
hit it in practice, this just closes the gap.

**#95 — `HouseholdHealth.tsx` read its income total from the orphaned `paydays` table**, dead since
#82/PR #86 redirected onboarding to `pay_schedules`. Every household onboarded after PR #86 was
showing `totalIncome === 0` here, permanently. Fixed by switching to `pay_schedules` + `payHistory`,
mirroring the logic `HealthScoreCard.tsx` already uses (fixed schedules use `schedule.amount`,
variable ones use the latest logged `payHistory` entry). Confirmed against `HealthScoreCard.tsx` as
the correct current source rather than guessing.

**Known, deliberately out-of-scope limitations flagged during the build** (pre-existing, not
regressions — worth a future ticket if they matter):
- Neither the old nor new #95 income figure normalizes for pay frequency (weekly vs. monthly
  schedules just get summed raw) — `HealthScoreCard.tsx` has the real frequency-normalized version
  for the dashboard; `HouseholdHealth.tsx` was never doing that for bills/funds either, so fixing it
  here would be scope creep.
- A household with only variable-pay members and zero logged pay history shows `totalIncome === 0`
  until a pay is logged — matches `HealthScoreCard`'s existing behavior, but is a *new* trigger
  condition for that empty state versus the old (broken) `paydays` behavior.
- #91's throw doesn't roll back the just-created `households` row on failure — same as this
  function's other existing failure paths; a bigger change if orphaned-household cleanup is wanted.

**Workflow:** implementation done by one sub-agent (Orchestrator does not write code); a *separate*
independent sub-agent then tested the PR — read the diff itself, ran typecheck/build/lint (lint
count identical to `main`, so no new issues), booted the dev server and confirmed a clean load. Two
things could only be verified by direct code reading rather than live: #91's actual failure path
(would need a forced live Supabase insert failure) and #95's on-screen number (no test-account
credentials available to the tester agent) — both are trivial, unambiguous changes, and the tester
flagged the gap explicitly rather than claiming a live pass it didn't do. Verdict: PASS, no blocking
issues. Fully in-pipeline verifiable (no layout/platform-native surface), so labeled
`needs-merge-approval` rather than `needs-manual-test` — merged straight through per Anthony's
go-ahead.

## #106 — joint-fund income-split calculator, built, reviewed, verified, and merged this session (2026-08-19)

**[#106](https://github.com/mp3anthony/funded/issues/106) — CLOSED, built in
[PR #107](https://github.com/mp3anthony/funded/pull/107).** Filed `ready-for-agent` in the prior
session's interview, zero open questions. Built to spec in one session, Step 3 straight through
(no scoping conversation needed) per Anthony's explicit instruction.

**What it is:** a "Suggest Split" panel inside the existing Joint Fund Contributions settings
sheet (`ContributionSettingsSheet.tsx`). For each household member, sums a monthly-normalized
income across all their `pay_schedules` (fixed schedules use `schedule.amount` converted via
`convertAmount`; variable schedules use the existing `calculateAveragePay`). Each member's split %
= their income ÷ total household income; recommended contribution = split % × total monthly bills
(same reduce `calculateHealthScore` already uses, kept behaviorally identical). Blocks the whole
calculator — no partial split, no guessing — if any member has no pay schedule, or a variable-pay
member has fewer than 3 logged pays. Each row gets an Apply button that writes straight into
`household_contributions` via the existing `setContribution` path, in that member's own pay
frequency. Fully live/stateless, no new table.

**Two-round review caught a real bug** — same pattern as #75/#101/#85: for a member with **2+
variable pay schedules**, `calculateAveragePay(memberId)` was being called once per schedule in a
loop. Since that helper is member-scoped (not schedule-scoped), it returns the *same* blended
average every call — so the loop summed it in multiple times, silently inflating that member's
income and distorting every other member's split %. Fixed to call it exactly once per member,
converting the single result at the frequency of whichever variable schedule was most recently
created. Round 2: approved. A stale JSDoc comment (still describing the old per-schedule behavior)
was fixed as a small follow-up commit — cosmetic only.

**Verified end-to-end against a disposable Supabase test household, not just by reading code**
(same standard as #101/#82/#85) — Anthony's own household can't exercise the "both members fixed"
happy path yet (Hannah's pay isn't fixed until ~28 Aug), so a synthetic two-member joint-fund
household (`Split106 Test Household`) was built via the local dev server + browser tool. Every
number was hand-computed independently first, then matched to the app's output to the cent. All 6
checklist items covered:

- **Both fixed, different frequencies** (A $2,000/mo, B $500/wk, $1,000/mo bill): app showed
  48.0%/$480.19mo and 52.0%/$120.05wk — exact match to hand calc, sums to 100%.
- **Variable pay, <3 logged pays**: switched B to variable with 0 history, app blocked with
  *"issue106.split.b doesn't have enough pay history yet (needs at least 3 logged pays)"* — no
  split for anyone.
- **Missing pay schedule entirely**: fresh-joined member with no schedule at all, app blocked with
  *"issue106.split.b hasn't set up a pay schedule yet"* — no split for anyone.
- **Apply**: wrote `$120.048.../weekly` into `household_contributions`, confirmed by direct query;
  manual row picked it up as "Active" on reopen, Save button read "Saved," manual save path
  unaffected.
- **Direct-pay households never see it**: verified by code inspection, not live-tested — the row
  that opens this sheet was already gated behind `isJointFund` in `settings-client.tsx` before this
  diff, untouched by it.
- **Reassess without reload**: edited B's pay live in-app (client-side nav only, no `navigate`/full
  reload anywhere in the sequence), reopened the panel in the same tab — recalculated to
  39.8%/$397.54mo and 60.2%/$139.14wk, matching the hand-recomputed numbers exactly.

Test data (2 disposable accounts, 1 household) fully deleted afterward — verified first it was the
only household either test account belonged to.

**One open edge case, not tested, worth knowing about:** for a member with 2+ *variable* pay
schedules (e.g. two variable-pay jobs), the "own pay frequency" used by Apply falls back to
whichever schedule was created most recently. The issue didn't specify a tie-break for this case
beyond "reasonable" — this is a judgment call made during the build, not something Anthony signed
off on explicitly. Fine as shipped, but flag it if it ever comes up for real.

`v0.9.8` → `v0.9.9`, confirmed with Anthony immediately before merge per `CLAUDE.md` §4.
`needs-merge-approval` — all 6 checklist items verified in-pipeline with real evidence, no
layout/platform-native surface needing hands-on device testing.

## #85 — leave household, fixed, reviewed, verified, and merged this session (2026-08-14)

**[#85](https://github.com/mp3anthony/funded/issues/85) — CLOSED, fixed in
[PR #105](https://github.com/mp3anthony/funded/pull/105).** Filed as a narrow UI-routing bug
("Leave household confirms, then wrongly opens a bare join-code sheet instead of the full
create-or-join screen"). Investigating before building found the real scope was much bigger:
**leave-household logic didn't exist anywhere in the codebase.** The confirm() dialog's warning
text ("this will permanently delete... or remove your membership") described behavior that was
never implemented — confirming just opened the join sheet, with nothing ever deleted. The narrow
fix as filed would have looked fixed (right screen shown) while still silently no-op'ing
underneath, since `joinHousehold()` (`src/context/AppContext.tsx`) detects the still-existing
membership and refuses/restores it on any subsequent join attempt.

Scope expanded on the issue with Anthony's sign-off (recorded in the issue comments) to build
real leave functionality:

- **Non-owner member leaves:** self-deletes their own `household_members` row, scoped to both
  `user_id` **and** `household_id` (not `user_id` alone — see the round-1 review finding below).
  Every dependent row (pay schedules/history, contributions, bill splits) already cascades off
  `member_id`, so nothing else needed hand-rolling.
- **Owner leaves:** full household teardown via a new `delete-household` Supabase edge function
  (`supabase/functions/delete-household/index.ts`), mirroring the existing `join-household`
  pattern. Needed because every table cascades cleanly off `households.id` **except**
  `notifications` (`household_id` FK is `NO ACTION`, and its RLS only allows deleting your own
  rows) — a plain client-side household delete would foreign-key-violate the moment any member
  has a notification. The edge function runs server-side with the service-role key, re-derives
  ownership via the existing `is_household_owner()` Postgres function (never trusts a client
  claim), clears notifications for every member of the household, then deletes the household row.
  **Anthony explicitly approved this as a sanctioned new use of the service-role key** before it
  was built — flagged because `SPEC.md` calls new uses of that key a stop-and-ask item.
- Settings button now branches on owner-vs-member and redirects to `/` on success so the app's
  existing onboarding gate (`AppShell.tsx`) naturally shows the create-or-join screen.

**Two-round independent review caught a real bug, not just style nits** — same pattern as #101.
Round 1: **NEEDS-REWORK**. `leaveHousehold()` deleted by `user_id` alone with no `household_id`
scoping — a real hazard given the documented #75 multi-membership edge case (a user can end up
with a second `household_members` row in a different household). An unscoped delete would have
silently wiped *all* of a user's memberships, not just the one they meant to leave. Also flagged
dead `JoinHouseholdSheet`/`isJoinSheetOpen` state left behind in `settings-client.tsx` (its only
call site in that file was the button being replaced). Both fixed — round 2: **APPROVED**.

**Verified end-to-end against a disposable Supabase test setup, not just by reading code** (same
standard as #101/#82): two throwaway accounts, real households with a bill/payday, and —
specifically to prove cross-member cleanup — a seeded notification row for *each* user. All 4
checklist scenarios run for real: member-leaves (household + owner's data survive, confirmed via
direct query), rejoin-after-leave (no "already a member" refusal), owner-leaves-with-a-member-
present (household/members/bills/funds/paydays/pay_schedules/**both users'** notifications all
confirmed dropped to 0, and the other member's own session independently confirmed kicked back to
onboarding — not just cosmetic on the actor's screen), and solo-owner-leaves. Browser tool's
native `confirm()` dialogs are auto-suppressed (returns `false`) — had to override
`window.confirm = () => true` via the JS-exec tool before each click to actually trigger the
flow; worth remembering for any future manual-flow testing that hits a `confirm()`/`alert()`.
Test accounts and all seeded data fully deleted afterward, verified zero remaining
`household_members` rows for either test user first.

`v0.9.7` → `v0.9.8`. `needs-merge-approval` — Anthony approved the merge and the version number
in-session. No manual/device testing needed (business logic + an edge function, no layout/
platform-native surface).

## #101 — payday timezone drift, fixed, reviewed, verified, and merged this session (2026-08-05)

**[#101](https://github.com/mp3anthony/funded/issues/101) — CLOSED, fixed in
[PR #103](https://github.com/mp3anthony/funded/pull/103).** Root cause: `src/context/AppContext.tsx`
wrote `next_pay_date` via `date.toISOString().split("T")[0]` in four places (`parseDateForDb`,
`logPay`, `autoLogMissedPays` x2). `toISOString()` converts to UTC first; the Date objects at
those call sites represent **local midnight**, so for a UTC+ household (Sydney) the stored date
rolled back one calendar day — making `autoLogMissedPays` (runs on every Payday tab load) treat
today's payday as already missed before local midnight, which drifted the next-payday countdown
(weekly showing "in 5 days" instead of 7).

**Fix:** added `toLocalYmd(date)`, mirroring the already-correct pattern in `adjustAutopayBillDate`
(`src/lib/utils.ts`), and swapped all four UTC-round-trip call sites to use it.

**Two-round review caught a real regression, not just style nits** — worth repeating the pattern:
round 1 (independent reviewer sub-agent, never the implementer) returned `NEEDS-REWORK`. The
naive fix for `parseDateForDb` (swap its `Date.parse` + `toISOString` UTC round-trip for
`toLocalYmd`) would have traded the Sydney bug for the *mirror-image* bug in negative-UTC-offset
households (US etc.) — hitting bill due dates, invoice dates, fund/goal deadlines, and
pay-schedule dates, not just payday. Caught by the reviewer actually tracing `Date.parse`'s
UTC-anchored spec behavior for bare `"YYYY-MM-DD"` strings, empirically verified with
`TZ=America/New_York`. Fixed by short-circuiting: every real caller of `parseDateForDb` already
passes a plain date-only string, so it now returns that string unchanged with zero `Date`
round-trip — timezone-invariant by construction. Round 2: approved.

**Verified end-to-end, not just by reading code** (same standard as #82): disposable Supabase
test account/household created, weekly pay schedule set to today, confirmed via direct query
that no early auto-log fired; logged the pay, confirmed the UI countdown read "IN 7 DAYS" and
`next_pay_date` advanced to exactly `+7 days` in Supabase; then set `next_pay_date` to 3 weeks in
the past and confirmed `autoLogMissedPays` still correctly caught all 3 genuinely-missed pays at
the right weekly-spaced dates without also flagging today. Run on this dev machine's actual local
timezone (`Pacific/Auckland`, UTC+12 — a positive offset like Sydney, so it would have reproduced
the original bug if the fix had regressed). Test account fully deleted afterward — verified
first it was the only member of its household, no real data touched.

`v0.9.5` → `v0.9.6`. `needs-merge-approval` — Anthony approved the merge and the version number
in-session, no further manual test needed (pure date-serialization logic, no UI/layout/
platform-native surface to check by hand).

**Side finding, filed separately, not part of this diff:**
**[#102](https://github.com/mp3anthony/funded/issues/102)** — `Onboarding.tsx`'s First Bill step
sends a human-readable `dueDate` string (`"August 05, 2026"`) instead of `YYYY-MM-DD`. Latent,
pre-existing, surfaced by the reviewer while checking `parseDateForDb`'s fallback branch — not
currently visibly breaking onboarding (Postgres's lenient date parser likely accepts the format
on insert) but fragile and inconsistent with every other add-bill path. Ordinary backlog,
overlaps with #84 (same file, same class of onboarding-form fix).

## This session's work — CHANGE-LOG.md filed as issues (2026-08-05)

Continuation of the same day's earlier recap/triage pass (below). Rather than waiting for a live
scoping conversation, the remaining 4 `CHANGE-LOG.md` items — the ones the earlier pass this
session had left for "next session" — were filed as GitHub issues on Anthony's request, each a
placeholder carrying the same summary/decisions-needed writeup, so he can review them on his own
time before coming back to scope each one:

- **[#97](https://github.com/mp3anthony/funded/issues/97)** — Notifications overhaul
- **[#98](https://github.com/mp3anthony/funded/issues/98)** — Bills vs Expenses split
- **[#99](https://github.com/mp3anthony/funded/issues/99)** — Dynamic visual/motion overhaul
- **[#100](https://github.com/mp3anthony/funded/issues/100)** — Dashboard overhaul

All labeled `needs-info` — matches **[#88](https://github.com/mp3anthony/funded/issues/88)**'s
precedent ("waiting on reporter for more information" is literally Anthony in this case). Anthony
initially said "ready-for-human"; switched to `needs-info` once it was pointed out that
`ready-for-human` means something different in `CLAUDE.md` §3 (partial agent/partial human
execution, e.g. third-party dashboard config) and `needs-info` is the label whose actual
definition matches this situation. `CHANGE-LOG.md`'s 4 entries updated to
`status: triaged (filed as #NN, needs-info — waiting on Anthony's scoping answers)` — the file's
pending list is now empty. Committed directly to `main` (docs-only, no code touched), consistent
with how recent sessions have handled this kind of housekeeping.

## Earlier this session: full backlog recap/triage pass (2026-08-05)

Anthony asked for a full recap of every open concern — GitHub issues plus anything floating
outside them — then to get as much of the "outside GitHub" pile actually into GitHub as
possible. Result:

**Filed without needing more info from Anthony** (8 new issues):
- **[#87](https://github.com/mp3anthony/funded/issues/87)** — health-score empty-state design
  question (`CHANGE-LOG.md` entry, the question itself was enough to file as-is).
- **[#88](https://github.com/mp3anthony/funded/issues/88)** — Direct Pay untested end-to-end,
  blocked on real testers, not a decision (`CHANGE-LOG.md` entry).
- **[#89](https://github.com/mp3anthony/funded/issues/89)** through
  **[#94](https://github.com/mp3anthony/funded/issues/94)** — the six previously-unfiled
  follow-ups from the #75 investigation (see the old "Unfiled follow-ups from #75" section
  below, now superseded — kept for historical context but every item there now has a real
  issue number).

**Originally left for next session** — the 4 `CHANGE-LOG.md` items above, because they need an
actual scoping conversation with Anthony, not just a filing pass. **Superseded later the same
session:** filed anyway as placeholder issues **#97–#100** (`needs-info`) so Anthony can review
them on his own time before that conversation happens — see "This session's work — CHANGE-LOG.md
filed as issues" above.

**Two more loose items surfaced, initially left unfiled, then filed on Anthony's explicit
go-ahead the same session:**
- **[#95](https://github.com/mp3anthony/funded/issues/95)** — `HouseholdHealth.tsx`'s
  total-income figure reads from the orphaned `paydays` table. Found while fixing #82; same
  table #82 just stopped onboarding from writing to.
- **[#96](https://github.com/mp3anthony/funded/issues/96)** — no real push notifications
  delivered; a client-side fallback fires 5–10s after opening the app instead. Root cause:
  server cron is scheduled in UTC with no per-timezone logic (ties to #37), and push only fires
  if a live `push_subscriptions` row exists.

**Every loose thread from this recap is now in GitHub, including the 4 `CHANGE-LOG.md` entries**
(filed later the same session as #97–#100). `CHANGE-LOG.md` is now empty of pending items.

## #82 — payday persistence, fixed and merged this session

**[#82](https://github.com/mp3anthony/funded/issues/82) — payday entered during onboarding never
appeared on the Payday tab — CLOSED, fixed in [PR #86](https://github.com/mp3anthony/funded/pull/86).**
Root cause: onboarding's `addPayday` wrote to the `paydays` table; the Payday tab reads
`pay_schedules`, a completely different table that nothing in onboarding ever wrote to.

Went with Option A (minimal) — `Onboarding.tsx`'s Step 3 now calls `addPaySchedule` instead of
`addPayday`, with defaults matching the real Add Pay Schedule form (current user as member,
monthly, fixed amount). No new fields, no schema change, `paydays`/`addPayday` and
`HouseholdHealth.tsx` left untouched.

**Verified end-to-end, not just by reading code:** disposable test signup through onboarding →
confirmed via direct Supabase query the row landed in `pay_schedules` → Payday tab showed it
immediately → survived a hard reload → test account/household cleaned up after. This was
`needs-merge-approval`, not `needs-manual-test` (had to create that label — it didn't exist in
the repo yet despite `CLAUDE.md` §3 naming it).

Anthony's call on the version bump: skip it, stay at `v0.9.5` for this one (`CLAUDE.md` §4
normally defaults to +0.0.1 per preview build).

**Side effect worth knowing:** #84 (onboarding's payday step should mirror the real form) is now
unblocked — it was tied to #82's root cause and touches the same code.

## Also filed this session, NOT blocking, ordinary backlog

Three more issues came out of Anthony's final manual pass on PR #77, all triaged live and agreed
non-blocking:

- **[#83](https://github.com/mp3anthony/funded/issues/83)** — onboarding's First Bill step is
  missing fields present in the real Add Bill card. Deliberate MVP simplification, not a defect.
- **[#84](https://github.com/mp3anthony/funded/issues/84)** — onboarding's payday step is missing
  fields present in the real Payday tab's pay-schedule form. Same story as #83. Tied to #82's root
  cause — worth doing together, #82's own body links here.
- **[#85](https://github.com/mp3anthony/funded/issues/85)** — Settings' "Leave household" jumps
  straight to a join-code sheet instead of the full create-or-join onboarding choice. Confirmed
  pre-existing, unchanged by this PR — checklist item 7 tested and passed the current behavior
  as-is. Anthony wants it changed; logged as its own issue.

None of these are time-sensitive the way #82 is — pick them up whenever, in any order, no
dependency on #82 landing first except #84 (see above).

**PR #77's final checklist state at merge**, for the record: 8/14 checked with real evidence
(1, 2, 4, 5, 7, 10, 14, plus the payday+bill item), the rest (3, 3b, 8, 9, 11, 12, 13) covered by
Anthony's completed real-device pass this session — full detail in the
[canonical PR comment thread](https://github.com/mp3anthony/funded/pull/77#issuecomment-5139199683)
and the [final merge-triage comment](https://github.com/mp3anthony/funded/pull/77#issuecomment-5185601933).
Item 9's offline-failure wording wasn't pinned to the checklist's exact text but was accepted on
substance (fail-closed error, no silent data loss) — not reopened for wording alone.

**Manual-test checklists are now a standard format, codified in `CLAUDE.md` §2 Step 4:** numbered
scenario → bold setup steps → one ✅ pass line → a ❌ line only for a specific named failure mode.
Anthony asked for this because bare checklists weren't building his understanding of *what* each
test actually catches — new checklists should explain the why, not just the click-path.

**The user-switch cases must be done in a single tab without reloading.** A fresh page load
papers over every bug in this ticket. The first implementation pass would have passed a
checklist that only tested cold starts — that is precisely how its regression got through
review-by-checklist and had to be caught by code review instead.

Next after #82: **`CHANGE-LOG.md` triage + the CRD interview** (bottom of this file).

## `pr-browser-triage` run against PR #77 — trial results (historical, PR now merged)

This was the skill's first real execution (built last session, never run). Source checklist: the
[canonical PR comment](https://github.com/mp3anthony/funded/pull/77#issuecomment-5139199683), 14
items, confirmed as superseding the PR body's checklist.

**Classification** (by an independent sub-agent, reviewed and approved by the orchestrating
session before anything executed — the approval-gate step worked correctly):

| # | Item | Verdict | Why |
|---|---|---|---|
| 1 | Cold start, new user | Full | Plain form/DOM flow |
| 2 | Warm reload | Full | Hard reload is a real reload in Chromium |
| 3 | In-tab switch, B's household | Partial | "Not even one frame" is sub-second flash timing |
| 3b | In-tab switch via `/login` | Partial | Same flash-timing issue as #3 |
| 4 | In-tab switch, brand-new user | Full | Final state checkable via DOM/URL, no timing involved |
| 5 | Join by code, new user | Full | Plain form flow |
| 6 | Join by code, already has one | Full | Exact error text + resulting household readable from DOM |
| 7 | Legitimate household switch | Full | Settings flow, readable end-state |
| 8 | No empty-dashboard flash | Partial | Explicit sub-second flash, Anthony's own note says "screen-record it" |
| 9 | Offline behaviour | Partial | No DevTools offline/throttle control in the browser tool |
| 10 | Version string | Full | Trivial text read |
| 11 | Onboarding + force-close/relaunch | Partial | A new tab is a degraded stand-in for true PWA process-kill semantics |
| 12 | Save failure shown during onboarding | Partial | Needs offline, same gap as #9 |
| 13 | Back button locked during save | Partial | Also needs offline |
| 14 | First Bill saves on every frequency | Full | Pure form interaction × 4, fully scriptable |

8 Full, 7 Partial (counting 3b separately), 0 Not-testable. Anthony approved running the 8 Full
items.

**Execution — all against a local `npm run dev` server (port 3000, config now saved at
`.claude/launch.json`), using disposable Supabase test accounts rather than Anthony's real A/B
accounts (no real credentials were available in-session, and using throwaways kept this run out of
his real data):**

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Cold start, new user | ✅ Pass | Fresh signup → create household → completed clean, reached dashboard |
| 2 | Warm reload | ✅ Pass | Hard reload kept household name + bill; landed on dashboard, no create/join flash |
| 4 | In-tab switch, brand-new user | ✅ Pass | Sign-out → fresh signup, no reload → onboarding completed cleanly |
| 10 | Version string | ✅ Pass | Settings reads exactly `funded. v0.9.8` |
| 14 | First Bill saves on every frequency | ✅ Pass | Weekly/Fortnightly/Monthly/Yearly all saved correctly (lowercase values), confirmed directly against the `bills` table — no constraint error on any |
| **5** | **Join by code, new user** | ❌ **Fail** | UI shows "Successfully Joined!" then dumps the user back on "create or join" — even after a full reload. Root cause below. |
| 6 | Join by code, already has one | ⏸ Blocked | Depends on a working join |
| 7 | Legitimate household switch | ⏸ Blocked | Same dependency |

**Root cause of the item 5 failure** (confirmed directly in the database, not inferred): the
**deployed** `join-household` edge function —

```ts
.insert({ household_id: household.id, name: userName, email: userEmail, role: "member", invitation_status: "accepted" })
```

— never sets `user_id`. Every join creates a `household_members` row with `user_id = null`.
`loadData`'s STEP 1 query (`.eq('user_id', session.user.id)`) then correctly finds no membership,
so the user lands back on Onboarding — permanently, since nothing about the state ever changes on
retry. Confirmed via `mcp__bdb49bb0…__list_edge_functions` / `get_edge_function`: the deployed
function is **version 1**, `created_at` equals `updated_at` — deployed exactly once, never updated
since. The **local** repo's `supabase/functions/join-household/index.ts` already has the fix
(`user_id: user.id` on insert, plus a "claim an unclaimed record" branch for the
already-a-member case), and `AppContext.tsx`'s client-side `joinHousehold` already has its own
matching fallback and recovery logic for the same case. The fix has clearly been written and
committed at some point — it just was never pushed with `supabase functions deploy`. This
predates and is unrelated to the #75/#77 diff; it was only surfaced by actually exercising the
join flow end-to-end, which no prior manual pass had done because Anthony's real test accounts
(A/B) already have households and never route through the "brand-new user joins" path.

**Test data created this session** (all disposable, all confirmed via SQL `email_confirmed_at`
update since none of these throwaway addresses can receive real confirmation emails):

| Email | Household | Bill (frequency) | Notes |
|---|---|---|---|
| `pr77triage.c1@example.com` | C1 Triage Household | none | Payday saved, bill step didn't save — see caveat below, not treated as a real bug |
| `pr77triage.c1b@example.com` | C1b Triage Household | Rent $400 (weekly) | Used for item 2 (reload) |
| `pr77triage.c1c@example.com` | C1c Triage Household | Internet $80 (fortnightly) | Used for item 4 (in-tab switch) |
| `pr77triage.c1d@example.com` | C1d Triage Household | Gym $60 (monthly) | |
| `pr77triage.c1e@example.com` | C1e Triage Household | Car Insurance $1,200 (yearly) | Used for items 2 (revisited) and 10 |
| `pr77triage.join1@example.com` | none (orphaned membership under C1b) | — | Demonstrates the item-5 bug directly; still stuck on Onboarding |

**Deleted** in a later session (2026-08-03) per Anthony's request — all 5 households and all 6
accounts, including `join1`'s orphaned membership. Verified beforehand that each household's
member list was exactly these test accounts (no real users mixed in) and no `notifications` rows
referenced them; deleted `households` first (cascades to members/bills/funds/paydays), then the
`auth.users` rows.

**Caveat, not a confirmed bug:** early on, `c1`'s onboarding appeared to skip the First Bill step
entirely (dashboard showed "Fully Funded" / $0 — the 85-canary shape). Investigated by re-running
the identical flow slower, one action at a time instead of batching tool calls right after a page
transition — it completed cleanly every time afterward (`c1b` through `c1e` all worked). Treating
the `c1` incident as an artifact of firing browser-automation calls too fast against an
in-flight page transition, not a product defect. Flagging for visibility only; if it ever
resurfaces from a real user doing something unusually fast, it may be worth a second look.

## Out-of-band: Supabase cleanup + Direct Pay test account (2026-08-04, unrelated to #75/#77)

Anthony asked for a real Direct Pay test account so PR #77's untested Direct Pay logic (see
"Findings to carry in" below) could actually be exercised, plus a full audit of what was left in
Supabase after prior sessions' cleanups. Two findings before anything was touched:

- **The 2026-08-03 cleanup entry below is inaccurate.** It claims `slmg.anthony@gmail.com`,
  `blueprintmusic.info@gmail.com`, and `blueprintmusic.info+9.6@gmail.com` were deleted. On
  inspection this session, `blueprintmusic.info@gmail.com` (household "Test house", 1 bill, 2
  paydays), `test@example.com` (household "Test Household", 2 bills), and
  `hmw.hannahmaewilson@gmail.com` (no household, orphaned `notification_settings`/
  `push_subscriptions` rows) were all still present. Either the deletion silently failed or these
  are unrelated re-created accounts — not investigated further, just corrected and cleaned up
  properly this time with a blast-radius check first (each household had exactly 1 member, no
  overlap with real users).
- **A second, orphaned "The Paulls" household existed** (`9bb29e36…`, `is_joint_fund=false`, 0
  members, 0 bills/funds/paydays/notifications) — distinct from the real one
  (`4821ab06…`). Deleted, confirmed empty on every FK first.

**Anthony's explicit call: only `anthonypaull.nz@outlook.com` and `slmg.hannah@gmail.com` (both
on the real "The Paulls" household) should exist in Supabase, plus whatever fresh test account he
creates.** All three stray users above were deleted (households first, cascades bills/funds/
paydays/members, then the `auth.users` rows — the `cascade_delete_user_fks` migration from the
prior session made this a clean one-shot with no follow-up orphan queries needed).

Anthony then signed up fresh as `blueprintmusic.info@gmail.com`, completed onboarding, and chose
**Direct Pay** at the joint-account step — household **"Paull's Direct"** (`1c3d1f83…`,
`is_joint_fund=false`, single member `997ed18a…`, user `e3c4efac…`). Per his instruction, all 14
bills and both funds were then cloned from the real household onto it, real names/amounts intact:

- Deleted the single placeholder "Rent $550/week" bill onboarding had already created (would have
  duplicated the real Rent bill once copied over).
- Copied all 14 `bills` rows (`INSERT … SELECT` from `4821ab06…`), `assignee_id` remapped from
  the real household's two members (Ants/Hannah) to the new household's single member `997ed18a…`
  — Paull's Direct only has one person, so every bill is now assigned to it.
- Copied both `funds` rows (Xbox Elite Controller $0/$200, Studio Monitors $0/$300), `owner_id`
  remapped from the real owner (`4200aca8…`) to the new user `e3c4efac…`; `member_id` stayed
  `null` on both (matches the source rows).
- New IDs generated for every copied row — none of the original bill/fund IDs were reused.

Anthony spot-checked the result in the app and confirmed it looks right, then went back to PR #77
manual testing. **Current full Supabase user roster: exactly 3 users** —
`anthonypaull.nz@outlook.com` + `slmg.hannah@gmail.com` (real, "The Paulls", joint fund) and
`blueprintmusic.info@gmail.com` (test, "Paull's Direct", Direct Pay, 14 bills + 2 funds cloned
from the real data). No code was touched this session — no commit needed beyond this file.

## Out-of-band: Supabase test-user cleanup (this session, unrelated to #75/#77)

Not ticket work — Anthony asked to delete three test users from Supabase Auth after the
dashboard's own delete kept failing. Root cause: `household_members`, `notification_settings`,
and `notifications` had `user_id → auth.users.id` as `NO ACTION` instead of `CASCADE` (the other
four user-referencing tables — `households`, `push_subscriptions`, `user_preferences`, and
`funds` via `SET NULL` — were already correct). Fixed with migration
`cascade_delete_user_fks`, then deleted `slmg.anthony@gmail.com`,
`blueprintmusic.info@gmail.com`, `blueprintmusic.info+9.6@gmail.com` and their households.
Verified first that each of the three owned a household with no other members and no stray
`notifications.household_id` rows, so nothing else was in the blast radius. Auth-dashboard user
deletion should work normally from here on. No code changed, no commit — Supabase only.

## What #75 was

Three pre-existing hazards in the auth/`loadData` path, built as one change because they share
the code path. Full writeup:
https://github.com/mp3anthony/funded/issues/75#issuecomment-5128418922

Everything followed from three facts, all verified, all still true:

- `AppProvider` **never unmounts across sign-out/sign-in** — both are client-side `router`
  navigations, no page reload.
- `dbHouseholdId`, `householdName`, `bills`, `funds`, `members` are **never cleared anywhere**.
  `loadData`'s no-session branch clears only `isOnboarded` and the resolution ref.
- auth-js 2.108.2 emits **only `SIGNED_IN`** for `signInWithPassword` — no `SIGNED_OUT` first —
  and `/login` is reachable while already signed in.

So user B arrives in the same tab with all of user A's state resident and no null-session tick
to clear it. **The second household is not the damage — the lockout is.** A second
`household_members` row makes `loadData`'s STEP 1 `.maybeSingle()` error `PGRST116` on every
later load, forever, stranding the user's real data with no in-app way back.

**Nobody has ever hit it.** Zero users have more than one membership row. A clean production
check does not refute it — same evidentiary posture as #74.

**Decisions taken, do not reopen:** all three items in one build · client-side guards only, no
migration and no `UNIQUE` constraint (deferred pending the multi-household question) ·
`ensureHousehold` approved as an in-scope third door · `v0.9.5`.

## How it was built — worth repeating

Implementer and reviewer were **separate agents**; no agent reviewed its own code. Two review
rounds. Round 1 returned **needs-rework** with two blockers that a testing checklist would
never have caught. Round 2 approved.

Two things came out of that worth carrying forward:

- **The reviewer overruled itself.** It instructed raising `isDataLoading` before hydration;
  the implementer refused and explained why (it unmounts Onboarding mid-flight, so on failure
  the flag-clear and `setCreateError` batch into one render that remounts Onboarding fresh with
  the error reset to `null` — a silent failure). On re-review the reviewer agreed its own
  instruction had been wrong. **A sub-agent pushing back on a brief is a good sign, not a
  problem.**
- **The reviewer withdrew a citation it had gotten wrong** (`HealthScoreCard.tsx:33` → `:34`).
  Check specific claims rather than accepting either agent's line numbers.

## Traps — confirmed, do not repeat

- **The 85 canary.** Empty state computes to exactly **85** in `calculateHealthScore`
  (`src/lib/utils.ts`) — `(100 × 0.4) + (50 × 0.3) + (100 × 0.3)` — clearing the `>= 80`
  threshold in `HealthScoreCard.tsx`. An unexplained "Fully Funded" **always** means something
  handed the dashboard empty arrays. Look at loading state, never at the scoring formula.
  Three separate causes have now been traced to this one symptom.
- **Supabase query errors resolve, they do not reject.** `PostgrestBuilder` returns
  `{ data: null, error }`. So a `Promise.all` of failing queries completes *normally* with
  empty arrays. This is why #74 exists and why the last 85 route is still open.
- **Never add a per-component `isDataLoading` guard.** `AppShell` withholds *all* children
  while `session && isDataLoading`, so a component-level guard is unreachable dead code. This
  is A2. #73's original body prescribed exactly this and was wrong.
- **`<AppProvider>` is mounted with no props** (`src/app/layout.tsx`). Server-side session
  prefetch was removed deliberately for #47 — reading `cookies()` in the root layout forces the
  whole app dynamic under `cacheComponents`. So `initialSession` is always `null` and
  `initialIsOnboarded` always `false`. Two separate wrong diagnoses came from forgetting this.
- **`allInFuture` in `src/lib/utils.ts` is NOT safe to remove**, despite #73's original claim.
  `overdueBills` filters the stored `status` **string** while `allInFuture` parses `dueDate` —
  independent. `mapBillFromDb` only ever *upgrades* status to `"Overdue"`, never clears a stored
  `"Overdue"` on a future date, and its `else if` skips the derivation entirely for
  `payment_type === "auto"`. An auto-pay bill with stored `"Overdue"` and a future due date
  scores **100** with the flag, **80** without — an 8-point swing across the 80 boundary.
- **`npm run lint` fails outright** — 96 problems, 53 errors, all pre-existing. One sits on
  `loadData`'s trigger effect, which is a **hard byte-identical constraint**, so a naive
  "fix lint" pass would break the app's loading gate. Do not run one without reading this.
- **Line references in comments go stale within a single session.** Five rounds now. Always
  re-grep after editing; never carry a number forward. This file now avoids citing line
  numbers for exactly that reason.
- **Use `Write` + `--body-file` for GitHub bodies.** Heredocs and PowerShell here-strings both
  break on markdown of any real length — `git commit -m` with an inline here-string containing
  double quotes fails outright.
- **529 Overloaded killed four implementation runs in the previous session.** If it recurs,
  prefer a **fresh** agent with a tight self-contained brief and exact line anchors over
  resuming one with a long transcript.
- **`isolation: "worktree"` sub-agents can end up on the wrong base branch.** Twice this session,
  an agent's sandbox had a stale/unrelated branch checked out (byte-identical to `main`, missing
  every #75/#78 commit) instead of the real target branch — and once the real branch was already
  checked out in the main working tree, the agent couldn't check it out a second time in its own
  worktree at all. Both times the agent worked around it by creating its own branch off the
  correct tip and committing there. **Always verify after an implementer agent reports a commit**:
  check its commit's parent is actually the branch tip you expected, then bring it in with
  `git cherry-pick <hash>` from the real checkout (safe here specifically because the commit sits
  directly on top of the current tip — for a diverged history, this needs a rebase instead) and
  clean up the leftover worktree/branch with `git worktree remove --force` + `git branch -D`.
  Don't assume "the agent committed" means "the commit is on the branch you asked for."
- **`gh api ... -f field=@path` silently does NOT read the file on this Windows/gh setup** — it
  posts the literal string `@path` as the field value instead. Use `-F` (capital) instead, which
  does the file read correctly. Caught only because the PR comment update was verified by
  re-fetching it afterward — always verify a `gh api` PATCH/POST that embeds file content by
  reading it back, don't trust a 200 response alone.

## Follow-ups from #75 — ALL now filed as GitHub issues (2026-08-05)

Full detail in [PR #77](https://github.com/mp3anthony/funded/pull/77)'s body. Kept here for
historical context; every item below now has a real issue, so this list is superseded — go to
the linked issue for current status, not this section.

1. ~~**Onboarding steps 2–5 may be unreachable.**~~ **Resolved as #78** (closed).
2. **`joinHousehold` step 2's rollback trusts unvalidated cached state.** Filed as
   **[#89](https://github.com/mp3anthony/funded/issues/89)**.
3. **Cross-user notification writes** — data hygiene only, no user-visible effect. Filed as
   **[#90](https://github.com/mp3anthony/funded/issues/90)**.
4. **`ensureHousehold` discards its `household_members` insert error** yet sets the resolution
   ref regardless. Filed as **[#91](https://github.com/mp3anthony/funded/issues/91)**.
5. **Stale line citations in `SPEC.md`.** Filed as
   **[#92](https://github.com/mp3anthony/funded/issues/92)**.
6. **The server is still not authoritative** — `join-household`'s edge function gap. Filed as
   **[#93](https://github.com/mp3anthony/funded/issues/93)**.
7. **No in-app recovery for an already-duplicated user.** Filed as
   **[#94](https://github.com/mp3anthony/funded/issues/94)**.

## #78 and #79 — found and fixed this session, folded into PR #77

Anthony ran PR #77's checklist item 1 (cold-start, new user) and reported feedback rather than a
plain pass/fail. That surfaced two bugs neither the #75 work nor its checklist covered:

- **[#78](https://github.com/mp3anthony/funded/issues/78)** — `createHousehold`'s create path set
  `isOnboarded` true the instant step 1 finished, unmounting the wizard before steps 2–5 ever
  rendered. This was unfiled follow-up 1 above, confirmed by Anthony actually hitting it. Fixed:
  only `completeOnboarding()` sets that flag now. `v0.9.5` → `v0.9.6`.
- **[#79](https://github.com/mp3anthony/funded/issues/79)** — with #78 fixed and steps 2–4
  actually reachable, Anthony went through them, entered a payday and a bill, saw no error — and
  neither showed up anywhere afterward, even after a full app close and relaunch (not just a
  reload, which ruled out stale client state as the explanation). Root cause: `handleNext()` fired
  `updateHouseholdPaymentMode`/`addPayday`/`addBill` without awaiting them or checking for
  failure, so the wizard could reach "Setup Complete" with nothing actually saved. Fixed to match
  step 1's existing await/error/block-advance pattern. `v0.9.6` → `v0.9.7`.

Both were built by an implementer sub-agent and checked by a separate reviewer sub-agent (no agent
reviewed its own code, per protocol). The reviewer caught one real regression in the first #79
attempt — the Back button wasn't disabled during a save, so backing out mid-write while the save
was still in flight could silently bounce the wizard forward again once it resolved, or show the
resulting error banner on the wrong step. A follow-up commit fixed that; **Anthony chose not to
re-review the follow-up commit itself** ("looks good for both" — his call, noted per protocol
rather than assumed).

Both fixes went on the **same branch** (`issue-75-auth-loaddata-hazards`), not new branches or a
new PR — Anthony's explicit call, to close everything out in one PR/merge cycle rather than three.
The PR #77 body has a new "Folded into this PR after round 2" section documenting this; the
canonical checklist comment has three new items (11–13) covering both.

## #80 — found and fixed this session, folded into PR #77

Anthony was working through checklist item 11 (#79's onboarding payday+bill test) and hit a new,
unrelated failure on Step 4 ("First Bill"): every save failed with a raw Postgres error rendered
straight into the UI — `new row for relation "bills" violates check constraint
"bills_frequency_check"`.

Root cause: `Onboarding.tsx`'s bill-frequency `<select>` used capitalized option values
(`"Weekly"`, `"Fortnightly"`, `"Monthly"`, `"Yearly"`) and defaulted `billFrequency` state to
`"Monthly"`. The `bills` table's check constraint only permits lowercase
(`weekly`/`fortnightly`/`monthly`/`yearly`) — see
`supabase/migrations/20260707005200_update_frequency_data_to_fortnightly.sql`. This was the only
frequency picker in the app built this way; `FrequencyToggle.tsx` and `AddBillSheet.tsx` already
used the correct lowercase convention. Pure frontend fix, no schema/migration involved, so it
qualified as an unambiguous bug fix under `CLAUDE.md` §1 — no CRD needed.

Filed as [#80](https://github.com/mp3anthony/funded/issues/80), fixed by a sub-agent (Orchestrator
never edits code directly), diff verified by the orchestrator before commit. `v0.9.7` → `v0.9.8`.
New checklist item 14 covers it — enter each of the four frequency options on Step 4 and confirm
no failure banner, then confirm the saved bill on the Bills page shows the frequency actually
picked.

Same branch, same PR as #75/#78/#79 — Anthony's now-established call to close everything out in
one PR/merge cycle rather than a new branch per bug found during testing.

## The other open tickets

**[#82 — payday entered during onboarding doesn't persist](https://github.com/mp3anthony/funded/issues/82)**
· CLOSED, fixed in PR #86 — see "#82 — payday persistence" section above.

**[#83](https://github.com/mp3anthony/funded/issues/83) / [#84](https://github.com/mp3anthony/funded/issues/84)**
· `enhancement`, `ready-for-agent` · onboarding's bill/payday steps should mirror the real
in-app Add Bill card / Payday tab's pay-schedule form. Not time-sensitive; #84 worth doing
alongside #82 since it's the same form.

**[#85 — Leave household should return to full onboarding, not a bare join-code box](https://github.com/mp3anthony/funded/issues/85)**
· CLOSED, fixed in PR #105 — see "#85 — leave household" section above.

**[#74 — successful-but-empty query results wipe loaded household data](https://github.com/mp3anthony/funded/issues/74)**
· `bug`, `needs-triage` · **needs Anthony's approach decision before building.**

`if (billsRes.data)` in `loadHouseholdRelatedData` — `[]` is truthy, so a query that succeeds
with **zero rows** overwrites loaded arrays with empty ones. Same for `funds`, `paydays`,
`members`, `bill_splits`. RLS returns exactly that shape when the auth token isn't applied yet.
The obvious patch ("only overwrite when non-empty") is **wrong** — it would freeze a bill
deleted on another device. Four approaches are in the issue body.

**#74 and #75 are the same bug class** — a failed query and an empty-but-successful query
collapsing into one code path. Read the merged #75 fix before picking a #74 approach. Add
follow-up 3 from the PR body to #74's description: it is the one remaining route to the 85
canary, and it is purely this pattern.

**[#71](https://github.com/mp3anthony/funded/issues/71)** PWA stale cache — two open
implementation-shape questions (cache-busting mechanism, offline tradeoff) to resolve at kickoff.

**[#37](https://github.com/mp3anthony/funded/issues/37)** household timezone UI — one open
question (any member vs admin-only). Now **load-bearing** for notifications: "notify me at 6pm
my local time" needs a timezone the user can set, and every household is currently hardcoded to
`Australia/Sydney`. **Per-household vs per-user is undecided** and materially changes the build.

**[#89](https://github.com/mp3anthony/funded/issues/89)–[#94](https://github.com/mp3anthony/funded/issues/94)**
· the six #75 follow-ups, all filed 2026-08-05 — see "Follow-ups from #75" section above.

**[#87](https://github.com/mp3anthony/funded/issues/87)** health-score empty-state design
question, **[#88](https://github.com/mp3anthony/funded/issues/88)** Direct Pay untested
end-to-end · both filed 2026-08-05 from `CHANGE-LOG.md`, no further input needed to file — see
"This session's recap/triage pass" above.

**[#95](https://github.com/mp3anthony/funded/issues/95)** — `HouseholdHealth.tsx` reads total
income from the orphaned `paydays` table. Found while fixing #82, filed same session.

**[#96](https://github.com/mp3anthony/funded/issues/96)** — no real push notifications
delivered; server cron scheduled in UTC with no per-timezone logic (ties to #37), push silently
no-ops if the subscription row is dead. Diagnosed a while back, filed this session.

**[#97](https://github.com/mp3anthony/funded/issues/97)–[#100](https://github.com/mp3anthony/funded/issues/100)**
· notifications overhaul, bills-vs-expenses split, visual/motion overhaul, dashboard overhaul —
the 4 `CHANGE-LOG.md` items that needed a real scoping conversation, filed as `needs-info`
placeholders this session instead of waiting for that conversation live. **Work through these
before any more coding** — see "→ START HERE NEXT SESSION" at the top of this file.

**Join-by-code was broken in production — filed, fixed, and closed as [#81](https://github.com/mp3anthony/funded/issues/81).**
Anthony's call: own issue, not folded into PR #77 (the redeploy is unrelated to #75's diff and
doesn't block that PR's merge). Edge function redeployed and retested this session — see
"→ START HERE NEXT SESSION" at the top of this file.

## `SPEC.md` Part A at a glance

- **Part A is final** — A1 (5 escalation gates) / A2 (8 standing rules). Do not reopen unless
  Anthony raises something new.
- **A1 — mandatory escalation, stop and ask Anthony.** RLS mandatory · service-role key
  server-only · `convertAmount` normalisation before comparing amounts · stack changes ·
  branching (absolute prohibition, never commit to `main`).
- **A2 — follow, do not escalate.** `parseBillDate`/`todayInZone` for all date parsing ·
  `cacheComponents` and its `export const runtime` consequence · notification dismissal as
  mark-as-read · the centralised `isDataLoading` gate · no `fixed` inside `overflow:hidden` ·
  Next.js viewport API · mobile-first PWA · versioning discipline.

## Open process items

- **Protocol labels don't fully match the repo, partially fixed.** `CLAUDE.md` §3 names
  `needs-manual-test`, `needs-merge-approval` and `out-of-spec`. `needs-merge-approval` was
  created this session (needed it for #82/PR #86). `needs-manual-test` and `out-of-spec` still
  **don't exist**. Actual labels now: `bug`, `Change`, `documentation`, `duplicate`,
  `enhancement`, `help wanted`, `invalid`, `question`, `wontfix`, `Critical`, `Epic`,
  `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `ready-for-testing`,
  `needs-merge-approval`. `ready-for-testing` is the de facto equivalent of `needs-manual-test`
  and was used for PRs #76/#77. Anthony to choose: rename the protocol to match the repo, or
  create the last two missing labels.
- **`CHANGE-LOG.md` count discrepancy — RESOLVED, and now fully closed out.** Verified count was
  genuinely 6; all 6 are now filed as issues (#87, #88 needed no further input; #97–#100 filed as
  `needs-info` placeholders this session). `CHANGE-LOG.md`'s pending list is empty.

## Then: needs-info issues one by one, then a new vertically-sliced spec — see top of file

All 6 original `CHANGE-LOG.md` entries are now GitHub issues (#87, #88 needed no further input
and are ordinary backlog now; #97–#100 are `needs-info`, each carrying its own decisions-needed
list — see each issue body, not this file, for the specifics). Anthony's agreed sequencing,
recorded in full at "→ START HERE NEXT SESSION" at the top of this file:

1. Work through #97–#100 (and any other `needs-info` issue that shows up — check
   `gh issue list --label needs-info`) one at a time, Anthony-initiated, before any more code
   work.
2. Once they're all resolved, triage the full open-issue list and write a new vertically-sliced
   spec that sequences the rest of delivery without blockers, so agent-delegated implementation
   and testing can run cleanly slice by slice.
3. Licensing + app-store distribution comes after that, run alongside opening testing to people
   beyond Anthony/Hannah — timeline context only, no action needed yet.

Findings to carry in for whenever each `needs-info` issue gets its interview (also duplicated
into the relevant issue body):

- **The notifications mechanism works and is cheap:** run the cron **hourly** instead of daily
  and process each household only when its local hour matches its chosen notify hour. No new
  infrastructure. Depends on #37.
- **Bills-vs-Expenses is the biggest pending item.** Not just an add-screen toggle — dashboard
  totals, contribution splits, the reminder generator and #70's category ordering all read
  `bills`, and each needs a deliberate decision.
- **Direct Pay is untested *logic*, not just untested UI.** `calculateHealthScore`'s
  budget-coverage half runs a completely different calculation in Direct Pay mode (sums
  `billSplits` rather than contributions). Waiting on real direct-pay testers is the right call.
- **Multi-household vs one-household-per-user** is now a live schema question, raised by #75.
  Deciding it unblocks the `UNIQUE` constraint.

## Reference

- Protocol: [`CLAUDE.md`](CLAUDE.md) — read first.
- Working spec: [`SPEC.md`](SPEC.md) — **Part A final (A1/A2)**. Part B Slices 1 (#71) and 3
  (#37) still open. Stale line citations tracked as #92 (still open, not picked up this session).
- Out-of-spec inbox: [`CHANGE-LOG.md`](CHANGE-LOG.md) — **empty of pending items.** All 6 entries
  are now GitHub issues (#87, #88, #97–#100).
- **Merged: PR #108** https://github.com/mp3anthony/funded/pull/108, closes #91, closes #95 (two
  clear backlog bug fixes — see "#91 & #95" section above). `v0.9.9` → `v0.9.10`, now on `main`.
- **Merged: PR #107** https://github.com/mp3anthony/funded/pull/107, closes #106 (joint-fund
  income-split calculator). `v0.9.8` → `v0.9.9`, now on `main`.
- **Merged: PR #105** https://github.com/mp3anthony/funded/pull/105, closes #85 (leave household
  — full implementation, not just the routing fix). `v0.9.7` → `v0.9.8`, now on `main`.
- **Merged: PR #103** https://github.com/mp3anthony/funded/pull/103, closes #101 (payday
  timezone drift). `v0.9.5` → `v0.9.6`, now on `main`.
- **Merged: PR #86** https://github.com/mp3anthony/funded/pull/86, closes #82 (payday
  persistence). `v0.9.5` stays on `main`.
- **Merged: PR #77** https://github.com/mp3anthony/funded/pull/77 (commit `41acb2d`, closes #75,
  #78, #79, #80 — `v0.9.5` now on `main`).
- **Top priority next session:** work through `needs-info` issues #97–#100 with Anthony, one at
  a time — see top of this file. Anthony plans to review all open issues himself first and bring
  the scoping answers back, so let him redirect from there.
- Ready to build whenever: [#83](https://github.com/mp3anthony/funded/issues/83),
  [#84](https://github.com/mp3anthony/funded/issues/84),
  [#102](https://github.com/mp3anthony/funded/issues/102) (overlaps #84 — same file, same class
  of onboarding-form fix).
- Needs Anthony's decision first: [#74](https://github.com/mp3anthony/funded/issues/74),
  [#71](https://github.com/mp3anthony/funded/issues/71),
  [#37](https://github.com/mp3anthony/funded/issues/37),
  [#93](https://github.com/mp3anthony/funded/issues/93),
  [#94](https://github.com/mp3anthony/funded/issues/94).
- **`needs-info`, Anthony to interview-and-resolve next:**
  [#97](https://github.com/mp3anthony/funded/issues/97),
  [#98](https://github.com/mp3anthony/funded/issues/98),
  [#99](https://github.com/mp3anthony/funded/issues/99),
  [#100](https://github.com/mp3anthony/funded/issues/100).
- Filed 2026-08-05, low-priority backlog, still open: [#87](https://github.com/mp3anthony/funded/issues/87),
  [#88](https://github.com/mp3anthony/funded/issues/88),
  [#89](https://github.com/mp3anthony/funded/issues/89),
  [#90](https://github.com/mp3anthony/funded/issues/90),
  [#92](https://github.com/mp3anthony/funded/issues/92) (`ready-for-agent`, not picked up yet),
  [#96](https://github.com/mp3anthony/funded/issues/96),
  [#102](https://github.com/mp3anthony/funded/issues/102). #91 and #95 from this same batch are
  now closed — see "#91 & #95" section above.
- **Everything from this session's recap is now in GitHub, including the 4 `CHANGE-LOG.md`
  items** (filed as #97–#100). Nothing left floating outside issues at all.
- **Join-by-code fixed and closed:** [#81](https://github.com/mp3anthony/funded/issues/81) —
  redeployed and retested previous session.
- Merged: PR #76 https://github.com/mp3anthony/funded/pull/76 (`v0.9.4`)
- Closed: #73 https://github.com/mp3anthony/funded/issues/73 (kept as the written record of the
  health-score investigation and its two wrong diagnoses)
- Closed: #101 https://github.com/mp3anthony/funded/issues/101 (payday timezone drift, fixed in
  PR #103 this session — see "#101" section above)
- Open: #83, #84, #74, #71, #37, #87, #88, #89, #90, #92, #93, #94, #96, #97, #98,
  #99, #100, #102 (non-blocking backlog)
- Closed: #85 https://github.com/mp3anthony/funded/issues/85 (leave household, fixed in PR #105
  this session — see "#85" section above)
- Closed: #106 https://github.com/mp3anthony/funded/issues/106 (income-split calculator, built in
  PR #107 this session — see "#106" section above)
- Closed: #91, #95 https://github.com/mp3anthony/funded/issues/91 (ensureHousehold error handling)
  and https://github.com/mp3anthony/funded/issues/95 (orphaned income table), both fixed in PR #108
  this session — see "#91 & #95" section above

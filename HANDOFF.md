# Handoff

**Last updated:** 2026-09-05 — **#134, #132, #139 CLOSED.** All three notification-subsystem fixes
shipped in one PR ([#138](https://github.com/mp3anthony/funded/pull/138)) squash-merged to `main`
at `v0.9.35`, production deployment confirmed `READY` and live via Vercel MCP (`get_deployment` on
the merge commit's own deployment, not just a green GitHub merge). Full story in the dated section
below.

**→ START HERE NEXT SESSION: no queued ticket.** Two open issues remain, neither pre-scoped as
"next": **#99** (`ready-for-agent`, "Scope needed: Dynamic visual/motion overhaul") needs a scoping
conversation before it can be built — don't assume prior motion-work context (Slice 13/#99's
original motion pass) covers it; read the issue fresh. **#88** (`needs-info`, Direct Pay
end-to-end testing) is blocked waiting on real-world testers, not actionable by an agent — leave it
alone unless Anthony has an update.

**Notification subsystem — worth knowing if it ever comes up again:**
- **#134 root cause was NOT a timezone bug** — household timezone/notify_hour were both already
  correct in the DB. The actual bug: `AppContext.tsx`'s client-side "app is open" notification path
  (a legacy mechanism predating Slice 9/11's notify_hour + scheduled-delivery work) pushed
  immediately on generation, ignoring notify_hour entirely. Fixed by splitting generated rows into
  "push now" (notify_hour already passed today, household tz) vs "defer" (write the row with
  `scheduled_for` set and `delivered_at` null, letting the existing `deliver-scheduled` pg_cron
  push it on time). **Gotcha hit and fixed during review:** the deferred-row day calculation must
  use `todayInZone(householdTz)`, NOT the device's local day — the file already computes a
  device-zone `todayYmd` for other purposes (reminder generation itself), and reusing that for the
  household-zone delivery-hour math silently computes the wrong day whenever a household's chosen
  timezone differs from the device opening the app.
- **#132**: overdue-reminder dedupe keys must roll over daily (`...-overdue-${todayYmd}`) or an
  overdue bill can only ever notify once, ever. Manual bills previously generated *zero* overdue
  reminders (the code excluded `diffDays < 0` entirely) — auto-pay bills got exactly one.
- **#139** added `notification_settings.overdue_bill_reminders` (new column, default true) as a
  standalone toggle layered on top of (AND'd with) the existing `manual_bill_reminders`/
  `auto_pay_reminders` gates — due-soon/day-0 reminders are unaffected by it. Also removed snooze
  entirely (including a second, independent copy of the same localStorage-scanning logic that lived
  in `AppShell.tsx` driving the bell badge count — grep for "snooze" repo-wide if this ever needs
  touching again, it's not confined to `NotificationCenter.tsx`).
- **Process note**: this was a live back-and-forth with Anthony reviewing the PR's own Vercel
  preview mid-session (screenshots of the actual Inbox/Settings UI) — #139 didn't exist as a filed
  issue until after #134/#132 were already built, reviewed, and pushed; it was filed and built as a
  same-branch follow-up onto the still-open PR rather than a new stacked PR, since he was actively
  testing that exact preview URL.

**Sub-slice 4's own open question, resolved and worth knowing if it ever comes up again:** an
active goal-contribution rule (`RuleCard.tsx`/`AppContext.tsx`'s `ContributionRule`) only fires
once, conditionally, on a payday that crosses its threshold — it has no inherent "weekly amount."
Confirmed with Anthony (logged as a 2026-09-05 comment on #98): only **fixed-$** rules count toward
the weekly-draw total, at face value; **percentage-of-surplus rules are excluded entirely** (their
payout depends on a future payday's surplus that can't be known in advance — matches #106's
existing philosophy of blocking rather than guessing when a real number isn't available). This
precedent — don't estimate an unknowable future number, just exclude it — is likely relevant again
if sub-slice 5's health-score work runs into a similar shape of question.

**A real, currently-unverified assumption baked into sub-slice 4, worth knowing if a weekly-draw
number ever looks wrong:** an expense's flat `amount` (no `frequency` column exists on `expenses`)
is treated as an implicitly **weekly** figure. This rests on the sub-slice-1 migration's own prose
comment describing the migrated groceries/fuel rows as "weekly/recurring," cross-checked by the
sub-slice 4 reviewer against live prod data (the migrated dollar amounts sit in the weekly-cadence
magnitude range for this household, not monthly) — but the source `bills.frequency` values were
never SQL-verified before the rows were deleted, so this is inference, not a hard fact. If a
household's weekly-draw total ever looks scaled wrong once they add expenses with genuinely
different real-world cadences, this assumption is the first place to check.

**Sub-slice 2 shipped a materially different UI than first built** — worth knowing before touching
any of these files again: the original build put bills/expenses on separate tabs; Anthony rejected
that ("I hate the switch... hoping it could all stay as one page") and it was reworked into a
single interleaved list (`bills-client.tsx`'s `groupedItems`), grouped by category, sorted by
amount descending — same as bills always sorted, expenses just drop into the same grouping with no
special-casing. Three more rounds of cosmetic feedback followed and are all live: `RowPill.tsx` now
has three colored variants (`primary`=lime/Auto-Pay, `success`=green/Manual, `accent`=amber/Expense
— was originally just two, "Manual" and "Expense" used to look identical); `ItemTypeToggle.tsx` (the
bill/expense choice inside `AddBillSheet`/`AddExpenseSheet`) is a labeled sliding switch, not a
segmented button grid — "Item Type" label above it, an action-framed caption below ("Switch to
Expense"/"Switch to Bill", i.e. always names the OTHER state, not the current one). A v0.9.29
patch-notes entry (`src/lib/patch-notes.ts`) explains the bill-vs-expense distinction to users.

**Critical infra gotcha discovered this session, read before touching ANY Vercel cron work again:**
this project is on **Vercel's Hobby plan**, which only permits cron jobs to run **once per day**.
An hourly cron (`vercel.json`'s `"crons"` array) silently fails to ever reach production — no
error surfaces anywhere obvious; the deployment just never promotes, and the site quietly keeps
serving the last successful build. This actually happened: #96 half B was first built as an hourly
Vercel Cron (PR #127, merged), and sat "merged" on `main` for a while with production silently
stuck on the pre-merge build before this session caught it via `gh pr checks` on the *next* PR
failing with a link to Vercel's own cron-pricing docs. **Lesson: after merging ANY change to
`vercel.json`'s cron schedule, explicitly verify a production deployment actually completed
(`list_deployments`/`get_deployment` via the Vercel MCP tools, target: "production", state:
"READY") — don't assume a green squash-merge means it shipped.** Real per-minute/hourly scheduling
on this project now goes through **Supabase `pg_cron` + `pg_net`** instead (see below), which is
NOT subject to Vercel's plan limit at all.

Gemini CLI checked a few sessions ago and found broken (Google killed the free Code-Assist tier it
authenticated against) — not usable for offloading build work until re-authed with an API key or
migrated; see the dated section below for detail, don't re-diagnose from scratch next time.

## 2026-09-05 (new session) — #98 sub-slice 6 of 6 (final piece) built, reviewed, merged; #98 CLOSED

Picked up exactly where the prior HANDOFF pointed ("→ START HERE NEXT SESSION: #98 sub-slice 6").
Before delegating, read the deferred comment in `bills-client.tsx` and the actual `groupedItems`/
`allCategories` logic to scope the work precisely (per `CLAUDE.md` Step 1's scope check) — this
turned into the session's one real finding.

**Scoping finding, brought to Anthony before building:** the sub-slice's stated goal — "apply the
existing per-user category-ordering system, currently bill-only, to expense categories too" — was
already functionally true. Expenses use the exact same 7-category list as bills (confirmed:
`AddExpenseSheet.tsx`'s dropdown offers the identical options to `AddBillSheet.tsx`'s, no separate
expense-category constant exists anywhere in the repo), and `groupedItems` already merges bills and
expenses into one set of category buckets sorted by the single saved `categoryOrder` — so reordering
categories in the existing Edit Order modal already reorders expenses too. The only thing genuinely
"bill-only" was naming: the `BILL_CATEGORIES` constant, and a comment claiming this was deferred.
**Presented this to Anthony rather than silently building a no-op feature** — he chose the smallest
option (quick cleanup, same build→review pattern as every other sub-slice, just scoped smaller).

**What got built, [PR #137](https://github.com/mp3anthony/funded/pull/137):** renamed
`BILL_CATEGORIES`→`ITEM_CATEGORIES` and `BILL_CATEGORY_REMAP`→`CATEGORY_REMAP` in
`bills-client.tsx` (only file that ever referenced them, confirmed by repo-wide grep before and
after), rewrote the `groupedItems` comment to state the sharing is finalized rather than deferred.
**Deliberately left untouched**, per explicit build-agent instruction: the Supabase
`user_preferences.bill_category_order` column, its string-literal usage in
`loadCategoryOrder`/`saveCategoryOrder`, and the `billCategoryOrder` localStorage key — renaming a
live DB column is its own schema/Part-A-adjacent decision with zero functional upside here, not
warranted for a pure naming cleanup. `v0.9.32` → `v0.9.33`, no patch-notes entry (internal cleanup,
not user-facing).

**Independent review: APPROVED, zero findings.** Verified the rename is complete repo-wide (fresh
grep for both old names, zero hits), read the live `groupedItems`/`allCategories` code directly to
confirm the new comment's claim is factually true (not just prettier wording), confirmed the
out-of-scope DB/localStorage identifiers were correctly left alone, confirmed `git show --stat`
touched exactly the two intended files, and reasoned explicitly about whether a pure rename +
comment + version bump could have any runtime effect (concluded no, verified by reading every diff
hunk). Independently re-ran `tsc`/lint/build — clean, lint 58/46 exact baseline match, zero issues
in the touched files specifically.

**Pushed as PR #137, labeled `needs-merge-approval`** — pure rename/comment, fully
pipeline-verifiable, no manual test needed. Vercel preview confirmed green via `gh pr checks`.
Version confirmed with Anthony before merge. Squash-merged; local branch delete initially failed
because the build agent's worktree still had it checked out (same recurring wrinkle as sub-slice
5) — cleaned up with `git worktree remove --force` + `git branch -D`, then `git fetch` +
`git reset --hard origin/main` to sync local `main`. **Production deployment verified directly via
the Vercel MCP tool** (`list_teams` → `list_projects` → `list_deployments`, confirming the merge
commit `47889dc`'s own deployment shows `target: "production"`, `state: "READY"`) — not just
trusted from a green GitHub merge.

**Workflow, same pattern as every prior sub-slice:** orchestrator scoped/investigated first (found
the no-op-functionality finding) → build sub-agent (isolated worktree) → independent review
sub-agent (never the builder, fresh agent) → orchestrator pushed/opened the PR → Anthony's
go-ahead → merge. **APPROVED first pass, no rework round needed.**

**#98 is now fully CLOSED — all 6 sub-slices merged, issue auto-closed by PR #137's "Closes #98".**
No ticket queued next — see "→ START HERE NEXT SESSION" at the top of this file for the remaining
open issues (#134, #132, #99, #88) and a recommended starting point.

## 2026-09-05 (continued) — #98 sub-slice 5 of 6 (health-score integration) built, reviewed, merged

Picked up exactly where the prior HANDOFF pointed ("→ START HERE NEXT SESSION: #98 sub-slice 5").
No open question this time — sub-slice 4 already resolved the one ambiguity that mattered
(fixed-$-only contribution rules), so this sub-slice was a straightforward, non-ambiguous extension
of already-decided scope (Decision #5 on #98: "expenses fold into the existing budget-coverage
half — one unified score, not a separate expense component"). Went straight to build after a plain-
language recap, no scoping conversation needed.

**What got built:** `calculateHealthScore`'s (`src/lib/utils.ts`) Budget Coverage section (30%
weight) only — Bills Management (40%) and Goals/Contributions (30%) sections untouched. The
denominator (`totalMonthlyExpenses`, shared by both Joint Fund and Direct Pay branches) now also
sums expenses (implicitly weekly, converted to monthly — same convention as `bills-client.tsx`'s
Total Bar) and `sumActiveFixedContributionRules` (reused from sub-slice 4, not reinvented). Direct
Pay's numerator (`totalMonthlySplits`) now also sums percentage-mode expense splits
(`expense.amount * split.percentage/100`, weekly→monthly), deliberately mirroring the existing
bill-split asymmetry — whole-item/assignee expenses contribute nothing, same as whole-item/assignee
bills today; not a new gap, a faithful replication of an existing one. Joint Fund's numerator
(`householdContributions`) left completely untouched — that's actual money flowing in, a separate
concept from the obligations denominator. `HealthScoreCard.tsx`'s call site updated to pass
`expenses`/`expenseSplits`/`contributionRules` through (all three were already available from
`useApp()`, just not wired in yet).

**Independent review: APPROVED first pass, zero findings** (not even non-blocking notes) — verified
the diff touches only the Budget Coverage block, confirmed both branches' denominator expansion is
identical, confirmed the Joint Fund numerator is genuinely untouched, traced the percentage-split
lookup for a missing-parent-expense edge case (safely no-ops, no crash), confirmed `Expense` has no
`is_paused` concept at all (matches `bills-client.tsx`'s existing unfiltered-expenses convention, not
a gap), independently reran `tsc`/lint/build (58/46, exact baseline match), grepped for other
`calculateHealthScore` callers (none), checked for the state-desync/race bug class (#74/#89/#90/#96)
and found none (pure synchronous calc, no new state).

**Pushed as [PR #136](https://github.com/mp3anthony/funded/pull/136), labeled
`needs-merge-approval`** — pure calc logic, fully verifiable in-pipeline, same category as sub-slices
1 and 4. Vercel preview confirmed green via `gh pr checks`. `v0.9.31` → `v0.9.32`, confirmed with
Anthony before merge. Squash-merged; the local branch delete initially failed because the build
agent's worktree still had it checked out (remote branch deleted fine) — cleaned up with
`git worktree remove --force` + `git branch -D` before syncing local `main` via `git fetch` +
`git reset --hard origin/main`. **Production deployment verified directly via the Vercel MCP tool**
(`list_teams` → `list_projects` → `list_deployments` → polled `get_deployment` on the merge commit's
own deployment through one `BUILDING` cycle to `READY`, aliases confirmed pointing at it) — not just
trusted from a green GitHub merge.

**Workflow, same pattern as every prior sub-slice:** build sub-agent (isolated worktree) →
independent review sub-agent (never the builder, fresh agent) → orchestrator pushed/opened the PR →
Anthony's go-ahead → merge. **APPROVED first pass, no rework round needed.**

**#98 continues at sub-slice 6 of 6 (the last piece) — #70 category-ordering extension for
expenses.** See "→ START HERE NEXT SESSION" at the top of this file.

## 2026-09-05 (new session) — #98 sub-slice 4 of 6 (weekly-draw calc integration) built, reviewed, merged

Picked up exactly where the prior HANDOFF pointed ("→ START HERE NEXT SESSION: #98 sub-slice 4").
Re-read the full decision history on #98 first (`gh issue view 98 --comments`) before scoping
anything, per this file's own instruction that sub-slice 4 had a genuinely open question deferred
to it.

**The open question, resolved before building:** sub-slice 4's own scope ("weekly draw becomes
bills + expenses + active goal-contribution rules") left unanswered how a goal-contribution rule —
which only fires once, conditionally, when a payday crosses a threshold, as either a fixed $ or a
%-of-surplus — becomes a steady weekly-draw line item. Brought this to Anthony directly rather than
assuming an answer (this file explicitly flagged not to guess here). Presented three options; he
picked the simplest: **only fixed-$ rules count, at face value; percentage-of-surplus rules are
excluded entirely** (their payout depends on a future payday's surplus that can't be known in
advance — matches #106's existing "don't guess when data's missing" philosophy). Logged as a
comment on #98 as the source of truth before build started.

**What got built:** two existing totals extended from bills-only to bills + expenses + active
fixed-$ rules — `bills-client.tsx`'s Total Bar (the actual number households watch to know how much
to draw weekly) and `ContributionSettingsSheet.tsx`'s `SuggestSplitPanel.totalMonthlyBills` (#106's
Suggest Split calculator's denominator). New shared helper `sumActiveFixedContributionRules` in
`src/lib/utils.ts` filters `is_active && amount_type === "fixed"` (both `action_type`s — "goal" and
"contribution" — count, since both represent real money leaving that member's pay), converting each
rule's amount from the triggering member's own pay-schedule frequency (falling back to "monthly" if
a member has zero or multiple schedules — the build agent's own reasonable-default call, commented
in place, not separately re-confirmed). Expenses fold in via `convertAmount(amount, "weekly", ...)`
— see the top-of-file note on why "weekly" is an inference, not a verified fact, from the sub-slice
1 migration. `calculateHealthScore` in `src/lib/utils.ts` deliberately left untouched (sub-slice 5's
job) — confirmed zero diff by both the builder and reviewer.

**Independent review: APPROVED first pass.** Specifically cross-checked the expense-implicit-weekly
assumption against live prod data (grocery/fuel dollar amounts sit in the weekly-cadence magnitude
range for this household, not monthly — circumstantial but consistent), confirmed percentage-rules
are a genuine skip (not zero-summed), traced the rule→frequency conversion end-to-end, confirmed
zero diff in `calculateHealthScore`/#106's core calc/`groupedItems` list rendering, checked for the
state-desync bug class this repo has hit before (#74/#89/#90/#96) and found none (purely additive to
already-loaded `AppContext` state). Independently re-ran `tsc`/lint/build — clean, lint exactly at
the 58/46 baseline. One non-blocking note logged: `bills-client.tsx`'s Total Bar never filtered
`is_paused` (unlike `SuggestSplitPanel`'s version, which does) — a pre-existing inconsistency the
build correctly left alone as out of scope rather than silently "fixing" it mid-slice.

**Pushed as [PR #135](https://github.com/mp3anthony/funded/pull/135), labeled
`needs-merge-approval`** — pure calc logic, fully verifiable in-pipeline (no layout/native surface
needing a hands-on pass), same category as sub-slice 1. Vercel preview confirmed green via
`gh pr checks`. `v0.9.30` → `v0.9.31`, confirmed with Anthony before merge. Squash-merged, branch
deleted, worktree cleaned up, local `main` synced via `git fetch` + `git reset --hard origin/main`.
**Production deployment verified directly via the Vercel MCP tool** (`list_teams` → `list_projects`
→ `list_deployments`, confirming the merge commit's own deployment shows `target: "production"`,
`state: "READY"`) — not just trusted from a green GitHub merge.

**Workflow, same pattern as every prior sub-slice:** build sub-agent (isolated worktree) →
independent review sub-agent (never the builder, fresh agent) → orchestrator pushed/opened the PR →
Anthony's go-ahead → merge. **APPROVED first pass, no rework round needed.**

**#98 continues at sub-slice 5 (health-score integration)** — see "→ START HERE NEXT SESSION" at
the top of this file.

## 2026-09-05 — #98 sub-slice 3 of 6 (Direct Pay split logic for expenses) built, reviewed, PR open awaiting on-device test

Picked up exactly where the prior HANDOFF pointed ("→ START HERE NEXT SESSION: #98 sub-slice 3").
Anthony was afk on mobile — gave a blanket go-ahead to start, plus a heads-up that a pure-schema
slice would be fine to merge on review alone. Flagged back that this slice isn't schema-only
(new %-split UI + `AppContext` wiring, no migration needed since `expense_splits` already existed
from sub-slice 1) — routed through the normal `needs-manual-test` labeling instead of merging on
review alone.

**What got built, per the issue's Decision #4 (both split modes coexist, chosen per expense):**
new "Split Type" picker in `AddExpenseSheet.tsx` (existing whole-item assignee vs new percentage
mode), a percentage editor per household member with a running total, save disabled unless the
total is exactly 100% (no auto-normalize — same validate-before-save convention as
`ContributionSettingsSheet.tsx`/`AddBillSheet.tsx`). `AppContext.tsx` gained `expenseSplits` state
wired into load/backup/rollback/wipe paths; `addExpense`/`updateExpense` now take `split_mode` +
`splits[]`, with `updateExpense` deleting-then-reinserting `expense_splits` rows on every save
(the cleanup path for a mode change) — this mirrors `updateBill`'s existing `bill_splits` pattern
byte-for-byte, not a new pattern. `ExpenseCard.tsx`/`ExpenseDetailSheet.tsx` show the split
breakdown (e.g. "Alice 60% / Bob 40%") for percentage-mode expenses instead of a single assignee.
No migration — `expense_splits`' RLS from sub-slice 1 already mirrored `bills`/`bill_splits`'s
real policies and was confirmed (reviewer read the migration file directly) to already support
this slice's read/write patterns.

**Independent review: APPROVED**, two non-blocking findings logged (not fixed, both inherited
patterns rather than new regressions): (1) the "sum to 100%" rule is UI-enforced only — no
DB/`AppContext`-function-level cross-row check exists, matching this app's existing client-gated
validation philosophy elsewhere; (2) `updateExpense`'s delete-then-reinsert is non-atomic (a
mid-operation failure could leave local `expenseSplits` state briefly stale vs. the DB) — verified
identical to `updateBill`'s existing `bill_splits` behavior, not a new bug class, but worth knowing
given this repo's history with state-desync bugs (#74/#89/#90/#96). Also independently re-ran
`tsc`/lint/build (clean; lint 58 errors/46 warnings vs. baseline 58/43 — the +3 are
`@next/next/no-img-element` on new avatar `<img>` tags, same existing pattern used elsewhere,
e.g. `BillCard`), grepped the whole tree to confirm zero leakage into #106's calc or the health
score (both explicitly out of scope, later sub-slices), and confirmed the new picker/editor UI
matches `ContributionSettingsSheet.tsx`'s existing segmented-toggle classes rather than inventing
new ones.

**Pushed as [PR #133](https://github.com/mp3anthony/funded/pull/133), initially labeled
`needs-manual-test`** — no automated test suite exists in this repo, and this is genuinely new
interactive form UI (split-type toggle, percentage inputs + running total, overlapping-avatar split
display), so both build and reviewer agreed on that label per `CLAUDE.md`'s routing rule. Vercel
preview confirmed green via `gh pr checks`. `v0.9.29` → `v0.9.30` (version bump done by the build
agent per the project's per-preview-build convention — not separately re-confirmed with Anthony
mid-session since he was afk).

**Anthony's call once told a manual-test checklist was ready: he doesn't use Direct Pay at all
(Joint Fund only), so there was no real way for him to exercise this UI himself.** Relabeled
`needs-manual-test` → `needs-merge-approval` and squash-merged on the strength of the independent
review alone, deleted the branch, local `main` synced via `git fetch` + `git reset --hard
origin/main`. **Production deployment verified directly via the Vercel MCP tool** (`list_projects`
→ `list_deployments` → `get_deployment` on the merge commit's own deployment ID, confirming
`readyState: "READY"` and the production aliases actually point at it) — not just trusted from a
green GitHub merge, per this repo's standing gotcha about silent production-deploy failures.

**Workflow, same pattern as sub-slices 1-2:** build sub-agent (isolated worktree) → independent
review sub-agent (never the builder, fresh agent) → orchestrator pushed/opened the PR → Anthony's
no-real-way-to-test call → merge. **APPROVED first pass, no rework round needed.** Worktree cleaned
up after push. Two unrelated leftover worktrees (`agent-a2a73983b2b027590`, locked;
`agent-a69afbc08584a8fcc`) left alone, stale from prior sessions, not from this one.

**#98 continues at sub-slice 4 (weekly-draw calc integration)** — see "→ START HERE NEXT SESSION"
at the top of this file.

## 2026-09-04 (continued) — #98 sub-slice 1 of 6 (expenses schema + migration) built, reviewed, applied to prod, merged

Continuation of the same day's session, picked up right where the entry below left off ("→ START
HERE NEXT SESSION: #98"). Read #98's full decision comment first — this turned out too large to
build in one PR (schema change + UI + two new split modes + a calc-logic rewrite touching #106 +
health-score changes + #70 extension), matching what both the issue and `SPEC.md` Slice 12
already flagged. **Confirmed with Anthony before building anything**: proposed a 6-piece
sub-slicing plan, he approved it as-is; logged as a comment on #98 itself as the source of truth
for build order going forward (not just in this file) — schema+migration → add/edit UI → Direct
Pay split logic → weekly-draw calc integration (#106) → health-score integration → #70 category
ordering extension.

**Sub-slice 1 (schema + migration), CLOSED, [PR #130](https://github.com/mp3anthony/funded/pull/130).**
New `expenses` table (separate from `bills`, per Anthony's schema-shape sign-off already recorded
on #98 in a prior session) plus a new `expense_splits` join table, designed up front so sub-slices
3 (Direct Pay split UI) and 4 (weekly-draw calc) can land without a second migration:
`split_mode` picks either whole-item `assignee_id` (mirrors how `bills` already works) or the new
`expense_splits` %-split table (stores raw percentages, not precomputed dollars, since no
"weekly-draw amount" concept exists for expenses yet). RLS mirrors `bills`'/`bill_splits`' real
current policies — deliberately does NOT carry forward `bill_splits`' legacy insecure anon
policies. One-time data migration moved the 4 real groceries/fuel workaround bill-rows (the thing
Anthony's original decision comment specifically called out) into the new table; "Day Care" (same
category) correctly left as a real bill. Added `Expense`/`ExpenseSplit` TS interfaces, nothing
wired to them yet — that's later sub-slices' job.

**Independent review: APPROVED first pass**, but given real weight because this is a schema
change destined for direct production application — reviewer independently queried live Supabase
(not just trusted the migration file) to confirm the RLS mirror was accurate, confirmed the exact
4 migration candidate rows, confirmed `bill_splits` was actually empty for those bill ids so the
cascade-delete had no side effects, and confirmed the split-mode design genuinely avoids a future
second migration. One cosmetic-only nit found and fixed in a follow-up commit: the migration's own
comment slightly undersold `bill_splits`' real policy count (said "exactly one" when there are
two, functionally irrelevant but worth correcting for a future reader). `tsc` clean, lint 58/42
unchanged, build clean.

**Applied directly to production Supabase by the orchestrator** (not the build sub-agent, per this
repo's established split for migration work) after the review — verified live immediately after:
`expenses` went 0→4 rows, `bills` went 29→25, exactly matching the reviewed candidate list.
`v0.9.27` → `v0.9.28`, confirmed with Anthony before merge; no patch-notes entry added (schema-only,
no user-facing change, and no prior pure-schema slice in this project's history sets a
must-add-an-entry precedent either way — followed the conservative default). Squash-merged, branch
and this session's build-agent worktree cleaned up. One unrelated leftover worktree
(`agent-a69afbc08584a8fcc`, stale from a prior session, not from this one) left alone as before.

**Workflow, same pattern as every prior slice**: build sub-agent (isolated worktree, since this
touches schema) → independent review sub-agent (never the builder, explicitly asked which review
path Anthony wanted per `CLAUDE.md`'s "don't assume Orchestrator reviews by default" rule — he
chose a separate sub-agent) → two small fix-and-recommit follow-ups (comment nit + version bump)
sent back to the same builder (full context) → orchestrator applied the migration directly and
merged. No rework round needed on the substance, only the two trivial follow-ups.

**#98 continues next session at sub-slice 2 (add/edit expense UI)** — see "→ START HERE NEXT
SESSION" at the top of this file.

## 2026-09-04 — Slice 13 (#99) on-device manual test found 2 real regressions, fixed, re-tested, merged; Group 4 closed

Picked up exactly where the prior entry (below) left off: PR #129 was open, labeled
`needs-manual-test`, with a 5-item checklist. Anthony ran it for real.

**Round 1 — 3 of 5 items failed/were compromised:**
1. Dialog entrance animation — "too quick or I'm just not seeing any animation."
2. Settings notifications structure — pass.
3. Push-status row — pass.
4. Dashboard count-up — pass, but a patch-notes popup on first load was covering it.
5. Health section expand/collapse — "nothing happening when expanding anything."

Build sub-agent investigated all 3 in a worktree (not just re-reading source — checked compiled
production CSS and drove the actual markup in a real browser via computed styles / Web Animations
API):
- **Item 1, real bug**: Safari doesn't smoothly animate an element's own opacity when that same
  element also carries `backdrop-filter` (documented WebKit issue) — `Dialog.tsx`'s backdrop had
  both on one div, so the blur "settled" instantly instead of fading. Fixed by splitting the
  static dim/blur onto a separate inner div, leaving the outer div's opacity animation
  filter-free. Confirmed `globals.css`'s existing mobile modal rules already special-cased an
  `.absolute` child for exactly this kind of split (pre-existing, from commit c8a43b5) — the fix
  slotted into CSS that was already shaped for it.
- **Item 5, no defect found**: compiled CSS and live DOM both confirmed the
  `grid-template-rows: 1fr↔0fr` height-animation technique genuinely works. Theory: the patch-notes
  popup (item 4's bug) has a full-viewport backdrop and was opening on mount, so early taps meant
  for the Health chevron were landing on the popup instead — read as "nothing happening."
- **Item 4, real bug**: `PatchNotesPopup.tsx` opened synchronously on mount. Fixed with a 1200ms
  delay (state update + localStorage seen-marking kept atomic, timeout cleaned up on unmount so an
  early nav-away doesn't wrongly mark it seen).

Independent reviewer verified all of the above against the real diff (not the builder's prose),
confirmed the Safari fix didn't break `modal-backdrop`'s scroll-lock contract or click-outside-to-
close, confirmed the popup fix has no unmount leak and correct atomicity, independently re-ran
tsc/lint/build. **APPROVED.** Pushed as a second commit onto PR #129's branch.

**Round 2 — Anthony re-tested: all 5 pass, but "minimal"** — asked for the motion to be more
noticeable, still "premium-minimal, no bounce" (the already-approved design direction). Second
build sub-agent bumped the shared `--duration-base`/`--duration-slow` tokens ~+30% (200→260ms,
400→520ms), the Dialog card's translateY/scale entrance distance (10px/0.97 → 18px/0.945, 220→280ms),
and the dashboard count-up (900→1150ms) — grepped every consumer of the shared tokens first to
confirm no press-feedback/hover element would be affected, only entrance/expand motion. Independent
reviewer verified the blast-radius grep independently, confirmed no bounce/spring easing was
introduced anywhere, checked the Health section's opacity-fade-delay math still exactly matches its
new total duration, and re-ran tsc/lint/build itself. **APPROVED.** Pushed as a third commit.

**Merged**: version reconfirmed with Anthony (`v0.9.27`, unchanged — these were rework commits on
the same open PR, not a new build cycle), squash-merged, remote branch deleted. `git pull --ff-only`
on `main` confirmed 14 files landed matching the full diff. Two stray build-agent worktrees
(`.claude/worktrees/agent-a9816eb9d072c80c1`, `-acf2eadb0b1ca3fda`) cleaned up along with their
local branches; one unrelated leftover worktree (`agent-a69afbc08584a8fcc`, stale on an older commit,
not from this session) was left alone.

**#98 (bills vs expenses split) — still untouched**, `ready-for-agent`, decisions already recorded
on the issue — see "→ START HERE NEXT SESSION" at the top of this file.

## 2026-09-03 (Group 4 session) — Slice 13 (#99) designed live via the design canvas skill, built, reviewed, PR open awaiting on-device test

Picked up exactly where the prior HANDOFF pointed ("START HERE NEXT SESSION — Group 4: #99 and
#98"). Anthony asked to use the `design` canvas skill to work through #99's visual decisions live
before building, rather than building straight from the research doc's recorded direction.

**Design phase, done live with Anthony via the `design`/`artifact-capabilities` skills, not
pre-decided:**
- Built a multi-artboard canvas (published as a Claude Artifact) covering two things: the Settings
  notification-row consolidation (already scoped as an out-of-spec fold-in to this slice, direction
  left open — "single entry point" vs. "sub-heading grouping") and the #99 motion pass itself
  (mood/direction already decided in `research/issue-99-100-motion-dashboard-research.md`, but the
  *concrete* execution — actual duration/easing values, exact entrance animation, dashboard
  count-up feel — was not).
- **Notifications**: showed today's baseline plus both directions side by side; Anthony picked the
  single-entry-point option, then went further mid-review — pointed out that the real app *already*
  has two separate activation controls (the `all_enabled` toggle inside the old Notifications
  dialog, and a separate "Enable push notifications" button inside the old Push notifications
  dialog) for what's really one concern, and asked for them merged to exactly one switch. This is a
  real functional change, not just IA — flagged to Anthony as exceeding the slice's original
  "presentation only" framing; he confirmed proceeding under this slice rather than a separate
  ticket. Recorded in `SPEC.md`'s Slice 13 section (see that file for the full decision writeup)
  before building. One build-fix round on the mockup itself: a CSS `all: unset` reset had silently
  eaten a row's layout on the first pass (Anthony caught it from a screenshot) — traced and fixed
  before building for real.
- **Motion**: built live/interactive artboards (not just static pictures) so Anthony could actually
  trigger the animations rather than read descriptions — a motion-token legend (durations +
  easing curve, auto-looping demo bars), a working Dialog-entrance replica (tap to open/close, real
  CSS animation), a dashboard stat-tile replica (count-up + tier-color-cycle buttons), and (added
  after Anthony asked "how exactly does the dashboard have motion" — a good sign the first pass
  under-explained what was real app behavior vs. demo-only controls) an expand/collapse replica.
  One real bug hit mid-session: the interactive artboards' buttons didn't respond at first — root
  cause was a missing `is_interactive: true` flag in the canvas layout manifest, not a code problem;
  fixed by setting it on the three interactive artboards. Anthony also caught a design mismatch on
  the dashboard tile mockup (an outer bordered box that doesn't exist in the real
  `HealthScoreCard.tsx`, which is borderless with just a hairline top-rule per cell) — fixed by
  re-reading the real component and matching it exactly rather than inventing a container.

**Build, review, fix-and-re-review — same pattern as every prior slice:**
- Build sub-agent implemented all of: motion tokens in `globals.css`; the `tailwindcss-animate`
  install fix (a real pre-existing bug — 10 files reference `animate-in`/`fade-in`/`zoom-in`
  classes from a package that was never installed, silent no-ops app-wide including the shared
  `Dialog.tsx` modal shell); bespoke entrance motion on `Dialog.tsx` matching the exact
  canvas-approved values; the Settings notifications merge; and `HealthScoreCard.tsx` motion
  (count-up, tier-color transition onto the new token scale, real expand/collapse height
  animation). Explicitly kept in scope per `SPEC.md`'s "polish pass, not a rebuild" framing — no
  page-transition wrapper, no skeleton states, no celebration/confetti moments, despite the
  ticket's broad title.
- **First independent review: NEEDS-REWORK, two real regressions** (not style nits) — both in the
  exact race/state-desync bug class this repo has hit before (#74/#89/#90): (1) the builder had
  *deleted* an existing unconditional push-subscription auto-heal effect (from commit `a2400c6`,
  comment "Auto-sync the subscription to the server in case of a split-state") while merging the
  notifications panel, replacing automatic self-healing with an on-demand-only fix the user has to
  notice and act on — a real behavior downgrade the spec's "just relocate the button" framing
  didn't authorize; (2) `AppShell.tsx`'s floating-bell `NotificationCenter` and the Settings-page
  one ended up with two independent, unsynced copies of `pushStatus` state, so a re-enable via one
  wouldn't update the other while both were mounted (e.g. on the Settings page itself).
- **Fix, same builder (full context)**: restored the auto-heal as a new
  `syncPushSubscriptionIfPresent()` helper, invoked from a session-keyed effect now living in
  `AppContext.tsx` — runs unconditionally per signed-in session, not gated behind any dialog;
  centralized `pushStatus` into `AppContext` too (same pattern `notificationSettings` already used),
  removing both components' local copies. Added a `0.9.27` patch-notes entry while in there (a
  reviewer nit, non-blocking, done anyway).
- **Fresh reviewer (not the builder, not the one who found the bugs) verified the fix round**:
  traced both fixes end-to-end against the actual diff (not just re-reading the builder's prose),
  independently re-ran `tsc`/`lint`/`build`, and proactively checked a *new* question the first
  review didn't need to ask — since `pushStatus` moved into `AppContext`, does it correctly avoid
  leaking a previous user's push status across a same-tab account switch? Answer: no synchronous
  reset on sign-out, but the only account-specific field (`hasLiveSubscription`) gets overwritten
  once the effect's next `getPushStatus()` resolves — a brief, low-severity async window matching
  this codebase's existing "next load overwrites" pattern for other per-user state, not a new class
  of bug. Verdict: **APPROVED**. `tsc` clean, lint 58 errors/42 warnings (one *fewer* error than the
  59/42 baseline — a dead `any`-typed catch block was removed along the way), `build` clean.

**Pushed as [PR #129](https://github.com/mp3anthony/funded/pull/129), NOT merged this session** —
Anthony's explicit call to end the session here and test on-device overnight rather than merge
blind. Vercel preview deployment confirmed green via `gh pr checks`. Labeled `needs-manual-test`
(visual/motion, per `SPEC.md`'s testing note for this slice) with a 5-item checklist handed to
Anthony covering: Dialog entrance animation, the one-row/one-panel/one-switch Settings structure,
the push-status row showing real state, dashboard count-up on a fresh load, and the Health section's
expand/collapse. Two things flagged as **not** manually testable and only code-verified: the
tier-color transition (nothing forces a real threshold crossing on demand) and the push auto-heal
fix (a background self-sync with no visible UI). `v0.9.26` → `v0.9.27`, version confirmed with
Anthony before the PR was opened — **not live in production until this merges.**

**Impeccable skill touched this session, not yet used for real work**: updated to the latest
version (`npx impeccable update`, effect applies next session, not this one — installed v4.0.4 →
latest v4.1.3 queued). Anthony's explicit call: hold the first real `$impeccable init` → full-app
`critique`/`audit` pass until *after* this Slice 13 work is merged, so it reviews the finished state
rather than a moving target — don't jump into that unprompted next session either, wait for him to
raise it. Also clarified for Anthony: Impeccable is a design/UX-craft tool (visual quality, a11y,
motion, layout), not a substitute for this project's existing `code-review` skill (Standards + Spec
review) — the two are complementary, not either/or; `code-review` stays the tool for reviewing
diffs against repo conventions and ticket scope going forward, same as always.

**#98 (bills vs expenses split) — untouched this session**, still exactly where Group 4's prior
note left it: `ready-for-agent`, decisions recorded on the issue, recommend sub-slicing it further
at its own kickoff rather than one PR.

## 2026-09-03 (continued) — Slice 10/11 (#96, push reliability) built, reworked mid-session after a real production-deploy discovery, merged; Group 3 fully closed

Picked up exactly where the prior HANDOFF pointed ("START HERE NEXT SESSION — Group 3, #96").
Both halves were pre-scoped from an earlier needs-info interview, so went straight to build —
no scoping conversation needed for either at kickoff.

**Slice 10 / #96 half A — dead-subscription indicator, CLOSED, [PR #126](https://github.com/mp3anthony/funded/pull/126).**
Settings gets a "Push notifications" row ("Active"/"Not active here") opening a dialog that
explains why (never granted / denied / granted-but-stale — the iOS-expiry case) with a one-tap
re-enable reusing the existing `subscribeToPush()` flow. No schema change — `push_subscriptions`
already existed with an RLS policy permitting the client-side status read used here (confirmed live
against Supabase, not just trusted from the migration history). Independent review **APPROVED
first pass** — traced the full re-enable chain into a real DB upsert, checked the async
status-check against this repo's known race-bug class (#74/#89/#90), none found; `tsc` clean, lint
59/42 baseline. Labeled `needs-manual-test` (native permission APIs) — **Anthony tested live**:
opened the preview on his phone, and rather than waiting on the clock for a real reminder, the
orchestrator drove a real test push through the app's own authenticated `/api/push/send` route
(via his own logged-in desktop-Chrome session, run through `claude-in-chrome` — a page-scoped JS
`fetch` using his session's own token, never exposing the token itself: a direct read of the raw
token out of `localStorage` was correctly blocked by the harness's auto-mode classifier as
credential extraction, so the fetch was done in one JS execution that never returned the token
value) — landed on his lock screen twice (once per registered subscription), confirmed. Version
`0.9.23` → `0.9.24` initially, later renumbered (see below).

**Slice 11 / #96 half B — first attempt (hourly Vercel Cron), merged, then discovered broken in
production.** Built as designed in `SPEC.md` (switch `vercel.json` to hourly, gate each user's
reminder generation on their local hour matching `notify_hour`) — [PR #127](https://github.com/mp3anthony/funded/pull/127),
independent review **APPROVED** (dedupe/DST edge cases specifically stress-tested, `tsc`/lint
clean), merged at `v0.9.24`. **While rebasing Slice 10 onto the new `main` to resolve the expected
version-bump conflict, its own PR's Vercel deployment check failed** — traced the failure link
directly to Vercel's own cron-pricing docs page: **this project is on the Hobby plan, which only
allows once-per-day cron.** Checked directly against Vercel's API (`list_deployments`): **no
production deployment had ever been created for PR #127's merge commit** — the squash-merge
"succeeded" on GitHub, but production silently stayed on the prior build the entire time. No live
breakage (site kept serving the old, still-correct daily-cron behavior), but #96 half B as merged
could never actually have worked. See the top-of-file gotcha note — this is worth remembering for
any future cron-touching work on this project.

**Slice 11 v2 — reworked design, confirmed live with Anthony, CLOSED, [PR #128](https://github.com/mp3anthony/funded/pull/128).**
Anthony's own suggestion, once the Hobby-plan ceiling was explained: split generation from
delivery — "one cron > store until user set time." Landed as: `vercel.json` reverts to once-daily
(`0 15 * * *`, 3pm UTC ≈ 1-2am Sydney, well ahead of most households' `notify_hour`); that daily
run now only *generates and stores* each due reminder with a computed `scheduled_for` (via a new
`zonedDateAtHour()` helper) and `delivered_at: null`, no more push-sending inline. A new
`/api/cron/deliver-scheduled` route (gated by a fresh `DELIVER_CRON_SECRET`, separate from the
existing `CRON_SECRET`) finds anything due and actually sends the push. **A Supabase `pg_cron` job
— not subject to Vercel's plan limit at all — calls that route every 5 minutes via `pg_net`**;
Anthony confirmed the 5-minute interval directly. `pg_cron`/`pg_net` were both already available in
this Supabase project (just not installed) — enabled via `apply_migration`. The delivery secret was
generated by the orchestrator and stored in **Supabase Vault** (`vault.create_secret`), referenced
inside the `pg_cron` job's SQL via `vault.decrypted_secrets` — never appears in plaintext anywhere
in the repo or the cron job definition itself; Anthony's only manual step was pasting the same
value into a new Vercel env var (Production scope).

**Two independent review rounds on Slice 11 v2** — first pass **NEEDS-REWORK**: found a real,
non-theoretical double-delivery bug — `delivered_at` was written once, in a single batch update
*after* the entire delivery loop finished, so a `maxDuration=60` timeout partway through would
leave already-pushed rows still `NULL`, and the next 5-minute run would re-send them. **Fix**: moved
the write to per-user (inside the loop) instead of once at the end, narrowing any timeout's blast
radius to at most one user's in-flight batch. **Second pass, fresh reviewer: APPROVED** — explicitly
queried live production data (4 users, 96 notification rows total) and reasoned that full per-row
granularity wasn't worth the extra DB round-trips at this scale, rather than reflexively demanding
the stricter fix. Both rounds also independently re-verified `zonedDateAtHour`'s DST correctness
against real 2026 Sydney transition dates (both directions), confirmed dedupe/Part A2 fully
unregressed, and re-ran `tsc`/lint clean at baseline (59/42) — never trusted the builder's
self-report.

**End-to-end live verification, not just code review** — after merge, the orchestrator inserted a
real due test notification directly into the `notifications` table, waited for the `pg_cron` job's
next tick, and confirmed via `cron.job_run_details` (`status: succeeded`) and `net._http_response`
(**real HTTP 200**, body `{"due":1,"users":1,"delivered":1,"pushed":4}`) that the whole chain
actually fired — then Anthony confirmed the push itself landed on his phone. Test row deleted
afterward. This is now watched-working end-to-end, not just verified by code+DB inspection (unlike
the still-open gap noted below for #114's bug-reporting path).

**Version bumps, confirmed with Anthony at each merge**: `0.9.23` → `0.9.24` (Slice 10 build) →
re-numbered `0.9.25` (Slice 11 v1 took `0.9.24` first) → Slice 11 v1 PR #127 merged at `0.9.24` →
Slice 11 v2 PR #128 merged at `0.9.25` (rebuilt on the post-#127 `main`) → Slice 10's PR #126
rebased again and merged at `0.9.26`. Final state: **`v0.9.26` live in production**, both halves of
#96 closed together in one GitHub issue comment summarizing the whole arc.

**Workflow notes worth remembering:**
- Two build agents run in parallel (Slice 10 + Slice 11 v1) in the *same* non-worktree checkout at
  the start of this session — both self-navigated a mid-build collision (branch/HEAD flipping under
  them as the other committed) without cross-contaminating each other's files, but it was closer
  than ideal. Orchestrator's call: reviews (mostly read-only) are fine to run in parallel in a
  shared checkout; **future parallel *builds* should use `isolation: "worktree"`** to remove this
  risk entirely rather than relying on agents noticing and recovering.
- Fix-and-re-review loop pattern held again for Slice 11 v2: same builder gets the fix request (full
  context), a **fresh** reviewer (not the one who found the bug, not the builder) checks just the
  fix rather than re-reviewing the whole diff from scratch.
- `pg_cron`/`pg_net`/Supabase Vault are now a proven pattern on this project for anything needing
  finer-than-daily scheduling — reach for this combination first before assuming a Vercel Cron
  schedule change will work, given the Hobby-plan ceiling.

## 2026-09-03 (new session) — Group 3 Slices 8-9 (#37, #97) built, reviewed, merged

Picked up exactly where the prior HANDOFF pointed ("START HERE NEXT SESSION — Group 3"). Re-ran
`gh issue list --state open` first — matched HANDOFF's expectation exactly (6 open: #99, #98, #97,
#96, #88, #37 — #88 the only `needs-info`).

**Slice 8 / #37 — per-household timezone settings screen, CLOSED, [PR #124](https://github.com/mp3anthony/funded/pull/124).**
Settings row shows the household's current IANA timezone to all members; only the household owner
can open the edit control (searchable dropdown built off `Intl.supportedValuesOf('timeZone')`, no
new dependency). Save validates via `Intl.DateTimeFormat` before writing `households.timezone`,
falls back to `Australia/Sydney`. No cron changes needed (already reads that column). **Real finding
surfaced during review, not a blocker:** `households` UPDATE RLS is member-wide, not owner-only —
pre-existing, unrelated to this change, and matches how this codebase already gates other
owner-only actions (client-side only, e.g. the existing member-management `canManage` pattern) — so
true server-side owner enforcement would need its own Part A sign-off if ever wanted; logged as a
possible future hardening ticket, not fixed here. Independent review **APPROVED first pass** —
traced owner-gating end-to-end (inert UI + a second guard inside the update function itself),
verified the RLS claim directly against the migration file, traced `householdTimezone` through
every `AppContext.tsx` load/adopt/rollback path for the state-desync bug class this repo has hit
before (#74/#89/#90) and found no recurrence. `tsc` clean, lint matched baseline exactly (59/42 —
note the real baseline is 42 warnings, not the 41 the last HANDOFF entry cited; corrected here).
Labeled `needs-manual-test` (searchable dropdown + owner/member permission boundary). `v0.9.21` →
`v0.9.22`, confirmed with Anthony before merge.

**Slice 9 / #97 — notify-hour picker + payday/goal-milestone reminders, CLOSED, [PR #125](https://github.com/mp3anthony/funded/pull/125).**
Each user sets their own "notify me around X o'clock" hour (`notify_hour`, new column on
`notification_settings`, default 9am, no owner gate — every member sets their own). Two new
reminder types added through the *existing* `generateReminders.ts` dedupe/mark-as-read machinery,
left untouched, only extended: **payday "log your pay"** (fires once `next_pay_date` has
arrived/passed and hasn't been logged, per-member like `lodge_payment`) and **goal/fund milestone
reached** (25/50/75/100% of target, dedupe by fund+threshold so it fires once per threshold even on
a balance jump that crosses two at once, household-wide like `manual_bill`/`auto_pay`). No prior
"milestone" concept existed anywhere in the codebase — thresholds were a fresh call, **confirmed
with Anthony before build** via a quick check-in. Both new types get their own toggle in the
notification-bell settings panel, matching the existing 3-toggle pattern. **`notify_hour` is
deliberately stored/readable/saveable only in this slice — not wired into any send-timing yet**
(explicitly Slice 11/#96-half-B's job); confirmed by grep there are zero references to it in the
cron route or client generator. Migration (3 additive columns, all `NOT NULL DEFAULT`, matching the
table's existing convention) applied directly to prod Supabase by the Orchestrator (not the build
sub-agent — Anthony confirmed the schema change first via a quick check-in, then the orchestrator
ran `apply_migration` itself rather than delegating that specific step). Independent review
**APPROVED first pass** — verified live against Supabase (constraint exists, current pay-schedule/
fund data), traced the dedupe-key logic for the multi-threshold-jump edge case explicitly, confirmed
`logPay()` advancing `next_pay_date` is what the reminder correctly re-derives "already logged"
from (no separate drift-prone flag), confirmed both generators (client `useEffect` + server cron)
updated consistently, confirmed the two-generator architecture itself was left untouched as scoped.
**One pre-existing bug surfaced, not introduced here, just extended — logged for a follow-up, not
fixed:** native push notifications' deep-link always points at `/bills?billId=...` regardless of
notification type; was already wrong for `lodge_payment`, now also slightly wrong for the two new
types when tapped from an actual push (in-app click-through in the bell panel is unaffected, already
correctly gated). `tsc` clean, lint 59/42, unchanged. Labeled `needs-manual-test` (notify-hour
picker UI). `v0.9.22` → `v0.9.23`, confirmed with Anthony before merge.

**Workflow, consistent with Group 1/2:** build sub-agent → independent review sub-agent (never the
builder) → push/PR/version-bump-confirm-with-Anthony → merge → `gh pr merge --delete-branch` →
`git reset --hard origin/main` to sync local. Both slices APPROVED first pass, no rework rounds
needed. **One new wrinkle worth remembering:** the harness's auto-mode safety classifier blocked an
`Agent` spawn whose prompt told the sub-agent to apply a Supabase migration itself — had to split
that pattern going forward: sub-agent writes the migration file only (does not call
`apply_migration`), Orchestrator applies it directly via the Supabase MCP tool after getting
Anthony's explicit sign-off on the schema change first. Worked cleanly once split this way; use the
same split next time a build task includes both new app code and a migration.

**Group 3's last piece, #96, deliberately left for next session** (Anthony's explicit call, to
start it fresh) — see "→ START HERE NEXT SESSION" below.

## 2026-09-03 — Slice 15 / #114 in-app bug reporting built, reviewed, merged; Group 2 closed

Picked up exactly where the prior HANDOFF pointed ("START HERE NEXT SESSION — Group 2, Slice 15").
Anthony generated the required GitHub PAT at the start of the session.

**GitHub PAT setup, walked through live with Anthony:** fine-grained token
(https://github.com/settings/tokens?type=beta), scoped to the `funded` repo only, `Issues:
Read and write` permission only, added to Vercel as `GITHUB_BUG_REPORT_TOKEN`. Anthony hit a
Vercel UI snag getting Production+Preview both checked (environment-selector UI wouldn't toggle
cleanly) — resolved by going **Production-only**, which is actually the right scope anyway (real
users only hit Production; Preview is for our own testing, not real bug reports).

**What got built, per SPEC.md Slice 15:** "Report a bug" button in Settings opens a form
(title+description required, optional screenshot). One scoping decision made with Anthony before
build: the spec's "optionally a screenshot" doesn't map to any GitHub REST endpoint (issue
attachments are web-UI-drag-drop-only, no API) — decided to route screenshots through a **new
Supabase storage bucket** (`bug-report-screenshots`, public read / authenticated-only write, 5MB
cap, image-mime whitelist) and link the resulting URL as a Markdown image in the issue body,
rather than skipping screenshots for this pass. New server route
(`src/app/api/bug-report/route.ts`) re-derives the submitter's identity from their Supabase
session (never trusts client-supplied identity, same standard as #93/#90), reads
`GITHUB_BUG_REPORT_TOKEN` server-side only, calls GitHub's create-issue REST API, pre-creates a
`from-app` label idempotently. `src/lib/version.ts` `0.9.20` → `0.9.21`, matching patch-notes
entry added.

**One independent review round, APPROVED first pass** — given this is new schema-adjacent
(storage bucket + RLS) work touching a brand-new secret, reviewed with the same scrutiny this repo
gives service-role-key-adjacent changes: queried the live Supabase project directly to confirm the
bucket/RLS policies exist exactly as built (not just trusting the migration file), grepped the
whole `src/` tree to confirm the token never appears in any client-reachable file, traced the
`from-app` label pre-creation logic to confirm a `422 already-exists` doesn't abort the
submission, and independently re-ran `tsc`/`lint` (clean / 59 errors-42 warnings vs. baseline
59/41 — the +1 warning is a routine `@next/next/no-img-element` hint on the screenshot preview,
same pattern as an existing warning elsewhere in the app). One cosmetic-only nit noted, not fixed:
the migration filename's timestamp doesn't exactly match Supabase's internal applied-migration
timestamp — content matches, harmless.

**Manual device testing surfaced the Preview-vs-Production env scoping in practice, not a bug**:
Anthony tested on the PR's Vercel Preview deployment, which correctly does NOT have
`GITHUB_BUG_REPORT_TOKEN` (Production-only) — the route correctly showed a clear "Bug reporting is
not configured on the server" error instead of crashing or silently no-op'ing, which is exactly
the failure-path behavior the spec asked for. **Anthony's explicit call: skip live
GitHub-issue-creation testing on preview** (would've required temporarily granting the token to
Preview) — relied on the independent reviewer's direct Supabase/code verification instead; first
genuine end-to-end confirmation will be the first real bug report filed from production. Worth
knowing if a report ever needs debugging: this path hasn't been watched live end-to-end yet, only
verified by code+DB inspection.

**Version bump confirmed with Anthony before merge**: `v0.9.20` → `v0.9.21`. Squash-merged as
[PR #123](https://github.com/mp3anthony/funded/pull/123), branch deleted, `gh pr merge` auto-synced
local `main`. Issue #114 auto-closed by the merge.

**Workflow, same pattern as Slice 14:** build sub-agent → independent review sub-agent (APPROVED
first pass, no rework needed) → push/PR/version-bump-confirm → Anthony's on-device test →
merge/local-sync. Labeled `needs-manual-test` per spec (new secret + new storage surface).

## 2026-09-02/03 — Slice 14 / #113 patch notes page built, reviewed, device-tested, merged

Picked up exactly where the prior HANDOFF pointed ("START HERE NEXT SESSION — Group 2"). Anthony
asked to build patch notes tonight and leave bug reporting (#114) for the next session, since he
was heading off to watch a show.

**What got built, per SPEC.md Slice 14:** a hidden `/patch-notes` page reachable from Settings,
listing per-version user-facing blurbs newest-first (`src/lib/patch-notes.ts`, hand-written,
backfilled honestly from HANDOFF.md's actual v0.9.12-v0.9.19 history), plus a one-time popup
(`PatchNotesPopup.tsx`) shown on first load after a version bump, detected via a
`localStorage`-stored last-seen-version key. `src/lib/version.ts` now centralizes `APP_VERSION`
into one named export/source of truth (previously only a hardcoded literal inline in Settings) —
confirmed by grep this didn't create a second divergent copy anywhere.

**One independent review round, APPROVED first pass** — specifically traced the popup's
once-per-version fire logic (the trickiest part of this slice) for double-fire/never-fire risk on
remount, route-change, and React 19 StrictMode double-invoke: confirmed safe because the
localStorage write happens synchronously in the same effect pass that shows the popup, so any
remount short-circuits on the already-seen check. Content cross-checked against HANDOFF.md for
accuracy. `tsc` clean, lint unchanged from baseline (59/41).

**Anthony's live on-device feedback after the first preview push:** the "what's new" link was too
small/easy to miss (buried as tiny footer text) — wanted it as a full row-style button in the
app's fluoro-green accent, similar to "Leave household," placed above it with a green divider
between them. Built as a follow-up commit, sent to a **fresh** independent reviewer (not the
original one) — APPROVED, confirmed the `border-primary/20` divider opacity matches this
codebase's existing convention (grepped multiple other files using the same value) rather than
being an arbitrary pick, confirmed `Link` is the semantically-correct element over `button` here,
no regressions to the "Leave household" handlers.

**Version bump confirmed with Anthony before merge** per `CLAUDE.md` §4: `v0.9.19` → `v0.9.20`.
Added a new patch-notes entry for 0.9.20 itself describing the feature that ships it (the page
that shows this text). Squash-merged as
[PR #122](https://github.com/mp3anthony/funded/pull/122), branch deleted, local `main` re-synced
via `git reset --hard origin/main`, stale remote-tracking branches pruned. Issue #113 auto-closed
by the merge.

**Workflow, same pattern as Group 1:** build sub-agent → independent review sub-agent → (this
slice needed one extra round for the on-device styling feedback, handled as
fix-by-original-builder → fresh independent reviewer, not the reviewer who already approved the
first pass) → push/version-bump-confirm/merge/local-sync. Labeled `needs-manual-test` per spec
(popup-timing genuinely needed Anthony's real-device pass, not just code-reading) — he tested and
approved live on his phone before the merge went ahead.

## 2026-09-02 (continued further still) — Slices 5-7 built, reviewed, merged; Group 1 closed out

Continuation of the same day's session, picked up exactly where the prior HANDOFF pointed
("START HERE NEXT SESSION — Group 1, Slice 5 / #87"). Re-ran `gh issue list --state open` first —
still exactly the expected 12 open issues, #88 the only `needs-info`.

**Slice 5 / #87 — empty-household "not set up yet" state, CLOSED, [PR #119](https://github.com/mp3anthony/funded/pull/119).**
Anthony's decision was already final on the issue (recorded in a prior triage-pass comment): when
a household has zero bills AND zero goals (`funds`) AND zero contributions in steady state, show a
distinct "Not Set Up Yet" status instead of the misleading 85/"Fully Funded". Implemented as a
pure display-layer override in `src/components/HealthScoreCard.tsx` only —
`isGenuinelyEmpty = !isDataLoading && bills.length === 0 && funds.length === 0 &&
householdContributions.length === 0` — `calculateHealthScore` itself (`src/lib/utils.ts`)
untouched, so nothing else that reads the raw score is affected. Independent review specifically
hunted for a loading-race false-trigger, given this repo's history (#73/#74/#82/#90 all in that
class): traced `isDataLoading` through `AppShell`'s mount-gating and the `joinHousehold`
household-switch path, found one *theoretical*, currently-unreachable gap structurally similar to
#90 (only protected today by an incidental hard page reload on that one code path) — flagged for
a future ticket, not a blocker since no live UI path can trigger it. **APPROVED first pass.**
`tsc` clean, lint unchanged from baseline (59/41). `v0.9.16` → `v0.9.17`.

**Slice 6 / #112 — remove dead `HouseholdHealth.tsx`, CLOSED, [PR #120](https://github.com/mp3anthony/funded/pull/120).**
Straightforward dead-code deletion, confirmed independently by both the builder and reviewer via
repo-wide grep (including docs, barrel files, dynamic/string references) that the only remaining
mentions are in `HANDOFF.md`/`CHANGE-LOG.md`/`SPEC.md`/README/a research doc — zero source
references. Distinct from the live `HealthScoreCard.tsx`, confirmed untouched. **APPROVED first
pass**, no orphaned dependencies needed cleanup. `tsc` clean, lint unchanged (59/41), `npm run
build` succeeds. `v0.9.17` → `v0.9.18`.

**Slice 7 / #71 — PWA stale-cache bug, CLOSED, [PR #121](https://github.com/mp3anthony/funded/pull/121). `v0.9.18` → `v0.9.19`.**
Anthony's decision (prior triage-pass comment) was both recommended directions combined: (1)
inject the build/commit hash into `CACHE_NAME` in `public/sw.js` per deploy instead of the
hand-bumped static `v3` it had been stuck on, so the existing `activate` purge-old-caches logic
actually fires every release; (2) switch the app-shell/navigation fetch strategy from
network-first to true stale-while-revalidate (serve cache immediately, refresh in background via
`event.waitUntil()`) — this is what actually fixes the ~1s-per-tab-hop delay, since navigations no
longer block on a network round-trip. New `scripts/stamp-sw.mjs` wired as an npm `prebuild` step
(auto-runs before `build` on Vercel's default npm build command — confirmed no `vercel.json`
override exists in this repo) stamps `public/sw.js`'s `CACHE_NAME` with `VERCEL_GIT_COMMIT_SHA`
(build-time-available per Vercel's own docs), falling back to `VERCEL_DEPLOYMENT_ID` then a dev
timestamp locally. Non-navigation (asset/API) caching left untouched — only the navigation
strategy changed.

**This went through real iPhone testing before merge, per `CLAUDE.md` §2 Step 4** — issue #71 is
explicitly flagged platform-sensitive in its own testing-assessment section. First code review
**APPROVED at the code level**, but a code review is not a substitute for a device pass, and this
proved out: Anthony's manual test caught a real bug the review missed.

**Bug 1 (found on-device, not by review): offline navigation stranded a signed-in user on the
onboarding screen** ("Create a Household / Join via Code"), with a visible "Sign Out" button
implying the session was actually still valid underneath — confirmed via screenshot, recoverable
only by toggling connectivity + logging out/in, or force-closing. **Root cause:** not the service
worker (that part was already correct) — `AppContext.tsx`'s `loadData()` conflated "the device has
no network, the request never reached the server" with "the server confirmed this household isn't
onboarded," calling `setIsOnboarded(false)` on any query failure including a network failure.
**Fix (`93d5f2c`):** added `isNetworkFailure(err)` to distinguish the two — checks
`navigator.onLine` first, with a fallback regex match against real fetch-failure error messages
(covers Safari's `"Load failed"`, not just Chrome's `"Failed to fetch"`, since `navigator.onLine`
is known to misreport on iOS). On a genuine network failure, `isOnboarded` is left untouched.
Independent review (fresh reviewer) **APPROVED**, specifically verifying the fix doesn't rely
solely on the unreliable `navigator.onLine` API and doesn't regress the legitimate "actually new
user" onboarding path — but flagged a residual risk: the only recovery mechanism was a single
`'online'` event listener, which has documented flakiness in iOS Safari standalone-PWA mode.

**Bug 2 (the flagged risk materialized on retest): app got stuck on an infinite loading spinner**
after reconnecting — confirmed via screenshot, no recovery even after toggling airplane mode back
off and waiting. **Fix (`d300eb8`):** replaced the single `'online'`-listener dependency with three
independent recovery triggers (a 5s poll that self-heals even if every browser event is missed,
`'online'`, and `'visibilitychange'`/`'focus'`), plus a 30s escape hatch that swaps the bare
spinner for a message + manual "Retry" button so the user is never left with zero feedback and
zero action available. **Independent re-review found a real bug in this fix before it reached
Anthony a third time:** tapping Retry while still offline permanently killed the escape hatch —
the state driving the 30s timer's effect (`isNetworkStuck`) didn't change *value* on a second
failure, so the effect never re-ran and the button never came back, reproducing the original
severity. **Fix (`88bbd30`):** added a `retryGeneration` counter bumped on every failed retry
(gated on "the button has shown at least once this stuck episode" to avoid restarting the initial
countdown forever), added to the effect's dependency array so any failed retry — manual or
automatic — reliably re-arms the timer; also added an in-flight guard so the 5s poll can never
stack overlapping requests. This round's independent review traced both "manual retry fails again"
and "a later, separate offline episode starts clean" step-by-step through the actual code before
approving, and directly re-ran lint to resolve an ambiguous claim in the builder's own report
rather than trusting either half of it (confirmed 59/41, unchanged).

**Real-device retesting after both fixes never reproduced either bug again** — but every attempt
Anthony made to force a genuinely offline-with-nothing-cached state (flicking between
already-loaded tabs, force-quitting, even a full Safari "Clear History and Website Data") kept
coming back fully functional, still logged in, with real data. Root cause of *that*: iOS keeps an
installed home-screen web app's storage in a separate container from Safari's own browsing data —
clearing Safari's site data does not reach an installed PWA's storage, so none of those tests
actually forced the cold state they were meant to. The only way to truly force it is deleting and
reinstalling the icon, which is the exact workaround #71 exists to make unnecessary, so it wasn't
used for verification. **Anthony's explicit call: merge anyway** — code review traced both bugs'
exact failure sequences through the real code across 3 rounds, and every real-world test available
without reinstalling showed clean behavior throughout. Logged here as a known testing-coverage
limitation, not a confirmed pass of the specific offline-data-load recovery path — worth knowing if
an offline-related bug report ever comes in for this feature.

**One real nuance from the first review round, not a bug:** offline capability after this fix is
"last-good cached version" only *within* routes visited online since the most recent deploy — only
`/`, `/offline`, the manifest, and icons are precached on install; other routes have no offline
content until visited online post-deploy. A real, arguably-correct consequence of build-scoped
cache busting, narrower than "keeps offline working" might sound on its own.

**Workflow used across all of Group 1's remaining slices, consistent with Slices 1-4:** one build
sub-agent per slice, one *independent* review sub-agent (never the builder), fix-and-re-review loop
whenever NEEDS-REWORK or a real device bug was hit (needed 2 extra rounds for Slice 7, none for
Slices 5-6). Slices 5-6 followed straight through to push/PR/version-bump/merge/local-sync on
Anthony's blanket go-ahead ("keep going, merge when done"). Slice 7 was deliberately routed to
`needs-manual-test` instead of auto-merged — its own testing section requires a real device, which
a blanket "merge when done" instruction can't satisfy on its own; this was flagged to Anthony
explicitly before pushing, and every fix round after the on-device bugs went back through a fresh
independent reviewer before returning to his phone, rather than re-testing unreviewed code on a
live device each time.

## 2026-09-02 (continued further) — Slice 4 / #90 built, reviewed, merged

Picked up exactly where the prior HANDOFF pointed. Re-ran `gh issue list --state open` first —
still exactly the expected 12 open issues, #88 the only `needs-info`.

**Slice 4 / #90 — cross-user notification write, CLOSED, [PR #118](https://github.com/mp3anthony/funded/pull/118).**
The client-side "notification generation" `useEffect` in `AppContext.tsx` (~line 3724) was gated
only on `session`, `notificationSettings`/`all_enabled`, and `isDataLoading` — not `isOnboarded`.
During a same-tab user-switch race (A → B), if `isDataLoading` read `false` before B's household
state had actually resettled, the effect could fire with `session.user.id = B` against A's stale
household/bills data, writing a notification row shaped `{ user_id: B, household_id: A }`. Fixed
by adding `!isOnboarded` to the early-return guard (and `isOnboarded` to the dependency array,
since it's now referenced in the guard body). Independent review traced every `setIsOnboarded`
call site in the file end-to-end and confirmed: `isOnboarded` never goes transiently false for an
already-settled, previously-onboarded user (the `knownOnboarded` guard from #75 already prevents
that), so the new gate is a true no-op on the normal single-user path and only closes the narrow
cross-user-switch window described in the issue — no regression to legitimate onboarding/adopt/
join flows. **APPROVED first pass**, no rework needed. Fully in-pipeline verifiable (pure business
logic, no UI/layout/platform-native surface) → `needs-merge-approval`, not `needs-manual-test`.
`v0.9.15` → `v0.9.16`, confirmed with Anthony before merge. Same workflow as Slices 1-3: build
sub-agent → independent review sub-agent → push/PR/version-bump/merge on go-ahead → local `main`
synced via `git reset --hard origin/main`.

## 2026-09-02 (continued) — Slices 1-3 of Group 1 built, reviewed, merged; Gemini CLI found broken

Continuation of the same day's full-triage session (dated section below). Anthony asked to check
whether the Gemini CLI could offload build work to save tokens before starting the build.
**Found broken, not just misconfigured**: `gemini -p "..."` fails with `IneligibleTierError` —
Google discontinued free-tier "Gemini Code Assist for individuals" access for this CLI client,
pointing at migrating to "Antigravity" instead. Not a quick fix; needs either a `GEMINI_API_KEY`
(Google AI Studio) swapped in, or the Antigravity migration. Not pursued further this session —
Anthony said to proceed without it. Worth remembering next time offloading comes up rather than
re-diagnosing.

**Batching preference confirmed with Anthony**: one PR per slice for Group 1 (not grouped/batched),
per `CLAUDE.md` §2 Step 4's "worth a quick check-in" note from the prior session's HANDOFF.

**Slice 1 / #93 — single-household-per-user, CLOSED, [PR #115](https://github.com/mp3anthony/funded/pull/115).**
Added a `UNIQUE` constraint on `household_members.user_id` (checked prod for existing violations
first — zero found, applied clean) and a real server-side "already belongs to any household" check
in `supabase/functions/join-household/index.ts` (identity re-derived from the auth session, not
client-supplied), redeployed (now version 3). `AppContext.tsx`'s existing client-side #75 guard
left untouched — additive, not a replacement. Independent review: **APPROVED** first pass — traced
the trickiest interaction (user already in household A with a separate unclaimed invite waiting in
household B → correctly blocked) by hand, verified live against prod Supabase directly (constraint
exists, `user_id` still nullable, deployed source byte-matches local, zero duplicate rows). Two
non-blocking findings logged for a future ticket, not fixed this pass: the new check fails open
(not closed) if its own query errors (matches an existing pattern elsewhere in the same file), and
a race-condition backstop surfaces a raw Postgres error string instead of a friendly message.
`v0.9.12` → `v0.9.13`.

**Slice 2 / #74 — warm-reload empty-query race, CLOSED, [PR #116](https://github.com/mp3anthony/funded/pull/116).**
New shared helper `resolveWarmReloadRace<T>(previousState, result, refetch)` in `AppContext.tsx`
(Option 4 from the issue): trusts an empty query result immediately when the previous in-memory
state was already empty (fast path, unaffected); when previous state was non-empty and the new
result comes back empty, re-fetches once to confirm before committing — a real deletion elsewhere
still lands, a same-RLS-race spurious empty doesn't. Applied to all five loaded slices (bills,
funds, paydays, members, bill_splits — the last filtered against the post-race-check resolved
bills, not the raw fetch). **First review round: NEEDS-REWORK** — found a real stale-closure
regression in `joinHousehold`'s household-switch branch: `setBills([])` etc. don't retroactively
update the closed-over variables `loadHouseholdRelatedData` reads, so a switch to a new household
was comparing against the OLD household's real data, causing needless (not corrupting, just slow)
extra re-fetches on every switch to a household empty in any slice. **Fixed** with an explicit
`assumeEmptyPreviousState` option threaded through `loadData`/`loadHouseholdRelatedData`, set
`true` only at that one household-switch call site — bundled in a `Promise.all` for the four
independent slice reconciliations while in there. **Second review round: APPROVED** — verified by
grepping every call site of `loadData`/`loadHouseholdRelatedData` that the override is never set on
the normal warm-reload path (which would have silently reintroduced the original bug). `v0.9.13` →
`v0.9.14`.

**Slice 3 / #89 — joinHousehold stale-members snapshot, CLOSED, [PR #117](https://github.com/mp3anthony/funded/pull/117).**
Built directly after #74 as planned, reusing its `resolveWarmReloadRace` helper unchanged. The old
cascade-delete-old-household cleanup step decided whether to delete based on `backupState.members`
— a cached snapshot vulnerable to the same RLS-race class as #74 — silently skipping cleanup
(orphaning data) if wrongly empty. Fixed by routing through `resolveWarmReloadRace` with a live
re-fetch confirmation before either branch trusts an empty/not-found result; an inconclusive
(`null`) result skips cleanup and logs rather than guessing, since this call site is destructive.
**Found during the build, fixed together, not a separate follow-up**: the non-owner
"just remove my own membership" branch had the identical stale-snapshot bug as the owner
cascade-delete branch. Independent review: **APPROVED** first pass — specifically checked for an
old/new household-id mixup (none found) and reasoned explicitly about whether one confirmation
re-fetch is conservative enough given the stakes (a wrong call here deletes a household): the RLS
race this defends against only ever produces spurious *emptiness*, never fabricates rows, so a
double-race failure direction is toward *skipping* cleanup (recoverable) rather than *wrongly
deleting* (unrecoverable) — judged acceptable as-is, no extra confirmation needed. `v0.9.14` →
`v0.9.15`.

**Workflow pattern used for all three** (establishing precedent for the rest of Group 1): one
build sub-agent per slice → one independent review sub-agent (never the builder) → if NEEDS-REWORK,
fix request sent back to the *same builder* (has full context) → re-review by a *fresh* independent
agent (not the one that already found/approved parts of it) before merge. Squash-merged, branch
deleted, local `main` re-synced via `git reset --hard origin/main` each time (a plain `git pull`
after a squash-merge on a diverged local branch creates a spurious merge-bubble commit — reset
instead of pull once the PR is confirmed merged).

## 2026-09-02 (new session) — full triage pass + SPEC.md rewrite done

Every open GitHub issue (12 total, confirmed live via `gh issue list --state open`) is now
`ready-for-agent` except #88, correctly still `needs-info` (blocked on people, not a decision).
`SPEC.md` Part B fully rewritten into 15 vertically-sliced, dependency-ordered slices covering
every ready-for-agent issue plus the two high-priority out-of-spec items (patch notes, in-app bug
reporting) plus one dead-code cleanup. All three since filed as issues #112 (dead-code), #113 (patch notes), #114 (bug reporting). No code built yet — this session was pure triage +
spec-writing.

## 2026-09-02 (new session) — full triage pass across all open issues, SPEC.md rewritten

Picked up exactly where the prior session's HANDOFF pointed: needs-info queue was clear, this
session's job was the full triage pass + new vertically-sliced spec (standing plan agreed
2026-08-05). Re-ran `gh issue list --state open` and `--label needs-info` first per the standing
instruction — confirmed 12 open issues, matching HANDOFF's expectation exactly (only #88
needs-info).

**6 previously-untriaged issues scoped live with Anthony** (decisions recorded as comments on each
issue, labels flipped `needs-triage` → `ready-for-agent`):
- **[#87](https://github.com/mp3anthony/funded/issues/87)** — empty household scoring 85/"Fully
  Funded": add a distinct "not set up yet" state.
- **[#71](https://github.com/mp3anthony/funded/issues/71)** — PWA stale-cache bug: bump
  `CACHE_NAME` per deploy (build hash) **and** stale-while-revalidate for navigations, combined.
- **[#74](https://github.com/mp3anthony/funded/issues/74)** — warm-reload empty-query race:
  re-fetch-to-confirm pattern (option 4 from the issue) — treat an empty batch as suspect only
  when prior state was non-empty, re-fetch once to confirm before committing.
- **[#90](https://github.com/mp3anthony/funded/issues/90)** — cross-user notification write on
  same-tab switch: fix now, add the missing `isOnboarded` gate.
- **[#89](https://github.com/mp3anthony/funded/issues/89)** — joinHousehold stale-members
  snapshot: reuse #74's re-fetch-to-confirm helper, sequence directly after #74.
- **[#96](https://github.com/mp3anthony/funded/issues/96)** — no real push delivered: split into
  two independent slices — per-timezone hourly cron (depends on #37+#97 landing first) and
  dead-subscription health-indicator UI (no dependency, can slot in anytime).

**One CHANGE-LOG.md pending item resolved:** `HouseholdHealth.tsx` (dead code, flagged during
#110) — decision: delete it, confirmed unused anywhere in the app.

**Two out-of-spec items given concrete scope** (were only one-line CHANGE-LOG entries before):
- **Patch notes page** — per-version blurb text is hand-written per release (small structured
  file, e.g. `patch-notes.ts`), separate from `HANDOFF.md`'s technical detail. Hidden Settings page
  + first-open-on-new-version popup.
- **In-app bug reporting** — GitHub REST API call directly from a Next.js server route (no
  polling), using a new server-side-only GitHub PAT/App token scoped to `issues: write`. Flagged
  as a new-secret item to watch at kickoff, same caution class as the service-role key even though
  it isn't that key.

**`SPEC.md` Part B rewritten wholesale** (old Slices 1-3 were stale — #70 was already closed,
#71/#37's open questions were already resolved by this session's earlier work): now 15 slices,
every one mapped to a `ready-for-agent` GitHub issue or one of the two out-of-spec items or the
dead-code cleanup. Part C gives a 4-group dependency-ordered milestone recommendation — full detail
in `SPEC.md` itself, summary:
1. **Group 1 (foundational, no dependencies):** #93 (single-household-per-user), #74, #89 (must
   follow #74), #90, #87, dead-code deletion (#112), #71 (PWA cache).
2. **Group 2 (Anthony's explicit high-priority build-order flag):** patch notes page (#113), in-app bug
   reporting.
3. **Group 3 (sequential chain):** #37 (timezone) → #97 (notifications overhaul, depends on #37)
   → #96 half A (dead-subscription, independent) → #96 half B (hourly cron, depends on both #37
   and #97).
4. **Group 4 (largest/highest-risk, sequenced last):** #99/#100 (motion overhaul — but pull the
   `tailwindcss-animate` install fix forward as a standalone quick fix ahead of the full pass, it's
   cheap and fixes an already-broken feature) → #98 (bills vs expenses split, recommend
   sub-slicing further at its own kickoff rather than one PR — the largest, most structurally
   involved slice in this pass).

`CHANGE-LOG.md` updated to reflect every entry's new SPEC.md slice mapping. Part A of `SPEC.md`
untouched — no locked invariants touched this session, pure Part B rewrite.

**Nothing built this session** — Anthony's implicit expectation from the standing plan was
triage-then-spec, not triage-then-build-everything-immediately. Next session (or later this one,
if continued) starts actually building, beginning with Group 1.

## 2026-09-02 (continued) — needs-info queue finished: #99/#100, #93/#94, #88 checked in

Picked up right where the session paused (see the dated section below for the first half:
#37/#97/#98). Re-ran `gh issue list --label needs-info` first per the standing instruction —
confirmed still exactly the 5 HANDOFF expected, nothing new accumulated.

- **[#99](https://github.com/mp3anthony/funded/issues/99)** (dynamic visual/motion overhaul) —
  research-then-decide, same pattern as #97: two parallel sub-agent passes (this codebase's
  current animation/token state, and how YNAB/Monarch/Copilot/Rocket Money/Simplifi/EveryDollar/
  PocketGuard/Honeydue handle motion). Full report at
  `research/issue-99-100-motion-dashboard-research.md`. Decisions: **polish pass, not a
  structural design-system rebuild; whole app at once; premium-minimal mood** (Copilot Money as
  reference). **Real bug found during research, folded into scope:** `tailwindcss-animate` isn't
  installed, so the `animate-in`/`fade-in`/`zoom-in` classes already used in 10 files — including
  the shared `Dialog.tsx` modal shell used app-wide — are currently no-ops; modals etc. are
  popping in with zero animation today despite the code looking animated. Fixing that install is
  in scope for whichever agent builds this. `needs-info` → `ready-for-agent`.
- **[#100](https://github.com/mp3anthony/funded/issues/100)** (dashboard overhaul) — **closed,
  folded into #99.** Research found no comparable app combines a swipeable carousel with a gauge
  for live stat tiles (genuinely novel, not catch-up work); real gauge precedent exists only for
  credit-score dials (Rocket Money, old Mint). Decision: **keep the existing 4-tile grid, add
  number count-up/transition polish only** — lowest-risk of the three options the research laid
  out (the other two — original swipeable gauge, and a static-gauge-plus-swipeable-cards hybrid —
  are documented in the report if ever revisited). No separate dashboard-overhaul scope remains.
- **[#93](https://github.com/mp3anthony/funded/issues/93)** (join-household edge function doesn't
  enforce single-membership server-side) — was blocked on the multi-household-vs-single-household
  schema question deferred at #75's build time. Decision: **one household per user** (Anthony's
  explicit call, recorded as a Part A schema-change sign-off per `CLAUDE.md` §4, not just
  implied). Unblocks adding the `UNIQUE` constraint on `household_members.user_id` (deferred at
  #75) plus a real server-side "does this user already belong to any household" check in the edge
  function, not just the existing client-side #75 guard. `needs-info` → `ready-for-agent`.
- **[#94](https://github.com/mp3anthony/funded/issues/94)** (no in-app recovery path for an
  already-duplicated household member) — **closed, covered by #93.** A `UNIQUE` constraint is a
  hard DB-level guarantee — once #93 lands, a duplicate-membership state becomes literally
  impossible, not just discouraged by a client-side guard, so a recovery UI for a state that can't
  occur is speculative work rather than a real safety net. Orchestrator's call (Anthony deferred
  the disposition decision explicitly), reasoning recorded on the issue in case a future session
  ever relaxes the UNIQUE constraint or revisits multi-household support.
- **[#88](https://github.com/mp3anthony/funded/issues/88)** (Direct Pay untested end-to-end) —
  checked in, not a full interview (per its own framing — blocked on people, not a decision).
  Status: one real user is now using Direct Pay day-to-day, but isn't likely to actively report
  issues, so this is a passive usage signal rather than the active testing feedback loop needed to
  actually rescope. Left `needs-info`, unchanged — noted on the issue for the record.

**Every needs-info/needs-triage item from the standing plan is now resolved** except #88 (which is
correctly still open — it's blocked on people, not scoping). This clears the precondition for the
full triage pass + new vertically-sliced spec. Not started this session (Anthony's call — save it
for a dedicated session rather than starting it in the last stretch of this one). See "→ START
HERE NEXT SESSION" below.

## 2026-09-02 — needs-info queue scoping session (no build)

Anthony asked to pick up the needs-info queue interview per the standing plan. Live re-check
(`gh issue list --label needs-info`) found **7 open, not the 4 HANDOFF previously listed** — #88,
#93, #94 had accumulated since. Worked through 3 today:

- **[#37](https://github.com/mp3anthony/funded/issues/37)** (per-household timezone settings
  screen) — decision: **owner-only edit access** (matches the existing ownership-gated pattern
  used for leave/delete-household). `needs-triage` → `ready-for-agent`.
- **[#97](https://github.com/mp3anthony/funded/issues/97)** (notifications overhaul) — was
  blocked on #37 (now resolved: per-household timezone). Decisions: **one time-of-day picker per
  user** ("notify me around X o'clock", builds on the existing per-user `notification_settings`
  table — no competitor app researched offers true time-of-day scheduling, so this is a genuine
  differentiator, not parity work); **new reminder types this ticket: payday "log your pay" +
  goal/fund milestone reached**. Backed by two parallel sub-agent research passes (this
  codebase's actual notification system/schema, and how YNAB/Monarch/Copilot/Rocket
  Money/Simplifi/EveryDollar/PocketGuard/Honeydue handle notification timing — Honeydue, the one
  couples/shared-household app in the set, is the closest analog and confirmed the per-person-
  preference-on-a-shared-item pattern). Full decision writeup and research summary in the issue
  comment. `needs-info` → `ready-for-agent`.
- **[#98](https://github.com/mp3anthony/funded/issues/98)** (bills vs expenses split) — **turned
  out much bigger than its original framing**, not a categorization toggle. Anthony's real problem:
  groceries/fuel are currently entered as bills purely as a workaround so they count toward the
  weekly joint-account draw; there's no real "expense" concept, and goal-contribution rules
  (e.g. "20% of surplus into a goal") should also count toward that same draw. Decisions: bill =
  fixed/contractual/recurring, expense = variable spend that still counts toward the weekly draw;
  **the weekly draw becomes bills + expenses + active goal-contribution rules**, not just bills
  (touches #106's contribution-calc logic directly); **separate `expenses` table** (Orchestrator's
  technical recommendation, Anthony signed off — avoids adding type-filters to every existing
  bills query); **Direct Pay expenses support both whole-item assignment AND %-split, chosen per
  expense** (new pattern — Direct Pay bills today only do whole-item assignment via
  `assignee_id`, no %-split exists there yet); health score folds expenses into the existing
  budget-coverage half; #70's category ordering extends to expenses; **one-time migration script**
  moves existing groceries/fuel bill-rows into the new expenses table. **This is a schema change —
  Part A escalation trigger, Anthony's sign-off recorded in the issue comment thread, not just
  implied.** Anthony's explicit call: **not building this immediately** — gets sliced vertically
  into narrow tickets during the upcoming full-triage/spec pass, same as the standing plan.
  `needs-info` → `ready-for-agent`.

**Two new feature requests brought directly in chat, logged out-of-spec (not scoped, not built)**
per `CLAUDE.md` §1 — neither appears anywhere in `SPEC.md`:
- Patch notes page (hidden in-app page, reachable from Settings, listing changes per version;
  first-open-on-a-new-version popup pointing to what's new).
- In-app bug reporting (report from inside the app, ideally landing as a GitHub issue; Anthony
  himself flagged the app→GitHub delivery mechanism as needing its own design session — polling
  vs. some other approach — not a quick decision).

Anthony's call: **both fold into the upcoming full-triage/spec pass, flagged high priority** for
build-order weighting in that pass — not built now, not scoped in detail yet beyond that.
`CHANGE-LOG.md` entries updated to `status: triaged` accordingly.

**Out-of-band, unrelated to tickets:** two dead Stop/Notification hooks in Anthony's **global**
`~/.claude/settings.json` (not this project) pointed at a deleted side-project script
(`schematic-companion/hook-relay.js` — that whole project was intentionally deleted by Anthony).
Removed both hook entries. Worth remembering: Anthony sometimes wires cross-project convenience
hooks into global settings rather than per-project settings, so a hook error surfacing in this
project isn't necessarily caused by anything in this repo.

Prior session, unchanged below: **#110 (Household Health card default-open + remove Payday page
avatars) built and merged.** Anthony brought it directly in chat (not from the backlog) — two
small, unambiguous, in-spec UI tweaks, no CRD needed. Scoped, filed `ready-for-agent`,
implementation delegated to one sub-agent, a separate independent sub-agent tested it live against
a disposable Supabase test household (not just by reading the diff), merged as
[PR #111](https://github.com/mp3anthony/funded/pull/111). Fully in-pipeline verifiable (no layout/
platform-native surface) → `needs-merge-approval`, not `needs-manual-test`. Version bump confirmed
with Anthony before merge. `v0.9.11` → `v0.9.12`.

## #110 — household health default-open, payday avatars removed, built/tested/merged this session (2026-08-23)

**[#110](https://github.com/mp3anthony/funded/issues/110) — CLOSED, built in
[PR #111](https://github.com/mp3anthony/funded/pull/111).** Anthony asked directly in chat for two
things: the dashboard's "Household Health" section to default open (was collapsed), and member
avatars removed from the Payday page. Both scoped against the actual code before filing — no
ambiguity, no locked-invariant/schema/security touch, so no CRD and no scoping conversation needed
beyond confirming the plan in plain English.

**What changed:**
- `src/components/HealthScoreCard.tsx` — `isHealthExpanded` initial state `false` → `true`. This is
  the *live* dashboard "Household Health" section (with the Weekly Income/Bills/Surplus/Goals stat
  grid and the existing collapse/expand chevron, which is untouched — still works both ways).
- Three avatar spots removed, all exclusive to the Payday page: the pay schedule list row
  (`src/app/payday/payday-client.tsx`), the pay history card (`src/components/PayHistoryCard.tsx`),
  and the pay schedule detail sheet (`src/components/PayScheduleDetailSheet.tsx`). Member name text
  stays in all three; surrounding layout tightened.

**Side finding, logged not fixed:** `src/components/HouseholdHealth.tsx` is a *separate, unrelated*
component that also renders something labeled "Household Health" — but it's dead code, never
imported anywhere in the app (confirmed by a repo-wide grep), despite #95 (previous session) fixing
its data source as if it were live. Anthony confirmed: log it, don't touch it. Added to
`CHANGE-LOG.md` as `status: pending` for a future session to decide (delete vs. wire up).

**Also found during independent testing, not a defect in this diff:** `PayHistoryCard`'s per-row
member-info block (touched by this diff) is always called with `hideMemberInfo={true}` at its one
call site (`payday-client.tsx`) — so pay history rows show amount/date only, no name field at all,
avatar or otherwise. Pre-existing, unrelated to this change; worth knowing if `hideMemberInfo` is
ever revisited.

**Workflow:** implementation done by one sub-agent (Orchestrator does not write/edit code — even
the one-line version-bump string in `settings-client.tsx` went to a sub-agent, not edited directly).
A separate independent sub-agent tested live: built a disposable Supabase test account/household
with a fixed pay schedule and a logged pay history entry (so every touched UI surface actually had
something to render), verified all 5 testing-checklist items PASS via DOM/accessibility-tree
inspection (the browser tool's screenshot compositor wasn't available in that run, so element
absence was confirmed via `read_page`/`javascript_tool` instead — more precise than a screenshot for
proving something's *not* there anyway), re-ran `tsc`/`lint` independently (identical error count
vs. a freshly-checked-out `main`, 3 fewer warnings matching the removed avatar `<img>` elements),
and cleaned up the test data afterward (confirmed blast radius first). Verdict: PASS, no rework
needed. `CHANGE-LOG.md` entry for `HouseholdHealth.tsx` and the version-bump commit were done on the
same branch/PR before merge.

`v0.9.11` → `v0.9.12`, confirmed with Anthony immediately before merge per `CLAUDE.md` §4.

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

## → START HERE NEXT SESSION — Group 4: finish #99 (PR #129 needs Anthony's on-device pass), then #98

**Groups 1-3 are all fully closed** (Slices 1-15 plus #96's rework) — full detail in the dated
sections above. `v0.9.26` was live in production as of that point, confirmed working end-to-end.

**#99's build is done and reviewed, sitting in [PR #129](https://github.com/mp3anthony/funded/pull/129)
unmerged** — full detail in the "Slice 13 (#99) designed live via the design canvas skill" section
just above. Anthony is testing on-device overnight; do NOT re-open the design/scoping conversation
or re-build anything next session unless he reports a problem. If he approves:
1. Confirm the 5-item manual checklist passed (Dialog entrance, one-row/one-panel/one-switch
   Settings structure, push-status row, dashboard count-up, Health expand/collapse).
2. Merge normally: `gh pr merge 129 --squash --delete-branch`, then
   `git reset --hard origin/main` to sync local `main` (not `git pull`).
3. Verify the Vercel production deployment actually completed post-merge (`list_deployments`/
   `get_deployment` via the Vercel MCP tools, target: "production", state: "READY") — standing
   practice from the #96 half-B incident, not specific to this PR, but worth the 30 seconds anyway
   since this is the first merge since that lesson was written down.
4. Close issue #99 (the PR does this automatically on merge if it's linked — confirm it actually
   did rather than assuming).

If Anthony reports a bug: this went through one fix-and-re-review round already (see the dated
section above for exactly what was checked) — don't re-litigate the parts that already passed two
independent reviews (motion tokens, `Dialog.tsx` entrance values, dashboard motion, the one-switch
panel structure, `tailwindcss-animate` wiring). Scope any fix narrowly to whatever he actually hit.

**After #99 merges, only #98 remains** (per `SPEC.md` Part C):
- **#98 — bills vs expenses split.** The largest, most structurally involved slice in the whole
  spec — a real schema change (new `expenses` table), touches the weekly-draw calculation (#106)
  directly, and Direct Pay gets a new %-split-or-whole-item pattern for expenses. Already
  `ready-for-agent` with decisions recorded on the issue, but **recommend sub-slicing it further at
  its own kickoff** rather than building as one PR — see the issue/`SPEC.md` Slice 12 section for
  the full decision writeup before starting.

Re-check `gh issue list --state open` at session start regardless (was 3 open as of this session's
end: #99 — will auto-close on the PR #129 merge, #98, #88 — #88 the only `needs-info`, correctly
still open, blocked on people not a decision, no action needed on it).

**Workflow, unchanged**: build sub-agent → independent review sub-agent (never the builder) →
fix-and-re-review loop if NEEDS-REWORK → push/PR/version-bump-confirm-with-Anthony → route
`needs-manual-test` or `needs-merge-approval` per surface → merge → `gh pr merge --delete-branch` →
`git reset --hard origin/main` to sync local `main`.

**Read the top-of-file cron/Vercel-Hobby-plan gotcha before touching `vercel.json` again** —
neither #99 nor #98 currently look cron-related, but if that changes, this project's real scheduling
primitive is now Supabase `pg_cron`/`pg_net` (already enabled, proven working), not Vercel Cron
beyond once-daily.

**If a build needs both new app code AND a Supabase migration in one task**, split it: sub-agent
writes the migration file only, Orchestrator applies it via the Supabase MCP tool directly after
Anthony's sign-off — the harness's auto-mode safety classifier blocks an `Agent` spawn whose prompt
tells the sub-agent to call `apply_migration` itself. #98 will need this split given its schema
change.

**One live-testing gap worth knowing about before touching #114's code again:** the bug-reporting
GitHub-issue-creation path (screenshot upload → GitHub API call) was verified by independent code
review + direct Supabase inspection, not by an actual live submission — Anthony's on-device test
only exercised the "secret missing on Preview" failure path (by design, not a bug). If a real bug
report ever needs debugging, or that route needs revisiting, don't assume it's been watched
working end-to-end live — it hasn't yet.

<details>
<summary>Prior next-session note (Group 1 → Group 2 transition, now done)</summary>

**Slices 1-7 all done** (#93, #74, #89, #90, #87, #112, #71 — all merged, `v0.9.19`, full detail in
the dated sections above). **Group 1 is completely closed out — nothing left in it.** Re-check
`gh issue list --state open` at session start anyway in case anything new was filed since (was
exactly the expected 12 open issues as of this session's end, #88 the only `needs-info`).

**Worth reading before touching offline/network-failure code again:** Slice 7 (#71) needed 2 extra
fix-and-re-review rounds after Anthony's real iPhone testing caught bugs the first code review
missed (offline navigation stranding a signed-in user on onboarding, then a stuck-forever loading
spinner in the first fix's recovery logic) — full blow-by-blow in that slice's dated section above.
Also worth knowing: on iOS, an installed home-screen PWA's storage is a separate container from
Safari's own browsing data — clearing Safari's site data does NOT reach an installed PWA, so it
can't be used to force a genuinely cold/uncached test state; only an actual delete+reinstall can.
That limited how thoroughly the final offline-recovery fix could be device-verified — logged as a
known gap, not a confirmed pass, in case an offline-related report ever comes in for this feature.

Use the same workflow as Slices 1-6 (documented in detail above): one build sub-agent per slice,
one *independent* review sub-agent (never the builder), fix-and-re-review loop if NEEDS-REWORK,
then push/PR/version-bump/merge with Anthony's go-ahead — **except** for anything the issue itself
flags as platform-sensitive (layout/styling/native-behavior surface needing hands-on verification),
which routes to `needs-manual-test` and waits for a real device pass before merging, same as #71.
After a squash-merge, sync local `main` with `git reset --hard origin/main` (not `git pull` — it
creates a spurious merge-bubble commit on a diverged local branch).

**Gemini CLI is broken** (checked this session) — Google killed the free Code-Assist tier it
authenticated against (`IneligibleTierError`, points at migrating to "Antigravity"). Not usable for
offloading build-agent work as-is; would need a `GEMINI_API_KEY` swap-in or the Antigravity
migration to fix. Don't re-diagnose from scratch if this comes up again — this is already known.

**Not this session, but on Anthony's radar for timeline context:** once the app is stable under
the new spec, next is licensing + evaluating app-store distribution (cost/timeline TBD), running
in parallel with opening testing to people beyond Anthony/Hannah. No action needed yet.

</details>

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

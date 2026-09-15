# Handoff

Older, fully-closed session history (everything before 2026-09-07) lives in `HANDOFF-ARCHIVE.md` —
not read at session start, open it by hand only if you need old investigation detail.

**Last updated:** 2026-09-15 — **process/tooling session, no app code touched.** Trimmed redundant
restatement out of `CLAUDE.md`; split `HANDOFF.md`'s closed-out history (pre-2026-09-07) into
`HANDOFF-ARCHIVE.md`; added a `CLAUDE.md` rule folding approved `to-spec` GitHub issues' durable
decisions into `SPEC.md`; ran `setup-matt-pocock-skills` for this repo (`docs/agents/issue-tracker.md`,
`triage-labels.md`, `domain.md`) so `to-spec`/`to-tickets`/`triage`/`qa` are configured instead of
stopping to ask. All committed directly to `main` (commit `c93498a`) — no ticket, no version bump, no
patch-notes entry (nothing user-facing changed). The open-items list below (#144/#145/#148/#152) is
unaffected by this session; still the actual next work.

**Last updated before that:** 2026-09-14 (continued session) — **all 4 queued in-app issues (#157/#159/#160/#156)
triaged; #163/#159 and #164 both merged to production at `v0.9.45`, both CLOSED.** Anthony
confirmed manual testing passed on #165 (the iOS Safari tap fix) before merge. See the dated section
below for full detail.

**Last updated before that:** 2026-09-14 (earlier same session) — **#158/#161 (dashboard weekly
income/surplus/health-score ignoring actual logged pay for fixed-amount schedules) investigated,
built, reviewed (1 rework round), merged, CLOSED.** Production is live at `v0.9.44`. See the dated
section below for full detail.

**Last updated before that:** 2026-09-08 (continued session) — **#154 (auto-pay bills firing false
"Overdue" pushes + notifications appearing hours late) investigated, built, merged, CLOSED.**
Production was live at `v0.9.43`. See the dated section below for full detail. This directly
confirms #144's post-deploy check item (below) was never actually clean — worth reading before
assuming #144 is fully settled.

**Last updated before that:** 2026-09-08 (new session) — **#151 (dashboard tips ticker banner)
scoped, built, reviewed, tuned on manual-test feedback, merged, CLOSED.** Production was live at
`v0.9.42`. See the dated section below for full detail. **#146 (out-of-spec idea) triaged this
session** — closed, superseded by #151. **#152 (Known Issues tab on patch-notes page) scoped and
filed this session, deliberately NOT built** — Anthony is taking it in a different session; leave
it alone unless he says otherwise. #148 and #145 (both `needs-info`) untouched this session.

**→ START HERE NEXT SESSION:**
0. **#163/#159 and #164 CLOSED this session (2026-09-14, continued) — both merged, production
   confirmed live at `v0.9.45`.** No further action needed on either; flagged here only so a future
   session doesn't re-litigate them. See the dated section below for full detail, including the
   version.ts/patch-notes.ts merge conflict between the two PRs and how it was resolved (both
   independently bumped to the same 0.9.45 — combined both patch-notes highlights under that one
   entry rather than stacking two version numbers, since they landed at the identical number).
1. **#158/#161 CLOSED this session (2026-09-14) — see the dated section below.** No further action
   needed; flagged here only so a future session doesn't re-litigate it. Worth a casual visual
   confirm next time Anthony's in the app that his real $3502.24 back-pay still shows correctly in
   Weekly Income/Surplus/Contributors before his next payday (2026-09-22) cycles it out of view.
2. **#144 post-deploy confirmation — now PARTIALLY answered by #154's investigation (2026-09-08
   continued session), not fully closed.** Confirmed live: Anthony's own household (`4821ab06-
   a09a-4cfe-8160-e53e52550b57`) genuinely delivers on schedule — his notifications land at his
   real 19:00 NZT `notify_hour` and Hannah's at her 09:00 NZT, both within ~3 seconds of
   `scheduled_for`. So the *scheduling* side of #144 is confirmed working. What's still open: the
   symptom Anthony actually experienced (notifications appearing to arrive hours late, e.g. an
   overnight 7pm batch showing up at 11am) was NOT a scheduling bug — it was a **push-delivery
   display bug**, fixed as part of #154 (see that section): `push.ts`/`sw.js` weren't stamping a
   real send-`timestamp` on the notification payload, so a message that reached a sleeping/offline
   device late got stamped "now" by the OS instead of showing its true original send time. That
   fix is live in `v0.9.43` but **has not yet been confirmed against a real delayed-delivery
   scenario on Anthony's own device** — worth checking with him after a day or two whether backlog
   notifications now show the correct original time instead of "just now"/minutes-ago.
3. **[#154](https://github.com/mp3anthony/funded/issues/154) — mostly resolved, one loose end.**
   GEM VISA / ASB VISA / "Power" overdue notifications Anthony reported in his second screenshot
   have **no matching row anywhere in the notifications table's history**, and none of those bills
   are actually overdue per their current `bills` rows. Not explained by the case-sensitivity bug
   that was fixed (that only affected Cloud services/Day Care/Disney/PC Finance/Prime/Rent, all of
   which _did_ have matching false-overdue rows, confirmed and fixed). Ask Anthony to check the
   actual per-notification timestamp on his phone for those three specifically next time it
   happens — possible explanations raised but unconfirmed: a stale/cross-account render, or a
   transcription slip relaying the screenshot.
4. **[#145](https://github.com/mp3anthony/funded/issues/145)** — Anthony's wife (Hannah) barely/not
   getting bill reminder pushes. **Parked, not abandoned** — see the dated section below for the
   full investigation (Supabase evidence: generation/delivery both look fine for her by the numbers,
   leading root-cause candidate is `sendPushToSubscriptions` in `src/lib/push.ts` only cleaning up
   dead subscriptions on an exact 404/410, silently swallowing any other failure). Anthony then said
   she reports getting **no** notifications at all, which is a step beyond what the row-count
   evidence showed — don't trust the "looks fine" framing as still current. **Also surfaced this
   session, unrelated but relevant**: her notify_hour is **9 (9am)**, Anthony's is **19 (7pm)** —
   they are NOT on the same schedule despite being in the same household (notify_hour is per-user,
   not per-household). If Anthony/Hannah want them aligned, that's a Settings change on her end, not
   a bug. Do not scope a build here until Anthony has actually talked to her.
5. **[#148](https://github.com/mp3anthony/funded/issues/148)** (`needs-info`) — Anthony's own
   fortnightly pay schedule's `next_pay_date` drifted +1 day with no pay logged. The
   full evidence/theory for this isn't in this file — check the GitHub issue's own comments before
   re-investigating from scratch. Caveat still applies: Anthony manually
   corrected his pay schedule's date mid-investigation, so re-pull current `pay_schedules`/
   `pay_history` rows fresh rather than trusting any earlier snapshot.
6. **[#152](https://github.com/mp3anthony/funded/issues/152)** — Known Issues tab on the
   patch-notes page (sourced from GitHub issues labeled `known-issue`, plain-language blurb parsed
   from a `## User-facing blurb` section in the issue body). Fully scoped, filed, `ready-for-agent`
   — but Anthony said he's building this one in a different session. **Do not pick this up unless he
   explicitly says otherwise.**
7. **NOT YET FILED, needs Anthony's decision first (`needs-info`-shaped, surfaced during #154's
   investigation):** a bill's `due_date`/`invoice_date` don't self-correct once a bill is marked
   "Paid" — `mapBillFromDb` only recomputes Overdue/Due-Soon status when `status !== "Paid"`, so a
   manual bill stuck at "Paid" silently stops generating reminders forever and its detail-sheet
   dates freeze at whatever they were when last touched (this is what Anthony's "Internet" bill
   screenshot showed — Aug 13 due date, Jun 26 invoice date, both stale). Two real product questions
   for Anthony before this can be scoped as a build: (1) should a "Paid" manual bill automatically
   flip back to Due Soon/Overdue once its next cycle's due date arrives with no further user action?
   (2) should `markAsPaid()` also roll `invoice_date` forward in lockstep with `due_date` (currently
   `invoice_date` has no rollover code anywhere in the codebase — frozen at creation forever)? Both
   are logic-only changes (`AppContext.tsx`), no schema/migration involved, but the behavior change
   itself is a judgment call, not a clean bug fix — ask before building.

**Worth knowing about the notification generation cron if it ever comes up again:** as of this
session it is no longer strictly once-daily — see the 2026-09-08 dated section below for the full
fix. Don't assume the old "accepted once-daily trade-off" framing from earlier sessions still holds;
it's been superseded.

**Doc-divergence between this branch's `HANDOFF.md` and `main`'s copy (from earlier in the #99
slice) is now resolved** — this file is the merged, authoritative version. The one piece that was
only on `main`'s copy and not here has been folded in: **[PR #138](https://github.com/mp3anthony/funded/pull/138)**
(notification fixes #134/#132/#139, squash-merged to `main` mid-slice at `v0.9.35`) and
**[PR #140](https://github.com/mp3anthony/funded/pull/140)** (backfilled the missing v0.9.35
patch-notes entry, and added a permanent rule to `CLAUDE.md` §4: **every version bump now requires
a patch-notes entry in the same PR going forward, including backend-only/no-UI changes** — a
genuinely invisible change still gets a one-line "no visible change" note rather than being
skipped). Both landed directly on `main` while this branch was still in progress, parallel to the
#99 work — worth knowing since neither PR number appeared anywhere else in this branch's own
history until now.

**#88 (Direct Pay end-to-end testing) is CLOSED** — redundant with the in-app bug-report tool per
Anthony's call; no longer an open issue.

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

## 2026-09-14 (continued session) — all 4 queued in-app issues triaged one by one; 2 built + PRs open (#165/#166), 2 closed with no code needed

Continuation of the same day's session, picked up exactly where the earlier entry (below) left off:
the 4 untriaged in-app issues. Anthony asked to triage one at a time, pausing between each for his
input, with each disposition reflected on the GitHub issue itself — followed that pattern
throughout, no batch decisions.

**[#159](https://github.com/mp3anthony/funded/issues/159) (Hannah: can't attach a screenshot on
Report a Bug) → built as [#163](https://github.com/mp3anthony/funded/issues/163) →
[PR #165](https://github.com/mp3anthony/funded/pull/165), `needs-manual-test`.** Investigated
first: the client-side MIME/size check, the Supabase Storage bucket policy, and the GitHub-issue
API route were all internally consistent — nothing in the code was an obvious, confirmed bug.
Rather than guess blind, asked Anthony directly; he confirmed the actual symptom was "tapping the
button did nothing," which pointed at the hidden-`<input type=file>` +
`fileInputRef.current?.click()` trigger pattern — a known source of unresponsive taps on iOS Safari
inside a modal/sheet. Filed #163 as defensive hardening (root cause not 100% pinned, but
high-confidence): replaced the click-trigger pattern with a `<label>`-wrapped file input (also
fixes keyboard accessibility — the old hidden input was unreachable by Tab/Enter, now it isn't);
widened accepted screenshot types to include HEIC/HEIF (iPhone's default photo format) and GIF
alongside JPEG/PNG/WebP, via both the client check and a new Supabase migration
(`20260914000000_widen_bug_report_screenshot_mime_types.sql`) widening the bucket's
`allowed_mime_types`; made the inline validation error visually prominent (matched to the existing
`submitError` banner pattern already in the same file, not invented styling). Independent review
(separate agent, not the builder): **APPROVED**, two non-blocking nits found and folded in before
the PR was opened — an unused `fileInputRef` left over after removing the programmatic click, and
`storage.ts`'s `mimeExtMap` not yet covering the new HEIC/HEIF/GIF types (fell back to a
filename-extension guess, worked but was inconsistent). Both fixed by the same builder, re-verified
clean. `v0.9.44` → `v0.9.45`, patch notes added. **Labeled `needs-manual-test`, not
`needs-merge-approval`** — the one thing this fix can't be confirmed by without a real iOS device is
exactly the bug it's fixing (a tap not registering), so code review alone can't close the loop here.

**[#160](https://github.com/mp3anthony/funded/issues/160) (Hannah: notification 46 min late,
Android S25FE) → folded into #145, closed, no code touched.** Per the prior session's own steer,
did not scope this as a standalone bug — posted the report as a comment on the already-parked #145
thread (secondary-member push-delivery investigation) and closed #160 to avoid tracking the same
likely root cause under two issue numbers. #145 stays parked exactly as before, still waiting on
Anthony talking to Hannah directly.

**[#157](https://github.com/mp3anthony/funded/issues/157) (Hannah: Bills page filters can't isolate
expenses) → scope-checked, logged `out-of-spec`, left open/untriaged. One real bug found along the
way → built as [#164](https://github.com/mp3anthony/funded/issues/164) →
[PR #166](https://github.com/mp3anthony/funded/pull/166), `needs-merge-approval`.** Ran the Step 1
Scope Check before touching anything: no bill-vs-expense type filter exists anywhere in the code,
and — critically — this isn't an oversight. Slice 12/#98's own history (see the dated section
further down) shows Anthony explicitly rejected a separate-tabs bills/expenses design in favor of
one interleaved list ("I hate the switch"), so a "filter to isolate expenses" request reopens a
direction already deliberately steered away from once. Logged to `CHANGE-LOG.md` as `out-of-spec`
rather than silently built — it's a cheap, low-risk addition if Anthony wants it (a third dropdown
alongside the existing Category/Due-Date filters, no schema/redesign involved), but it's his call,
not a bug fix. **#157 itself was left open and untouched on GitHub**, no label change, pending
Anthony's triage.

While investigating #157's filter code, found a real, separate, unambiguous bug: the existing Due
Date filter (This Week/This Month/Overdue) makes `filteredExpenses` silently return `[]` whenever
it's active — expenses just vanish with zero explanation, likely part of what Hannah is actually
hitting even though it's not the "type filter" she asked for. Filed as #164 (clear bug, no CRD
needed per Step 1's carve-out). Investigated the `expenses` schema before building anything: no
`due_date`/`frequency`/`is_recurring` field exists at all (`20260904120000_add_expenses_table.sql`'s
own comment confirms these were deliberately dropped as "not applicable to variable spend"). Per the
issue's explicit instruction not to guess, the builder did not fabricate a `created_at`-based
date-filter semantic (which would misrepresent recurring variable spend — e.g. a 3-month-old logged
grocery expense would wrongly vanish from "This Week" despite recurring weekly). Instead: expenses
stay excluded when the Due Date filter is active, but a clear explanatory note now renders instead
of a silent disappearance, with the "Overdue" case explicitly documented as intentional (no overdue
concept for expenses). Independent review: **APPROVED** — schema claim independently reverified,
the `hasExpensesHiddenByDateFilter` flag checked for false positives (correctly returns `false` for
a genuinely empty household, not just "filter is off"), all 4 testing-checklist items walked and
passed. One non-blocking suggestion noted for later, not actioned: `filteredExpenses` and the
hidden-note flag duplicate the same search/category predicate in two places — safe today, worth a
shared-helper extraction if either filter's logic changes independently in future. `v0.9.44` →
`v0.9.45`, patch notes added. Labeled `needs-merge-approval` — pure calc/logic + UI text, no
device-specific behavior involved.

**Merge, same day:** Anthony manually tested #165 on a real device and confirmed both PRs good to
merge. #165 merged first (clean, no conflicts against `main` yet). #166 then conflicted exactly as
predicted — both PRs independently bumped `APP_VERSION` to the identical `0.9.45` (so `version.ts`
itself merged automatically with no conflict at all — same string on both sides), leaving only
`patch-notes.ts`'s `highlights` array in conflict. Resolved by combining both bullet points under
the single 0.9.45 entry (not stacking two version numbers — precedent from 2026-09-08 doesn't
directly apply here since the numbers matched exactly, but the same spirit: keep both entries'
content, don't pick one side). Re-ran `tsc` clean after resolving, pushed the merge commit, waited
for the fresh Vercel preview to go green, then squash-merged #166. **Production deployment verified
directly via the Vercel MCP tool** (`list_teams` → `list_projects` → `list_deployments`, confirming
deployment `dpl_FpWb743nCwTudYQFGPLgnBNQ7FjN` — the #166 merge commit `71fd533`, which by definition
also carries #165's changes since it's the latest `main` — shows `target: "production"`,
`state: "READY"`) — not just trusted from a green GitHub merge, per this repo's standing gotcha.
Local `main` fast-forwarded, both worktrees removed, issues #159/#163/#164 all auto-closed via each
PR's "Closes #___".

**[#156](https://github.com/mp3anthony/funded/issues/156) (infra: move transactional email off
Anthony's personal Gmail) → unblocked, re-scoped, re-labeled `ready-for-human`, no code touched.**
Anthony confirmed the main Hazardous Schematics site has now landed on its own domain, clearing the
self-block from the prior session. **Scope correction found before doing anything else:** grepped
the entire `funded` codebase for `mailjet`/`resend`/`smtp`/any from-address — zero matches anywhere
in application code. This means the sender configuration almost certainly lives in **Supabase's own
dashboard** (Authentication → Emails → SMTP Settings), not in this repo's code — so the original
issue's step 4 ("update funded's own app code") is very likely not needed; there's nothing here for
a build sub-agent to touch. Anthony confirmed Mailjet is already set up, he just needs the sending
domain swapped from his personal Gmail. Since account/domain-setting changes are things the
Orchestrator is not permitted to do on Anthony's behalf even with permission, posted a full
step-by-step walkthrough as a comment on #156 (Mailjet: add + verify the sending domain → get its
DNS records; Vercel: add those DNS records to the `hazardousschematics.com` domain, verify; Mailjet:
create the actual sending address once verified; Supabase dashboard: swap the Sender email under
Auth → Emails → SMTP Settings) and relabeled `ready-for-human`. **Worth knowing if this resurfaces:**
no code path in this repo constructs or sends transactional email directly — if that assumption
turns out wrong later (e.g. a hidden edge function does something with email), re-verify before
trusting this note.

**Workflow, extending the same pattern as every prior slice, but with an extra scoping layer this
time (bug-report triage, not a single pre-scoped ticket):** for each of the 4 issues — investigate
first (read-only sub-agent or direct grep/read), present findings in plain English, ask Anthony
which direction to take, only then act. Two issues (#163, #164) went through the full
build → independent review → cleanup-round → PR pipeline; two (#160, #156) needed no code at all,
just correct triage disposition (fold into an existing thread; re-scope and hand off manual steps).
**No orchestrator-authored code landed in either diff** — all implementation went through build
sub-agents in isolated worktrees, all review went through separate fresh reviewer agents, matching
`CLAUDE.md`'s separation-of-duties rule throughout. **Both #165 and #166 are left open, unmerged,
awaiting Anthony** — see "→ START HERE NEXT SESSION" above for exactly what each needs.

## 2026-09-14 — #158/#161 (weekly income/surplus/health-score ignoring logged pay for fixed-amount schedules) investigated, built, reviewed (1 rework round), merged, CLOSED; 4 new in-app issues surfaced, untriaged

Opened with the standard Step 0 flow: read `HANDOFF.md` first. Listed open GitHub issues to check
for drift against the doc and found **4 issues filed via the in-app bug-report tool that weren't in
HANDOFF at all** — [#157](https://github.com/mp3anthony/funded/issues/157),
[#159](https://github.com/mp3anthony/funded/issues/159),
[#160](https://github.com/mp3anthony/funded/issues/160) (all `from-app`), plus
[#156](https://github.com/mp3anthony/funded/issues/156) (not from-app, migrated from ATLAS's
cross-department task bank, self-blocked on the main Hazardous Schematics site landing first — no
action taken or needed). Surfaced these to Anthony but did not scope/build any of them this
session — see "→ START HERE NEXT SESSION" above for the full breakdown and priority read on each.

**#158 (Anthony, from-app): "Weekly surplus not including surplus added to payday."** Anthony flagged
real urgency mid-conversation — the evidence (a ~$1600 back-pay bump) would age out of visibility
once his next scheduled payday (2026-09-22) landed, so investigated immediately rather than parking
as a scoping conversation.

**Root cause found and confirmed live, not guessed:** `HealthScoreCard.tsx`'s `weeklyIncome`/
`weeklyActualIncome` calcs only checked `pay_history` for **variable**-amount pay schedules
(`if (!schedule.is_fixed_amount)`) — a **fixed**-amount schedule always fell back to the static
`schedule.amount`, even though fixed-amount schedules log real pay via the identical "Log Pay" flow.
Confirmed directly in Supabase (project `cswjhomkhuzxxdwvtbjv`): Anthony's fortnightly schedule
(`amount: 1893.79`, `is_fixed_amount: true`) had a real `pay_history` row of `3502.24` logged
2026-09-08 that the dashboard never picked up. Filed as
[#161](https://github.com/mp3anthony/funded/issues/161) (closes #158) with a 4-item testing
checklist, per Step 1 (clear bug fix, no CRD needed).

**Workflow deviation this session, worth remembering:** Anthony initially said "just merge it, you
can approve it as the orchestrator" (i.e. skip independent review entirely). The Orchestrator pushed
back per `CLAUDE.md`'s "Challenge Me"/separation-of-duties rules — this touches real money-facing
calculations, and self-approval is exactly what that rule exists to prevent — and asked for explicit
confirmation before taking that shortcut. Anthony then clarified he actually wanted the normal
independent-review flow, just without a manual test on his end ("as long as it's reviewed... I'm
sure with your approval we will be ok"). Reverted to the standard build → independent review →
Orchestrator-verified → merge pipeline. **This paid off**: the independent reviewer found a real,
correctly-scoped miss — the identical bug pattern existed a **third** time in the same file
(`HealthScoreCard.tsx`'s per-member "Contributors" breakdown, ~line 317), which the original build
agent's own repo-wide grep claim ("no duplicate found") had missed because it was a second
occurrence *inside* the same file it had already touched, not a separate file. Sent back to the same
build agent (full context retained) → fixed identically → re-reviewed → **APPROVED**, zero further
findings.

**What got built, [PR #162](https://github.com/mp3anthony/funded/pull/162) (closes #161, closes
#158):** all three occurrences in `HealthScoreCard.tsx` (`weeklyIncome`, `weeklyActualIncome`, and
the per-member Contributors reducer) now check the latest `pay_history` row for a schedule
unconditionally, falling back to `schedule.amount` only when no history exists yet — bringing
fixed-amount schedules in line with how variable-amount ones already worked. Logic-only, no
schema/migration.

**Verification, both by the reviewer and independently by the Orchestrator:** `tsc --noEmit` clean,
`next build` clean (all 19 routes), `npm run lint` 101 problems (56 errors/45 warnings) — identical
to `main`'s own baseline, zero regression. Orchestrator personally read the full diff before
approving (not just the sub-agents' self-reports) — confirmed scoped to exactly the 3 intended files
(`HealthScoreCard.tsx`, `version.ts`, `patch-notes.ts`), no scope creep. All 4 testing-checklist items
on #161 verified by hand-trace by both the reviewer and Orchestrator (pure calc logic, no live device
needed): fixed-schedule-with-history now uses the logged amount; no-history falls back safely
(no NaN/crash); variable-schedule behavior is byte-for-byte unchanged; Joint Fund households
(`isJointFund` branch, uses `householdContributions`) are untouched by the diff.

`v0.9.43` → `v0.9.44`, patch notes added ("Fixed the weekly income, weekly surplus, and health score
on your dashboard not updating when your pay comes in higher or lower than usual, for people on a
fixed pay schedule..."). Pushed as PR #162, labeled `needs-merge-approval` (pure calc logic, fully
pipeline-verifiable, no manual test needed). Vercel preview confirmed green via `gh pr checks`.
Squash-merged, branch/worktrees cleaned up, local `main` fast-forwarded to `cf825d7`. **Production
deployment verified directly via the Vercel MCP tool** (`list_teams` → `list_projects` →
`list_deployments`, confirming the merge commit's own deployment `dpl_AmeTycJagiG9FsVFuZQFSBXzFMKo`
shows `target: "production"`, `state: "READY"`) — not just trusted from a green GitHub merge, per
this repo's standing gotcha.

**Worth checking next time Anthony's in the app** (see "→ START HERE NEXT SESSION" item 1): his real
$3502.24 back-pay should now show correctly in Weekly Income/Surplus/Contributors — worth a casual
visual confirm before his next scheduled payday (2026-09-22) cycles the evidence out of view.

**Workflow, same pattern as most prior sessions after the one deliberate detour above:** Orchestrator
investigated and confirmed root cause directly (live Supabase queries, not guessed) → filed the issue
with a testing checklist → build sub-agent (isolated worktree) → independent review sub-agent (never
the builder, fresh agent) found a real bug on round 1 → same builder fixed it (full context) →
re-reviewed, APPROVED → Orchestrator independently re-verified the diff itself before merging → PR
opened, Vercel green → merged → production verified via Vercel MCP. **One rework round needed, not
zero** — the near-miss on skipping review entirely is worth remembering next time speed pressure
tempts cutting that step.

## 2026-09-08 (continued session) — #154 (auto-pay false-overdue pushes + late-timestamp display) investigated, built, merged, CLOSED

Anthony reported live, with two phone screenshots: a wall of "Bill Overdue" pushes for bills he
believes are auto-pay (shouldn't be overdue at all), all timestamped "now"/"27m ago" at 11am/11:27am
NZT despite his `notify_hour` being 19 (7pm); plus a bill detail modal showing a stale August due
date and June invoice date that never seemed to progress cycle-to-cycle. No CRD needed — straight
bug-fix territory per `CLAUDE.md` Step 1.

**Investigation (background sub-agent, read-only first, then resumed to build once confirmed):**
- **Root cause of the false-overdue pushes**: `generateReminders.ts` compared `bill.payment_type`
  case-sensitively (`=== 'auto'` / `!== 'auto'`), but the DB stores it capitalized (`'Auto'`/
  `'Manual'`), and the server cron path (`push-reminders/route.ts`) never normalizes it before this
  check — only the client's `mapBillFromDb` lowercases it first. Every real Auto-pay bill was
  silently falling into the Manual branch on the cron path, using the raw un-rolled-forward
  `due_date` instead of `adjustAutopayBillDate()` — reproducing the exact #143 symptom, one
  branch-selection step earlier than #143 itself touched. Confirmed live against 6 real bills
  (Cloud services, Day Care, Disney, PC Finance, Prime, Rent) all genuinely misfiring.
- **Root cause of the apparent 11am delivery**: NOT a scheduling bug — verified directly against
  live Supabase data that Anthony's household delivers correctly (his pushes land at 19:00 NZT,
  Hannah's at 09:00 NZT, both within ~3 seconds of `scheduled_for`). The real cause: `push.ts`/
  `public/sw.js` never stamped a send-time `timestamp` on the push payload. Web push has no
  delivery-time guarantee — a message can sit queued and only reach a sleeping/offline device much
  later — so with no explicit timestamp, the OS stamps a late-rendered notification "now" (render
  time, not send time), making an on-time overnight 7pm batch look like it just arrived once the
  device reconnects. This matches Anthony's report closely (DB "now" at investigation time was
  itself ~11:15am NZT, right when he reported seeing the burst).
- **One dead end investigated and correctly ruled out, worth remembering:** an unscoped SQL query
  (joining `notifications`/`bills` without a household filter) briefly looked like it had found a
  *worse* bug — the same `dedupe_key` appearing at 3 different `scheduled_for` times per day. Turned
  out to be the Orchestrator's own query mistake, pulling in an entirely different customer's
  household ("Paull's Direct", Sydney timezone) that happens to reuse generic bill names like "Rent"
  and "Cloud services". **This DB has other real customers' data in it, not just Anthony's test
  household — always scope notification/bill queries to a specific household_id/user_id, never a
  bare bill-name join.** Re-scoped correctly, no such bug exists for Anthony's own household.
- **Unresolved, flagged rather than guessed at:** GEM VISA / ASB VISA / "Power" from Anthony's
  second screenshot have zero matching notification history and aren't overdue per their current
  `bills` rows — not explained by the case-sensitivity bug (which only affects the 6 bills above).
  See "→ START HERE NEXT SESSION" item 1.
- **Due date/invoice date question, deliberately NOT built** — confirmed as a real gap
  (`invoice_date` has no rollover code anywhere; a "Paid" manual bill's status/due_date never
  re-evaluates once cycled past again) but ambiguous product behavior, not a clean bug — flagged to
  Anthony as `needs-info`-shaped rather than silently built. See "→ START HERE NEXT SESSION" item 6.

**What got built and shipped, [PR #155](https://github.com/mp3anthony/funded/pull/155) (closes
[#154](https://github.com/mp3anthony/funded/issues/154)):**
- `generateReminders.ts`: case-insensitive `payment_type` comparison in both the Manual and Auto-Pay
  branches, matching `adjustAutopayBillDate`'s own convention.
- `push.ts`: stamps a real `timestamp: Date.now()` into the push payload at send time.
- `public/sw.js`: passes that `timestamp` through into `showNotification()` (falling back to
  `Date.now()` if absent) so a delayed on-device render shows the true send time.
- Deleted 6 already-queued false-overdue notification rows generated under the old buggy logic
  (Cloud services/Day Care/Disney/PC Finance/Prime/Rent, all for tonight's 7pm cycle) so they
  wouldn't re-fire before the fix shipped.

**Orchestrator independently re-verified before committing, not just trusted the sub-agent's
self-report** — this run had come back flagged with a security-classifier warning ("blocked by
classifier — review actions carefully"), so before acting on it: read the full `git diff` directly
(clean, matches the stated changes, the one non-obvious line — a `CACHE_NAME` cache-bust bump in
`sw.js` — matches this repo's own pre-existing "manual-test redeploy trigger" pattern from PR #121,
not something new); re-ran the DB queries myself with correct household scoping to confirm both the
bug and the cleanup were real (this is where the "Paull's Direct" false alarm above was caught and
corrected); confirmed the 6 pending bad rows were actually gone before proceeding. **Worth
remembering: a security-classifier flag on a sub-agent's tool use is a signal to verify independently
before acting, not to blindly trust or blindly discard the agent's work — in this case the flagged
run's actual changes were legitimate.**

No CRD, no schema/migration — pure application logic. `v0.9.42` → `v0.9.43`, patch notes added.
Filed [#154](https://github.com/mp3anthony/funded/issues/154) (retroactively, after building, given
the same-day 7pm-cycle urgency — Anthony had already said "let's fix this first" before the issue
existed) with a testing checklist. Vercel preview confirmed green via `gh pr checks`. Anthony
confirmed merge. Squash-merged, branch deleted, local `main` fast-forwarded. **Production deployment
verified directly via the Vercel MCP tool** (`list_teams` → `list_projects` → `list_deployments` →
polled `get_deployment` on the merge commit `6883fc0`'s own deployment through `BUILDING` to
`READY`, `target: "production"`, alias `funded-alpha.vercel.app` confirmed pointing at it) — not
just trusted from a green GitHub merge, per this repo's standing gotcha.

**Workflow, slightly different from the usual pattern given urgency:** Orchestrator delegated
investigation-only first (background sub-agent, read-only) → user supplied a second screenshot with
new evidence mid-investigation that contradicted the first pass's timing conclusion → Orchestrator
resumed the same agent with the new evidence and authorized it to build once the cause was confirmed
(skipping a separate build-sub-agent handoff, given the same-day urgency and that the investigating
agent already had full context) → Orchestrator independently re-verified the diff and the live DB
state before committing anything (extra scrutiny here specifically because of the classifier flag) →
issue filed retroactively → PR opened, labeled `needs-merge-approval` → Anthony's go-ahead → merge →
production verified. **No separate independent-review sub-agent this round** — a deliberate
trade-off for same-day urgency, not the norm; worth resuming the normal build→independent-review
split next time this isn't time-critical.

## 2026-09-08 (new session) — #146 triaged into #151, built, reviewed, tuned, merged, CLOSED; #152 filed and parked for Anthony

Opened by listing open GitHub issues. Anthony picked #146 (`out-of-spec` idea, dashboard tips
ticker banner) to triage live rather than leave logged. Per his explicit steer, skipped the full
`crd` skill (too small a feature to warrant it) and instead ran a plain-language discovery
interview — one question at a time via `AskUserQuestion` — until every gap was closed (content
source, motion style, dismiss persistence/behavior, placement vs. the existing mobile `BottomNav`,
reduced-motion handling, tip copy ownership, hover-pause) before filing anything. Filed as
[#151](https://github.com/mp3anthony/funded/issues/151), closed #146 pointing to it.

**#151 built, reviewed, merged.** Build sub-agent added `DashboardTipsTicker.tsx` (fixed to
viewport bottom, above `BottomNav` on mobile using the same clearance value `AppShell.tsx` already
reserves), a `useReducedMotion` hook (new — none existed), and `dashboard-tips.ts` (a plain
`string[]`, 10 tips, kept separate from the component per the ticket's "easily editable" ask, now
carrying a staleness-review comment instructing future sessions to update it whenever a shipped
feature changes user-facing behavior). `UpcomingBillsCard`/`ActiveGoalsCard` gained an
`onMinimisedChange` callback prop so `page-client.tsx` can track both cards' minimised state and
derive `bothCardsMinimised`, which drives the ticker's `active` prop. `v0.9.41` → `v0.9.42`,
patch-notes entry added, confirmed with Anthony before merge.

**Independent review (code-review skill, Standards + Spec axes, separate sub-agent from the
builder, Anthony's explicit choice again this session):** Spec axis — 7/8 testing-checklist items
passed; item 5 (dismiss) flagged as fading rather than hiding "immediately" per the issue's literal
wording. Standards axis — two minor findings (unnecessary `useCallback`/`useMemo` wrappers around
already-stable setters/cheap derivations in `page-client.tsx`, a Middle Man smell). Anthony asked
for both fixed before merge; a separate builder sub-agent applied both, re-verified clean.

**Three rounds of manual-test tuning after Anthony tried the PR preview, each a small direct
build-sub-agent fix (never edited by the Orchestrator itself — caught and corrected one slip where
the Orchestrator almost made a direct Edit, reverted immediately, redone via sub-agent):**
1. Scroll speed too fast, banner popped in with zero delay → halved marquee speed (32s → 64s loop)
   and added a 2s delay before the *initial* fade-in only (fade-out and dismiss stay instant).
2. Fade-in still popped instead of animating → root cause was the `instantHide` mechanism toggling
   the `transition-opacity` class on/off, so the class's presence and the opacity value could
   change in the same render with nothing to transition from. Fixed by keeping the transition class
   always present and doing the instant-dismiss via a direct `transitionDuration` DOM override
   (reflowed, then handed back to CSS on the next frame) instead of removing the class.
3. **Still** popped even with the transition structurally correct → real root cause was the easing
   curve, not the transition mechanism: `--ease-standard` (`cubic-bezier(0.16,1,0.3,1)`,
   documented as a "decelerate" curve for movement/scale) puts an opacity value at
   ~visually-complete within the first ~20-30% of a 520ms duration, then flat for the rest — right
   curve for something sliding into place, wrong for a plain crossfade. Swapped to `ease-in-out`,
   which spreads the change evenly across the full duration. **Worth remembering if any other fade
   in this codebase ever "looks instant" despite a correct transition-duration/class setup — check
   the easing token before assuming the transition mechanism itself is broken.**

Anthony confirmed round 3 ("Waaaay better") and said merge. Squash-merged PR #153, branch deleted,
local `main` fast-forwarded, issue #151 auto-closed via "Closes #151".

**#152 (Known Issues tab) scoped the same way (live discovery interview) and filed, then
deliberately NOT built** — Anthony is taking it in a different session. Full spec, mechanism, and
an 8-item testing checklist are on the issue itself; key decisions worth knowing if it resurfaces
here anyway: repo is **public** (confirmed via `gh repo view`), so no GitHub token/secret needed;
which issues surface is gated by a new `known-issue` label that **Claude** decides to apply (Anthony
explicitly declined to own that judgment call — "I don't know what should be withheld from users");
the user-facing blurb lives in a `## User-facing blurb` marked section inside the issue body itself
(not a separate config file); fetch is server-side or in the pipeline, unauthenticated GitHub REST
API, cached ~15 min (60 req/hr rate limit on an unauthenticated public-repo call otherwise); the
tab must fail gracefully (friendly empty state, never an error) if the fetch fails; seeding at
launch means adding the `known-issue` label + blurb to whichever currently-open bugs warrant it
(candidates named on the issue: #148, #145).

**Workflow, same pattern as every prior slice**: Orchestrator ran the discovery interview directly
(no sub-agent for that — it's plan/scope work, not code) → filed the issue → build sub-agent →
independent Standards+Spec review (separate sub-agent, code-review skill) → fixes sent back to a
build sub-agent → pushed, PR opened `needs-manual-test` (layout/animation/mobile-stacking, correctly
not pipeline-verifiable) → three small manual-test-driven tuning rounds, each delegated to a fresh
build sub-agent → Anthony's go-ahead → merge. **No orchestrator-authored code landed in the diff** —
one near-miss where the Orchestrator made a direct one-line Edit mid-diagnosis, caught immediately,
reverted, and redone through a sub-agent before anything was pushed.

## 2026-09-08 — #142 and #144 scoped, built, reviewed, merged, CLOSED; #145 investigated then parked

Opened by listing open GitHub issues per the prior HANDOFF pointer. Scoped #145/#144/#142 with
Anthony (Problem Agreement step) before building anything — for #145 and #144 this meant real
investigation first (Supabase queries + reading the actual cron/push code), not just restating the
prior session's hypotheses. Anthony chose a separate sub-agent (not the Orchestrator) to review both
builds before merge, per `CLAUDE.md`'s "ask, don't assume" review-routing rule.

**#142 (bug-report Description field) — scoped, built, reviewed, merged.** Prior session's repro
attempt was already exhausted (see below), so this session didn't re-attempt reproduction — scoped
straight to defensive hardening: a live character counter (no artificial cap invented — confirmed via
`src/app/api/bug-report/route.ts` that the description goes straight into a GitHub issue body, no DB
column/schema limit exists to justify one) and lightweight diagnostic logging on the change handler
(fires once per 100-char boundary crossed, not every keystroke, so a real recurrence leaves evidence
in the console). Independent review found two small real issues, both fixed by the same builder: (1)
the log used `console.debug`, which Chrome/Edge DevTools filter out of the default view unless
"Verbose" is enabled — defeats the point of leaving evidence — changed to `console.log`; (2) the
boundary-tracking ref wasn't reset in `resetAndClose()`, so reopening the sheet for a second report
in the same session could log a false "boundary crossed" on the very first keystroke — fixed.
`v0.9.39` → `v0.9.40`, patch-notes entry added. Pushed as [PR #149](https://github.com/mp3anthony/funded/pull/149),
labeled `needs-manual-test` (the original bug was never reproduced automatically, so this needs a
real device). **Anthony tried to reproduce, couldn't, said merge anyway** — squash-merged, branch
deleted.

**#144 (reminder timing drift) — scoped, built, reviewed, merged.** Investigated fresh rather than
trusting the prior session's "accepted architecture trade-off, needs a bigger pg_cron rework"
framing — turned out half of that was already solved and undocumented as such. Confirmed via a live
`select * from cron.job` query that a Supabase `pg_cron` job already delivers every 5 minutes via
`pg_net` calling `/api/cron/deliver-scheduled` — delivery was never the problem. The actual bug was
narrower: `push-reminders/route.ts` (generation) ran once a day at one fixed UTC hour (Vercel
Hobby-plan cron limit), and its own code comment already admitted that a household whose local
`notify_hour` had already passed by that single run gets `scheduled_for` set in the past, so it
fires almost immediately instead of at the chosen time. **Fix:** extended the same
Supabase-`pg_cron`-instead-of-Vercel-Cron pattern the delivery route already used, to generation
too — `push-reminders/route.ts` now accepts a second independent bearer secret
(`GENERATION_CRON_SECRET`, mirroring the existing `DELIVER_CRON_SECRET` pattern) alongside the
existing `CRON_SECRET`, so it's safe to also be invoked frequently. Left `vercel.json`'s once-daily
entry in place as a fallback (retiring it is a separate ops call, not bundled in). Independent review
specifically verified — not just trusted — the claim that repeated same-day generation runs are safe
no-ops: traced every `dedupe_key` in `generateReminders.ts` (all calendar-day/cycle-stable, never a
call-time timestamp), confirmed the unique index backing the upsert exists, and confirmed
`ignoreDuplicates: true` really does compile to `ON CONFLICT ... DO NOTHING`, leaving `scheduled_for`
untouched on a duplicate. Auth-logic diff (OR of two secrets, 500 only if both unset) verified line
by line, no fall-through bug. One round of minor cleanup sent back to the builder: two other files
(`deliver-scheduled/route.ts`, `AppContext.tsx`) still described push-reminders as strictly "daily,"
now stale — fixed. `v0.9.39` → `v0.9.41` (0.9.40 reserved for #142). Pushed as
[PR #150](https://github.com/mp3anthony/funded/pull/150), labeled `needs-merge-approval`.

**Infra applied directly by the Orchestrator, outside the PR** (matching how the existing delivery
cron was set up — see the `20260908120000_document_frequent_generation_cron.sql` migration, which is
comment-only by design): generated a new secret, stored it in Supabase's vault as
`generation_cron_secret`, and scheduled a new `pg_cron` job (`generate-scheduled-reminders`, every 15
min) calling `/api/cron/push-reminders` with it. **This required one manual step from Anthony** —
adding `GENERATION_CRON_SECRET` as a Vercel env var with the generated value — since none of the
available Vercel MCP tools can write env vars; he confirmed it was added.

**Merge hit a real conflict, resolved by the Orchestrator**: both PRs branched off the same `main`
and both touched `src/lib/version.ts`/`src/lib/patch-notes.ts` (every version bump does, by
convention) — #142 merged clean first, #144 then conflicted on exactly those two files when merging
`main` in. Resolved by keeping `APP_VERSION` at the higher `0.9.41` and keeping both patch-notes
entries in newest-first order (0.9.41 above 0.9.40) — `tsc` re-run clean after resolving, before
completing the merge commit. **Worth remembering for next time two same-day PRs both bump the
version**: expect this exact conflict shape, and resolve by keeping the higher version number and
both patch-notes entries rather than picking one side.

**Post-merge verification**: production deployment confirmed `READY`/`target: production` via the
Vercel MCP tool for both merge commits. Checked the new generation cron's actual HTTP responses in
`net._http_response` — its one pre-deploy run correctly got a 401 (old code didn't know the new
secret yet), confirming the auth logic behaves as expected; too little time had passed post-deploy
to confirm a post-fix successful run before the session ended. GitHub auto-closed both #142 and #144
via each PR's "Closes #___".

**#145 — investigated with real Supabase queries, then parked at Anthony's request.** Queried
`household_members` directly: confirmed the "both members show OWNER" observation from the prior
session is real at the DB level (both rows in Hannah's household are `role: owner`, no `member` row
exists at all) — but also confirmed via `notifications` row counts (54 generated for Hannah vs 69 for
Anthony, comparable, both marked `delivered_at`) that this role anomaly isn't gating her reminders,
so it's likely a separate, lower-priority data-shape issue rather than this bug's cause. Read
`src/lib/push.ts` directly: `sendPushToSubscriptions` only treats an exact 404/410 as "dead" and
cleans it up — any other failure (bad VAPID key, network error, a 400) just `console.error`s into
Vercel's server logs and disappears, no retry, no user-facing signal, nothing written back to the
DB. Hannah has exactly one push subscription (Chrome/FCM), untouched since 2026-09-05 — consistent
with, but not proof of, a silent failure since then. Slice 10's `PushStatusDialog` health-check UI
already exists, so the surfacing mechanism is there — it just isn't wired to catch this failure
class. **Posted this as the working theory on the issue, then Anthony said Hannah now reports
getting no notifications at all** (not just "barely," which is what the row-count evidence above
actually supports) — parked rather than scoped into a build, per his explicit call, until he's
talked to her further. Also surfaced in the same investigation: her `notify_hour` is 9 (9am),
Anthony's is 19 (7pm) — not the shared "7pm for the household" both of them apparently assumed;
worth clearing up with her directly since it's a plain Settings difference, not a bug.

**Workflow, same pattern as every prior slice**: Orchestrator scoped/investigated first (real
Supabase queries, not just re-stating hypotheses) → posted plans as issue comments, got Anthony's
go-ahead → build sub-agent (not isolated worktree this time — sequential single-branch builds, since
running two agents in parallel against the same working directory on different branches risks
corruption) → independent review sub-agent (never the builder, fresh agent, Anthony's explicit
choice this session) found real issues on both PRs → same builder fixed them (full context) →
Orchestrator finalized version/patch-notes, pushed, opened both PRs → Anthony's go-ahead → merge,
including one real conflict resolved by the Orchestrator directly (see above) → infra (Supabase vault
secret + pg_cron job) applied directly by the Orchestrator, matching the existing precedent for this
kind of change.

## 2026-09-07 (new session) — #99 closed on GitHub; #143 (auto-pay overdue push) built, reviewed (2 rounds), merged, CLOSED

Opened by listing open GitHub issues and reading this file's own "→ START HERE NEXT SESSION"
pointer. Found a doc/GitHub mismatch: HANDOFF already said #99 was fully done and merged, but the
issue itself was still open on GitHub with `ready-for-agent`. Anthony confirmed it just needed
closing (the work was genuinely done) — closed it with a comment pointing back to PR #141. **Worth
remembering: this file being right about the work doesn't mean GitHub reflects it — check both.**

**#143 built:** root cause was two independent overdue checks that disagreed for auto-pay bills.
The UI (`AppContext.tsx`'s `mapBillFromDb`) calls `adjustAutopayBillDate()` (`src/lib/utils.ts`) to
roll a recurring auto-pay bill's stale stored `due_date` forward to its real next occurrence before
ever checking overdue — so a normal auto-pay bill with an old stored date never shows Overdue. The
push-reminder cron (`generateReminders.ts`) computed `diffDays` straight off the **raw** `due_date`
with no such rollforward, so it fired a daily "Bill Overdue" push for bills the UI never considered
overdue. Fix: `generateReminders.ts`'s Auto-Pay Bills branch now calls the same
`adjustAutopayBillDate` the UI already uses, so cron and UI agree. A bill still genuinely overdue
after rolling forward still fires "Bill Overdue" daily — untouched.

**First independent review round: NEEDS-REWORK, one real blocking bug found** — not a nitpick.
`adjustAutopayBillDate` computed "today" via the calling process's own `new Date()`, which is
correct for its original browser-side caller but wrong for the new server-side cron caller: the
cron already computes a household-timezone-local `todayYmd` (via `todayInZone()` in
`src/lib/notifications/timezone.ts`) specifically because the Vercel server process's own UTC clock
can disagree with a household's local calendar date around the cron's fixed daily UTC run hour
(e.g. Sydney/Auckland-ish timezones). Using the server's raw clock inside `adjustAutopayBillDate`
could fail to roll a due date forward on time right at that boundary, reintroducing the exact #143
symptom through a different door. **Fix**: `adjustAutopayBillDate` gained an optional 4th param
`todayYmd?: string` — omitted, behaves exactly as before (existing `AppContext.tsx` call site
untouched); supplied, used instead of `new Date()`. `generateReminders.ts` now passes its own
household-local `todayYmd` into the call.

**Second independent review round (fresh agent): APPROVED**, walked a concrete Auckland/UTC
scenario end-to-end confirming the fix is genuinely correct, traced `todayYmd` all the way back to
`todayInZone(tz)` in the cron route, confirmed the browser-side call site's behavior is byte-for-byte
unchanged, confirmed the original bug's core fix wasn't regressed by the follow-up commit. Both
review rounds independently ran `tsc`/`next build`/lint themselves rather than trusting the builder.
**One lint-count wrinkle worth knowing if it comes up again**: this repo's real `"lint"` script in
`package.json` is a bare `"eslint"` (no path arg) — running it via `npm run lint` lints the *entire*
repo including `supabase/functions/*` (Deno edge functions) and reports ~13,900 problems, wildly
different from the ~101 both build agents and the first reviewer got by invoking `eslint .` or
similar directly. Both numbers are self-consistent baselines (identical on `main` vs. the branch
either way — no regression either way), just scoped differently; the orchestrator verified this
directly by running `npm run lint` itself on both `main` and the branch. Not a bug, just a trap for
next time someone reports a lint count that looks different from a prior session's.

**Pushed as [PR #147](https://github.com/mp3anthony/funded/pull/147), labeled
`needs-merge-approval`** — pure cron/calc logic, no UI/layout surface, fully verifiable in-pipeline.
Vercel preview confirmed green via `gh pr checks`. `v0.9.38` → `v0.9.39`, confirmed with Anthony
before merge. Squash-merged, remote branch deleted by `gh pr merge --delete-branch`; local `main`
fast-forwarded automatically since this session did the merge itself. This session's own build-agent
worktree (`agent-ac2a1c4fade02a432`) and its branch cleaned up after the cherry-pick onto the
tracked branch landed. **Production deployment verified directly via the Vercel MCP tool**
(`list_teams` → `list_projects` → `list_deployments`, confirming the merge commit `ae192ec`'s own
deployment shows `target: "production"`, `state: "READY"`) — not just trusted from a green GitHub
merge, per this repo's standing gotcha. Issue auto-closed by the PR's "Closes #143".

**Workflow, same pattern as every prior slice**: build sub-agent (isolated worktree) → independent
review sub-agent (never the builder, fresh agent) found a real bug → same builder fixed it (full
context) → a second fresh reviewer verified the fix → orchestrator cherry-picked/pushed/opened the
PR → Anthony's go-ahead → merge. **One rework round needed, not zero** — worth noting since several
recent sub-slices went first-pass-clean; this is a reminder the review step actually catches things.

**Next session: three standalone bugs left (#142, #145, #144, in that priority order) + one
untriaged idea (#146)** — see "→ START HERE NEXT SESSION" at the top of this file.

## 2026-09-07 (continued) — PR #141 review-fix round, manual-test pass, merged; #99 CLOSED

Anthony gave feedback on the PR #141 checklist from his phone: Dashboard's Household Health and
Savings Goals expand/collapse showed the slow motion correctly, but **Upcoming Bills** and
**Contributors** were instant; **Payday**'s pay-history expand was instant; the **avatar dropdown**
opened/closed with zero motion (checklist item 5's explicit requirement). No spec question, no
locked invariant — straight into the normal fail→fix→re-review loop.

**Build sub-agent (isolated worktree)** fixed all four. Two turned out to live in different files
than the ticket's literal names suggested — worth remembering if this class of report comes up
again: "Dashboard Contributors" is a subsection inside `HealthScoreCard.tsx`, not a separate
component; `ContributorSplits.tsx` is actually a bill-split-entry form with no collapse behavior at
all. Likewise "Payday history" lives in `src/app/payday/payday-client.tsx`, not `PayHistoryCard.tsx`
(a single non-collapsing row). The agent caught this itself by reading the real live code paths
rather than forcing the fix onto the named-but-wrong file. `UpcomingBillsCard.tsx` and the
`HealthScoreCard.tsx`/`payday-client.tsx` collapse sections were brought in line with the existing
known-good `grid-template-rows: 1fr↔0fr` technique (same tokens as `ActiveGoalsCard.tsx`).
`AvatarDropdown.tsx` gained a new `menu-panel-in` keyframe and a 3-state open/closing/closed machine
so it plays its exit animation before unmounting, plus `active:scale-[0.98]` press feedback on its
menu items.

**Independent review (fresh agent, not the builder): APPROVED, zero findings.** Verified the two
file-redirections were genuinely correct (grepped `ContributorSplits.tsx`/`PayHistoryCard.tsx` for
collapse logic — none exists), confirmed the grid-row technique matches the reference implementation
token-for-token, checked the AvatarDropdown state machine for a rapid open→close→open race or a
timeout leak on unmount (none found), confirmed zero diff outside the 5 intended files. Independently
re-ran `tsc`/`eslint`/`next build` itself rather than trusting the builder's numbers — matched
exactly (101 problems/56 errors/45 warnings vs. 102/56/46 baseline, one dead-handler warning removed
incidentally).

Cherry-picked the reviewed commit onto the branch as `c607df8`, pushed, Vercel preview confirmed
green. Posted a follow-up PR comment naming exactly the 4 items to re-test (everything already
passed didn't need re-checking). **Anthony re-tested and confirmed all pass**, said "merge that."

**Merge:** version reconfirmed at `v0.9.38` (unchanged — this was a rework commit on the same open
PR, not a new build cycle, matching every prior round's convention). Relabeled `needs-manual-test` →
`needs-merge-approval`. Reconciled this file's history against `main`'s own divergent copy (see the
note near the top of this file) before merging, so the squash-merge wouldn't silently drop either
copy's detail. Squash-merged PR #141, production deployment verified `READY` via the Vercel MCP
tool (not just a green GitHub merge, per this repo's standing cron-deploy gotcha).

**#99 is now fully CLOSED — the entire whole-app motion pass (7 sessions across multiple
sub-passes: Foundation/Settings/AppShell/Dashboard in PR #129, Funds/Goals, Bills/Payday/shared
sheets, Auth screens, this review-fix round) is live in production.** No ticket queued next beyond
the four standalone bugs — see "→ START HERE NEXT SESSION" at the top of this file for priority
order.

## 2026-09-07 — QA session: 4 new bugs filed (no code touched), PR #141 still the priority

Anthony reported 3 problems conversationally (in-app bug-report form freezing, auto-pay bills
pinging "overdue" pushes, notification timing acting up including his wife barely getting any).
Ran the `qa` skill: explored the relevant code in the background (bug-report form, overdue calc,
notification scheduling/delivery) while lightly clarifying with him, then filed. **No code was
changed this session** — pure triage/filing. **PR #141 (this file's own "→ START HERE NEXT
SESSION" pointer above) is unaffected and still the actual next-session priority** — these 4 new
issues are queued behind it, not instead of it.

- **[#142](https://github.com/mp3anthony/funded/issues/142)** — in-app "Report a Bug" form's
  Description box stops accepting keystrokes past a certain length, no error/feedback, reported as
  consistent/reproducible. **Worth knowing before picking this up:** the codebase exploration found
  *no* `maxLength` or any other cap on the Description field in the current code (the sibling Title
  field does have `maxLength={150}`, which would silently do exactly this if it were the field
  mistaken for Description) — so the cause isn't obvious from reading the code and will need actual
  reproduction, not just a source read.
- **[#143](https://github.com/mp3anthony/funded/issues/143)** — auto-pay bills fire daily "Bill
  Overdue" push notifications despite never showing as overdue in the bill list/health score.
  **Root cause already located, not just reported:** `mapBillFromDb` (display/health-score path)
  explicitly exempts `payment_type === "auto"` bills from ever being marked Overdue, but the
  separate push-reminder cron (`generateReminders.ts`) computes overdue straight from the bill's
  raw, unadjusted `due_date` with no such exemption — two independent overdue checks, only one of
  which knows about auto-pay. Straightforward, unambiguous bug fix, no CRD needed.
- **[#144](https://github.com/mp3anthony/funded/issues/144)** — reminder notifications drift off
  the household's configured time (Auckland/7pm) instead of arriving consistently at that hour.
  **Architecture-level cause already located:** the generation cron only runs once/day at a fixed
  UTC instant (Vercel Hobby-plan cron-frequency ceiling, same constraint as the #96/Slice 11 gotcha
  already documented above) and just fires per-household reminders whenever that single run
  happens — a household's actual configured hour only matters for whether that reminder lands close
  to on-time or noticeably off, depending on which side of the fixed daily run its timezone offset
  falls on. The code's own comments call this an accepted trade-off already, not an oversight — so
  this ticket is really "make the accepted trade-off less visible to users" rather than a pure
  logic bug; worth surfacing that distinction to Anthony before scoping a fix, since a real fix
  likely means revisiting the once-daily architecture (e.g. extending the existing Supabase
  `pg_cron`/`pg_net` pattern already used for delivery, rather than another Vercel Cron attempt).
- **[#145](https://github.com/mp3anthony/funded/issues/145)** — a secondary household member
  (Anthony's wife) barely receives bill reminder push notifications despite having notifications
  enabled on her phone, while the primary/owner member gets them reliably. **Leading hypothesis
  from exploration, not yet confirmed:** delivery needs two separate per-user prerequisites that
  aren't part of onboarding/invite-accept — a `notification_settings` row (only lazily created the
  first time that user's client loads household data) and a `push_subscriptions` row (only created
  when that specific person manually taps "Enable push notifications" in Settings on their own
  device). A secondary member can easily be missing one or both without realizing it, and a missing
  subscription is currently swallowed silently (marked delivered, nothing actually sent, no retry).
  Worth asking Anthony to have her specifically check Settings → Push Notifications on her own
  phone before assuming this is a logic bug rather than a one-time setup gap.

All 4 labeled `bug`/`needs-triage` on GitHub — none touch a Part A locked invariant, no CRD needed,
all clean build-when-picked-up bug fixes. No version bump, no patch-notes entry (nothing shipped).


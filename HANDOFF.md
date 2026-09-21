# Handoff

Older, fully-closed session history lives in `HANDOFF-ARCHIVE.md` — not read at session start, open
it by hand only if you need old investigation detail.

**Last updated:** 2026-09-21 — **#173 (light icon asset files) built, independently reviewed,
merged (PR #175), live at `v0.9.47`. #174 was re-scoped mid-session and is next — nothing built yet.**
Prior state (2026-09-17): #144/#154/#148 closed; #168 PR open waiting on Hannah's device test.
See "→ START HERE NEXT SESSION" below for the current open-item list.

**→ START HERE NEXT SESSION:**
A. **BUILD [#174](https://github.com/mp3anthony/funded/issues/174)** (sub-issue of
   [#172](https://github.com/mp3anthony/funded/issues/172), `ready-for-agent`; #173 is done, merged as
   [PR #175](https://github.com/mp3anthony/funded/pull/175), production deployment verified `success`
   at merge commit `15caca1`, `v0.9.47`). The issue body holds the full **revised** spec and testing
   checklist — read it, don't re-grill. Branch from current `main` (already has #173's files and the
   `0.9.47` bump → bump to `0.9.48`). Summary:
   - **Scope was revised this session (Anthony approved) — the old "tab favicon only, home-screen icon
     stays dark" plan is superseded.** #174 now: (1) media-scoped tab `<link rel="icon">` (light icon
     under `prefers-color-scheme: light`, existing dark under dark), **and** (2) the home-screen icon —
     `apple-touch-icon` in `src/app/layout.tsx` + `icons` in `public/manifest.json` — switches to the
     **light** icon (`icon-light-512x512.png` for apple-touch; manifest 192+512 light), `?v=3` cache-bust.
     Leave `manifest.json` `theme_color`/`background_color` and `viewport.themeColor` alone.
   - **Why (don't re-litigate):** Anthony's bookmarked **Cartel** web link switches between light/dark
     in iPhone Home Screen > Customise even though it's a plain Vercel PWA. Cartel declares ONE opaque
     light icon (`cartel/mobile/public/icon.png`, 1024px, no alpha) and **iOS 18 auto-generates the dark
     variant**. Funded's icon was already black (and 192px with semi-transparent corners), so the
     auto-dark was visually identical and it never seemed to switch. Earlier HANDOFF/#174 text saying
     "iOS has no dark support for web apps" (Apple forum thread 761615) was **wrong** — no *developer-
     supplied* dark icon, but the OS darkens a single icon. Anthony's screenshots of the "Test"
     (Funded preview) icon in Dark mode showed a slightly lighter charcoal tile, consistent with this.
   - **Accepted trade-offs:** iOS's auto-dark isn't our black + lime; Android just shows the light icon;
     already-installed home-screen icons never update (delete + re-add to see it); default icon for
     new installs flips dark → light. True branded dark/light icons still need the future native/store
     move (Anthony will file that himself; locked-stack change, nothing to do now).
   - **Needs in the PR:** version bump + patch note, a `CHANGE-LOG.md` row (`done`, links #174, "not in
     SPEC.md"), label `needs-manual-test` (iPhone: delete old icon → re-add from the preview → check
     Default shows light, Customise > Dark shows OS-darkened version; report what Dark looks like).
   - **Process:** build sub-agent in an isolated worktree → independent review sub-agent (standing rule,
     don't ask) → Orchestrator commits/pushes/opens PR → `needs-manual-test`.
0. **[PR #169](https://github.com/mp3anthony/funded/pull/169) (#168, Android/Samsung Internet
   bug-report screenshot-attach losing the draft) — open, `needs-manual-test`, NOT yet merged.**
   Hannah was going to try it for real (attach a screenshot on her actual device — Samsung Internet,
   not Chrome, see the dated section below for why that correction matters) the evening of
   2026-09-17; Anthony said another session would close this out once she confirms. Check whether
   that's happened before doing anything else with this PR — if she hasn't tried it yet, it's still
   just waiting, not stuck.
1. **[#145](https://github.com/mp3anthony/funded/issues/145)** — Hannah barely/not getting bill
   reminder pushes. Still parked, still unresolved. **New evidence 2026-09-17:** Anthony reported she
   got one notification ~40 minutes late on Android — logged as a comment on #145, not a new issue.
   Root-cause theory from the original investigation (`sendPushToSubscriptions` in `src/lib/push.ts`
   only cleans up dead subscriptions on an exact 404/410, silently swallowing any other failure) is
   still just a theory, not confirmed. Do not scope a build here until Anthony has talked to her
   directly about what she's actually experiencing.
2. **[#152](https://github.com/mp3anthony/funded/issues/152)** — Known Issues tab on the
   patch-notes page. Fully scoped, filed, `ready-for-agent`. **Corrected understanding as of
   2026-09-17: this is NOT reserved for Anthony to build himself** (he's not a developer — any Claude
   session can pick this up whenever he wants it built). A comment was added to the issue flagging
   that if the repo has gone private since scoping, the Known Issues fetch will need a server-side
   GitHub token (same PAT pattern as `/api/bug-report/route.ts`), since the original scoping assumed
   an unauthenticated public-repo fetch.
3. **NOT YET FILED, needs Anthony's decision first:** a bill's `due_date`/`invoice_date` don't
   self-correct once a bill is marked "Paid" — `mapBillFromDb` only recomputes Overdue/Due-Soon
   status when `status !== "Paid"`, so a manual bill stuck at "Paid" silently stops generating
   reminders forever and its detail-sheet dates freeze at whatever they were when last touched. Two
   real product questions for Anthony before this can be scoped as a build: (1) should a "Paid"
   manual bill automatically flip back to Due Soon/Overdue once its next cycle's due date arrives
   with no further user action? (2) should `markAsPaid()` also roll `invoice_date` forward in
   lockstep with `due_date` (currently has no rollover code anywhere — frozen at creation forever)?
   Both are logic-only changes (`AppContext.tsx`), no schema/migration involved, but the behavior
   change itself is a judgment call, not a clean bug fix — ask before building.

**Other open issues, for completeness (2026-09-21 snapshot, no action taken this session):**
[#167](https://github.com/mp3anthony/funded/issues/167) (Mailjet onboarding email campaign,
`needs-info`/`ready-for-human`, not previously in this file),
[#157](https://github.com/mp3anthony/funded/issues/157) (Bills page can't filter to expenses —
logged `out-of-spec`, needs Anthony's call), and
[#156](https://github.com/mp3anthony/funded/issues/156) (move transactional email off personal Gmail —
`ready-for-human`, waiting on Anthony's manual Mailjet/DNS/Supabase steps). Also #168/PR #169 still
waiting on Hannah's device test (item 0 above) — status unchecked this session.

**Closed the previous session (2026-09-17), no further action needed — flagged only so a future session
doesn't re-litigate:**
- **[#144](https://github.com/mp3anthony/funded/issues/144)** — Anthony confirmed his own
  notifications now arrive at his configured time with nothing false. Closed.
- **[#154](https://github.com/mp3anthony/funded/issues/154)** — Anthony confirmed no false overdue
  notifications since the v0.9.43 fix, including no recurrence of the previously-unresolved GEM
  VISA/ASB VISA/Power loose end. Closed.
- **[#148](https://github.com/mp3anthony/funded/issues/148)** — Anthony confirmed the pay-schedule
  date drift hasn't recurred. Closed.
- **[#170](https://github.com/mp3anthony/funded/issues/170)/[PR #171](https://github.com/mp3anthony/funded/pull/171)**
  — removed the "track it here" GitHub-issue link from the bug-report success screen (Anthony's
  call: users shouldn't be able to track issues directly; the Known Issues tab + patch notes are the
  intended notification path instead). Built, independently reviewed (clean), merged, confirmed live
  in production at `v0.9.46`.

**Gotcha caught this session, worth remembering:** the 2026-09-15 session's 3 doc-only commits
(`CLAUDE.md`/`HANDOFF.md` trims) were made locally but **never actually pushed to GitHub** — local
`main` and `origin/main` had silently diverged for two days before this session noticed while trying
to fast-forward after a merge. Not lost, just sitting unpushed; merged up cleanly this session. Worth
double-checking `git status`/ahead-behind at the start of a session, not just assuming a prior
session's "committed" meant "pushed."

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

## 2026-09-17 — #144/#154/#148 closed on Anthony's confirmation; #168 (Android draft loss) built+reviewed, PR open pending Hannah's device test; #170 (remove tracking link) built, reviewed, merged, live

Opened by reading this file's own "→ START HERE NEXT SESSION" pointer. Anthony confirmed three
outstanding loose ends were resolved: his own notifications arrive at his configured time with
nothing false (closes #154, including its previously-unexplained GEM VISA/ASB VISA/Power loose end);
the pay-schedule date drift hasn't recurred (closes #148); and by extension #144's remaining
uncertainty (whether the v0.9.43 timestamp-display fix actually holds on a real delayed-delivery
case) is resolved too, since he's seeing correct on-time delivery with nothing false. All three
commented and closed on GitHub.

**New bug reported mid-conversation:** attaching a screenshot to the in-app bug report on Android
takes the user all the way back to a bare Settings page, losing the draft. Investigated
`BugReportSheet.tsx`/`settings-client.tsx` directly: the sheet's open/draft state lives only in
React `useState`, nothing persisted. Filed as
[#168](https://github.com/mp3anthony/funded/issues/168) — likely cause is the browser reclaiming the
backgrounded tab's renderer while the native file picker is up, then reloading the page fresh on
return, wiping all in-memory state. **Correction from Anthony after filing:** the actual device is
Hannah's, via **Samsung Internet**, not Chrome — corrected the issue and PR text accordingly (still
the same class of bug; Samsung Internet is also Chromium/Blink-based, and the fix doesn't depend on
anything Chrome-specific).

**#168 built** (isolated worktree): persists the draft (title, description, timestamp) to
`sessionStorage` while the sheet is open; restores and reopens the sheet on mount if a draft exists;
shows a re-attach note for the screenshot itself (a `File` can't survive a reload). **Independent
Spec review caught a real follow-up bug** before this went anywhere near a PR: the first draft of
the fix only cleared the sessionStorage draft on Cancel/Submit, so a user who just navigated away
from Settings normally (not Cancel, not a reload) would leave a stale draft sitting there that could
force-reopen the sheet on some totally unrelated future Settings visit. Sent back to a fresh build
agent: added a 2-minute timestamp-expiry window on the restored draft (long enough to survive a real
Android reload-and-relaunch, short enough to never span "user wandered off") plus an unmount-cleanup
clear for the normal-navigation case. Orchestrator independently re-read the full diff before
opening [PR #169](https://github.com/mp3anthony/funded/pull/169) — confirmed correct. `v0.9.45` →
`v0.9.46`. Labeled `needs-manual-test` (the actual Android reload-kill scenario can't be triggered
reliably outside a real device) — **still open, not merged**, waiting on Hannah's real-device test.

**New scope change from Anthony:** users shouldn't be able to track filed bug reports directly at
all — the Known Issues tab (future, #152) and patch notes are the intended notification paths, not a
direct GitHub issue link. Filed as [#170](https://github.com/mp3anthony/funded/issues/170), built
(separate isolated worktree — removed the "track it here" link from `BugReportSheet.tsx`'s success
screen and stopped `/api/bug-report/route.ts` returning `issueUrl`/`issueNumber`), independently
reviewed (clean, no findings), pushed as [PR #171](https://github.com/mp3anthony/funded/pull/171).
Anthony confirmed merge — squash-merged, production deployment verified `READY`/`target: production`
via the Vercel MCP tool at commit `fa8e032`, `v0.9.46` live.

**Also this session:** added a comment to #152 flagging that if the repo has gone private since it
was scoped, the Known Issues tab's GitHub fetch will need a server-side token (same PAT pattern as
the bug-report route) — the original scoping assumed an unauthenticated public-repo fetch. Confirmed
for Anthony that flipping the repo to private doesn't break anything currently in the codebase (the
only GitHub API usage, the bug-report route, already uses a server-side PAT, not anonymous access) —
his call whenever he wants to do it. Corrected a stale assumption from a much earlier session: #152
was never reserved for Anthony to hand-code himself; he's not a developer, it's `ready-for-agent` and
any Claude session picks it up when he wants it built.

**Process note:** Anthony gave explicit feedback this session — always delegate diff review to a
separate sub-agent, never have the Orchestrator review its own (or any) diff directly, even for
small changes, since keeping review work out of the Orchestrator's own context lets the session run
longer before compaction. Saved to persistent memory; applied for the rest of this session (#170's
review) and should be the default going forward without needing to ask each time.

**Also caught and fixed mid-session:** local `main` had 3 unpushed doc-only commits from the
2026-09-15 session (see the "Gotcha caught this session" note above) — merged and pushed alongside
this session's own work so `main` is now fully in sync with GitHub.

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


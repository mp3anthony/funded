# Handoff

Older, fully-closed session history lives in `HANDOFF-ARCHIVE.md` — not read at session start, open
it by hand only if you need old investigation detail.

**Last updated:** 2026-09-27 (late night) — **#169 merged (v0.9.53 live); #182 + #193 built, reviewed,
PRs open awaiting Anthony's manual test; agy no longer plans.**
- **[PR #169](https://github.com/mp3anthony/funded/pull/169) (#168) MERGED, v0.9.53, issue closed.**
  Timestamp-refresh fix (re-save draft on `visibilitychange` hidden / `pagehide` / Attach tap) +
  `hadScreenshot` flag (restore note only mentions a lost screenshot when one was being attached;
  cleared on picker `cancel` via native listener — React 19 only wires `onCancel` on `<dialog>` — or
  rejected file) + `submittedRef` guard against re-saving a submitted draft. agy review round 1
  CHANGES REQUESTED (3) → fixed → round 2 APPROVE. Merged without Hannah's test per Anthony. If she
  later reports the draft still lost on Samsung Internet, reopen #168.
- **[PR #194](https://github.com/mp3anthony/funded/pull/194) MERGED** (docs: #193 spec + version
  renumber). Versions: **#182 v0.9.54, #193 v0.9.55, #187 v0.9.56** — commented on all three issues.
- **[PR #195](https://github.com/mp3anthony/funded/pull/195) — #182 payday taps, v0.9.54,
  `needs-manual-test`, OPEN.** Payday reminder → `/payday?scheduleId=&payDate=` (pay date parsed from
  the existing `notifications.dedupe_key` via `parsePaydayLogPayDate` in `generateReminders.ts` — no
  migration); confirmation reminder → `/payday?historyId=`. Resolver in new pure
  `src/lib/notifications/paydayLink.ts`. Payday page waits for `autoLogMissedPays` to settle, opens
  the Log Pay or Confirm box once, strips params with `router.replace`. `sw.js` notificationclick: links
  with params always `client.navigate()` an open window (fallback `openWindow`) — also affects bill
  links. `deliver-scheduled` cron now selects `dedupe_key`. Plan: Claude sub-agent (agy plan failed —
  blocked tool). Build: Claude sub-agent. Review: agy APPROVE. main merged in (9da3668). Auto-fix on.
- **[PR #197](https://github.com/mp3anthony/funded/pull/197) — #193 goal popup, v0.9.55,
  `needs-manual-test`, OPEN, STACKED on #195** (base `feat/182-payday-tap-popups`; both touch
  `destination.ts`). Goal notification → `/funds?goalId=<fund id>`; Goals page waits for
  `isDataLoading` false, opens that goal's GoalDetailSheet, strips the param. v0.9.52 patch note
  "open Funds" → "open Goals". agy APPROVE. Auto-fix on. **After #195 merges: retarget #197's base to
  `main` (`gh pr edit 197 --base main`), merge main in if needed, re-check CI.**
- **Testing reality for #195/#197:** push taps only testable AFTER merge (pg_cron delivery job calls
  production). Before merge: inbox items on the PR preview (#195 items 6–8; #197 items 2–6). Seed
  test notifications with the method in the next section (tag `dedupe_key 'TEST-…'`, delete after).
  Note: #182's link needs a real payday `dedupe_key` shape (`<scheduleId>-<YYYY-MM-DD>-payday_log_pay`)
  on the test row, not `TEST-…`, or it falls back to plain `/payday` — use a real schedule id and pay
  date, and delete the row after.
- **agy change — [PR #196](https://github.com/mp3anthony/funded/pull/196) MERGED** (self-merge,
  docs/tooling rule; reviewed by a Claude sub-agent, not agy): `-Task plan` removed (plan models kept
  calling blocked `run_command`); on a blocked tool the script retries ONCE with a firmer line naming
  the sanitised tool, sharing the `-TimeoutMin` budget; second failure → exit 3, no cooldown. Kit
  updated byte-identical (backup `_backup-20260927b\`). Retry path not live-tested. Kit
  `UPDATE-PROMPT.md` not refreshed — other repos (Cartel, website) need a new update prompt to pick
  this up. Planning now always → Claude sub-agent. agy refuses `.sql` and `.claude/` paths (exit 4):
  paste schema facts into prompts; stage worktree diffs as temp `.md` files in the repo root, delete after.
- **Housekeeping:** stale worktree `agent-a6feb009b8d57c899` removed by Anthony. Merged worktrees
  cleaned. Remaining worktree: `.claude/worktrees/wt-193` (branch `feat/193-goal-popup`, PR #197) —
  remove after #197 merges. `worktree-agent-afa605247a48203f1` branch still kept (see below).
- **Process slip this session:** Orchestrator read a stale HANDOFF (the real one was in unmerged
  PR #194) and built #182 before #169. Lesson: at session start, also check open docs PRs
  (`gh pr list`) for a newer HANDOFF.
- **Anthony will run a new session to walk through closing the open PRs** — start with the
  START HERE list below.
**Last active SPEC ticket: Slice 16 — #182 (PR #195) + #193 (PR #197) in manual test; next build
#187 (Slice 17, v0.9.56).**

**Still-live notes carried from earlier sessions (2026-09-24 → 27; full detail in `HANDOFF-ARCHIVE.md`):**
- **How #181 was tested (reuse for #182/#193):** pushes can only be tested *after* merge — the pg_cron
  delivery job calls **production**, so the push link is built by live code, not the PR preview.
  Inbox-only items can be tested on the preview. Method: insert a `notifications` row for Anthony
  (`user_id 4200aca8-…`, household `4821ab06-…`; his main login, NOT the
  gmail one — see agent memory) with `scheduled_for = now()`, `delivered_at = null` → push within ~5 min
  (arrives ×6, one per subscription). Inbox-only: set `delivered_at = now()`. Re-show an old item:
  `is_read = false` (inbox hides read items). Tag test rows `dedupe_key 'TEST-…'` and delete after.
- **"Goals page" naming:** `/funds` is the **Goals page** — call it that in anything Anthony reads; no
  app-wide rename, `/funds` route/code unchanged.
- **agy tips:** agy line-level claims can be incomplete (missed 2 of 16 grep hits in a test) — verify.
  Call the script as `& .\scripts\agy-delegate.ps1 ... -Files @('a','b')` from PowerShell; agy only
  reads files passed via `-Files` (inside the repo). Never use the gemini-cli MCP.
- **agy loose ends:** (a) when **#183 (DESIGN-REFERENCE.md)** lands, restore the kit's
  design-foundation rule in `GEMINI-DELEGATION.md` pointing at it (currently dropped; rule 5 points at
  SPEC.md Part A); (b) future kit updates (kit at
  `D:\Anthonys-HQ\business\hazardous-schematics\agy-delegation-kit\`) get re-synced here — script must
  stay byte-identical, keep this repo's adapted rules 5/6.
- **Standing rule (Anthony, 2026-09-26):** docs/tooling-only PRs need no review from him —
  independent agent review, fix, self-merge.
- **Kept branch `worktree-agent-afa605247a48203f1`** — 1 commit (`1aacb99`, #98 Direct Pay split,
  sub-slice 3) not on origin; probably superseded; do NOT delete without Anthony's go-ahead — he
  hasn't decided.
- **Repo `mp3anthony/funded` is PUBLIC** (flipped private and back on 2026-09-26; only side effect:
  stars/watchers wiped).
- **Launch video (`/brag`, 2026-09-24):** output outside the repo at
  `D:\Anthonys-HQ\business\hazardous-schematics\brag-output\funded\2026-09-24-060937\`. Check the music
  licence (brag skill `assets/music/README.md`) before posting publicly.
- **Optional cosmetics (unfiled):** `public/manifest.json` black `background_color` / lime
  `theme_color`; stale "PR #121 redeploy trigger" comment on `sw.js` line 1.

**⚠️ FUNDED IS A MOBILE APP, NOT DESKTOP.** Installed home-screen app on iPhone (Anthony) and
Android/Samsung Internet (Hannah). Anthony has said this repeatedly — never lead with, test, or ask
about desktop behaviour.

**→ START HERE NEXT SESSION:**
A. **Close [PR #195](https://github.com/mp3anthony/funded/pull/195)
   ([#182](https://github.com/mp3anthony/funded/issues/182) payday taps, v0.9.54)** — walk Anthony
   through it: inbox checks on the PR preview (items 6–8; seed rows per "How #181 was tested" above,
   using a real payday `dedupe_key` shape) → his merge go-ahead + confirm version v0.9.54 → merge →
   push-tap checks on live (items 1–5, 9–11) → follow-up PR if any fail.
B. **Then [PR #197](https://github.com/mp3anthony/funded/pull/197)
   ([#193](https://github.com/mp3anthony/funded/issues/193) goal popup, v0.9.55)** — after #195
   merges, retarget base to `main` (`gh pr edit 197 --base main`), merge main in if needed, re-check
   CI → inbox checks on the preview (items 2–6) → his merge go-ahead + version confirm → merge → push
   check on live. Then remove worktree `.claude/worktrees/wt-193`.
C. **Then build [#187](https://github.com/mp3anthony/funded/issues/187)** (SPEC.md Slice 17,
   v0.9.56): paid bills reset to unpaid on/after their due date, invoice date rolls with it, autopay
   can't be marked Paid, one-off reset of bills already stuck at Paid. **Read the
   implementation-notes comment on #187 first** (real cron is pg_cron → `push-reminders` every ~5 min,
   not hourly; roll on-or-after due date; idempotent guard; month-end clamp). Includes a one-off
   production data fix (not written yet) — must be idempotent. Plan via a Claude sub-agent (agy no
   longer plans) → Claude build sub-agent → agy review → PR → `needs-manual-test`.
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
3. **[#183](https://github.com/mp3anthony/funded/issues/183)** (DESIGN-REFERENCE.md) —
   `needs-triage`/`ready-for-human`, untouched. When it lands, restore the design-foundation rule in
   `GEMINI-DELEGATION.md` (see "agy loose ends" (a) in the still-live notes near the top).

**Other open issues, for completeness (2026-09-21 snapshot, no action taken this session):**
[#167](https://github.com/mp3anthony/funded/issues/167) (Mailjet onboarding email campaign,
`needs-info`/`ready-for-human`, not previously in this file), and
[#156](https://github.com/mp3anthony/funded/issues/156) (move transactional email off personal Gmail —
`ready-for-human`, waiting on Anthony's manual Mailjet/DNS/Supabase steps).
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
**Superseded 2026-09-27:** offloading now goes through Antigravity (agy) via
`scripts/agy-delegate.ps1` / `GEMINI-DELEGATION.md`, which works. Never use the gemini-cli MCP.

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


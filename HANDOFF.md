# Handoff

Older, fully-closed session history lives in `HANDOFF-ARCHIVE.md` — not read at session start, open
it by hand only if you need old investigation detail.

**Last updated: 2026-09-28 (late evening) — #205 MERGED as v0.9.57 ([PR #210](https://github.com/mp3anthony/funded/pull/210),
merge `eed215a`), issue closed, production deploy confirmed READY. Next: [#211](https://github.com/mp3anthony/funded/issues/211).**
- **What #205 shipped:** Mark as Paid on a manual recurring bill due today or earlier (household tz) rolls it
  instantly, guarded on `due_date`. A toast "Paid for <Month> — next due <date>" shows with a solid **UNDO** button
  (8s, pauses on touch). **Undo restores the exact pre-tap row (unpaid/Overdue, not Paid).** This was the Orchestrator's
  call, delegated by Anthony: undoing to Paid at a past date would be rolled again by the cron. A stale-screen or
  second-device tap re-reads the bill, shows "already updated" and writes nothing. The roll path marks old-cycle
  reminders read (own user only), never deletes them. New `src/components/ui/Toast.tsx`. SPEC.md Slice 17 has a
  #205 amendment.
- **Bug caught in manual test:** Undo button was near-invisible in light theme (lime on grey, 1.79:1). Fixed in
  `6d7f799`, retested OK. All 5 checklist items passed on iPhone. Test 3 ("no push after Undo") was checked via DB
  rows, not by waiting for a push.
- **Seeding gotcha:** seeding OVERDUE test bills sends real "Bill Overdue" pushes to **Hannah** too (household-wide).
  Hannah received TEST-205 A/C alerts at ~10pm NZ. Next time, seed only right before testing, warn Anthony, and delete
  before NZ midnight (a new day creates a new overdue dedupe key, which means another push). All TEST-205 rows are
  deleted.
- **Filed this session:**
  - [#208](https://github.com/mp3anthony/funded/issues/208): notifications RLS exists live but not in migrations
    (security, so escalation).
  - [#209](https://github.com/mp3anthony/funded/issues/209): the pay-early path still hard-deletes notifications
    (SPEC A2).
  - [#211](https://github.com/mp3anthony/funded/issues/211) is approved, including the schema change (Anthony,
    2026-09-28). It covers two things: a persistent "Paid for <Month>" line under **Paid By** in the bill popup
    (new nullable `bills.last_paid_for`), and a permanent one-level **"Undo payment"** button next to Mark as Paid.
    Build after #205 (done). Needs a SPEC.md Slice 17 amendment when built. CHANGE-LOG lines 2026-09-27/28 are
    marked approved.
- **Still owed from #187 (v0.9.56), ask Anthony:** were the stuck bills fixed on both phones after a full close and
  reopen, and does Hannah's Android show the same?

**Earlier (2026-09-27, late evening) — #187 merged as v0.9.56:**
- **Out of spec, logged pending in CHANGE-LOG.md:** persistent "Paid for <month>" line on a bill after it
  rolls — likely needs a "last paid" column (schema → escalation). Triage with Anthony.
- **Migration `20260927120000_reset_stuck_paid_bills.sql` APPLIED (by Anthony in the Supabase SQL editor)
  before merge.** Final dry run touched 3 rows: Internet (Sydney household 1c3d1f83) 13 Aug → 13 Oct,
  ASB VISA + Hannah's Phone just unpaid. Verified after: 0 recurring Paid bills left. NZ household
  Internet was already unpaid at 13 Sep (Anthony's Unpaid test on preview) → shows Overdue; he marks it
  Paid and the cron moves it to 13 Oct.
- **Auto-mode classifier blocked `apply_migration` twice** ("Production Deploy", then "Cloud Storage Mass
  Delete") even after Anthony added an `autoMode.allow` entry for it in his user settings.json. Data-fix
  migrations → hand Anthony the SQL-editor steps rather than retrying. Don't edit settings.json yourself.
- **Live cron rollover VERIFIED on v0.9.56:** seeded `TEST-187 cron check` (Paid, due 26 Sep, invoice
  1 Sep) → 10:45 UTC run of `/api/cron/push-reminders` returned `rolled:1`, bill became Due Soon,
  26 Oct / 1 Oct. Row deleted. **Note:** rollover lives in the reminders job (pg_cron
  `generate-scheduled-reminders`, every **15** min), not the 5-min delivery job — so "rolls within a few
  minutes" is really up to 15 min (PR #202 checklist said 5; #205 makes it instant anyway).
- **Test logins — settled, don't re-raise:** Claude sessions must NOT create Funded users or type
  passwords into the app (login goes to live Supabase). Anthony does manual testing himself. What
  sessions CAN do to save him time: seed test rows (bills etc.) straight into his household via SQL,
  tagged `TEST-…`, set up in the exact state each checklist item needs, and delete them after. A local
  Supabase (Docker) with a seeded permanent test user was offered as the only compliant route to
  Claude logging in — Anthony declined for now; not filed.
- CLAUDE.md Step 5 updated ([PR #200](https://github.com/mp3anthony/funded/pull/200)): handoff-only
  wrap-up PRs merge straight away, no sub-agent review.

**Previous wrap-up (2026-09-27, earlier) — #195 (#182) and #197 (#193) MERGED, v0.9.55 live:**
- **[PR #195](https://github.com/mp3anthony/funded/pull/195) (#182 payday taps) MERGED as v0.9.54,
  issue closed — before any manual test.** Anthony's call: no pay was due/pending (next pays: 30 Sep
  weekly variable schedule `832e9381-…`, 6 Oct fortnightly fixed `41041717-…`) and push taps are only
  testable after merge anyway; faking a due pay would create a real pending pay. **Live checks still
  owed** (see START HERE B).
- **[PR #197](https://github.com/mp3anthony/funded/pull/197) (#193 goal popup) MERGED as v0.9.55,
  issue closed.** Retargeted to `main` after #195 merged (no conflicts). Anthony passed all preview
  inbox checks on iPhone (seeded 2 `goal_milestone` rows tagged `TEST-193-*`, one real goal, one
  nonexistent id — both deleted after). Goal **push** tap not yet seen live.
- Housekeeping: worktree `wt-193` removed; local `feat/182`, `feat/193`, `docs/handoff-2026-09-27d`
  branches deleted. Swept the 2026-09-27 (late night) and 2026-09-17 sections into `HANDOFF-ARCHIVE.md`.
**Last active SPEC ticket: Slice 17 — #205 merged v0.9.57; #211 (last-paid + Undo payment) next.**

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
- **agy state (PR #196, 2026-09-27):** `-Task plan` removed — planning always → Claude sub-agent.
  On a blocked tool the script retries once (retry path not live-tested). Kit `UPDATE-PROMPT.md` not
  refreshed — other repos (Cartel, website) need a new update prompt. agy refuses `.sql` and `.claude/`
  paths (exit 4): paste schema facts into prompts; stage worktree diffs as temp `.md` in repo root.
- **Session-start check:** also run `gh pr list` for an unmerged docs PR carrying a newer HANDOFF
  (a stale HANDOFF caused an out-of-order build on 2026-09-27).
- **#168 (bug-report draft, v0.9.53):** merged without Hannah's Samsung Internet test — if she
  reports the draft still lost after attaching a screenshot, reopen #168.
- **Payday test rows:** #182 links need a real `dedupe_key` shape
  (`<scheduleId>-<YYYY-MM-DD>-payday_log_pay`), not `TEST-…`, or they fall back to plain `/payday`.
- **agy loose ends:** (a) when **#183 (DESIGN-REFERENCE.md)** lands, restore the kit's
  design-foundation rule in `GEMINI-DELEGATION.md` pointing at it (currently dropped; rule 5 points at
  SPEC.md Part A); (b) future kit updates (kit at
  `D:\Anthonys-HQ\business\hazardous-schematics\agy-delegation-kit\`) get re-synced here — script must
  stay byte-identical, keep this repo's adapted rules 5/6.
- **Standing rule (Anthony, 2026-09-26):** docs/tooling-only PRs need no review from him —
  independent agent review, fix, self-merge. Handoff-only PRs: no review at all, merge straight away.
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
A. **Build [#211](https://github.com/mp3anthony/funded/issues/211)**: "Paid for <Month>" + "Undo payment".
   The schema change is approved, so applying the migration is routine. Plan via a Claude sub-agent, then a build
   agent, independent review, `needs-manual-test`, v0.9.58. Also ask Anthony about the v0.9.56 live checks
   (see top).
B. **Owed live checks (ask Anthony, don't block A):**
   - **#182 (v0.9.54)** — when the 30 Sep pay reminder arrives: tap the push (Log Pay box for that
     schedule), tap it from the bell, next day tap the old reminder (late tap → Confirm Pending Pay
     box), tap a bill reminder (bill popup still opens). PR #195 checklist items 1–11 have full steps.
   - **#193 (v0.9.55)** — next goal-milestone push: tap it → that goal's popup.
   - Any failure → reopen the issue / follow-up PR. Fully close + reopen the installed app first so
     the new service worker is active.
1. **[#145](https://github.com/mp3anthony/funded/issues/145)** — Hannah barely/not getting bill
   reminder pushes. Still parked, still unresolved. **New evidence 2026-09-17:** Anthony reported she
   got one notification ~40 minutes late on Android — logged as a comment on #145, not a new issue.
   Facts from the 2026-09-08 investigation (now in HANDOFF-ARCHIVE): both household_members rows are `owner`
   (not the cause; notification row counts were comparable); Hannah notify_hour 9 vs Anthony 19. Root-cause
   theory from the original investigation (`sendPushToSubscriptions` in `src/lib/push.ts`
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

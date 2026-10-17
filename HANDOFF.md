# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-17)

- `main` = v0.9.76 (PR #347: #333 Finish setting up card; migration `20261012120000` applied to prod). Live check pending on iPhone: new test account, skip payday/bill/goal, Dashboard shows the card with 3 rows; "Add your first bill" opens the Bills add form, save and the row goes; tap X, reopen, stays gone; a joiner sees no card. Earlier pending checks: #249 (v0.9.75: new household, Settings > Timezone shows Pacific/Auckland; existing households unchanged; guide timezone bullet reworded) and #248 (v0.9.74): fresh account, skip payday/bill/goal, Setup Complete shows Skipped, guide link opens, empty Payday/Bills/Goals say tap +. Closed work is not tracked here: git history, closed issues and `docs/lessons.md` hold it. Live-check results are not recorded; a failed check is raised again and Intake reopens the closed issue.
- **Workflow (PR #318, in `CLAUDE.md`):** live-app testing after merge, no preview testing; `needs-manual-test` on request only; Intake sub-agent on every new issue; plain-terms "What's changing" on every issue; orchestrator gives merge advice, Anthony approves each merge.
- **Updates card (#260) notes:** shown once per version and marked seen when shown, so closing the app without tapping X means it does not return. Anthony accepted this, and the long first patch-note bullet that clips at two lines, as is. Tiny known race: tapping into Updates within 1.2s of opening can still show the card there.
- **Grilled this session, no plan yet (each needs a Planner step, then the standing pause):**
  - **#248 shipped (v0.9.74).** Anthony still to confirm the why-box wording (steps 1-2) and the step 5 intro line; reword in a small PR if he wants changes. Reload mid-onboarding lands in the app with Direct Pay and no optional steps (not a regression; #333 covers it). Follow-up: #341 (Create Goal window shows no error text on failed save, `needs-triage`, Intake not yet run).
  - **#333 shipped (v0.9.76).** Follow-up: #348 (route `pay_schedules` through `resolveWarmReloadRace`; payday row can flash on warm reload, `needs-triage`, Intake not yet run). Minor known: with both `goalId` and `add` params the Funds add sheet waits for data (rare, correct).
- **#145 (Hannah gets no pushes, ~2 weeks; #160 folded in): parked, `needs-info`,** root cause unconfirmed. Her PWA is installed, permission on, Android/FCM subscription alive (refreshed 2 Oct). Reminders are generated, but `delivered_at` is stamped on every attempt so it proves nothing about receipt; Vercel keeps ~24h of logs. No test-push button. Anthony chose not to test with her yet. Options: Android settings check (Chrome notification switches, Samsung background usage limits), wait for a real reminder, one-off push via `/api/push/send` (needs his go-ahead), or a small build logging non-404/410 push failures to a new DB table (migration, A1 escalation).
- **#273** closed 2026-10-15 as blocked by plan: leaked-password protection needs Supabase Pro (we are on Free). Fallback on Free: raise minimum password length in Auth > Sign In / Providers > Email (Anthony's call). Reopen if we move to Pro.
- **Repo interaction limit** set to collaborators only until 2027-04-09 (spam, #276); renew then (Settings > Moderation options > Interaction limits).
- **Security** details live in the private notes file; no GitHub issue by design.
- **Grilled 2026-10-11, decisions in each issue body, glossary merged (PR #336); each needs a Planner step, then the standing pause:**
  - **#251 Leave/Delete household (`ready-for-agent`): PLANNED and independently reviewed, standing pause; build next in a fresh session.** Plan and review changes: https://github.com/mp3anthony/funded/issues/251#issuecomment-6230891763 (build from it, no re-plan). Rules: owner with another owner = plain leave; only owner + accepted members = pick an accepted member as owner then leave, or Delete (in-app dialog, type DELETE); sole member or only pending members = Delete only; last owner can't demote themselves. Anthony approved A1 option A + E1 on 2026-10-17: new `leave-household` edge function (service role, moves `households.user_id` to a remaining owner) plus triggers-only migration `20261017120000_household_last_owner_guards.sql`. Deploy order: apply migration, deploy `leave-household` and `delete-household` (verify deployed versions), merge. Prod pre-check and SQL ROLLBACK cascade test required. Follow-ups #350, #351, #352 (`needs-triage`, Intake not run).
  - **#250 blank due date (`ready-for-agent`, mute-column migration approved 2026-10-17; needs a Planner step, then the standing pause):** due date stays optional; "No due date" label, sorts last, counts in totals; Mark as Paid asks "When is it next due?" with Skip for now / Don't ask again; 30 days after adding, an orange "Add due date" prompt. Decided 2026-10-11: a dateless bill shows under All only.
  - **#267 paused bills (`ready-for-agent`, `needs-manual-test`):** orange pause icon, greyed amount, "Paused" in the date slot; one shared "counts toward totals" rule (excludes paused and finished one-offs) for Total Bar, weekly surplus and splits, health score, contributions; muted "N paused or finished, not counted" line under the Total Bar. Overlaps #288 (neutral date labels); Planner settles build order with #287/#288.
- **Backlog, all `needs-triage`, each needs its own grill session:** #261 (Report a bug becomes Report an issue; touches Getting started / SPEC Slice 15), #315 (manual Log Pay stores UTC date), #316 (`deletePayHistory` rollback design). Small chores: #265 (remove unused `@supabase/ssr`, stale `sw.js` comment), #266 (track `.env.local.example`).
- **Page-redesign audits** #277 Dashboard, #278 Payday, #279 Bills, #280 Goals, #281 Settings: each blocked by #183 (design reference HTML doc, `needs-triage` / `ready-for-human`, untouched).
- **Owed:** fix the stale "not wired up" comment in `NotifyHourDialog.tsx` in the next PR touching those files. Delete each Getting started "Good to know" item when #251, #250 are built (the #249 one is reworded in its build instead). The website (separate repo) must link to `/getting-started`.
- Known, low priority, not ticketed: the repo has no CREATE TABLE for notifications, notification_settings, push_subscriptions, and bills/paydays/funds live only in `schema.sql`, so migrations alone can't rebuild a database.
- Last active SPEC ticket: Slice 19 (#333 Finish setting up card, built). Grilled, not yet in SPEC.md (fold durable parts in when built): #251, #250, #267.

## Next session, in order

1. Build #251 in a fresh session from the reviewed plan comment. Then plan #267 (paused bills) and #250 (blank due date, migration approved), each via Planner then the standing pause.
2. Run Intake on #348, #350, #351, #352; small chores #265, #266. Grill #261, #315, #316 individually when Anthony asks.
3. #183 design reference (unblocks #277 to #281). #145 only when Anthony says so.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

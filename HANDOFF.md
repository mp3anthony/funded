# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-18)

- **`main` = v0.9.81. No open PRs.** Shipped today, live checks by Anthony as he uses the app (he raises any problem; no follow-up needed from us):
  - **#357 editing a bill no longer erases its notes (v0.9.81, PR #367).** `mapBillFromDb` now maps `notes`, so bill notes show in the bill details and survive edits. No unit test (mapper not exported from `AppContext.tsx`). Notes already wiped can't be recovered. Live check: open a bill with notes, see them, edit and save, they stay.
  - **#348 pay info no longer flashes empty on warm reload (v0.9.80, PR #365).** `pay_schedules` and `pay_history` now go through `resolveWarmReloadRace`; the helper moved to `src/lib/warmReloadRace.ts` with 6 unit tests; `docs/lessons.md` corrected (`paydays` is the unused legacy table). Live check: fully close and reopen, and background then return; the Dashboard must not flash "Add your payday".
  - **#250 bills with no due date (v0.9.79, PR #362, SPEC Slice 22).** Prod migration `20261018120000` applied before merge: `bills.due_date` is now nullable, new `bills.due_date_prompt_muted` boolean (default false). Dateless bills show "No due date" and sort last in their group; paying a manual repeating dateless bill asks "When is it next due?" (pick, skip, or "Don't ask again"); after 30 days an orange "Add due date" button shows. The Getting started "Always give a bill a due date" item is removed. Follow-up #363 (see Intake below).
  - **#267 paused bills (v0.9.78, PR #360, SPEC Slice 21).** Paused manual bills show "Paused" (no red date, only under the All filter); one shared "counts toward totals" rule. Follow-up #359.
- Earlier live checks still pending on iPhone: #251 (v0.9.77 leave/delete household), #333 (v0.9.76), #249 (v0.9.75), #248 (v0.9.74). Live-check results are not recorded; a failed check is raised again and Intake reopens the closed issue.
- **Session workflow note:** builds run in the current session, or Anthony wraps and clears to start a fresh one himself. The orchestrator does not spawn separate Claude sessions (the spawned session mistakes the orchestrator for Anthony). In-process sub-agents are fine.
- **Workflow (PR #318, in `CLAUDE.md`):** live-app testing after merge, no preview testing; `needs-manual-test` on request only; Intake sub-agent on every new issue; plain-terms "What's changing" on every issue; orchestrator gives merge advice, Anthony approves each merge.
- **Updates card (#260) notes:** shown once per version and marked seen when shown, so closing the app without tapping X means it does not return. Anthony accepted this, and the long first patch-note bullet that clips at two lines, as is. Tiny known race: tapping into Updates within 1.2s of opening can still show the card there.
- **#248:** Anthony still to confirm the why-box wording (steps 1-2) and the step 5 intro line; reword in a small PR if he wants changes.
- **#145 (Hannah gets no pushes, ~2 weeks; #160 folded in): parked, `needs-info`,** root cause unconfirmed. Her PWA is installed, permission on, Android/FCM subscription alive (refreshed 2 Oct). Reminders are generated, but `delivered_at` is stamped on every attempt so it proves nothing about receipt; Vercel keeps ~24h of logs. No test-push button. Anthony chose not to test with her yet. Options: Android settings check (Chrome notification switches, Samsung background usage limits), wait for a real reminder, one-off push via `/api/push/send` (needs his go-ahead), or a small build logging non-404/410 push failures to a new DB table (migration, A1 escalation).
- **#273** closed 2026-10-15 as blocked by plan: leaked-password protection needs Supabase Pro (we are on Free). Fallback on Free: raise minimum password length in Auth > Sign In / Providers > Email (Anthony's call). Reopen if we move to Pro.
- **Repo interaction limit** set to collaborators only until 2027-04-09 (spam, #276); renew then (Settings > Moderation options > Interaction limits).
- **Security** details live in the private notes file; no GitHub issue by design.
- **#357 (editing a bill wipes its notes): Intake done, `ready-for-agent`, build next.** Root cause confirmed: `mapBillFromDb` (`AppContext.tsx` ~552-597) never maps `notes`, so the edit form opens empty and saving nulls the notes; `BillDetailSheet.tsx:356` never shows them either. Fix is one mapper line (`notes: dbBill.notes ?? null`) + optional mapper test + v0.9.81 bump and patch note. No Planner needed, no A1 touch. Plan and findings are in the issue body. Notes already wiped can't be recovered.
- **Backlog needing Intake (all `needs-triage`, Intake not yet run):** #341 (Create Goal window shows no error on failed save), #350, #351, #352 (#251 household follow-ups), #359 (Dashboard Upcoming Bills lists paused manual bills by saved date), #363 (#250 row tap area / VoiceOver).
- **Backlog needing a grill session each:** #261 (Report a bug becomes Report an issue; touches Getting started / SPEC Slice 15), #315 (manual Log Pay stores UTC date), #316 (`deletePayHistory` rollback design). Small chores: #265 (remove unused `@supabase/ssr`, stale `sw.js` comment), #266 (track `.env.local.example`).
- **Page-redesign audits** #277 Dashboard, #278 Payday, #279 Bills, #280 Goals, #281 Settings: each blocked by #183 (design reference HTML doc, `needs-triage` / `ready-for-human`, untouched).
- **Owed:** fix the stale "not wired up" comment in `src/components/NotifyHourDialog.tsx` (line 15) in the next PR touching that file. The website (separate repo) must link to `/getting-started`.
- Known, low priority, not ticketed: the repo has no CREATE TABLE for notifications, notification_settings, push_subscriptions, and bills/paydays/funds live only in `schema.sql`, so migrations alone can't rebuild a database.
- Last active SPEC ticket: Slice 22 (#250); #348 and #357 were bug fixes outside any slice.

## Next session, in order

1. Ask Anthony for decisions on #359, #350 and #351.
2. Build the `ready-for-agent` fixes (#341, #352, #363), one PR each or grouped if he wants one version bump; small chores #265, #266 still need Intake.
3. Grill #261, #315, #316 individually when Anthony asks.
4. #183 design reference (unblocks #277 to #281). #145 only when Anthony says so.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

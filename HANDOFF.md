# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-12)

- `main` = v0.9.74 (PR #340: #248 onboarding rework slice 1). Live check pending on iPhone: fresh account, skip payday/bill/goal, Setup Complete shows Skipped, guide link opens, empty Payday/Bills/Goals say tap +. Closed work is not tracked here: git history, closed issues and `docs/lessons.md` hold it. Live-check results are not recorded; a failed check is raised again and Intake reopens the closed issue.
- **Workflow (PR #318, in `CLAUDE.md`):** live-app testing after merge, no preview testing; `needs-manual-test` on request only; Intake sub-agent on every new issue; plain-terms "What's changing" on every issue; orchestrator gives merge advice, Anthony approves each merge.
- **Updates card (#260) notes:** shown once per version and marked seen when shown, so closing the app without tapping X means it does not return. Anthony accepted this, and the long first patch-note bullet that clips at two lines, as is. Tiny known race: tapping into Updates within 1.2s of opening can still show the card there.
- **Grilled this session, no plan yet (each needs a Planner step, then the standing pause):**
  - **#248 shipped (v0.9.74).** Anthony still to confirm the why-box wording (steps 1-2) and the step 5 intro line; reword in a small PR if he wants changes. Reload mid-onboarding lands in the app with Direct Pay and no optional steps (not a regression; #333 covers it). Follow-up: #341 (Create Goal window shows no error text on failed save, `needs-triage`, Intake not yet run).
  - **#333 "Finish setting up" Dashboard card, slice 2 (`needs-info`):** needs a migration (per-user dismissed flag), so A1 escalation and Anthony's go-ahead before build; #248 has shipped, so it is unblocked pending Anthony's migration go-ahead. Decided 2026-10-11: joiners are not prompted for payday (owners only). Open for planning: stacking with Updates card and tips ticker (overlaps #277).
  - **#249 timezone default (`ready-for-agent`):** new households take the owner's device timezone (fallback Sydney); existing households untouched; the guide's timezone "Good to know" bullet is reworded and kept, not deleted. Small, no migration.
- **#145 (Hannah gets no pushes, ~2 weeks; #160 folded in): parked, `needs-info`,** root cause unconfirmed. Her PWA is installed, permission on, Android/FCM subscription alive (refreshed 2 Oct). Reminders are generated, but `delivered_at` is stamped on every attempt so it proves nothing about receipt; Vercel keeps ~24h of logs. No test-push button. Anthony chose not to test with her yet. Options: Android settings check (Chrome notification switches, Samsung background usage limits), wait for a real reminder, one-off push via `/api/push/send` (needs his go-ahead), or a small build logging non-404/410 push failures to a new DB table (migration, A1 escalation).
- **#273** (turn on leaked-password protection in Supabase Auth): `ready-for-human`; Anthony wants a guided walk-through in its own session; check the setting is available on our plan first.
- **Repo interaction limit** set to collaborators only until 2027-04-09 (spam, #276); renew then (Settings > Moderation options > Interaction limits).
- **Security** details live in the private notes file; no GitHub issue by design.
- **Grilled 2026-10-11, decisions in each issue body, glossary merged (PR #336); each needs a Planner step, then the standing pause:**
  - **#251 Leave/Delete household (`ready-for-agent`):** owner with another owner = plain leave; only owner + other accepted members = pick an accepted member as owner then leave, or Delete (in-app dialog, type DELETE); sole member = Delete only. Regular Leave also moves to an in-app dialog. Transfer reuses the existing Edit Member promote. Planner must check whether the creator leaving breaks RLS / `delete-household` (`households.user_id`); if so, A1 escalation. Decided 2026-10-11: only owner with only pending members = Delete only; the last owner cannot demote themselves.
  - **#250 blank due date (`needs-info`):** due date stays optional; "No due date" label, sorts last, counts in totals; Mark as Paid asks "When is it next due?" with Skip for now / Don't ask again; 30 days after adding, an orange "Add due date" prompt. Needs a per-bill mute column (migration, A1): Anthony's go-ahead before build. Decided 2026-10-11: a dateless bill shows under All only.
  - **#267 paused bills (`ready-for-agent`, `needs-manual-test`):** orange pause icon, greyed amount, "Paused" in the date slot; one shared "counts toward totals" rule (excludes paused and finished one-offs) for Total Bar, weekly surplus and splits, health score, contributions; muted "N paused or finished, not counted" line under the Total Bar. Overlaps #288 (neutral date labels); Planner settles build order with #287/#288.
- **Backlog, all `needs-triage`, each needs its own grill session:** #261 (Report a bug becomes Report an issue; touches Getting started / SPEC Slice 15), #315 (manual Log Pay stores UTC date), #316 (`deletePayHistory` rollback design). Small chores: #265 (remove unused `@supabase/ssr`, stale `sw.js` comment), #266 (track `.env.local.example`).
- **Page-redesign audits** #277 Dashboard, #278 Payday, #279 Bills, #280 Goals, #281 Settings: each blocked by #183 (design reference HTML doc, `needs-triage` / `ready-for-human`, untouched).
- **Owed:** fix the stale "not wired up" comment in `NotifyHourDialog.tsx` and the "weekly draw" comment in `bills-client.tsx` in the next PR touching those files. Delete each Getting started "Good to know" item when #251, #250 are built (the #249 one is reworded in its build instead). The website (separate repo) must link to `/getting-started`.
- Known, low priority, not ticketed: the repo has no CREATE TABLE for notifications, notification_settings, push_subscriptions, and bills/paydays/funds live only in `schema.sql`, so migrations alone can't rebuild a database.
- Last active SPEC ticket: Slice 18 (#248 onboarding rework, built). Grilled since, not yet in SPEC.md (fold durable parts in when built): #249, #333, #251, #250, #267.

## Next session, in order

1. Plan then build #249 in a fresh session from the issue (Planner, review, standing pause; version renumbers off 0.9.74). Build #333 once Anthony approves the migration.
2. Plan and build #251, #267 and #250 (#250 only after Anthony approves the migration), each in a fresh session from the issue. Grill #261, #315, #316 individually when Anthony asks; #265 and #266 are small chores.
3. #183 design reference (unblocks #277 to #281). #145 and #273 only when Anthony says so.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

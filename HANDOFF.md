# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-11)

- `main` = v0.9.72 (PR #326 and #327, #309). Closed work is not tracked here: git history, closed issues and `docs/lessons.md` hold it. Live-check results are not recorded; a failed check is raised again and Intake reopens the closed issue.
- **Workflow (PR #318, in `CLAUDE.md`):** live-app testing after merge, no preview testing; `needs-manual-test` on request only; Intake sub-agent on every new issue; plain-terms "What's changing" on every issue; orchestrator gives merge advice, Anthony approves each merge.
- **#311 + #260 grilled (2026-10-11), ready for a Planner in a fresh session:** decisions are in the issue bodies and as "planned" glossary entries (Updates page, Updates card; PR #329). Rename the What's new page to **Updates** (visible text and docs only, route `/patch-notes` stays). Replace the first-open modal with a compact non-blocking **Updates card** above the bottom nav (2 bullets, "+N more", stays until X or link, hides the tips ticker). Build #311 together with or before #260. Both need a version bump and patch note.
- **#145 (Hannah gets no pushes, ~2 weeks; #160 folded in): parked, `needs-info`,** root cause unconfirmed. Her PWA is installed, permission on, Android/FCM subscription alive (refreshed 2 Oct). Reminders are generated, but `delivered_at` is stamped on every attempt so it proves nothing about receipt; Vercel keeps ~24h of logs. No test-push button. Anthony chose not to test with her yet. Options: Android settings check (Chrome notification switches, Samsung background usage limits), wait for a real reminder, one-off push via `/api/push/send` (needs his go-ahead), or a small build logging non-404/410 push failures to a new DB table (migration, A1 escalation).
- **#273** (turn on leaked-password protection in Supabase Auth): `ready-for-human`; Anthony wants a guided walk-through in its own session; check the setting is available on our plan first.
- **Repo interaction limit** set to collaborators only until 2027-04-09 (spam, #276); renew then (Settings > Moderation options > Interaction limits).
- **Security** details live in the private notes file; no GitHub issue by design.
- **Backlog, all `needs-triage`, each needs its own grill session:** #248 (onboarding rework, "Skip for now"), #249 (timezone defaults to Australia/Sydney), #250 (bill saved with blank due date), #251 (owner "Leave household" deletes household for everyone), #261 (Report a bug becomes Report an issue; touches Getting started / SPEC Slice 15), #267 (paused bills: no visual cue, still counted in Total Bar; overlaps #288 display), #315 (manual Log Pay stores UTC date), #316 (`deletePayHistory` rollback design). Small chores: #265 (remove unused `@supabase/ssr`, stale `sw.js` comment), #266 (track `.env.local.example`).
- **Page-redesign audits** #277 Dashboard, #278 Payday, #279 Bills, #280 Goals, #281 Settings: each blocked by #183 (design reference HTML doc, `needs-triage` / `ready-for-human`, untouched).
- **Owed:** fix the stale "not wired up" comment in `NotifyHourDialog.tsx` and the "weekly draw" comment in `bills-client.tsx` in the next PR touching those files. Delete each Getting started "Good to know" item when #251, #250, #249 close. The website (separate repo) must link to `/getting-started`.
- Known, low priority, not ticketed: the repo has no CREATE TABLE for notifications, notification_settings, push_subscriptions, and bills/paydays/funds live only in `schema.sql`, so migrations alone can't rebuild a database.
- Last active SPEC ticket: Slice 14 (#311 rename and #260 card will amend it).

## Next session, in order

1. Plan #311 and #260 (Planner agent, then standing pause for Anthony; post the reviewed plan as an issue comment).
2. Grill #248, #249, #250, #251, #261, #267 individually when Anthony asks; #265 and #266 are small chores.
3. #183 design reference (unblocks #277 to #281). #145 and #273 only when Anthony says so.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-11)

- `main` = v0.9.73 (PR #331: #311 Updates rename + #260 Updates card, live check passed). Closed work is not tracked here: git history, closed issues and `docs/lessons.md` hold it. Live-check results are not recorded; a failed check is raised again and Intake reopens the closed issue.
- **Workflow (PR #318, in `CLAUDE.md`):** live-app testing after merge, no preview testing; `needs-manual-test` on request only; Intake sub-agent on every new issue; plain-terms "What's changing" on every issue; orchestrator gives merge advice, Anthony approves each merge.
- **Updates card (#260) notes:** shown once per version and marked seen when shown, so closing the app without tapping X means it does not return. Anthony accepted this, and the long first patch-note bullet that clips at two lines, as is. Tiny known race: tapping into Updates within 1.2s of opening can still show the card there.
- **Grilled this session, no plan yet (each needs a Planner step, then the standing pause):**
  - **#248 onboarding rework, slice 1 (`ready-for-agent`; decisions are in the issue body):** 6 steps (household, payment mode, payday, bill, goal, Setup Complete); "Skip for now" on payday, bill and goal; bill trimmed to name/amount/frequency/due date; goal is name + target; shared layout; "why" boxes on steps 1-2; Getting started note on the last step; join path unchanged. Glossary already merged (PR #334).
  - **#333 "Finish setting up" Dashboard card, slice 2 (`needs-info`):** needs a migration (per-user dismissed flag), so A1 escalation and Anthony's go-ahead before build; depends on #248 shipping first. Open for planning: does a joiner with no payday count as missing; stacking with Updates card and tips ticker (overlaps #277).
  - **#249 timezone default (`ready-for-agent`):** new households take the owner's device timezone (fallback Sydney); existing households untouched; the guide's timezone "Good to know" bullet is reworded and kept, not deleted. Small, no migration.
- **#145 (Hannah gets no pushes, ~2 weeks; #160 folded in): parked, `needs-info`,** root cause unconfirmed. Her PWA is installed, permission on, Android/FCM subscription alive (refreshed 2 Oct). Reminders are generated, but `delivered_at` is stamped on every attempt so it proves nothing about receipt; Vercel keeps ~24h of logs. No test-push button. Anthony chose not to test with her yet. Options: Android settings check (Chrome notification switches, Samsung background usage limits), wait for a real reminder, one-off push via `/api/push/send` (needs his go-ahead), or a small build logging non-404/410 push failures to a new DB table (migration, A1 escalation).
- **#273** (turn on leaked-password protection in Supabase Auth): `ready-for-human`; Anthony wants a guided walk-through in its own session; check the setting is available on our plan first.
- **Repo interaction limit** set to collaborators only until 2027-04-09 (spam, #276); renew then (Settings > Moderation options > Interaction limits).
- **Security** details live in the private notes file; no GitHub issue by design.
- **Backlog, all `needs-triage`, each needs its own grill session:** #250 (bill saved with blank due date), #251 (owner "Leave household" deletes household for everyone), #261 (Report a bug becomes Report an issue; touches Getting started / SPEC Slice 15), #267 (paused bills: no visual cue, still counted in Total Bar; overlaps #288 display), #315 (manual Log Pay stores UTC date), #316 (`deletePayHistory` rollback design). Small chores: #265 (remove unused `@supabase/ssr`, stale `sw.js` comment), #266 (track `.env.local.example`).
- **Page-redesign audits** #277 Dashboard, #278 Payday, #279 Bills, #280 Goals, #281 Settings: each blocked by #183 (design reference HTML doc, `needs-triage` / `ready-for-human`, untouched).
- **Owed:** fix the stale "not wired up" comment in `NotifyHourDialog.tsx` and the "weekly draw" comment in `bills-client.tsx` in the next PR touching those files. Delete each Getting started "Good to know" item when #251, #250 close (the #249 one is reworded in its build instead). The website (separate repo) must link to `/getting-started`.
- Known, low priority, not ticketed: the repo has no CREATE TABLE for notifications, notification_settings, push_subscriptions, and bills/paydays/funds live only in `schema.sql`, so migrations alone can't rebuild a database.
- Last active SPEC ticket: Slice 14 (amended by #311, #260). Grilled since, not yet in SPEC.md (fold durable parts in when built): #248, #249, #333.

## Next session, in order

1. Build #248 and #249, each in a fresh session from the issue (Planner, review, standing pause). Build #333 only after #248 ships and Anthony approves the migration.
2. Grill #250, #251, #261, #267 individually when Anthony asks; #265 and #266 are small chores.
3. #183 design reference (unblocks #277 to #281). #145 and #273 only when Anthony says so.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

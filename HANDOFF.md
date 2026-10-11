# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-11)

- `main` = v0.9.70 (PR #321, #298). Closed work is not tracked here: git history, closed issues and `docs/lessons.md` hold it. Live-check results are not recorded; a failed check is raised again and Intake reopens the closed issue.
- **Workflow (PR #318, in `CLAUDE.md`):** live-app testing after merge, no preview testing; `needs-manual-test` on request only; Intake sub-agent on every new issue; plain-terms "What's changing" on every issue; orchestrator gives merge advice, Anthony approves each merge.
- **#309 PLANNED and APPROVED, build next (`ready-for-agent`).** Grill done 2026-10-11; plan independently reviewed (APPROVED) and approved by Anthony. Plan = issue comment https://github.com/mp3anthony/funded/issues/309#issuecomment-6104103743 (v0.9.71: pure helper `src/lib/patchNotesWindow.ts`, filter at render in `patch-notes-client.tsx`, tests, conventions line, SPEC Slice 14 amendment, `docs/context/app-shell.md`, README). Reviewer nit: lowercase the month-name list. Build in a fresh session from the issue; do not re-grill. Window = newest entry's month plus the one before; popup untouched; no footer.
- **#145 (Hannah gets no pushes, ~2 weeks; #160 folded in): parked, `needs-info`,** root cause unconfirmed. Her PWA is installed, permission on, Android/FCM subscription alive (refreshed 2 Oct). Reminders are generated, but `delivered_at` is stamped on every attempt so it proves nothing about receipt; Vercel keeps ~24h of logs. No test-push button. Anthony chose not to test with her yet. Options: Android settings check (Chrome notification switches, Samsung background usage limits), wait for a real reminder, one-off push via `/api/push/send` (needs his go-ahead), or a small build logging non-404/410 push failures to a new DB table (migration, A1 escalation).
- **#273** (turn on leaked-password protection in Supabase Auth): `ready-for-human`; Anthony wants a guided walk-through in its own session; check the setting is available on our plan first.
- **Repo interaction limit** set to collaborators only until 2027-04-09 (spam, #276); renew then (Settings > Moderation options > Interaction limits).
- **Security** details live in the private notes file; no GitHub issue by design.
- **Backlog, all `needs-triage`, each needs its own grill session:** #248 (onboarding rework, "Skip for now"), #249 (timezone defaults to Australia/Sydney), #250 (bill saved with blank due date), #251 (owner "Leave household" deletes household for everyone), #260 (shrink first-open patch-notes popup; overlaps #248 and #309), #261 (Report a bug becomes Report an issue; touches Getting started / SPEC Slice 15), #267 (paused bills: no visual cue, still counted in Total Bar; overlaps #288 display), #311 (What's new page), #315 (manual Log Pay stores UTC date), #316 (`deletePayHistory` rollback design). Small chores: #265 (remove unused `@supabase/ssr`, stale `sw.js` comment), #266 (track `.env.local.example`).
- **Page-redesign audits** #277 Dashboard, #278 Payday, #279 Bills, #280 Goals, #281 Settings: each blocked by #183 (design reference HTML doc, `needs-triage` / `ready-for-human`, untouched). When #183 lands, restore the design-foundation rule in `GEMINI-DELEGATION.md`.
- **Owed:** fix the stale "not wired up" comment in `NotifyHourDialog.tsx` and the "weekly draw" comment in `bills-client.tsx` in the next PR touching those files. Delete each Getting started "Good to know" item when #251, #250, #249 close. The website (separate repo) must link to `/getting-started`.
- Known, low priority, not ticketed: the repo has no CREATE TABLE for notifications, notification_settings, push_subscriptions, and bills/paydays/funds live only in `schema.sql`, so migrations alone can't rebuild a database.
- Last active SPEC ticket: Slice 14 (#309's build PR amends it; before that the #152 amendment).

## Next session, in order

1. Build #309 from the approved plan comment (fresh session). Then grill #311 and #260 (both touch the What's new page / first-open popup).
2. Grill #248, #249, #250, #251, #261, #267 individually when Anthony asks; #265 and #266 are small chores.
3. #183 design reference (unblocks #277 to #281). #145 and #273 only when Anthony says so.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

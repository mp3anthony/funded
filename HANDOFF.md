# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-04)

- `main` = v0.9.60 (PR #238, #209 built and merged; before it v0.9.59 PR #233 for #216, v0.9.58 PR #231 for #211, and docs PRs #214, #217, #219, #221, #223, #224, #226, #227, #229, #239). Production deploys of v0.9.58, v0.9.59 and v0.9.60 all confirmed `success`.
- #209 DONE and closed (2026-10-04): pay-early/one-off/paused now marks the paid cycle's reminders read instead of deleting them; `deliver-scheduled` skips read rows. All 4 iPhone checks passed. Behaviour to know: a reminder read before its push time no longer pushes. `TEST-209*` bills deleted (notification rows kept, A2: mark read if they show in the bell). Not live-tested, offer if wanted: "paid before notify hour = no push" (prod only) and the "bill due today still rolls" regression.
- #216 DONE and closed (2026-10-03): the Settings toggle now reads "Confirm Pending Pay Reminders" (only user-visible "Lodge" text; internal `lodge_payment` keys unchanged by design). iPhone checks passed.
- #211 DONE and closed (2026-10-03): `bills.last_paid_for` (nullable date, migration applied to prod before the build shipped), "Paid for <Month>" line under Paid By (not shown on autopay), permanent one-level "Undo payment" button (manual, recurring, non-paused, non-Paid bills whose due date is last_paid_for + 1 cycle). Recorded when a Paid bill rolls (instant roll, cron, on-open catch-up); pay-early records at roll time; Mark as Unpaid never touches it. SPEC Slice 17 amendment merged. All 12 iPhone checks passed. Known cosmetic: Undo payment can shift a month-end invoice date by a few days (due date always exact). Seeded TEST bills deleted. 19 notifications mentioning "TEST-" still exist (A2: never delete; mark read if they show in the bell).
- #156 DONE and closed (2026-10-01): Supabase Auth email sends via Mailjet from a `noreply@` address on the `funded.` subdomain. Details in `docs/environment.md`. Optional later: DMARC.
- Security hardening (2026-10-04): #208 DONE and closed. Migration `20261004120000_declare_live_rls_policies.sql` declares the live RLS policies that had no repo migration (PR #242, applied to prod, two independent review rounds). Follow-up RLS hardening in progress: batch 1 (PR #243, "RLS hardening 1") applied to prod and merged. RLS hardening batch 2 and a security follow-up ticket are pending (details private; ask Anthony). Neither PR bumped the version (migrations only); `main` is still app v0.9.60. Owed: iPhone smoke test after batch 1 (details private).
- Known, low priority, not ticketed: the repo has no CREATE TABLE for notifications, notification_settings, push_subscriptions, and the bills/paydays/funds tables live only in `schema.sql`, so migrations alone can't rebuild a database from scratch.
- #201 TRIAGED (2026-10-04, outcome commented on the issue): labels `ready-for-agent` + `needs-manual-test`. Decisions: paused bills get no server reminders at all; on resume a passed due date rolls to the next logical future date. Build in one PR: A (skip paused in generateReminders), B (roll on resume), C (editing a paused bill must not resume it). A later session builds it.
- Pay schedule decision (2026-10-04): all household members can edit pay schedules, no change needed.
- Triage session (2026-10-04, outcomes commented on the issue):
  - #215 DEFINED (2026-10-04 definition session, outcome commented on the issue): decision is **no Surplus Pool** (a sinking fund is just a goal). Rescoped to a small UI cleanup, retitled "Remove stub Surplus Pool option from the Payday surplus popup", labels `ready-for-agent` + `needs-manual-test`, no schema, no escalation. Remove the "Bills Surplus Pool" button and fake alert (`SurplusSuggestionModal.tsx`, `payday-client.tsx:178-182`), reword popup copy to goals only, keep top-3 goals / full-surplus behaviour, delete the "Surplus Pool (planned, #215)" entry in `docs/context/money.md` in the build PR. Planner to decide the zero-goals edge case. Not started; a later session builds it.
- Grill session (2026-09-30) settled the migration's open Funded questions (merged in #217). Owed: fix the stale "not wired up" comment in `NotifyHourDialog.tsx` and the "weekly draw" comment in `bills-client.tsx` in the next PR touching those files. Anthony plans a UI/UX rework of every page and will tell a session when ready.
- Owed live checks, ask Anthony, don't block the build: #182 (v0.9.54, tap the 30 Sep pay reminder push, the bell item, a late tap, and a bill reminder) and #193 (v0.9.55, tap the next goal-milestone push, expect that goal's popup). Fully close and reopen the installed app first. Any failure reopens the issue.
- #145 (Hannah getting no pushes, ~2 weeks; #160 folded in): still parked, `needs-info`, root cause unconfirmed (2026-10-04 session, commented on the issue). Her PWA is installed and notification permission is on. Her Android/FCM subscription was refreshed 2 Oct, so it is alive (earlier "untouched since Sep 5" note was wrong). Reminders are generated fine, but `delivered_at` is stamped on every attempt so it proves nothing about receipt; Vercel keeps only ~24h of logs, so past push errors are gone. No test-push button exists. Anthony chose not to test with her yet. Options when ready: Android settings check (Chrome notification switches, Samsung background usage limits), wait for a real reminder, one-off push via `/api/push/send` (needs his go-ahead), or a small build logging non-404/410 push failures to a new DB table (migration, A1 escalation).
- #152 (Known Issues tab on the patch-notes page): scoped, `ready-for-agent`, any session can build it when Anthony asks. If the repo ever goes private, the fetch needs a server-side GitHub token.
- #183 (design reference doc): `needs-triage` / `ready-for-human`, untouched. When it lands, restore the design-foundation rule in `GEMINI-DELEGATION.md`.
- Last active SPEC ticket: none (security hardening and #201 triage touched no SPEC section; last slice work was Slice 17, #211, done).

## Next session, in order

1. Ask Anthony about the owed live checks (#182, #193) when a push arrives.
2. Confirm the batch 1 smoke test result.
3. RLS hardening batch 2 (details private) when Anthony says.
4. Security follow-up ticket (details private).
5. #201 build, then #215 build (Planner, Code Writer, independent review), when Anthony says.
6. Start #145 (pick an option above), #152 or #183 only when Anthony says so.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

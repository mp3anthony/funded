# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-04)

- `main` = v0.9.60 (PR #238, #209 built and merged; before it v0.9.59 PR #233 for #216, v0.9.58 PR #231 for #211, and docs PRs #214, #217, #219, #221, #223, #224, #226, #227, #229, #239). Production deploys of v0.9.58, v0.9.59 and v0.9.60 all confirmed `success`.
- #209 DONE and closed (2026-10-04): pay-early/one-off/paused now marks the paid cycle's reminders read instead of deleting them; `deliver-scheduled` skips read rows. All 4 iPhone checks passed. Behaviour to know: a reminder read before its push time no longer pushes. `TEST-209*` bills deleted (notification rows kept, A2: mark read if they show in the bell). Not live-tested, offer if wanted: "paid before notify hour = no push" (prod only) and the "bill due today still rolls" regression.
- #216 DONE and closed (2026-10-03): the Settings toggle now reads "Confirm Pending Pay Reminders" (only user-visible "Lodge" text; internal `lodge_payment` keys unchanged by design). iPhone checks passed.
- #211 DONE and closed (2026-10-03): `bills.last_paid_for` (nullable date, migration applied to prod before the build shipped), "Paid for <Month>" line under Paid By (not shown on autopay), permanent one-level "Undo payment" button (manual, recurring, non-paused, non-Paid bills whose due date is last_paid_for + 1 cycle). Recorded when a Paid bill rolls (instant roll, cron, on-open catch-up); pay-early records at roll time; Mark as Unpaid never touches it. SPEC Slice 17 amendment merged. All 12 iPhone checks passed. Known cosmetic: Undo payment can shift a month-end invoice date by a few days (due date always exact). Seeded TEST bills deleted. 19 notifications mentioning "TEST-" still exist (A2: never delete; mark read if they show in the bell).
- #156 DONE and closed (2026-10-01): Supabase Auth email sends via Mailjet from a `noreply@` address on the `funded.` subdomain. Details in `docs/environment.md`. Optional later: DMARC.
- #201 (paused bills still get server reminders; resumed bills may show Overdue): `needs-triage`, not started.
- Triage session (2026-10-04, outcomes commented on the issue):
  - #215 DEFINED (2026-10-04 definition session, outcome commented on the issue): decision is **no Surplus Pool** (a sinking fund is just a goal). Rescoped to a small UI cleanup, retitled "Remove stub Surplus Pool option from the Payday surplus popup", labels `ready-for-agent` + `needs-manual-test`, no schema, no escalation. Remove the "Bills Surplus Pool" button and fake alert (`SurplusSuggestionModal.tsx`, `payday-client.tsx:178-182`), reword popup copy to goals only, keep top-3 goals / full-surplus behaviour, delete the "Surplus Pool (planned, #215)" entry in `docs/context/money.md` in the build PR. Planner to decide the zero-goals edge case. Not started; a later session builds it.
- Grill session (2026-09-30) settled the migration's open Funded questions (merged in #217). Owed: fix the stale "not wired up" comment in `NotifyHourDialog.tsx` and the "weekly draw" comment in `bills-client.tsx` in the next PR touching those files. Anthony plans a UI/UX rework of every page and will tell a session when ready.
- Filed, not started: #208 (notifications RLS exists live but not in migrations; security, so escalation).
- Owed live checks, ask Anthony, don't block the build: #182 (v0.9.54, tap the 30 Sep pay reminder push, the bell item, a late tap, and a bill reminder) and #193 (v0.9.55, tap the next goal-milestone push, expect that goal's popup). Fully close and reopen the installed app first. Any failure reopens the issue.
- #145 (Hannah barely getting bill reminder pushes): parked, unresolved, root cause unconfirmed. Do not scope a build until Anthony has talked to her.
- #152 (Known Issues tab on the patch-notes page): scoped, `ready-for-agent`, any session can build it when Anthony asks. If the repo ever goes private, the fetch needs a server-side GitHub token.
- #183 (design reference doc): `needs-triage` / `ready-for-human`, untouched. When it lands, restore the design-foundation rule in `GEMINI-DELEGATION.md`.
- Last active SPEC ticket: none (#215 definition session touched no SPEC section; last slice work was Slice 17, #211, done).

## Next session, in order

1. Ask Anthony about the owed live checks (#182, #193) when a push arrives.
2. #215 is ready to build (Planner, Code Writer, independent review) when Anthony says.
3. Start #145, #152, #183, #201 or #208 only when Anthony says so (#208 needs escalation).

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

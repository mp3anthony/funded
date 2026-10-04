# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-04)

- `main` = v0.9.59 (PR #233, #216 built and merged; before it v0.9.58 PR #231 for #211, and docs PRs #214, #217, #219, #221, #223, #224, #226, #227, #229). Production deploys of v0.9.58 and v0.9.59 both confirmed `success` (2026-10-03).
- #216 DONE and closed (2026-10-03): the Settings toggle now reads "Confirm Pending Pay Reminders" (only user-visible "Lodge" text; internal `lodge_payment` keys unchanged by design). iPhone checks passed.
- #211 DONE and closed (2026-10-03): `bills.last_paid_for` (nullable date, migration applied to prod before the build shipped), "Paid for <Month>" line under Paid By (not shown on autopay), permanent one-level "Undo payment" button (manual, recurring, non-paused, non-Paid bills whose due date is last_paid_for + 1 cycle). Recorded when a Paid bill rolls (instant roll, cron, on-open catch-up); pay-early records at roll time; Mark as Unpaid never touches it. SPEC Slice 17 amendment merged. All 12 iPhone checks passed. Known cosmetic: Undo payment can shift a month-end invoice date by a few days (due date always exact). Seeded TEST bills deleted. 19 notifications mentioning "TEST-" still exist (A2: never delete; mark read if they show in the bell).
- #156 DONE and closed (2026-10-01): Supabase Auth email sends via Mailjet from a `noreply@` address on the `funded.` subdomain. Details in `docs/environment.md`. Optional later: DMARC.
- #201 (paused bills still get server reminders; resumed bills may show Overdue): `needs-triage`, not started.
- Triage session (2026-10-04, read-only, outcomes commented on both issues):
  - #209 (pay-early hard-deletes notifications): clear defect, NO escalation. **Plan DONE** (Planner, 2026-10-04), posted as a comment on the issue with a replacement iPhone checklist. Next: a new session builds it with a Code Writer (v0.9.60, patch note, separate reviewer, `needs-manual-test`). Plan: swap `clearBillNotifications` at `AppContext.tsx:2523` for `markOldCycleNotificationsRead(bill.id, current?.due_date ?? bill.due_date)` and delete the old function; add `.not('is_read','is',true)` to the `deliver-scheduled` query (without it a deferred push still goes out after paying); comment tweaks; `docs/lessons.md` update. Tell Anthony: a reminder read before its push time no longer pushes. Seed only due-soon `TEST-` bills (overdue ones push to Hannah).
  - #215 (Surplus Pool): new feature, not a bug. The Payday option is a stub with a fake "Successfully allocated" alert (`payday-client.tsx:178-182`). Likely schema so escalation. Labels `needs-triage`, `needs-info`, `ready-for-human`. Needs a definition session (six questions on the issue), then `to-spec`, SPEC.md, schema sign-off. Optional separate small bug: hide or make the fake alert honest.
- Grill session (2026-09-30) settled the migration's open Funded questions (merged in #217). Owed: fix the stale "not wired up" comment in `NotifyHourDialog.tsx` and the "weekly draw" comment in `bills-client.tsx` in the next PR touching those files. Anthony plans a UI/UX rework of every page and will tell a session when ready.
- Filed, not started: #208 (notifications RLS exists live but not in migrations; security, so escalation).
- Owed live checks, ask Anthony, don't block the build: #182 (v0.9.54, tap the 30 Sep pay reminder push, the bell item, a late tap, and a bill reminder) and #193 (v0.9.55, tap the next goal-milestone push, expect that goal's popup). Fully close and reopen the installed app first. Any failure reopens the issue.
- #145 (Hannah barely getting bill reminder pushes): parked, unresolved, root cause unconfirmed. Do not scope a build until Anthony has talked to her.
- #152 (Known Issues tab on the patch-notes page): scoped, `ready-for-agent`, any session can build it when Anthony asks. If the repo ever goes private, the fetch needs a server-side GitHub token.
- #183 (design reference doc): `needs-triage` / `ready-for-human`, untouched. When it lands, restore the design-foundation rule in `GEMINI-DELEGATION.md`.
- Last active SPEC ticket: none (#216 was a text-only rename outside the slices; last slice work was Slice 17, #211, done).

## Next session, in order

1. Ask Anthony about the owed live checks (#182, #193) when a push arrives.
2. Build #209 from the plan on the issue (no escalation). #215 starts with the definition session when Anthony says.
3. Start #145, #152, #183, #201 or #208 only when Anthony says so (#208 needs escalation).

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

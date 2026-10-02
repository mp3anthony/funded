# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-03)

- `main` = v0.9.58 (PR #231, #211 built and merged; docs before it: PR #214 context migration, PR #217 glossary decisions, PR #219 email sender setup, PRs #221, #223, #224, #226, #227 Auth email, PR #229 #167 lessons). Production deploy of v0.9.58 was still BUILDING when this was written: confirm it is READY at the start of the next session.
- #211 DONE and closed (2026-10-03): `bills.last_paid_for` (nullable date, migration applied to prod before the build shipped), "Paid for <Month>" line under Paid By (not shown on autopay), permanent one-level "Undo payment" button (manual, recurring, non-paused, non-Paid bills whose due date is last_paid_for + 1 cycle). Recorded when a Paid bill rolls (instant roll, cron, on-open catch-up); pay-early records at roll time; Mark as Unpaid never touches it. SPEC Slice 17 amendment merged. All 12 iPhone checks passed. Known cosmetic: Undo payment can shift a month-end invoice date by a few days (due date always exact). Seeded TEST bills deleted. 19 notifications mentioning "TEST-" still exist (A2: never delete; mark read if they show in the bell).
- #156 DONE and closed (2026-10-01): Supabase Auth email sends via Mailjet from a `noreply@` address on the `funded.` subdomain. Details in `docs/environment.md`. Optional later: DMARC.
- #201 (paused bills still get server reminders; resumed bills may show Overdue): `needs-triage`, not started.
- Grill session (2026-09-30) settled the migration's open Funded questions (merged in #217). Tickets: #215 (build the Surplus Pool, `needs-info`, needs a definition session with Anthony, likely schema so escalation) and #216 (rename "Lodge payment" UI text, `ready-for-agent`). Owed: fix the stale "not wired up" comment in `NotifyHourDialog.tsx` and the "weekly draw" comment in `bills-client.tsx` in the next PR touching those files. Anthony plans a UI/UX rework of every page and will tell a session when ready.
- Filed, not started: #208 (notifications RLS exists live but not in migrations; security, so escalation) and #209 (pay-early path still hard-deletes notifications, against SPEC A2).
- Owed live checks, ask Anthony, don't block the build: #182 (v0.9.54, tap the 30 Sep pay reminder push, the bell item, a late tap, and a bill reminder) and #193 (v0.9.55, tap the next goal-milestone push, expect that goal's popup). Fully close and reopen the installed app first. Any failure reopens the issue.
- #145 (Hannah barely getting bill reminder pushes): parked, unresolved, root cause unconfirmed. Do not scope a build until Anthony has talked to her.
- #152 (Known Issues tab on the patch-notes page): scoped, `ready-for-agent`, any session can build it when Anthony asks. If the repo ever goes private, the fetch needs a server-side GitHub token.
- #183 (design reference doc): `needs-triage` / `ready-for-human`, untouched. When it lands, restore the design-foundation rule in `GEMINI-DELEGATION.md`.
- Last active SPEC ticket: Slice 17 (#211 amendment, done).

## Next session, in order

1. Confirm the v0.9.58 production deploy is READY (`gh pr list` and Vercel).
2. Ask Anthony about the owed live checks (#182, #193) when a push arrives.
3. Start #145, #152, #183, #201, #208, #209, #215 or #216 only when Anthony says so (#215 first needs a definition session; #208 and #209 need escalation).

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

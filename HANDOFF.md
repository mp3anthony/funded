# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-09-30)

- `main` = v0.9.57 (#205 merged, PR #210: instant roll on Mark as Paid, with Undo). Production deploy confirmed READY.
- Last active SPEC ticket: Slice 17. #211 is approved, including its schema change (Anthony, 2026-09-28): a persistent "Paid for <Month>" line in the bill popup (new nullable `bills.last_paid_for`) plus a permanent one-level "Undo payment" button. Needs a SPEC.md Slice 17 amendment when built.
- Filed, not started: #208 (notifications RLS exists live but not in migrations; security, so escalation) and #209 (pay-early path still hard-deletes notifications, against SPEC A2).
- Owed live checks, ask Anthony, don't block the build: #182 (v0.9.54, tap the 30 Sep pay reminder push, the bell item, a late tap, and a bill reminder) and #193 (v0.9.55, tap the next goal-milestone push, expect that goal's popup). Fully close and reopen the installed app first. Any failure reopens the issue.
- #145 (Hannah barely getting bill reminder pushes): parked, unresolved, root cause unconfirmed. Do not scope a build until Anthony has talked to her.
- #152 (Known Issues tab on the patch-notes page): scoped, `ready-for-agent`, any session can build it when Anthony asks. If the repo ever goes private, the fetch needs a server-side GitHub token.
- #183 (design reference doc): `needs-triage` / `ready-for-human`, untouched. When it lands, restore the design-foundation rule in `GEMINI-DELEGATION.md`.
- #167 (Mailjet onboarding campaign) and #156 (move transactional email off personal Gmail): both waiting on Anthony's manual steps.

## Next session, in order

1. Build #211: plan via the Planner, Code Writer build, independent review, `needs-manual-test` (iPhone checklist), version v0.9.58 confirmed with Anthony before merge.
2. Ask Anthony about the owed live checks (#182, #193) when a push arrives.
3. Start #145, #152 or #183 only when Anthony says so.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

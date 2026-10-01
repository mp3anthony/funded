# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-01)

- `main` = v0.9.57 (docs since: PR #214 context migration, PR #217 glossary decisions from the grill session, PR #219 email sender setup, PR #221 Auth email glossary term and template plan, PRs #223 and #224 Auth email templates). Production deploy confirmed READY.
- #156 DONE and closed (2026-10-01): Supabase Auth email now sends via Mailjet from a `noreply@` address on the `funded.` subdomain, SPF/DKIM pass, test email hit the inbox. Details in `docs/environment.md`. No code change. Optional later: DMARC.
- New since last handoff: #201 (paused bills still get server reminders; resumed bills may show Overdue), filed, `needs-triage`, not started.
- Last active SPEC ticket: Slice 17. #211 is approved, including its schema change (Anthony, 2026-09-28): a persistent "Paid for <Month>" line in the bill popup (new nullable `bills.last_paid_for`) plus a permanent one-level "Undo payment" button. Needs a SPEC.md Slice 17 amendment when built.
- Grill session (2026-09-30) settled the migration's open Funded questions and merged them in #217: Household total (was weekly draw), Contributor = alias of Member, Fully Funded terms-only, Confirm Pending Pay reminder (was Lodge payment), planned terms stay in the glossary tagged with their ticket. New tickets: #215 (build the Surplus Pool, `needs-info`, needs a definition session with Anthony, likely schema so escalation) and #216 (rename "Lodge payment" UI text, `ready-for-agent`). Owed: fix the stale "not wired up" comment in `NotifyHourDialog.tsx` and the "weekly draw" comment in `bills-client.tsx` in the next PR touching those files. Anthony plans a UI/UX rework of every page and will tell a session when ready.
- Filed, not started: #208 (notifications RLS exists live but not in migrations; security, so escalation) and #209 (pay-early path still hard-deletes notifications, against SPEC A2).
- Owed live checks, ask Anthony, don't block the build: #182 (v0.9.54, tap the 30 Sep pay reminder push, the bell item, a late tap, and a bill reminder) and #193 (v0.9.55, tap the next goal-milestone push, expect that goal's popup). Fully close and reopen the installed app first. Any failure reopens the issue.
- #145 (Hannah barely getting bill reminder pushes): parked, unresolved, root cause unconfirmed. Do not scope a build until Anthony has talked to her.
- #152 (Known Issues tab on the patch-notes page): scoped, `ready-for-agent`, any session can build it when Anthony asks. If the repo ever goes private, the fetch needs a server-side GitHub token.
- #183 (design reference doc): `needs-triage` / `ready-for-human`, untouched. When it lands, restore the design-foundation rule in `GEMINI-DELEGATION.md`.
- #167 DONE and closed (2026-10-01): branded Confirm signup and Reset password templates live in `supabase/email-templates/` (source of truth; Anthony pasted them into Supabase), logo at `public/email/logo.png`, served from `funded-alpha.vercel.app` because the `funded.` subdomain is mail-only. Mailjet click tracking confirmed off. Anthony checked most of the iPhone checklist and signed it off; reopen if anything breaks. Supabase dashboard preview does not show the logo (blocks external images), so test with real emails only.

## Next session, in order

1. Build #211: plan via the Planner, Code Writer build, independent review, `needs-manual-test` (iPhone checklist), version v0.9.58 confirmed with Anthony before merge.
2. Ask Anthony about the owed live checks (#182, #193) when a push arrives.
3. Start #145, #152, #183, #215 or #216 only when Anthony says so (#215 first needs a definition session).

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub.

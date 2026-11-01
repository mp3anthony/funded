# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Done work lives in git and GitHub; durable knowledge lives in the places listed at the bottom.

## Current state (2026-11-01)

- `main` is the only branch (local and origin). App is live on Vercel at `APP_VERSION` 0.1.3. No open PRs.
- **Repo cleanup ([#501](https://github.com/mp3anthony/funded/issues/501)) done** (PRs #503-#507): `supabase/.temp/` untracked, old research file removed, legacy SQL moved to `supabase/legacy/`, README slimmed to setup plus pointers, SPEC.md slimmed (Part A untouched), lessons and glossaries pruned of stale items and R/F tags, pointers added to `CONTEXT-MAP.md` and `CLAUDE.md`.
- Android push ([#145](https://github.com/mp3anthony/funded/issues/145)) and password-reset links ([#490](https://github.com/mp3anthony/funded/issues/490)) are fixed and verified live on Hannah's Android (install from Chrome with Chrome notifications on).
- Launch video ([#495](https://github.com/mp3anthony/funded/issues/495)) is done, outside the repo in `D:\Anthonys-HQ\business\hazardous-schematics\brag-output\funded\2026-11-01-115132`.

## Owed (Anthony)

- Confirm Supabase Auth "Confirm email" is ON.
- Delete the orphan folder `.claude/worktrees/250-blank-due-date-a65f79` (105MB, local only, git-ignored; the delete was blocked for Claude). Optional: `.next` can be wiped to reclaim space.
- Decide whether `SPEC.md` Part A lines ~30 and ~63 (locked) should be updated: they name `supabase/rls_policies.sql`, `secure_rls_policies.sql` and `schema.sql`, which now live in `supabase/legacy/`.
- Optional: Supabase Auth > URL Configuration, check the Redirect URLs allow-list includes `/reset-password/update` (suspected root cause of #490; the fix works either way). Notes in [this #490 comment](https://github.com/mp3anthony/funded/issues/490#issuecomment-6540635952).
- Optional: the `docs/context` glossaries still point at a private design-doc path (`project/pages/*.md`); align with `DESIGN-REFERENCE.md` in a later docs pass.

## Device checks still open (Anthony, one pass on iPhone)

Claude cannot log in, so none of these are smoke-tested:

- No CSP console errors anywhere in the Home Screen app (sign in, realtime, avatar crop/upload, report screenshot, push enrol on web.push.apple.com, service worker and offline page, fonts and icon).
- Log out then sign in as someone else in the same Home Screen app starts empty (#478).
- Light-theme contrast; Dashboard fits one screen at 375px; header layout.
- Bonus flow and Payday note icon; confirming a Pending pay runs rules (#454).
- Home Screen icon shows the lime "f." after deleting and re-saving from Safari.
- Create household shows an 8-character code that copies; joining with a new and an old (6-character) code works.
- Avatar upload/replace/remove, a logged-out avatar URL, report screenshot upload.
- Leaving a household and deleting a household (as owner) still work (seed a `TEST-` household).
- Cron-created Pending pays and push reminders (can only be tested live).
- Updates card shows the 0.1.1-0.1.3 patch notes on next open.

## Next session, in order

1. Anthony reports device-check findings; the fix list goes through Intake, Code Writer and independent review as usual.
2. Otherwise pick from the open issues below.

## Open issues

[#383](https://github.com/mp3anthony/funded/issues/383) change login email (after the overhaul). Repo interaction limit (collaborators only) runs until 2027-04-09 (#276); renew then.

## Process notes

- No spawned sessions: build here, or Anthony wraps and clears for a fresh one.
- A `HANDOFF.md`-only wrap-up goes on its own `docs/handoff-*` PR and is merged straight away (no sub-agent review, no approval ask).
- The orchestrator never writes code; every diff, however small, goes to a Code Writer then an independent reviewer before commit or push.
- Security findings stay in the private notes file, never in GitHub, commits or this file.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub; look and layout: `DESIGN-REFERENCE.md` (and the design doc, design only).

# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Done work lives in git and GitHub; durable knowledge lives in the places listed at the bottom.

## Current state (2026-11-09)

- `main` is the only branch (local and origin). App is live on Vercel at `APP_VERSION` 0.1.4. No open PRs.
- **Delete my account ([#509](https://github.com/mp3anthony/funded/issues/509)) shipped** in PR [#518](https://github.com/mp3anthony/funded/pull/518) (v0.1.4): Settings button under Leave household, typed DELETE, Leave household owner rules. New `delete-account` edge function (service role, A1 approved by Anthony) deployed to Supabase, ACTIVE, verify_jwt on. Plan in [this #509 comment](https://github.com/mp3anthony/funded/issues/509#issuecomment-6720809202). Not yet live-checked.
- **Google Play push still open:** [#510](https://github.com/mp3anthony/funded/issues/510) privacy policy, [#511](https://github.com/mp3anthony/funded/issues/511) Android wrapper (TWA), [#512](https://github.com/mp3anthony/funded/issues/512) listing assets and copy, [#513](https://github.com/mp3anthony/funded/issues/513) Play declarations, [#515](https://github.com/mp3anthony/funded/issues/515) public deletion page (split from #509; where it lives deferred, contact email placeholder). #511 submission needs #510 and #515.
- New from #509: [#516](https://github.com/mp3anthony/funded/issues/516) profile photo upload likely failing (wrong folder id), [#517](https://github.com/mp3anthony/funded/issues/517) one-off clean-up of old member-id photo folders (prod storage, confirm first), [#519](https://github.com/mp3anthony/funded/issues/519) Delete my account edge-case polish.
- New private security note (2026-11-09) in the private notes folder; needs Anthony's decision.
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
- Updates card shows the 0.1.1-0.1.4 patch notes on next open.
- Delete my account (#509): sign up a throwaway, create a `TEST-` household, Settings > Delete my account, type DELETE: lands on Log in and that email no longer signs in. Optional: throwaway as only owner with you as member: it asks who takes over, then you're owner.

## Next session, in order

1. Anthony reports device-check findings; the fix list goes through Intake, Code Writer and independent review as usual.
2. Anthony reviews the private security note from 2026-11-09.
3. Google Play work. Decision needed: where the privacy policy (#510) and public deletion page (#515) live. #513 drafts and #512 copy can run without him; #511 and #512 screenshots need him. #516 (photo upload) is a clear bug fix and can go any time.

## Open issues

#510-#513, #515 Google Play; #516, #517, #519 (above). [#383](https://github.com/mp3anthony/funded/issues/383) change login email (after the overhaul). Repo interaction limit (collaborators only) runs until 2027-04-09 (#276); renew then.

## Process notes

- No spawned sessions: build here, or Anthony wraps and clears for a fresh one.
- A `HANDOFF.md`-only wrap-up goes on its own `docs/handoff-*` PR and is merged straight away (no sub-agent review, no approval ask).
- The orchestrator never writes code; every diff, however small, goes to a Code Writer then an independent reviewer before commit or push.
- Security findings stay in the private notes file, never in GitHub, commits or this file.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub; look and layout: `DESIGN-REFERENCE.md` (and the design doc, design only).

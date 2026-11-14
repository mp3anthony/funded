# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Done work lives in git and GitHub; durable knowledge lives in `CONTEXT-MAP.md`, `docs/` (conventions, lessons, environment, context, adr), `SPEC.md` and `DESIGN-REFERENCE.md`.

## Current state (2026-11-15)

- Live on Vercel at `APP_VERSION` 0.1.6. Last active: Delete my account edge cases ([#519](https://github.com/mp3anthony/funded/issues/519)), merged in PR [#527](https://github.com/mp3anthony/funded/pull/527), #519 closed. Only owner sent to "pick a new owner" instead of a dead end; a retry after a lost reply signs you out to Log in instead of "Unauthorized". No edge function or schema change. Small review nits left in the PR #527 description. Not yet live-checked.
- #516 profile photo iPhone check PASSED 2026-11-15. Still not live-checked: #509 (v0.1.4, `delete-account` edge function ACTIVE) and #519 Delete my account; both need throwaway accounts (Anthony makes a third account later).
- [#517](https://github.com/mp3anthony/funded/issues/517) photo clean-up DONE 2026-11-15: 1 file moved into its correct folder, 4 orphans deleted, bucket now 2 objects, both photos checked by Anthony. Local backup kept until 2026-11-22, then Anthony or an agent deletes it (it sits in the local backups folder).
- Key rotation not done yet; tracked privately. No sign of a leak.
- Google Play: #510 privacy policy, #511 Android wrapper (needs #510 and #515), #512 listing, #513 declarations, #515 public deletion page (contact email still a placeholder). #512 copy and #513 drafts can run without Anthony; #511 and #512 screenshots need him.
- [#521](https://github.com/mp3anthony/funded/issues/521) bank statement import: out of spec, `needs-info`; starts with a grilling session (`grilling` + `domain-modeling`), then research (CSV/OFX per bank vs Akahu, privacy); intake findings on the issue.
- Private security note (2026-11-09) needs Anthony's decision.

## Owed (Anthony)
- Confirm Supabase Auth "Confirm email" is ON. Optional: check Redirect URLs include `/reset-password/update` (#490).
- Delete local orphan `.claude/worktrees/250-blank-due-date-a65f79` (105MB, git-ignored; the delete was blocked for Claude).
- Decide whether `SPEC.md` Part A lines ~30 and ~63 (locked) should point at `supabase/legacy/`.
- Optional: `docs/context` glossaries still point at a private design-doc path (`project/pages/*.md`); align with `DESIGN-REFERENCE.md` in a later docs pass.

## Device checks (Anthony, one iPhone pass; Claude cannot log in)
- No CSP console errors in the Home Screen app; log out then in as someone else starts empty (#478).
- Light-theme contrast, Dashboard fits at 375px, header; Bonus flow, Payday note, Pending pay runs rules (#454).
- Home Screen icon "f."; household code (8 chars) copies, old 6-char codes join; cron Pending pays and push reminders.
- Logged-out avatar URL; report screenshot upload.
- Leave and delete household (seed a `TEST-` household). Updates card shows 0.1.1-0.1.6 notes.
- Delete my account (#509, #519): throwaway plus `TEST-` household, type DELETE, lands on Log in, email no longer signs in. Throwaway as only owner with you as member: asks who takes over.

## Next session, in order
1. Anthony's iPhone Delete my account checks (#509, #519) once a throwaway account exists.
2. Device-check findings go through Intake, Code Writer and independent review.
3. Anthony reviews the private security note.
4. Google Play: decide where #510 and #515 live; #513 and #512 drafts meanwhile.

## Open issues
#510-#513, #515 Google Play; #521; #383 change login email. Interaction limit (#276) renew 2027-04-09.

## Process notes
- No spawned sessions: build here, or Anthony wraps and clears for a fresh one.
- The orchestrator never writes code; every diff goes to a Code Writer then an independent reviewer. A `HANDOFF.md`-only wrap-up goes on its own `docs/handoff-*` PR, merged straight away.
- Security findings stay in the private notes file, never in GitHub, commits or this file.

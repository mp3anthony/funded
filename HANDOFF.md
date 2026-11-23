# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Done work lives in git and GitHub; durable knowledge lives in `CONTEXT-MAP.md`, `docs/` (conventions, lessons, environment, context, adr, workflow), `SPEC.md` and `DESIGN-REFERENCE.md`.

## Current state (2026-11-24)

- Live on Vercel at `APP_VERSION` 0.1.6 (last code change: #519, PR #527). Not yet live-checked: #509 and #519 Delete my account (need throwaway accounts).
- Repo tidy-up (home#16, epic home#20): Session A done, merged in PR #530 (purpose paragraph, `CLAUDE.md` 35 lines, new `docs/workflow.md`, stale history trimmed). Docs-only tidy PRs need no version bump.
- Session B next (steps 4 to 8): rebuild `CONTEXT-MAP.md` as a lane index (`docs/context/<lane>/` folders; `money.md` 169 lines and `app-shell.md` 114 are near the 200 cap, check line length too); `docs/environment.md` lists secret NAMES only, no private paths; context check of every pointer; doctor run by separate subagents; wrap-up. The home#16 slice split recording is Anthony's.
- Carry: `SPEC.md` Slices 1-22 untrimmed (optional later); file a GitHub issue for `console.log` lines logging user ids in `AppContext.tsx` (not yet filed); README still has some em dashes.
- Google Play (#510-#513, #515) on hold. #521 bank statement import: out of spec, `needs-info`, starts with a grilling session.
- Key rotation not done; tracked privately. Private security note (2026-11-09) needs Anthony's decision.

## Owed (Anthony)
- Confirm Supabase Auth "Confirm email" is ON; optionally check Redirect URLs include `/reset-password/update` (#490).
- Delete a stale git-ignored local worktree under `.claude/worktrees/` (105MB; delete was blocked for Claude). Decide whether `SPEC.md` Part A lines ~30 and ~63 (locked) should point at `supabase/legacy/`.

## Device checks (Anthony, one iPhone pass; Claude cannot log in)
- No CSP console errors in the Home Screen app; log out then in as someone else starts empty (#478).
- Light-theme contrast, Dashboard at 375px, header; Bonus flow, Payday note, Pending pay rules (#454).
- Home Screen icon "f."; 8-char household code copies, old 6-char codes join; cron Pending pays and push reminders. Logged-out avatar URL; report screenshot upload; leave and delete household (seed `TEST-`); Updates card shows 0.1.1-0.1.6.
- Delete my account (#509, #519): throwaway plus `TEST-` household, type DELETE, lands on Log in; only-owner case asks who takes over.

## Next session, in order
1. Tidy-up Session B (above).
2. Delete my account checks once a throwaway account exists; device-check findings go through Intake, Code Writer, independent review. Open issues: #510-#513, #515, #521, #383. Interaction limit (#276) renew 2027-04-09.

## Process notes
- No spawned sessions: build here, or Anthony wraps and clears. Orchestrator never writes code; every diff goes Code Writer then independent reviewer. A `HANDOFF.md`-only wrap-up goes on its own `docs/handoff-*` PR, merged straight away.
- Security findings stay in the private notes file, never in GitHub, commits or this file.

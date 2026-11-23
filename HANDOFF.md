# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Done work lives in git and GitHub; durable knowledge lives in `CONTEXT-MAP.md`, `docs/` (conventions, lessons, environment, context, adr, workflow), `SPEC.md` and `DESIGN-REFERENCE.md`.

## Current state (2026-11-24)

- Live on Vercel at `APP_VERSION` 0.1.6 (last code change: #519, PR #527). Not yet live-checked: #509 and #519 Delete my account (need throwaway accounts).
- Repo tidy-up (home#16, epic home#20): Session B done on branch `docs/tidy-up-b` (PR pending merge) (context lanes under `docs/context/<lane>/`, `CONTEXT-MAP.md` as lane index, `docs/environment.md` names only, docs dashes fixed). Tidy-up is complete for funded once that PR merges; Anthony records the slices on home#16 and home#20.
- Carry: `SPEC.md` Slices 1-22 untrimmed (optional); `SPEC.md` still has about 91 em dashes (optional cleanup); file a GitHub issue for `console.log` lines logging user ids in `AppContext.tsx` (not yet filed).
- Small code ticket needed: stale comments in `src` (`verdict.ts` points at `docs/context/money.md`; "AGENTS.md invariant #2" in `globals.css` and `Dialog.tsx`).
- Google Play (#510-#513, #515) on hold. #521 bank statement import: out of spec, `needs-info`, starts with a grilling session.
- Key rotation not done; tracked privately. Private security note needs Anthony's decision.

## Owed (Anthony)
- Confirm Supabase Auth "Confirm email" is ON; optionally check Redirect URLs include `/reset-password/update` (#490).
- Delete a stale git-ignored local worktree under `.claude/worktrees/` (105MB; delete was blocked for Claude). Decide whether `SPEC.md` Part A lines ~30 and ~63 (locked) should point at `supabase/legacy/`.

## Device checks (Anthony, one iPhone pass; Claude cannot log in)
- No CSP console errors in the Home Screen app; log out then in as someone else starts empty (#478).
- Light-theme contrast, Dashboard at 375px, header; Bonus flow, Payday note, Pending pay rules (#454).
- Home Screen icon "f."; 8-char household code copies, old 6-char codes join; cron Pending pays and push reminders. Logged-out avatar URL; report screenshot upload; leave and delete household (seed `TEST-`); Updates card shows 0.1.1-0.1.6.
- Delete my account (#509, #519): throwaway plus `TEST-` household, type DELETE, lands on Log in; only-owner case asks who takes over.

## Next session, in order
1. Delete my account checks once a throwaway account exists; device-check findings go through Intake, Code Writer, independent review. Open issues: #510-#513, #515, #521, #383. Interaction limit (#276) renew 2027-04-09.

## Process notes
- No spawned sessions: build here, or Anthony wraps and clears. Orchestrator never writes code; every diff goes Code Writer then independent reviewer. A `HANDOFF.md`-only wrap-up goes on its own `docs/handoff-*` PR, merged straight away.
- Security findings stay in the private notes file, never in GitHub, commits or this file.

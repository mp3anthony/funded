# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-30)

- **PR #425 MERGED to `main` as a9c5898 (squash):** redesign R01-R35, F01-F13, the #478 fix (second login on one device showed the first account's data) and the security hardening. Closed #377, #463, #478. Live on Vercel.
- **Applied to production Supabase (funded-app) today:** `pay_history_is_bonus` (20261026120000), `households_update_owner_only` (R28, 20261024130000), `hardening_4_member_rows`, `hardening_5_storage_paths`, `hardening_6_join_attempts`. Earlier: `pay_history.amount` nullable. `join-household` edge function redeployed (v4). Post-merge `UPDATE pay_history SET amount = NULL WHERE status = 'pending' AND amount = 0;` ran, 0 rows matched. Storage policy list checked beforehand; stored avatar and screenshot paths match the new own-folder layout.
- `hardeningGuards` test is now in `npm test` (688 tests).
- **v0.1.0 RELEASED via PR #481 (c9c6d4f, 2026-10-30):** `APP_VERSION` 0.1.0, patch-notes entry added (9 bullets). Updates card verified by cause: it shows when last-seen differs from `APP_VERSION`; the earlier no-toast was only the missing bump. Anthony should see the card with the 0.1.0 notes on next open after Vercel deploys.
- **Not done, owed:**
  - Anthony to confirm Supabase Auth "Confirm email" is ON.
  - Claude cannot log in, so no smoke test was done of avatar upload/replace/remove, a logged-out avatar URL, report screenshot upload, or create/join household (8-character and old 6-character codes). These are Anthony's device checks.
  - Cron-created Pending pays and push reminders can only be tested now it is live.

## Device checks still open (Anthony, one pass on iPhone)

Every "Not yet checked on iPhone" item from the R/F slices is open (git history of this file holds the full lists). Notable ones:

- No CSP console errors anywhere in the Home Screen app (sign in, realtime, avatar crop/upload, report screenshot, push enrol on web.push.apple.com, service worker and offline page, fonts and icon).
- Log out then sign in as someone else in the same Home Screen app starts empty (#478).
- Light-theme contrast (R35); Dashboard fits one screen at 375px; header layout (F06).
- Bonus flow (F13) and Payday note icon (F12); confirming a Pending pay runs rules (#454).
- Home Screen icon shows the lime "f." after deleting and re-saving from Safari (F11).
- Create household shows an 8-character code that copies; joining with a new and an old code works.

## Next session, in order

1. Anthony reports device-check findings; fix list goes through Intake, Code Writer and independent review as usual.
2. **R36 ([#423](https://github.com/mp3anthony/funded/issues/423))**: move every issue-specific item out of the design doc into `docs/context/` and friends, so the doc is design only. Also trim the stale health-score text and "Superseded" line in `SPEC.md`.
3. Remove the `redesign/full-app` branch if still present.
4. Optional: the `docs/conventions.md` "Milestones" line and the README milestone table still mention v0.10.0 for wider testers; Anthony to decide the wording.

## Open issues

[#423](https://github.com/mp3anthony/funded/issues/423) R36 cleanup (next planned job); [#479](https://github.com/mp3anthony/funded/issues/479) leave/delete household returns 500 where 401 fits; [#383](https://github.com/mp3anthony/funded/issues/383) change login email (after the overhaul); [#145](https://github.com/mp3anthony/funded/issues/145) parked, `needs-info`. Repo interaction limit (collaborators only) runs until 2027-04-09 (#276); renew then.

## Process notes

- No spawned sessions: build here, or Anthony wraps and clears for a fresh one.
- A docs-only PR (such as a `HANDOFF.md` wrap-up) is reviewed by a sub-agent and merged straight away.
- The orchestrator never writes code; every diff, however small, goes to a Code Writer then an independent reviewer before commit or push.
- Security findings stay in the private notes file, never in GitHub, commits or this file.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub; look and layout: `DESIGN-REFERENCE.md` (and the design doc until R36).

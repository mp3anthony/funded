# HANDOFF

> Where we left off. Rewritten at every wrap-up; current state only. Durable knowledge lives in the places listed at the bottom.

## Current state (2026-10-31)

- **[#495](https://github.com/mp3anthony/funded/issues/495) launch video BUILT 2026-11-01, awaiting Anthony review:** 30s, built with `/brag` (Hyperframes 0.8.70), 9:16 and 16:9, outside the repo in `D:Anthonys-HQusinesshazardous-schematicsrag-outputunded6-11-01-105753` (`brag-9x16.mp4`, `brag-16x9.mp4`, posters, `share-copy.txt`, plan and brief, generators in `tools/`). Screens were rebuilt from the real components (first pass from DESIGN-REFERENCE alone looked wrong), and the video opens on the Dashboard. Invented data only. Music and sound effects are synthesised in code and were never heard by Claude, so Anthony must judge them (ship silent plus effects if poor). Nothing committed for it; issue stays open until he approves or asks for re-rolls.
- **#488 DONE, PR #489 squash-merged to `main` as e96f943 (v0.1.2):** every web push now sends `urgency: 'high'` and a 12h TTL (`src/lib/push.ts`), guard test `src/lib/push.test.mjs` (690 tests), `docs/lessons.md` updated. Live on production. Part of [#145](https://github.com/mp3anthony/funded/issues/145), which stays open.
- **#145 findings (full write-up in the issue's 2026-10-31 comments):** a seeded test push to Hannah at 20:00 NZ was stamped delivered, the Vercel run logged no push error, so FCM accepted it; it showed in the app inbox but **no pop-up reached her phone**. Phone checks (battery, Sleeping apps, Samsung Internet site switch, Android app switch, DND) all fine. She was on **Samsung Internet** (home-screen shortcut). She has now installed Funded from **Chrome**, but cannot sign in (forgot password).
- **[#490](https://github.com/mp3anthony/funded/issues/490) BUILT, PR #493 squash-merged to `main` as 39c16d4 (v0.1.3):** reset links now always land on the set-a-new-password page (recovery flag stamped before `createClient`; update page needs the flag; AppShell forwards signed-in recovery landings; flag cleared on invalid/ready/success/SIGNED_OUT/login). Independent review approved, 701 tests. Global sign-out after reset kept. **Issue stays open:** not yet verified on Hannah's Android, and the likely root cause (Supabase Redirect URLs allow-list missing `/reset-password/update`) is still unchecked; plan in [this #490 comment](https://github.com/mp3anthony/funded/issues/490#issuecomment-6540635952). Live check: reset link shows the new-password screen with no Home flash; set password lands on sign-in; same link again says invalid or expired.
- Test row `TEST-145-hannah-push` was deleted. Hannah's password was never read or set by Claude.
- **#479 DONE, PR #485 squash-merged to `main` as 1b150b8:** `leave-household` and `delete-household` edge functions now return 401 (not 500) on a missing Authorization header, matching `join-household`. Guard test added in `hardeningGuards` (689 tests). `APP_VERSION` 0.1.1 with patch note. #479 closed. Both functions redeployed to production Supabase (funded-app): leave-household v3, delete-household v3 (deployed source verified to have the guard). The live `delete-household` used a `respond()` helper before; behaviour was identical to the repo, now replaced by the repo version.
- **R36 ([#423](https://github.com/mp3anthony/funded/issues/423)) DONE, PR #483 (ca90a8a):** glossaries, `docs/lessons.md`, `docs/conventions.md` and `SPEC.md` cleaned (stale health-score and "Superseded" text trimmed, Part A untouched). The design doc artifact is republished (v17) and now holds design only. #423 closed.

- **PR #425 MERGED to `main` as a9c5898 (squash):** redesign R01-R35, F01-F13, the #478 fix (second login on one device showed the first account's data) and the security hardening. Closed #377, #463, #478. Live on Vercel.
- **Applied to production Supabase (funded-app) earlier:** `pay_history_is_bonus` (20261026120000), `households_update_owner_only` (R28, 20261024130000), `hardening_4_member_rows`, `hardening_5_storage_paths`, `hardening_6_join_attempts`. Earlier: `pay_history.amount` nullable. `join-household` edge function redeployed (v4). Post-merge `UPDATE pay_history SET amount = NULL WHERE status = 'pending' AND amount = 0;` ran, 0 rows matched. Storage policy list checked beforehand; stored avatar and screenshot paths match the new own-folder layout.
- `hardeningGuards` test is in `npm test`.
- **v0.1.0 RELEASED via PR #481 (c9c6d4f, 2026-10-30):** `APP_VERSION` 0.1.0, patch-notes entry added (9 bullets). Updates card verified by cause: it shows when last-seen differs from `APP_VERSION`; the earlier no-toast was only the missing bump. Anthony should see the card with the 0.1.0 notes on next open after Vercel deploys.
- **Not done, owed:**
  - Anthony to confirm Supabase Auth "Confirm email" is ON.
  - Claude cannot log in, so no smoke test was done of avatar upload/replace/remove, a logged-out avatar URL, report screenshot upload, or create/join household (8-character and old 6-character codes). These are Anthony's device checks.
  - Cron-created Pending pays and push reminders can only be tested now it is live.
  - v0.1.1 and v0.1.2 updates card should show the new patch notes on next open after Vercel deploys.

## Device checks still open (Anthony, one pass on iPhone)

Every "Not yet checked on iPhone" item from the R/F slices is open (git history of this file holds the full lists). Notable ones:

- No CSP console errors anywhere in the Home Screen app (sign in, realtime, avatar crop/upload, report screenshot, push enrol on web.push.apple.com, service worker and offline page, fonts and icon).
- Log out then sign in as someone else in the same Home Screen app starts empty (#478).
- Light-theme contrast (R35); Dashboard fits one screen at 375px; header layout (F06).
- Bonus flow (F13) and Payday note icon (F12); confirming a Pending pay runs rules (#454).
- Home Screen icon shows the lime "f." after deleting and re-saving from Safari (F11).
- Create household shows an 8-character code that copies; joining with a new and an old code works.
- Leaving a household and deleting a household (as owner) still work (seed a `TEST-` household).

## Next session, in order

1. **#495** (launch video): Anthony reviews the MP4s (picture and sound). Re-rolls or closing the issue are his call. Regenerate with `node tools/build.mjs` in the output folder.
2. **#490** (built, v0.1.3): Anthony does the dashboard check (Supabase Auth > URL Configuration; steps in the plan comment) and picks wildcard vs exact redirect URLs. Then Hannah resets her password via the emailed link as the live test; close #490 if it works.
3. **#145:** once Hannah is signed in on the Chrome install, seed another `TEST-` push (method in `docs/lessons.md`) and ask whether the pop-up arrives. If Chrome also fails: add a diagnostic and/or persist push failures (migration, A1 escalation, Anthony's call).
4. Anthony reports device-check findings; fix list goes through Intake, Code Writer and independent review as usual.
5. Remove the `redesign/full-app` branch (local and origin; squash-merged in PR #425). Not deleted yet, needs Anthony's go-ahead.
6. Optional: the `docs/conventions.md` "Milestones" line and the README milestone table still mention v0.10.0 for wider testers; Anthony to decide the wording.
7. Optional cosmetic: leftover "R27 built" / "(F09)" tags in `docs/context/app-shell.md` and old "health score" wording in `docs/lessons.md`.

## Open issues

[#495](https://github.com/mp3anthony/funded/issues/495) launch video via `/brag`, built, awaiting review, out-of-spec, output outside the repo; [#383](https://github.com/mp3anthony/funded/issues/383) change login email (after the overhaul); [#145](https://github.com/mp3anthony/funded/issues/145) `needs-info`, **Android only** (Hannah's Samsung S25FE): urgency/TTL shipped (#488), server side confirmed fine, pop-up still missing on Samsung Internet; Chrome install test pending; [#490](https://github.com/mp3anthony/funded/issues/490) reset-link fix shipped (v0.1.3), awaiting dashboard check and Hannah's live test. Repo interaction limit (collaborators only) runs until 2027-04-09 (#276); renew then.

## Process notes

- No spawned sessions: build here, or Anthony wraps and clears for a fresh one.
- A docs-only PR (such as a `HANDOFF.md` wrap-up) is reviewed by a sub-agent and merged straight away.
- The orchestrator never writes code; every diff, however small, goes to a Code Writer then an independent reviewer before commit or push.
- Security findings stay in the private notes file, never in GitHub, commits or this file.

## Where things live

- Vocabulary: `CONTEXT-MAP.md` and `docs/context/`. Decisions: `docs/adr/`.
- Conventions, lessons, environment and ops: `docs/conventions.md`, `docs/lessons.md`, `docs/environment.md`.
- Requirements and guardrails: `SPEC.md`; open tickets are on GitHub; look and layout: `DESIGN-REFERENCE.md` (and the design doc, design only).

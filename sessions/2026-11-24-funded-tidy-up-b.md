# Funded tidy-up, Session B (2026-11-24)

Part of home#16 (epic home#20). Branch `docs/tidy-up-b`.

## Done
- Split `docs/context/money.md` into 5 files (`owed`, `bill-status`, `income-and-pay`, `saving-and-planning`, `verdict`) and `app-shell.md` into 3 (`the-app`, `pages`, `keeping-informed`); `household` and `notifications` stay single files, each in its own lane folder.
- Rebuilt `CONTEXT-MAP.md` as a lane index.
- `docs/environment.md`: Mailjet specifics removed, secret names only.
- README em dashes removed; `docs/agents` dashes fixed and stale `CLAUDE.md` pointers repointed to `docs/workflow.md`.
- Doctor run by two separate reviewers; their findings fixed.
- `HANDOFF.md` rewritten to 30 lines or fewer, carry-over only.

## Decisions
- Lane folders under `docs/context/<lane>/`, one glossary per topic, all under the 200-line cap.
- Docs-only PR: no version bump or patch note.
- `SPEC.md` dashes left alone (locked file).

## Carry-over
- `SPEC.md` Slices 1-22 untrimmed and about 91 em dashes (both optional).
- File issue for `console.log` lines logging user ids in `AppContext.tsx`.
- Small code ticket: stale comments in `src` (`verdict.ts` path to `docs/context/money.md`; "AGENTS.md invariant #2" in `globals.css` and `Dialog.tsx`).
- Anthony records the slices on home#16 and home#20.

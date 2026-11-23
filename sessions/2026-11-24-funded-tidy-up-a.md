# Funded tidy-up, Session A (2026-11-24)

Part of home#16 (epic home#20).

## Done
- Merged PR #530: purpose paragraph added, `CLAUDE.md` slimmed to 35 lines, new `docs/workflow.md` holds the workflow detail, stale history trimmed from docs.
- `HANDOFF.md` rewritten to 30 lines or fewer, carry-over only.

## Decisions
- Docs-only tidy PRs need no version bump or patch note.
- Public repo: no private paths, account names or secret locations in docs.
- Lane-index structure for `CONTEXT-MAP.md` (`docs/context/<lane>/` folders) deferred to Session B.

## Left (Session B, steps 4 to 8)
- Rebuild `CONTEXT-MAP.md` as lane index; watch `money.md` (169 lines) and `app-shell.md` (114), near the 200 cap; check line length.
- `docs/environment.md`: secret names only.
- Context check of every pointer; doctor run by separate subagents; wrap-up.
- Optional: trim `SPEC.md` Slices 1-22.
- File issue for `console.log` lines logging user ids in `AppContext.tsx`; fix README em dashes.
- Slice split recording for home#16 is Anthony's.

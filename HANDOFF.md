# Handoff

**Last updated:** 2026-07-25
**Branch:** `main` (committed directly — housekeeping, no app code changed)
**App version:** unchanged (v0.9.1 per README) — no bump, no feature touched

## What happened this session

Reworked the project's operating protocol (was getting bloated and referencing
things that didn't belong to this app):

- Replaced the old `CLAUDE.md` + `.agents/AGENTS.md` combo with a single, leaner
  `CLAUDE.md` ("Lean v4"). Stripped content that had leaked in from an unrelated
  project (supermarket verification, crowd/consensus data, offline sync queues).
- Fixed a label that meant two different things (`ready-for-human` was doing
  double duty for "needs you directly" and "backend done, approve merge").
  Now split into `needs-mobile-test` (iPhone/WebKit verification) and
  `needs-merge-approval` (backend/platform-agnostic sign-off).
- Deleted `docs/decisions/` (21 historical decision records) and `docs/agents/`
  + `docs/GLOSSARY.md` entirely. Deliberate choice: less context to carry going
  forward outweighed keeping the paper trail.
- Updated `README.md`'s Contributing and Versioning sections to match — points
  at `CLAUDE.md` instead of the deleted files, uses the new label names.
- Committed straight to `main` (`db1b2f4`) since this was process cleanup with
  no linked GitHub issue and no app-facing change.

## What's next (separate sessions)

The project is roughly half-built. Anthony wants to line up everything left to
build via two spec passes, done in later sessions — not this one:

1. **Spec session** — use the `/to-spec` skill to think through and write up
   what remains for the project. Output: a spec document.
2. **Ticket session** — once the spec exists, Anthony uses `/to-tickets` to
   turn it into GitHub milestones/issues to track the remaining work.
3. **Implementation session(s)** — a later session picks up the filed tickets
   and uses the spec as the implementation guide.

None of this has started. When a future session picks this up, it should read
this file, confirm with Anthony whether the spec exists yet, and proceed from
whichever of the three steps above is next.

## Reference

- Protocol lives in [`CLAUDE.md`](CLAUDE.md) — read that first for how work
  should be routed.
- No `docs/` folder anymore. Domain glossary and decision history were
  retired this session; don't expect to find them.

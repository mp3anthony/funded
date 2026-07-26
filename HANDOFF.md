# Handoff

**Last updated:** 2026-07-26
**Branch:** `main` (PR #72 merged, feature branch `issue-70-category-order-persistence` deleted)
**App version:** `v0.9.3` (bumped from v0.9.2 at this merge)

## What happened this session

Built and merged **Slice 2 / Issue #70** (Bills/Goals category order defaults
+ account-synced persistence + `Short-Term` → `Wish List` rename), out of the
suggested Part C order (which had it last) — Anthony picked it up directly.

- New `user_preferences` table (per-user RLS) replaces `localStorage` for
  saved Bills/Goals category order. Migration
  `supabase/migrations/20260725120000_add_user_preferences_and_wishlist_rename.sql`
  applied directly to the `funded-app` Supabase project.
- New default orders shipped for both Bills and Goals category lists.
- One-time migration: existing `localStorage` order (if any) is pushed to the
  DB on first load, then the DB is authoritative — logic lives in the new
  `src/lib/categoryOrderPreferences.ts` shared helper.
- `Short-Term` renamed to `Wish List` everywhere in the UI, plus a data
  migration for existing goals.
- **Bug found during Anthony's manual testing** (screenshot evidence on the
  issue): the new default order only reached the Bills/Goals list-page
  grouping, not the separate hardcoded `<option>` lists inside the Add/Edit
  Bill and Add/Edit Goal sheets (`AddBillSheet.tsx`, `AddGoalSheet.tsx`,
  `EditGoalSheet.tsx`). Fixed same session (commit `92bedcb`), independently
  reviewed, verified by Anthony on the updated preview.
- `user_preferences` RLS verified directly against the live policy (not a
  manual test) — `FOR ALL USING/WITH CHECK (user_id = auth.uid())`, posted as
  evidence in an issue comment.
- Issue #70 closed by Anthony after confirming the fix on preview.
- Version bumped `v0.9.2` → `v0.9.3`.
- **Versioning-discipline guardrail corrected** (`SPEC.md` Part A,
  `CLAUDE.md` §4): it previously claimed `package.json`'s `version` field
  moves with the in-app display version — that was never actually true in
  practice (`package.json` sat at `0.1.0` throughout). `package.json` is
  unused npm-tooling metadata here; the hardcoded string in
  `settings-client.tsx` is the real source of truth. Doc now reflects that.
- **README versioning section** no longer restates the literal current
  version number (was going stale every merge) — keeps only the bump scheme.
- **`CLAUDE.md` protocol changes** (two rounds this session, both committed
  to `main` via the merge, not as separate standalone commits like prior
  protocol changes — Anthony was fine leaving them bundled in PR #72):
  - Orchestrator now **never writes or edits code itself** — all
    implementation goes to a sub-agent.
  - Orchestrator does **not** default to reviewing sub-agent diffs itself —
    it asks Anthony each time whether he wants the Orchestrator or a separate
    sub-agent to review before the diff proceeds. (Used this session: a
    separate sub-agent reviewed both the main #70 build and the dropdown-order
    bugfix.)
  - Supabase migrations, once a schema change has already cleared the Step 3
    escalation gate, are routine autonomous execution — no second
    stop-and-confirm just to apply them. (Applied directly this session.)
  - Added a Step 1 carve-out: clear bug fixes don't need a CRD, build
    directly — unless they turn out to touch a Part A locked invariant or be
    ambiguous, in which case escalate per Step 3.

## Environment notes

- **Global CLI tools installed on Anthony's machine** (`pipx`, `markitdown[all]`,
  `ffmpeg` via winget) and documented in a new `CLAUDE.md` §"Global CLI tools
  available" section — committed on branch `docs/global-cli-tools`, not yet
  merged to `main`. Anthony wants it folded into the next patch rather than
  merged standalone.

## What's next (separate sessions)

1. **Slice 1 (Issue #71) — PWA stale-cache bug.** Still open, still has two
   undecided implementation-shape questions (see `SPEC.md` Slice 1): exact
   cache-busting mechanism, and the offline-support tradeoff. Recommend
   resolving those with Anthony at kickoff. Originally suggested first in
   Part C's order — still the live-bug, highest-user-facing-risk item of what
   remains.
2. **Slice 3 (Issue #37) — household timezone settings UI.** Still open, one
   quick open question (who can change it — any member or admin-only). Small,
   well-scoped, independent of Slice 1.
3. **Confirm SPEC.md Part A guardrails** — still flagged from the previous
   session as "probably not exhaustive," Anthony hasn't done a pass yet.
4. **CRD interview for new feature ideas** — Anthony mentioned having a few
   in mind, not yet captured. Run the `crd` skill live once he's ready.

Both remaining slices (#71, #37) are independent of each other — order
between them is Anthony's call, not a dependency.

## Reference

- Protocol lives in [`CLAUDE.md`](CLAUDE.md) — read that first for how work
  should be routed. Updated this session (see above) — worth a fresh skim
  since the Orchestrator's code-writing and review-assignment behavior
  changed.
- Working spec lives in [`SPEC.md`](SPEC.md) — guardrails (Part A) + the
  remaining 2 open-issue slices in Part B (#71, #37; #70's slice entry is
  now historical/closed) + suggested order (Part C, partially stale since
  #70 went out of turn).
- Out-of-spec inbox lives in [`CHANGE-LOG.md`](CHANGE-LOG.md) — still empty.
- Issue #70: https://github.com/mp3anthony/funded/issues/70 (closed)
- PR #72: https://github.com/mp3anthony/funded/pull/72 (merged)

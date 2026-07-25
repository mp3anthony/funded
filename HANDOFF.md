# Handoff

**Last updated:** 2026-07-25
**Branch:** `main` (committed directly — protocol/process change, no app code touched)
**App version:** unchanged (v0.9.1 per README) — no bump, no feature touched

## What happened this session

Replaced the "Lean v4" liaison protocol with a new **CRD → SPEC → tickets →
build** protocol (commit `a9b2a20`):

- **`CLAUDE.md`** rewritten to the new protocol: session start now reads
  `HANDOFF.md` first (this file), scope checks run against `SPEC.md` with an
  `out-of-spec` escape valve into `CHANGE-LOG.md`, and mobile/manual testing
  labels were renamed `needs-mobile-test` → **`needs-manual-test`** /
  `needs-merge-approval` (kept).
- **`SPEC.md`** created — NOT a retroactive CRD for the whole app (that would've
  been busywork for an app that already exists). Instead:
  - **Part A** carries forward the technical guardrails from old CLAUDE.md §4
    (RLS mandatory on all tables, Next.js `viewport` API not manual meta tags,
    never nest `position: fixed` inside `overflow: hidden`, versioning
    discipline) plus stack facts pulled from the repo. Flagged as "probably
    not exhaustive — confirm" for Anthony to add to over time.
  - **Part B** folds the 3 currently-open GitHub issues into vertical slices:
    Slice 1 = #71 (PWA stale-cache bug), Slice 2 = #70 (category order +
    persistence + rename, labelled `needs-merge-approval` per Anthony's call —
    flagged for reassessment after the first pass), Slice 3 = #37 (household
    timezone settings UI). Each slice restates problem/acceptance
    criteria/open questions/testing label without inventing scope beyond the
    issue text.
  - **Part C** suggests a build order (#71 → #37 → #70) as a recommendation,
    not a decision.
- **`CHANGE-LOG.md`** created as the empty out-of-spec inbox the new protocol
  requires.
- Going forward: new feature ideas (Anthony has "a few" in mind, not yet
  captured) go through a proper CRD discovery interview and get layered on
  top of this SPEC — not folded in retroactively like the existing 3 issues
  were.

## What's next (separate sessions)

1. **Confirm SPEC.md Part A guardrails** — Anthony should skim once and flag
   anything missing; it was assembled by reading old CLAUDE.md + skimming the
   repo, not exhaustively audited.
2. **Reassess the #70 label** — currently `needs-merge-approval`
   (pipeline-verifiable, light spot-check) rather than `needs-manual-test`.
   Anthony wants to see how that plays out before treating it as precedent.
3. **Resolve #70's two blocking `needs-info` questions** before scoping that
   slice further: where `Debt & Finance` sits in the new Goals default order,
   and whether the `Short-Term` → `Wish List` rename is in-scope for #70 or a
   separate ticket.
4. **CRD interview for new feature ideas** — Anthony mentioned having a few
   in mind but hasn't listed them yet. Run the `crd` skill live (one question
   at a time) once he's ready, output lands in a `CRD-[Feature].md`, then
   layer onto `SPEC.md` — do not re-open the CRD question for the 3 issues
   already folded into Part B, that's settled.
5. Once ready to start build work: pick a slice (suggested order in SPEC.md
   Part C), file/confirm the GitHub issue per protocol §2.2, and proceed.

Nothing above has started. A future session should read this file first, per
protocol §2.0, and only pull the full `SPEC.md` if a ticket is ambiguous.

## Reference

- Protocol lives in [`CLAUDE.md`](CLAUDE.md) — read that first for how work
  should be routed.
- Working spec lives in [`SPEC.md`](SPEC.md) — guardrails (Part A) + the 3
  open-issue slices (Part B) + suggested order (Part C).
- Out-of-spec inbox lives in [`CHANGE-LOG.md`](CHANGE-LOG.md) — currently
  empty.

# CLAUDE.md: Funded

Funded is a household bills and goals budgeting mobile app, installed on a phone (React/Next.js on Vercel, Supabase backend). This repo is the app rebuild only. It is not a desktop web product and not a bank or payments service. Stack and hard invariants: `SPEC.md` Part A. Full workflow detail: `docs/workflow.md`.

@HANDOFF.md

## Start here

- Every session: read `HANDOFF.md` (auto-loaded), then `CONTEXT-MAP.md`; open only the glossary in `docs/context/` for the topic. Then check nothing is stale: `gh pr list` for an unmerged docs PR with a newer `HANDOFF.md`, and local `main` pushed and level with `origin/main`. Read full `SPEC.md` only if genuinely ambiguous.
- Soft rule: if a request touches an idea, term or behaviour the glossaries don't document, or disagrees with them, run `grilling` + `domain-modeling` with Anthony, then update `docs/context/` (`docs/adr/` only for hard-to-reverse, surprising trade-offs).
- Knowledge lives in: vocabulary `docs/context/` · build/process conventions, versioning, patch notes `docs/conventions.md` · lessons `docs/lessons.md` · hosting, Supabase, env vars, testing, tooling `docs/environment.md` · decisions `docs/adr/` · UI rules `DESIGN-REFERENCE.md` · requirements and slices `SPEC.md` · out-of-spec inbox `CHANGE-LOG.md` · tracker and labels `docs/agents/` · setup `README.md` · workflow detail `docs/workflow.md`.

## Rules

- **Orchestrator (main session) is the only one Anthony talks to and the only one that touches Git/GitHub.** It plans and delegates; subagents do one job, report back and stop.
- **HARD RULE, NO EXCEPTIONS:** the orchestrator never writes or edits code or tests (not a one-liner), and never reviews code. All code goes to a Code Writer sub-agent. Every diff, including each fix after a review, gets a different fresh sub-agent review before commit or push. No agent reviews its own code. The orchestrator relays findings, never judges work as reviewed.
- **Funded is a mobile app.** Live-check notes target iPhone (iOS Safari) only; code must still work on Android. Never lead with, test or ask about desktop.
- **Plain language:** explain actions, plans and choices in simple English before running code. Sacrifice grammar for concision.
- **Challenge Me:** push back on requests that are technically flawed, overly complex or misaligned with goals.
- **Versioning:** every build bumps the version with a patch-notes entry in the same PR (`docs/conventions.md`). Docs-only or tooling-only PRs: no bump.
- **Migrations:** once a schema change has cleared the escalation trigger, applying it is routine (`docs/environment.md`).
- **Models:** Planner subagents use the `planner` agent (Opus). All other subagents use the session's own model and effort. Anthony is cost-conscious.

## Workflow (detail in `docs/workflow.md`)

1. **Scope check:** in spec, proceed. Out of spec: one line in `CHANGE-LOG.md` (status `pending`), label `out-of-spec`, tell Anthony, stop. Clear bug fixes skip triage. Feature specs (`to-spec`) publish to a GitHub issue, then durable parts fold into `SPEC.md`.
2. **Intake:** every new issue or idea goes first to a read-only Intake sub-agent (context lookup, duplicates). Orchestrator agrees the problem with Anthony, then files or reopens the issue with a plain "What's changing" section. This is the approval gate before planning.
3. **Autonomous execution:** Investigator, Planner, Code Writer, Docs without interrupting Anthony, except on an escalation trigger. Standing pause: after a Planner plan is written and independently reviewed, stop before the Code Writer, notify Anthony (PushNotification), build in a fresh session; post the plan as an issue comment and name it in `HANDOFF.md`.
4. **Escalation:** stop, label `needs-info`, get Anthony's decision if the change touches a hard invariant or locked decision in `SPEC.md` Part A1 (schema or migration, security policy, locked guardrails), or a "bug fix" proves ambiguous or touches Part A.
5. **PR and merge:** branch plus PR, independent sub-agent review, tsc/tests/build pass. Orchestrator merges a clean PR itself (independent review approved, no A1 touch, version and patch note present, prod set-up done), then tells Anthony what changed plus 1-3 iPhone checks. Ask Anthony first when the review is not clean, A1 is touched or a prod data change is risky. Draft PRs wait for Anthony. Anthony tests live after merge, not on previews; a failed check reopens the issue.
6. **Wrap-up:** commit cleanly, update the PR, rewrite `HANDOFF.md` (current state only, name the active `SPEC.md` ticket). A `HANDOFF.md`-only change goes on its own `docs/handoff-*` PR, merged straight away.
- **Labels:** `needs-triage`, `needs-info` (always with a direct message), `ready-for-agent`, `ready-for-human`, `needs-merge-approval`, `needs-manual-test` (only on request), `out-of-spec`.
- **Branching:** never commit to `main`; work on branches. Docs-only PRs get a sub-agent review (never the author), then the orchestrator merges.
- **Budget:** aim for about 150k-180k context tokens per ticket; soft, favour finishing near-done work.
- **Tracker:** GitHub `mp3anthony/funded` via `gh`; domain docs multi-context (`docs/agents/`).

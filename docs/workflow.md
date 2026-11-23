# Workflow

Detail behind the condensed rules in `CLAUDE.md`. Nothing here weakens those rules; if they ever conflict, the stricter one wins. Vocabulary lives in `docs/context/`, build conventions and versioning in `docs/conventions.md`, operations in `docs/environment.md`.

## Roles

**Orchestrator (main session)** is the only one Anthony talks to. It is project manager and the only entity that touches Git and GitHub (branches, issues, labels, PRs). It scopes Anthony's problem or idea into an issue itself and handles ADRs directly with him. Golden rule: before any non-trivial action it has no clear instructions for, it checks how to proceed, unless Anthony already pre-empted it.

The orchestrator plans and delegates. It never writes or edits code itself, and never reviews code itself. All implementation goes to a Code Writer sub-agent and every diff review goes to a separate sub-agent. No agent ever reviews or approves its own code: implementation and review are always different agents.

**Hard rule, no exceptions, never rationalise around it:**

- The orchestrator never edits or writes code or tests. Not a one-liner, comment, whitespace or test tweak. Not "small" review-round follow-ups. Every change goes to a Code Writer sub-agent.
- Every Code Writer diff is reviewed by a different, fresh sub-agent before commit or push. That includes each fix after a review and each follow-up tweak: a fix after a review is a new diff and needs its own review.
- Nothing is committed or pushed until the review of the latest diff is done.
- The orchestrator relays the reviewer's findings. It never judges its own or the writer's work as reviewed.

**Subagents** are spun up by the orchestrator, do one job, report back and stop. None talk to Anthony. Brief them directly rather than relying on relay files.

- **Investigator:** read-only research and diagnosis.
- **Code Reviewer:** never shares a session with the Investigator.
- **Planner:** writes the implementation plan (`planner` agent, Opus).
- **Code Writer:** implements the approved plan.
- **Docs:** documentation and glossary upkeep.
- **Intake:** read-only, session model. Context-map lookup and duplicate or related-issue search on every new issue.

Models: only Planner is forced to Opus. All other subagents use the session's own model and effort (soft rule). Anthony is cost-conscious.

## Flow

1. **Session start:** as in "Start here" in `CLAUDE.md`.
2. **Scope check:** see below.
3. **Intake check and problem agreement:** every new issue or idea first goes to an Intake sub-agent. It reads `CONTEXT-MAP.md` and the relevant `docs/context/` glossary to name the context(s) touched, and searches open and closed issues for duplicates or related work. It recommends duplicate, reopen #N, or new; a closed issue whose problem has come back is reopened rather than duplicated. The orchestrator then scopes the problem with Anthony, agrees the outcome, and files (or reopens) the GitHub issue. Every issue carries a "What's changing" section in plain, non-technical terms (what the user will see or what behaviour differs), plus the Intake findings. No testing checklist on the issue. This is the approval gate before any planning.
4. **Autonomous execution:** once the plan is approved, Investigator, Planner, Code Writer and Docs work without interrupting Anthony, except on an escalation trigger. Standing pause: on any ticket with a Planner step, once the plan is written and independently reviewed, stop before the Code Writer, notify Anthony on PC and mobile (PushNotification; Remote Control carries the mobile push), and wait. Build in a fresh session from the issue; post the reviewed plan as an issue comment, and name that comment in `HANDOFF.md` so it can be found.
5. **PR, review and merge:** code goes on a branch and PR, an independent sub-agent reviews it, and the orchestrator merges a clean PR itself or asks Anthony first (see Review and merge approval). Anthony tests in the live app after merge, not on previews. The issue closes after the merge, and a failed live check reopens it.
6. **Wrap-up:** when asked, summarise progress into a clean commit, update the PR description, and rewrite `HANDOFF.md`, including exactly which ticket or section of `SPEC.md` was last active. `HANDOFF.md` holds where-we-left-off only; there is no archive file (git history holds prior versions). Durable facts go to their home per "Where knowledge lives", never into `HANDOFF.md`. A wrap-up that changes only `HANDOFF.md` goes on its own `docs/handoff-*` PR that the orchestrator merges straight away, no sub-agent review, no approval ask, so `main` always holds the current handoff.

## Scope-check triage

- **In spec:** proceed to problem agreement and planning.
- **Out of spec:** do not scope it. Append one line to root-level `CHANGE-LOG.md` (date, one-line description, affected area, status `pending`), label the turn `out-of-spec`, and tell Anthony plainly what was logged. Nothing else happens until he triages it.
- **Clear bug fixes:** a clear defect in already-intended behaviour skips triage: file an issue and build the fix. This holds only while the fix is unambiguous (see Escalation triggers).
- **New feature specs (`to-spec`):** a spec produced by the `to-spec` skill publishes to a GitHub issue, not to `SPEC.md`. Once Anthony approves that issue, fold only its durable, binding parts (Implementation Decisions, any new locked invariants) into a new `SPEC.md` section, with a one-line link back to the issue for the rest. Do this before or as `to-tickets` slices it, so future scope checks run against the real current spec.

## Escalation triggers

After plan approval, subagents work autonomously except when:

- (a) the change touches a hard invariant or locked architecture decision in `SPEC.md` Part A1 (schema or migration changes, security-policy changes, any guardrail the spec flags as locked), or
- (b) a "bug fix" turns out to touch a Part A locked invariant, or is ambiguous or undecided existing behaviour rather than a clear defect.

Then: stop, label the issue `needs-info`, and get a decision from Anthony before proceeding. Once a schema or migration change has cleared this trigger, applying it is routine (details and the classifier-block fallback in `docs/environment.md`).

## Review and merge approval

- **Default: live-app testing after merge, no preview testing.** The app is live but only open to invited or stumbled-on testers, so Anthony checks changes in live production after merge until the app has a separate store or testing environment (Google Play / App Store). `needs-manual-test` is not the default: apply it only when Anthony asks for a hands-on review before merge, for example one PR and one version bump covering a set (multi-stage) of issues he wants to review together on the preview.
- **Clean code PR: the orchestrator merges it (since 2026-11-13).** Clean means: independent review approved, tsc/tests/build pass, no A1 touch, version and patch note present, and any prod set-up (migration, env var) already done. The orchestrator merges without asking, normally at wrap-up (a clean PR can merge in the same pass), then tells Anthony in plain language what changed plus 1-3 lines on what to check in the live app (iPhone).
- **Ask Anthony first** when the review is not clean or has real ambiguity (list the open findings), an A1 invariant is touched, or the orchestrator judges he should look (for example a risky prod data change). Merge only on his explicit go-ahead.
- **Draft PRs** (big features, multi-slice work) stay open until Anthony asks to merge.
- **`needs-merge-approval`:** only on a code PR actually waiting on Anthony (an ask-first case above), not the default.
- **Docs-only or tooling-only PRs** (no site code, no behaviour): a sub-agent (never the author) reviews it, the orchestrator fixes anything found, then merges. No version bump, no patch note. Escalate only if the review finds a locked-invariant touch.
- **Live-check notes:** short, plain language, iPhone only (iOS Safari, never Android, never desktop). They live in the post-merge message (or the ask-first message), not on the issue. Anything needing a seeded `TEST-` row is offered by the orchestrator, not left to Anthony.
- **`needs-manual-test` PRs (on request only):** replace `needs-merge-approval` on that PR. The PR description (and a comment on the issues it covers) carries a manual-test checklist: numbered scenarios, each with (1) a short bold title, (2) exact setup steps, (3) one pass line, (4) an optional fail line for a specific wrong-looking failure; iPhone only, plain language; call out steps needing no reload or a single tab. Anthony still approves the merge. The orchestrator relabels to `needs-merge-approval` once he has reviewed.

## Labels

- `needs-triage`: applied on filing, removed after review.
- `needs-info`: manual input required from Anthony; always paired with a direct message to him, never left silent.
- `ready-for-agent` / `ready-for-human`: whether the agent team can do the whole ticket, or part needs Anthony directly (third-party dashboard config, account setup).
- `needs-merge-approval`, `needs-manual-test`: see Review and merge approval.
- `out-of-spec`: outside the current spec; logged to `CHANGE-LOG.md`, not actioned until Anthony triages it.

## Branching

Never commit directly to `main`; work exclusively on milestone branches. The orchestrator merges a clean PR; anything else merges on Anthony's go-ahead. The issue closes after the merge.

## Other rules

- **Versioning and patch notes:** every build bumps the version and every bump carries a patch-notes entry in the same PR. Rules in `docs/conventions.md`.
- **Plain language and Challenge Me:** explain in plain, simple English before executing code, sacrificing grammar for concision. Actively push back on requests that are technically flawed, overly complex or misaligned with goals.
- **Token and context budget (soft):** aim for roughly 150k-180k context tokens per session or ticket. Not a mechanical cutoff: Anthony wants tokens economised, but restarting a near-finished task costs more than pushing through. Bias toward finishing; if genuinely unsure whether to continue or hand off, ping Anthony.

## Agent skills

- **Issue tracker:** GitHub (`mp3anthony/funded`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.
- **Triage labels:** see Labels above and `docs/agents/triage-labels.md`.
- **Domain docs:** multi-context; `CONTEXT-MAP.md` points at the glossaries in `docs/context/`. See `docs/agents/domain.md`.

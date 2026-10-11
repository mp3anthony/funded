# CLAUDE.md — Funded

@HANDOFF.md

`HANDOFF.md` loads automatically every session (where we left off). This file holds only the workflow, the must-dos and the absolute do-nots; knowledge lives where the pointers below say. Applies to the app rebuild (React/Next.js on Vercel, Supabase backend).

## Start here

Every session: read `HANDOFF.md`, then `CONTEXT-MAP.md`; open only the glossary in `docs/context/` for the topic at hand. Then check that nothing is stale: run `gh pr list` for an unmerged docs PR carrying a newer `HANDOFF.md`, and confirm local `main` is pushed and level with `origin/main`. Only fall back to the full `SPEC.md` if something is genuinely ambiguous.

**Soft rule:** when a request touches an idea, term or behaviour the glossaries don't document, or seems to disagree with them, the orchestrator runs the `grilling` and `domain-modeling` skills together (that is all `/grill-with-docs` does) to align with Anthony, then updates `docs/context/` (and `docs/adr/` only for hard-to-reverse, surprising, trade-off decisions).

**Where knowledge lives:** vocabulary `docs/context/` · build and process conventions, versioning and patch notes `docs/conventions.md` · lessons and known items `docs/lessons.md` · hosting, Supabase, env var names, testing policy, devices and tooling `docs/environment.md` · architectural decisions `docs/adr/` · requirements, technical guardrails and slices `SPEC.md` · out-of-spec inbox `CHANGE-LOG.md`.

## Rules

- **Orchestrator owns all Git/GitHub interaction.**
- **Stack and hard invariants** live in `SPEC.md` Part A (A1 escalation gates, A2 standing rules).
- **Funded is a mobile app**, installed on a phone. Any live-check notes target iPhone (iOS Safari) only, never Android; code must still work on both. Never lead with, test or ask about desktop behaviour.
- **Plain language:** explain actions, plans and technical choices in plain, simple English before code execution. Always sacrifice grammar for concision.
- **Challenge Me:** actively push back, explain risks, and challenge requests that are technically flawed, overly complex or misaligned with goals.
- **Antigravity (agy) delegation:** the Orchestrator delegates review, design and large read-and-think work to agy per `GEMINI-DELEGATION.md` (never planning: that stays with Claude sub-agents), deciding when itself without asking Anthony, and falls back to Claude sub-agents on exit code 3. On exit 4 (file refused) it fixes the file list or uses Claude sub-agents, never loosens the filter. agy counts as a reviewer and never writes to the repo.
- **Versioning and patch notes:** every build bumps the version and every bump carries a patch-notes entry in the same PR. Rules in `docs/conventions.md`.
- **Supabase migrations:** once a schema or migration change has cleared the escalation trigger, applying it is routine. Details and the classifier-block fallback in `docs/environment.md`.
- **Models:** Planner subagents use the `planner` agent (`.claude/agents/planner.md`, Opus, the most capable model, because planning benefits most). All other subagents (Investigator, Code Writer, Code Reviewer, Docs) use the session's own model and effort (soft rule, not forced). Anthony is cost-conscious.

## Workflow Protocol

### Roles

**Orchestrator (main session), the only one Anthony talks to.** Project manager and the only entity that touches Git and GitHub (branches, issues, labels, PRs). Absorbs intake: scopes Anthony's problem or idea into an issue itself. Handles ADRs directly with him. **Golden rule:** before any non-trivial action it has no clear instructions for, it checks how to proceed unless Anthony already pre-empted it.

The orchestrator plans and delegates. It never writes or edits code itself, and it never reviews code itself: all implementation goes to a Code Writer sub-agent and every diff review goes to a separate sub-agent or agy. **No agent ever reviews or approves its own code**: implementation and review are always different agents, no exceptions.

**Subagents** are spun up by the orchestrator, do one job, report back, stop; none talk to Anthony. **Investigator** (read-only research/diagnosis), **Code Reviewer** (never shares a session with the Investigator), **Planner** (writes the implementation plan), **Code Writer** (implements the approved plan), **Docs** (documentation, glossary upkeep), **Intake** (read-only: context-map lookup and duplicate/related-issue search on every new issue; session model). Brief subagents directly rather than relying on relay files.

### Flow

1. **Session start:** as in "Start here" above.
2. **Scope check** (below).
3. **Intake check and problem agreement:** every new issue or idea first goes to an **Intake** sub-agent (read-only): it reads `CONTEXT-MAP.md` and the relevant `docs/context/` glossary to name the context(s) the issue touches, and searches open and closed issues for duplicates or related work. It reports back with a recommendation (duplicate, reopen #N, or new); a closed issue whose problem has come back is reopened rather than duplicated. The orchestrator then scopes the problem with Anthony, agrees the outcome, and files (or reopens) the GitHub issue. **Every issue carries a "What's changing" section in plain, non-technical terms** (what the user will see or what behaviour differs), plus the Intake findings. No testing checklist on the issue. This is the approval gate before any planning.
4. **Autonomous execution:** once the plan is approved, Investigator, Planner, Code Writer, Docs, without interrupting Anthony, except on an escalation trigger. **Standing pause:** on any ticket with a Planner step, once the plan is written and independently reviewed, stop before the Code Writer, notify Anthony on PC and mobile (PushNotification; Remote Control carries the mobile push), and wait. Build in a fresh session from the issue; post the reviewed plan as an issue comment, and name that comment in `HANDOFF.md`, so it can be found.
5. **PR, review and advice:** code goes on a branch and PR, an independent sub-agent (or agy) reviews it, and the orchestrator gives Anthony a merge **advice** (see Review and merge approval). Anthony tests in the live app after merge, not on previews; the issue closes after the merge, and a failed live check reopens it.
6. **Wrap-up:** when asked, summarize progress into a clean commit, update the PR description, and rewrite `HANDOFF.md` (including exactly which ticket/section of `SPEC.md` was last active). `HANDOFF.md` holds where-we-left-off only; there is no archive file (git history holds prior versions). Durable facts go to their home in the pointers above, never into `HANDOFF.md`. A wrap-up that changes only `HANDOFF.md` goes on its own `docs/handoff-*` PR that the orchestrator merges straight away, no sub-agent review, no approval ask, so `main` always holds the current handoff.

### Scope-check triage

- **In spec:** proceed to problem agreement and planning.
- **Out of spec:** don't scope it. Append one line to root-level `CHANGE-LOG.md` (date, one-line description, affected area, status `pending`), label the turn `out-of-spec`, tell Anthony plainly what was logged. Nothing else happens until he triages it.
- **Clear bug fixes:** a clear defect in already-intended behaviour skips triage: file an issue and build the fix. This holds only while the fix is unambiguous (see Escalation triggers).
- **New feature specs (`to-spec`):** a spec produced by the `to-spec` skill publishes to a GitHub issue, not to `SPEC.md`. Once Anthony approves that issue, fold only its durable, binding parts (Implementation Decisions, any new locked invariants) into a new `SPEC.md` section, with a one-line link back to the issue for the rest. Do this before or as `to-tickets` slices it, so future scope checks run against the real current spec.

### Escalation triggers

After plan approval, subagents work autonomously **except** when (a) the change touches a hard invariant or locked architecture decision in `SPEC.md` Part A1 (schema or migration changes, security-policy changes, any guardrail the spec flags as locked), or (b) a "bug fix" turns out to touch a Part A locked invariant or is ambiguous or undecided existing behaviour rather than a clear defect. Then: stop, label the issue `needs-info`, and get a decision from Anthony before proceeding.

### Review and merge approval

- **No preview testing.** The app is live but only open to invited or stumbled-on testers, so Anthony checks changes in production after merge rather than on previews. `needs-manual-test` is retired (no longer applied).
- **`needs-merge-approval`:** the default label for every code PR once review is done. Anthony still approves every merge; the orchestrator never merges code PRs on its own.
- **Merge advice (orchestrator, on every code PR):** after the independent review, tell Anthony in one short message whether the PR is **clean** (review approved, tsc/tests/build pass, no A1 touch, version and patch note present) or **not clean** (list the open findings). If clean, say so plainly and add 1-3 lines on what to glance at in the live app. Then wait for his explicit go-ahead; only then does the orchestrator run the merge. Anything needing prod set-up first (migration, env var) is done before the merge, as today.
- **HANDOFF-only PRs** (`docs/handoff-*`): merge straight away, no review.
- **Any other docs-only or tooling-only PR** (no site code, no behaviour): a sub-agent (never the author) reviews it, the orchestrator fixes anything found, then merges. No version bump, no patch note. Escalate only if the review finds a locked-invariant touch.
- **Live-check notes:** short, plain language, iPhone only; they live in the merge advice, not on the issue. Anything needing a seeded `TEST-` row is offered by the orchestrator, not left to Anthony.

### Labels

- `needs-triage`: applied on filing, removed after review.
- `needs-info`: manual input required from Anthony; always paired with a direct message to him, never left silent.
- `ready-for-agent` / `ready-for-human`: whether the agent team can do the whole ticket, or part needs Anthony directly (third-party dashboard config, account setup).
- `needs-merge-approval`: as in Review and merge approval. (`needs-manual-test` is retired.)
- `out-of-spec`: outside the current spec; logged to `CHANGE-LOG.md`, not actioned until Anthony triages it.

### Branching

Never commit directly to `main`; work exclusively on milestone branches. Anthony's explicit go-ahead triggers the merge; the issue closes after it.

### Token / context budget (soft guideline)

Aim for roughly 150k-180k context tokens per session/ticket. Not a mechanical cutoff: Anthony wants tokens economized, but restarting a near-finished task costs more than pushing through. Bias toward finishing a nearly complete task. If genuinely unsure whether to continue or hand off, ping Anthony and let him decide.

## Agent skills

- **Issue tracker:** GitHub (`mp3anthony/funded`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.
- **Triage labels:** default 5-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), all already on GitHub verbatim, plus 2 project-specific labels (`needs-merge-approval`, `out-of-spec`; `needs-manual-test` is retired). See `docs/agents/triage-labels.md`.
- **Domain docs:** multi-context, `CONTEXT-MAP.md` points at the glossaries in `docs/context/`. See `docs/agents/domain.md`.

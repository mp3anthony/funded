# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues (`mp3anthony/funded`). Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Project-specific labels beyond the canonical five

This repo's own liaison protocol (`CLAUDE.md`) uses three additional labels the generic skill vocabulary doesn't have roles for — apply them per `CLAUDE.md`'s own rules, not via the `triage` skill:

- `needs-manual-test` — on request only (since 2026-10-11 the default is live-app checks after merge): Anthony wants a hands-on preview review before merge, e.g. one PR and one version bump covering a set of issues
- `needs-merge-approval`: only on a code PR actually waiting on Anthony (review not clean or ambiguous, A1 touch, or the orchestrator wants him to look); since 2026-11-13 a clean PR is merged by the orchestrator without it
- `out-of-spec` — falls outside current `SPEC.md`; logged to `CHANGE-LOG.md`, not scoped until triaged


## Issue body rule

Every issue, however it is filed (orchestrator, QA skill, `from-app`), has a **"What's changing"** section in plain, non-technical terms: what the user will see or what behaviour differs. Intake findings (related context, related or duplicate issues) go in the body too. No testing checklist on the issue.

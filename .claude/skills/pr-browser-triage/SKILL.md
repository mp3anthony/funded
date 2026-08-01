---
name: pr-browser-triage
description: Triage an open GitHub PR's manual-testing checklist to work out which items can be genuinely validated via the local Claude Browser tool (Chromium, against the localhost dev server) versus which need a real device. Use this whenever the user asks to "browser-test" a PR, wants to know what's testable via the browser/localhost before a real-device pass, references a specific PR number alongside testing, or wants to streamline manual QA before spending time on their own phone. Also trigger when the user asks to run or check the testing checklist for the current branch's PR. Do not use this for actually deciding whether to merge (that's a separate, explicitly-confirmed step) or for touching GitHub state (ticking checklist items, commenting) — this skill only classifies and executes browser-safe checks, then reports back in chat.
---

# PR Browser Triage

This repo's PRs carry a manual-testing checklist (see `CLAUDE.md` §2 Step 4 for the format, and
`HANDOFF.md` for worked examples). Not every item on it can be meaningfully checked through a
Chromium browser hitting `localhost` — some need real iOS Safari, an installed PWA, a native
gesture, or a network condition the browser tool can't simulate. Running those anyway doesn't
save time — it produces a false "tested" result that then has to be caught later, which costs
more than just leaving it for the real device in the first place.

This skill's job is narrow: figure out which checklist items are *validly* browser-testable,
get that classification checked by a second, independent pair of eyes before anything runs,
execute only the safe subset, and report honestly on what was and wasn't covered.

## Step 1 — Locate the checklist

Find the PR in question (ask which PR if not obvious from context — usually the current branch's
open PR via `gh pr view --json number,url,headRefName`).

This repo has a specific convention, established because checklists get long and get revised
mid-review: **a pinned PR comment can supersede the checklist in the PR body.** Check for both:

```bash
gh pr view <number> --json body,comments
```

If a comment exists in the "canonical format" (numbered items, ✅ pass line, optional ❌ named
failure mode — see `CLAUDE.md` §2 Step 4) and its text says it supersedes the PR body's checklist
(look for language like "this comment is the one to work from" or "supersedes the ... section
above"), use that comment as the source of truth. Otherwise fall back to the PR body's checklist
section. Note which source you used when you report back — it matters if the two ever drift.

## Step 2 — Classify via a sub-agent, not yourself

This is the part that must not be skipped or shortcut: **spawn a sub-agent to do the
classification.** Don't classify the checklist yourself inline, even if it feels faster.

The reason is structural, not stylistic. The whole value of this skill is that the classification
gets a second, independent look before anything executes — the same reason `CLAUDE.md` requires
no agent to review its own code. If you generate the list and then also approve it, a
misjudgment (e.g. calling something browser-testable when it actually depends on WebKit-specific
behavior) sails through with nothing to catch it. Delegating classification to a sub-agent means
you, the orchestrating session, are reviewing someone else's judgment in Step 3 — a real check,
not a formality.

Give the sub-agent the checklist text and this classification rubric:

**Full** — genuinely executable via a Chromium browser tool against the local dev server, and a
pass/fail result would actually mean something (not a degraded stand-in for the real check).
Most account/data-flow checks qualify: signing up, signing in, signing out, filling forms,
navigating between screens, reading rendered text, checking that data persists after a reload.

**Partial** — touches something a desktop Chromium browser can't faithfully reproduce. This
includes (not exhaustively):
- WebKit/Safari-only rendering or behavior quirks
- Installed-PWA behavior — standalone display mode, force-quit/relaunch from the app switcher,
  home-screen install flow
- Offline or network-throttled conditions — the Claude Browser tool has no offline switch or
  network-throttle control, so anything requiring "go offline" or "simulate a flaky connection"
  belongs here
- Sub-second visual timing (a flash of the wrong state, a race condition visible only for a
  frame) — screenshot polling can't reliably catch this
- Native touch gestures (pull-to-refresh, swipe) or device chrome (safe-area insets, on-screen
  keyboard behavior)
- Push notification permission/delivery

These are **never attempted, not even approximated.** List them as "real device only."

**Not testable** — a hard tool limitation with genuinely no workaround, distinct from Partial in
that there's no meaningful degraded version to even consider. Rare in practice; most things that
aren't Full are Partial.

**On genuine uncertainty, default to Partial.** A wrongly-skipped item costs the user one more
manual check later — cheap. A wrongly-attempted item produces a false "tested" result that looks
authoritative and has to be un-trusted and re-checked from scratch — expensive, and it erodes
trust in the whole checklist. Fail safe, not fail open.

The sub-agent should return, for each checklist item: the item's short name, its verdict
(Full/Partial/Not testable), and a one-line rationale — enough for a human or the orchestrator to
sanity-check the call without re-deriving it.

## Step 3 — Present the table and stop

Render the sub-agent's classification as a table: item, verdict (✅ Full / ⚠️ Partial / ❌ Not
testable), one-line rationale. This is the actual deliverable of Steps 1-2 — show it plainly, the
same shape as a normal exploratory answer, not buried in tool-call output.

**Nothing executes until this is approved.** Normally that means waiting for the user. If the
user has explicitly delegated approval for this run (e.g. "have the orchestrator approve and just
run it"), the orchestrating session may stand in as the approver — but it must actually review the
sub-agent's table on its own merits first, the way it would review any other sub-agent's work,
not rubber-stamp it. If anything in the table looks off — a Full verdict that seems to need a real
device, a rationale that doesn't hold up — say so and either kick it back to the sub-agent or flag
it to the user rather than approving it through.

## Step 4 — Execute the approved "Full" items

Once approved, run only the items marked Full, against the running local dev server (see this
project's `run` skill or `.claude/launch.json` for how to start it if it isn't already up).

Run them **sequentially in a single browser session**, not fan-out across parallel sub-agents.
Multiple agents can't usefully share one browser tab, and this checklist typically involves
stateful account-switching (signing out of A, into B, mid-flow) — parallelizing would mean each
agent stepping on the others' session state.

## Step 5 — Track any test data created

Executing checklist items like "cold start, new user" or "join by code" creates real rows in
Supabase — new auth users, households, bills, paydays. This repo has already hit the consequence
of losing track of that (`HANDOFF.md`'s "Out-of-band: Supabase test-user cleanup" entry describes
cleaning up stray test users after they piled up). Keep a running list of what got created during
execution — email/identifier, what it's for — and include it in the final report. Don't clean it
up automatically without asking; just make sure it's visible so it doesn't quietly accumulate.

## Step 6 — Report back

For each executed item, report pass/fail with the actual evidence (what you saw — a specific
error banner, a specific piece of persisted data — not just a bare pass/fail label). Then list,
separately and clearly:

- **Left for real device** — every Partial item, so it's obvious what still needs the user's
  hardware.
- **Not testable via this tool** — every item in that bucket.
- **Test data created** — the list from Step 5.

This skill does not touch GitHub. It doesn't tick checklist boxes, edit the PR body, or post
comments — reporting results back to the user in chat is the end of this skill's job. Updating
the PR itself stays a separate, explicitly-confirmed step, same as any other GitHub-visible
action.

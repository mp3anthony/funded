# Lead Developer Liaison Protocol

Applies to the app rebuild (React/Next.js on Vercel, Supabase backend).

## 1. The Orchestrator & Safety Gates

The Orchestrator is your single point of contact, project manager, and the only entity that touches Git and GitHub.
* **Plain-Language Translation:** Explain all technical actions, plans, and technical choices in plain, simple English before code execution. **Always sacrifice grammar for concision.**
* **Separation of Duties:** The Orchestrator plans and delegates — it **never writes or edits code itself**. All implementation work goes to a sub-agent, and **no agent reviews or approves its own code**. The Orchestrator does not assume it should be the reviewer by default: it asks you whether you want the Orchestrator to review, or a separate sub-agent spun up to review, before the diff proceeds.
* **Challenge Me:** Actively push back, explain risks, and challenge requests if they are technically flawed, overly complex, or misaligned with goals.

---

## 2. Core Workflow & Autonomous Execution

0. **Session Start:** The Orchestrator reads `HANDOFF.md` first, before anything else, to see exactly where in the spec/tickets work last stopped. Since the spec is laid out ticket-by-ticket, this is usually enough on its own — a full re-read of `SPEC.md` is only needed if `HANDOFF.md` points to something ambiguous or the ticket itself is unclear.
1. **Scope Check:** Before scoping any request as an issue, the Orchestrator checks it against the current spec — using the ticket context already loaded from Step 0 where possible, and only pulling the wider `SPEC.md` if that context doesn't cover it.
   * **In spec:** proceed to Step 2 as normal.
   * **Not in spec:** do not scope, do not touch the CRD. Append one line to root-level `CHANGE-LOG.md` (date, one-line description, affected area, status: `pending`). Label the conversation turn `out-of-spec` and tell you in plain English what was logged. Nothing else happens until you triage it in client hat.
   * **Bug fixes:** a clear defect in already-intended behaviour does not need a CRD — file it as an issue per Step 2 and build it directly. This only holds while the fix is unambiguous; see the Step 3 escalation trigger for when a "bug" turns out to be something else.
2. **Problem Agreement:** You bring a problem or feature. The Orchestrator scopes it with you, agrees on the outcome, and files the issue with a testing checklist.
3. **Autonomous Execution:** Once a plan is approved, the orchestrator delegates to sub-agents without interrupting you, **unless** a mandatory escalation trigger is hit:
   * Touches any hard invariant or locked architecture decision defined in `SPEC.md` (e.g. schema/migration changes, security-policy changes, or any guardrail the spec flags as locked).
   * A "bug fix" turns out to touch a Part A locked invariant, or turns out to be ambiguous/undecided existing behaviour rather than a clear defect. Stop, label `needs-info`, and get a decision before proceeding — don't quietly treat it as a normal bug fix.
4. **Preview & Labeling Routing:** Code is pushed to a preview branch/environment, and the checklist is generated.
   * **If the change touches layout, styling, or platform-native behaviour that needs hands-on verification:** label **`needs-manual-test`** — pings you to verify on the relevant device/platform before merge.
   * **If the change is fully verifiable in-pipeline (no manual verification needed):** label **`needs-merge-approval`** — sub-agent team pre-ticks the checklist; you just give the go-ahead to merge.
   * **Manual test checklist format (`needs-manual-test` only):** each scenario is a numbered item — a short bold title, then the exact setup steps, then one ✅ line stating the pass condition. Add a ❌ line only where there's a specific wrong-looking failure worth naming so you know it on sight (verbatim wording, an empty-state flash, a silent bounce-back). Call out explicitly any step that must happen without a reload / in a single tab / on a specific device — a fresh load can paper over the exact bug being tested.
5. **Session Wrap-Up & Hand-Off:** When asked to wrap up or end the session, the orchestrator summarizes progress into a clean commit, updates the PR description, and updates a single root-level `HANDOFF.md` file — including exactly which ticket/section of `SPEC.md` was last active, so Step 0 of the next session can pick up without re-reading the whole spec.

---

## 3. Labels & Tracking

* **`needs-triage`**: Applied when an issue is filed; removed after review.
* **`needs-info`**: Applied when manual input is required (always paired with a direct message to you).
* **`ready-for-agent` / `ready-for-human`**: Indicates execution autonomy — whether the agent team can do the whole job, or part of it needs you directly (e.g. third-party dashboard config, account setup).
* **`needs-manual-test`**: Applied when a preview needs your hands-on verification before merge.
* **`needs-merge-approval`**: Applied when a change is complete and checklist pre-ticked — you just approve the merge.
* **`out-of-spec`**: Applied when a request falls outside the current spec. Logged to `CHANGE-LOG.md`, not scoped, not actioned until you triage.

---

## 4. Technical Guardrails & Environment

* **Branching:** Never commit directly to `main`; work exclusively on milestone branches. Issue closure triggers merge.
* **Project-Specific Guardrails Live in SPEC.md:** Hard technical invariants — schema rules, security policies, layout/rendering constraints, framework-specific gotchas, or anything else that would break the project if violated — are defined in that project's `SPEC.md`, not in this protocol. The Orchestrator treats `SPEC.md`'s guardrails as binding constraints when checking the Step 2 escalation triggers.
* **Versioning:** The project's chosen source of truth for its display version (see `SPEC.md` for which file that is — not assumed to be the package manifest) gets a default bump of `+0.0.1` per preview build. Confirm the exact version number with you immediately before merging.
* **Patch notes:** Every version bump gets a patch-notes entry (this project's user-facing "What's new" file — see `SPEC.md`/the codebase for which file that is) as part of the same PR, not a follow-up. This applies even to backend-only, infra, or under-the-hood changes with no UI difference — write what changed in plain language a non-technical user would understand (framing it around the practical effect: what's more reliable, what behaves differently, what to expect — not the mechanism). A pure internal change with genuinely zero user-facing effect still gets a one-line entry saying so (e.g. "cleaned up something behind the scenes — no visible change") rather than being skipped silently.
* **Supabase migrations:** Once a schema/migration change has already cleared the Step 3 escalation trigger (i.e. you've agreed the change should happen), applying the migration to Supabase is routine autonomous execution — no separate stop-and-confirm just to run `apply_migration`.

---

## 5. Reference Documents

* **`CRD.md`** — client requirements document, informed by a design doc with reference sites where relevant. Read once, at spec creation. Not reloaded during normal build work.
* **`SPEC.md`** — vertically-sliced spec derived from the CRD, **including this project's own technical guardrails** (stack, schema, layout, security rules, locked architecture decisions). This is the working reference during builds.
* **`CHANGE-LOG.md`** — append-only inbox for out-of-spec requests. Read/written cheaply; triaged on demand.
* **`HANDOFF.md`** — rolling session state, updated at wrap-up, read first at session start. Records exactly which ticket/section of `SPEC.md` was last active, so a new session usually doesn't need to re-read the full spec.

---

## Global CLI tools available

* `markitdown` — installed globally via pipx, converts PDF/DOCX/PPTX/XLSX/images/audio/HTML to Markdown. Usage: `markitdown path-to-file.ext -o output.md`
* `ffmpeg` was installed alongside it (via winget) to enable full audio/video transcription support in markitdown.

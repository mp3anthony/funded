# Lead Developer Liaison Protocol (Lean v4)

Applies to the app rebuild (React/Next.js on Vercel, Supabase backend).

## 1. The Orchestrator & Safety Gates

The Orchestrator is your single point of contact, project manager, and the only entity that touches Git and GitHub.
* **Plain-Language Translation:** Explain all technical actions, plans, and technical choices in plain, simple English before code execution. **Always sacrifice grammar for concision.**
* **Separation of Duties:** Sub-agents handle work, but **no agent reviews or approves its own code**.
* **Challenge Me:** Actively push back, explain risks, and challenge requests if they are technically flawed, overly complex, or misaligned with goals.

---

## 2. Core Workflow & Autonomous Execution

1. **Problem Agreement:** You bring a problem or feature. The Orchestrator scopes it with you, agrees on the outcome, and files the GitHub issue with a testing checklist.
2. **Autonomous Execution:** Once a plan is approved, the orchestrator delegates to sub-agents without interrupting you, **unless** a mandatory escalation trigger is hit:
   * Touches database migrations or RLS policy changes.
   * Touches locked architecture decisions or hard invariants.
3. **Preview & Labeling Routing:** Code is pushed to a Vercel preview branch, and the checklist is generated.
   * **If the change touches mobile layout, styling, or native browser behaviour:** label **`needs-mobile-test`** — pings you for iPhone/WebKit verification.
   * **If the change is backend/platform-agnostic (no layout or native browser behaviour involved):** label **`needs-merge-approval`** — sub-agent team pre-ticks the checklist; you just give the go-ahead to merge, no device testing needed.
4. **Session Wrap-Up & Hand-Off:** When asked to wrap up or end the session, the orchestrator summarizes progress into a clean commit, updates the GitHub PR description, and updates a single root-level `HANDOFF.md` file. At the start of a new session, the orchestrator reads `HANDOFF.md` to see where you left off.

---

## 3. GitHub Labels & Tracking

* **`needs-triage`**: Applied when an issue is filed; removed after review.
* **`needs-info`**: Applied when manual input is required (always paired with a direct message to you).
* **`ready-for-agent` / `ready-for-human`**: Indicates execution autonomy — whether the agent team can do the whole job, or part of it needs you directly (e.g. third-party dashboard config, account setup).
* **`needs-mobile-test`**: Applied when a preview needs your iPhone/WebKit verification before merge.
* **`needs-merge-approval`**: Applied when a backend/platform-agnostic change is complete and checklist pre-ticked — you just approve the merge.

---

## 4. Technical Guardrails & Environment

* **Branching:** Never commit directly to `main`; work exclusively on milestone branches. Issue closure triggers merge.
* **Database & Layout:** Mandatory RLS policies on all Postgres tables. For Next.js layout, use the official `export const viewport: Viewport` API instead of manual viewport/theme meta tags in `layout.tsx`. Never nest `position: fixed` elements inside containers with `overflow: hidden`.
* **Versioning:** `APP_VERSION` and `package.json` move together (default bump: `+0.0.1` per preview build). Confirm the exact version number with you immediately before merging.

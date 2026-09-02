# Research: Issue #99 (motion/visual overhaul) + Issue #100 (dashboard overhaul)

Decision-support document. No recommendation is made — see "Options to bring to Anthony" at the end.

---

## Part 1 — Current codebase state

### Animation/transition tooling today

- **No animation library installed.** `package.json` dependencies are Supabase, Next 16, React 19, `lucide-react`, `clsx`, `tailwind-merge`, `web-push`. No `framer-motion`, `react-spring`, `gsap`, or `tailwindcss-animate`.
- **All motion today is plain Tailwind utility classes** (`transition-colors`, `transition-all`, `transition-transform`, `duration-*`, `ease-*`) or raw CSS in `src/app/globals.css`. There is no shared timing/easing scale — every component picks its own `duration-200` / `duration-300` / `duration-500` / `duration-700` ad hoc.
- **Likely-dead animation classes:** 10 files (`Dialog.tsx`, `AppShell.tsx`, `NotificationCenter.tsx`, `JoinHouseholdSheet.tsx`, `AddPayScheduleSheet.tsx`, `AvatarDropdown.tsx`, `UserProfileMenu.tsx`, `Onboarding.tsx`, `payday-client.tsx`, `bills-client.tsx`) use `animate-in`, `fade-in`, `zoom-in`, `slide-in` classes. These come from the `tailwindcss-animate` plugin, which is **not installed** and not registered in `globals.css`'s `@theme` block. Tailwind v4 does not ship these utilities natively. Unless something else is supplying matching keyframes, these classes are currently no-ops — dialogs/sheets likely pop in with zero transition today despite the class names suggesting otherwise. Worth confirming visually, but this is a real gap a motion pass should either fix (install the plugin / add real keyframes) or replace.
- **Working micro-interactions that do exist:**
  - `HealthScoreCard.tsx` (dashboard's live health card) — expand/collapse chevron toggles are instant (no height transition), but the status-dot glow color and the color's `transition-colors duration-700` do animate; `BottomNav.tsx` active-tab icon gets `scale-110` + drop-shadow glow with `transition-all duration-200`.
  - `Dialog.tsx` — the shared modal/sheet shell (every modal in the app routes through this) has the `animate-in fade-in zoom-in duration-200` classes noted above as the intended entrance animation.
  - `AppShell.tsx` — a loading spinner uses `animate-spin` + `animate-in fade-in duration-300`; the header avatar button has `active:scale-95` + `transition-transform`.
  - `DialogButton` (primary/destructive variants) — `active:scale-95` press-feedback + `hover:brightness-110`.
  - Focus rings, hover-color transitions (`transition-colors`) are used broadly and consistently across buttons/links.
  - No page-transition wrapper exists — Next.js App Router navigation between `/`, `/payday`, `/bills`, `/funds`, `/settings` is a hard cut, no shared-element or fade transition.
  - No number count-up animation anywhere (all currency values render as static text via `toLocaleString`).
  - No skeleton/shimmer loading states found — only the one spinner in `AppShell.tsx`.

### Design-token setup a motion pass could plug into

- **Yes — there is a real token system**, but it's colors only, no motion tokens. `src/app/globals.css` defines CSS custom properties (`--color-primary`, `--color-background`, `--color-surface`, etc.) for dark/light themes, mapped into Tailwind v4 via `@theme inline`. No `tailwind.config.js` exists — this is a pure Tailwind v4 CSS-first setup (`@import "tailwindcss"` + `@theme`).
- **No motion tokens exist** — no `--duration-*`, `--ease-*` custom properties, no shared spring config, no defined stagger/delay scale. A whole-app motion pass would need to either (a) introduce a small set of CSS custom-property motion tokens the same way color tokens are done, or (b) go ad-hoc per component as today. Given the app already has a token precedent for color, adding parallel motion tokens (e.g. `--ease-standard`, `--duration-fast/base/slow`) would be consistent with existing architecture rather than a new pattern.
- The app is a PWA with heavy custom viewport/safe-area/modal-backdrop CSS (see the long comment block in `globals.css` about iOS fixed-position bugs) — any new motion work (especially page transitions or sheet animations) needs to respect the existing `.modal-backdrop` / `modal-open` scroll-lock system already in place; this is a hard constraint documented inline in the CSS.

### Main screens/surfaces — rough size for later sequencing

| Screen | File(s) | Size | Notes |
|---|---|---|---|
| Dashboard | `src/app/page-client.tsx` + `HealthScoreCard.tsx`, `UpcomingBillsCard.tsx`, `ActiveGoalsCard.tsx` | 160 lines (page) + 3 cards | Smallest page file, but the health card is the most animation-relevant surface (score, colored dot, 4 stat tiles, contributor list) |
| Payday | `src/app/payday/payday-client.tsx` | 514 lines | Large — pay schedules, pay history, contribution splits |
| Settings | `src/app/settings/settings-client.tsx` | 640 lines | Largest client page — likely the most toggles/rows/switches |
| Onboarding | `src/components/Onboarding.tsx` | 744 lines | Largest single component in the app — multi-step flow, prime real estate for a first-impression motion pass |
| Bills | `src/app/bills/bills-client.tsx` | 367 lines | List + detail sheets |
| Funds/Goals | `src/app/funds/funds-client.tsx` | 386 lines | List + detail sheets |
| Shell chrome | `AppShell.tsx` (254), `BottomNav.tsx` (55), `Dialog.tsx` (220) | — | Shared across every screen — highest leverage for a whole-app pass since every modal/sheet routes through `Dialog.tsx` and every tab through `BottomNav.tsx` |

(Sequencing note only — the ticket as scoped is whole-app, not phased, but this sizing is here in case Anthony wants to phase execution later.)

### Dashboard stat tiles + health score — current implementation in detail

**Two health-score implementations exist in the codebase; only one is live:**

- **`HealthScoreCard.tsx`** (in `src/components/`) — **this is the one actually rendered** on the dashboard (imported by `page-client.tsx`). It:
  - Computes a 0–100 score via `calculateHealthScore()` (see below) but doesn't display the number itself on the dashboard — it derives a **3-tier status label + color** from it: `score >= 80` → "Fully Funded" (lime `--color-primary`), `score >= 60` → "On Track" (amber `--color-accent`), else → "Needs Attention" (red `--color-destructive`). This tier logic is inline in the component (not shared/exported).
  - Renders a colored status dot with a `boxShadow` glow tinted to match, a headline status label, and (collapsible) a `grid-cols-2` grid of exactly the 4 stat tiles issue #100 names: **Weekly Income, Weekly Bills, Joint Fund Surplus (or "Surplus after bills" in direct-pay mode), Goals Total Added (Weekly)**. Each tile is a plain bordered cell (`border-t border-border`) with a mono label + bold mono value — no charts, no gauges, no per-tile color-by-health, just a flat 2×2 grid.
  - Also renders a collapsible "Contributors" section below the tiles (avatar + name + weekly amount per household member) — this is dashboard surface area issue #100 should probably account for if the redesign changes the card's overall shape.
  - Both the health status and the "Contributors" section have independent expand/collapse state (`useState`, chevron icons), each defaulting differently (health expanded, contributors collapsed) — instant show/hide, no animation.
- **`HealthScore.tsx`** and **`HouseholdHealth.tsx`** (in `src/components/`) — **both are dead code**, not imported anywhere in the app (verified via repo-wide search — only self-references and one unrelated comment mention). Each implements its own **separate, different** health-scoring logic (bill-paid-ratio for `HealthScore.tsx`; income-minus-expenses-percent for `HouseholdHealth.tsx`), with their own 3–4 tier color systems, inconsistent with `calculateHealthScore()` and with each other. Flagging this because a dashboard-overhaul ticket touching "the health score component" should not accidentally resurrect or fork from one of these — they're orphaned experiments, and their scoring math actively disagrees with the live one.

**`calculateHealthScore()`** — `src/lib/utils.ts` (starts line 88) — the one real, live scoring function:
- Weighted composite: Bills Management 40%, Goals/Contributions Progress 30%, Budget Coverage 30% (comment documents the weights; verify the actual weighted sum arithmetic further down the function if reused, since only the first two sub-scores were inspected in depth here).
- Bills sub-score: 100 if no bills overdue or all future-dated; else `100 - overdueCount*20` floored at 0.
- Goals sub-score: 50 baseline if no contributions/goals set up; 80 base + 20 bonus for any goal with progress, if contributions or goals exist.
- Budget sub-score: joint-fund mode compares contributions to monthly bill total; direct-pay mode (not fully inspected) presumably compares splits to bills.
- Known caveat flagged in-code (`AppContext.tsx` comments near lines 999, 1296, 2207, 2225): an all-empty/zero state computes to exactly 85, which reads as "Fully Funded" — a documented false-positive (referenced as issue #73) worth keeping in mind if a gauge redesign changes how boundary/empty states are visually communicated.

**Existing color-by-rank logic a gauge concept could reuse:** the 3-tier (lime/amber/red) mapping in `HealthScoreCard.tsx` at score thresholds 80/60 is the only live, wired-up version and the natural source of truth for gauge color bands. It's currently inline logic, not extracted into a shared helper — extracting it (e.g. into `lib/utils.ts` alongside `calculateHealthScore`) would be a reasonable prerequisite for a gauge component so tier colors stay single-sourced rather than re-derived.

---

## Part 2 — Comparable app research

Search-engine research only (no app installs) — findings are what's publicly documented/reviewed, not first-hand testing. Treat gaps honestly: several apps had thin public detail on animation specifics.

- **YNAB** — Public search results didn't surface documented specific micro-interaction/animation details (no confirmed confetti/celebration animation could be verified from search, despite it being commonly assumed). YNAB's known differentiator is the "Age of Money" metric, not a documented animation pattern. Cannot make a specific motion claim here without direct app inspection.
- **Monarch Money** — Dashboard is **customizable and drag-and-drop** (widgets can be reordered/removed). Confirmed: users **"swipe through their monthly review"** for cash-flow/expense insights — a swipeable card pattern exists in the app, but it's a review/summary carousel, not a gauge replacing the stat tiles. Also has visual progress bars for budget tracking. [Monarch dashboard help](https://help.monarch.com/hc/en-us/articles/360058127551-Customizing-Your-Dashboard), [Monarch tracking](https://www.monarch.com/features/tracking)
- **Copilot Money** — Won a **2024 Apple Design Award** and a Webby Award; reviewers consistently single out its animation/chart polish as the category benchmark ("every chart, animation, and interaction feels intentional," charts "animate smoothly," color palette adapts to spending). No specific gauge-carousel claim found, but it's the strongest "polish bar" precedent in the category. [Copilot review coverage](https://www.fincomparelab.com/reviews/copilot-money-review/), [Copilot design praise](https://thalvi.app/resources/best/copilot-money-app-review/)
- **Rocket Money** — Confirmed to use a **circular gauge/dial specifically for its credit-score feature**: a "FICO score dial" plus a credit-history trend graph. This is a real precedent for gauge-as-visualization in a finance app, but it's scoped to credit score, not the main financial dashboard stat tiles, and no swipe behavior was confirmed for it. [Rocket Money credit scores](https://app.rocketmoney.com/credit-scores)
- **Simplifi (Quicken)** — Deliberately **low-animation, low-chart philosophy**: reviews describe it as intentionally decluttered, prioritizing a simple "Spending Plan" tile over dashboards full of charts/graphs. No gauge or swipe pattern found — it's essentially the "quiet/analytical" end of the spectrum by design philosophy, not an animation showcase.
- **EveryDollar (Dave Ramsey)** — Recent redesign described as "cleaner and clearer" with dark mode and a performance overhaul, but no specific animation/gauge/swipe details surfaced. Zero-based budgeting focus, not a visual-delight-forward app.
- **PocketGuard** — Its signature feature, **"In My Pocket,"** is a real-time calculated "safe to spend" number (bills/goals/essentials subtracted from income) shown prominently on the dashboard — conceptually close to this app's "Joint Fund Surplus" tile, but described as a number/tile, not confirmed as a gauge or swipeable element in search results.
- **Honeydue** — The most directly relevant precedent (couples/shared finance) — confirmed features: shared real-time balance dashboard, per-partner spending-limit notifications, comment/emoji reactions on transactions (a genuinely playful, social micro-interaction unique among these apps). **No swipeable-gauge or gauge-visualization evidence found** — search results describe it as a fairly conventional balance/transaction list dashboard.
- **Mint (discontinued, historical precedent)** — Confirmed to have used a **color-coded gauge for credit score** (green/yellow/red bands indicating improving/stable/declining), with a tap-to-expand detail view. This is the closest documented precedent for "gauge + color-by-status band" as a concept, though again scoped to credit score, not general financial-health stat tiles, and not confirmed as swipeable.

**Direct answer on the swipeable-gauge question:** no app surveyed was found, via this search-based research, to use a swipeable gauge/arc visualization in place of static dashboard stat tiles. The closest real precedents are (a) static circular gauges used specifically for **credit score** (Rocket Money, Mint), and (b) a **swipeable card carousel** used for a **monthly review summary**, not live stat tiles (Monarch). The combination — swipeable + gauge + everyday stat tiles — appears to be a novel-for-this-category idea rather than something being copied from an established competitor. That's not a reason to reject it, just worth knowing it's not "catching up" to a pattern users already expect from elsewhere.

### General mood/style patterns worth naming as options

- **Playful/social** — Honeydue's comment-and-emoji-react-on-transactions pattern is the standout example of a finance app leaning into delight/personality rather than pure data density.
- **Premium/polished-minimal** — Copilot Money's positioning: heavy animation and chart polish, but restrained/native-feeling rather than bouncy; the "every interaction feels intentional" praise is about smoothness and consistency, not exuberance.
- **Subtle/analytical/quiet** — Simplifi's explicit design philosophy: fewer charts, less visual noise, a single clear "spending plan" number prioritized over dashboards full of graphs.
- **Gauge-as-status-symbol** — Rocket Money and (historically) Mint use a dial/gauge specifically to make one high-stakes number (credit score) feel like a single glanceable "grade," with color doing most of the communicating — directly analogous to what a household-health gauge would be doing here.

---

## Options to bring to Anthony

Not a recommendation — three named motion-mood directions and three named dashboard-tile concepts, laid out for a decision.

### Motion mood directions (issue #99)

1. **"Premium-minimal" (Copilot-inspired)** — Smooth, restrained easing everywhere (shared duration/easing tokens, no bounce), animated number count-ups on stat values, real entrance transitions on the currently-dead `Dialog.tsx` `animate-in` classes, subtle page-content fade on route change. Low personality risk, highest "feels expensive" payoff, most aligned with the app's already-editorial/mono-heavy visual language.
2. **"Playful/social" (Honeydue-inspired)** — Everything in (1) plus bouncier spring-style easing on key moments (goal hit, bill paid, health tier upgrade), a celebratory micro-interaction (confetti/pulse/haptic-style visual burst) when a goal completes or health status crosses into "Fully Funded," maybe emoji/reaction-style flourishes on shared/contributor actions given this is a household app. Higher personality, higher risk of feeling gimmicky if overused given the app's current fairly serious/dark editorial tone.
3. **"Subtle/data-forward" (Simplifi-inspired)** — Minimal added motion: fix the currently-broken `animate-in` transitions so they actually run, add color-transition consistency (the existing `transition-colors duration-700` pattern already present in `HealthScoreCard.tsx`), skip count-up/celebration animations entirely. Closest to "polish pass, don't add personality," lowest implementation cost, lowest visual risk.

### Dashboard tile concepts (issue #100)

1. **Swipeable gauge (original idea)** — Replace the 4-tile grid with a single swipeable arc/radial gauge per metric (Weekly Income / Weekly Bills / Joint Fund Surplus / Goals Total), carrying the existing lime/amber/red rank-color logic from `HealthScoreCard.tsx`. No direct competitor precedent found (see research above) — would be a genuinely novel pattern for this app category, reusing the existing `calculateHealthScore()` tiering but requiring new gauge-rendering work (no charting/gauge library currently installed).
2. **Static gauge + swipeable detail cards (Mint/Rocket-Money-inspired hybrid)** — Keep one prominent circular gauge for the overall household-health score/status (closer to how Rocket Money/Mint use a gauge for credit score), and make the 4 supporting numbers a swipeable card row underneath rather than a fixed 2×2 grid — separates "the one number that matters" from "the details," while still using a real, if scoped-down, precedent.
3. **Keep the grid, animate the numbers (Simplifi/Copilot-inspired, lowest-risk)** — Leave the 4-tile grid layout as-is structurally, but add count-up number animation, tier-color transitions on the status dot/label (extending the existing `transition-colors duration-700` pattern), and a smooth expand/collapse height transition (currently instant) for the Health/Contributors sections. No new gauge concept, no new library — purely animates what's already there.

---

*Research compiled 2026-09-02 for issues #99 and #100. Codebase findings based on direct file reads in this repo; comparable-app findings based on web search only (no direct app installs/testing) — flagged inline wherever evidence was thin.*

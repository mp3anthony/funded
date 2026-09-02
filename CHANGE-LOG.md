# Change Log

Append-only inbox for out-of-spec requests. One line per entry: date, one-line description, affected area, status.

Format: `- YYYY-MM-DD — description — area — status: pending|triaged|rejected`

- 2026-07-30 — Notifications overhaul: user-chosen delivery time (e.g. 6pm local), per-timezone scheduling, and new reminder types beyond the existing manual-bill/auto-pay/lodge-payment set (e.g. payday "log your pay") — notifications/cron/settings — status: triaged (filed as #97, needs-info — waiting on Anthony's scoping answers)
- 2026-07-30 — Bills vs Expenses split: "is this a bill or an expense?" choice on add, with expenses tracked separately from bills — bills data model + add/edit sheets — status: triaged (filed as #98, needs-info — waiting on Anthony's scoping answers)
- 2026-07-30 — Dynamic visual overhaul: motion/animation and interactive design pass across the app — global UI/design system — status: triaged (filed as #99, needs-info — waiting on Anthony's scoping answers)
- 2026-07-30 — Dashboard overhaul: replace the four static stat tiles (weekly income / weekly bills / joint fund surplus / total goals) with a swipeable dynamic gauge carrying the household-health rank colours — dashboard — status: triaged (filed as #100, needs-info — waiting on Anthony's scoping answers)
- 2026-07-30 — Health score design question: should a household with no bills/goals/contributions set up score 85 ("Fully Funded")? Current formula says yes; may want a distinct "not set up yet" state — health score — status: triaged (filed as #87)
- 2026-07-30 — Direct Pay mode behaviour unverified end-to-end; awaiting outsourced testers who use a direct-pay lifestyle before any rework is scoped — direct pay — status: triaged (filed as #88)
- 2026-08-19 — Joint-fund income-split calculator: Settings tool that recommends each member's joint-account contribution based on their income ratio, for joint-fund households only — settings/contributions — status: triaged (filed as #106, ready-for-agent, fully scoped same session)
- 2026-08-23 — `src/components/HouseholdHealth.tsx` is dead code: exports a "Household Health" card, never imported anywhere in the app (confirmed by repo-wide grep). Found while scoping #110, which touched the actual live "Household Health" section in `HealthScoreCard.tsx` instead. Worth deleting or wiring up, Anthony's call which — flagged, not actioned this session — component/cleanup — status: pending
- 2026-09-02 — Patch notes page: hidden in-app page (reachable from Settings) listing changes per version; a first-open-on-a-new-version popup surfaces what's changed since the user last looked, then defers to the hidden page for full history — settings/onboarding/notifications — status: triaged (folding into the upcoming full-issue-triage spec pass; Anthony flagged as high priority, build order TBD in that pass)
- 2026-09-02 — In-app bug reporting: a way for users to report bugs from inside the app, ideally in a format that maps onto a GitHub issue; Anthony flagged the open question of how the app→GitHub path actually works without continuous polling — needs its own scoping session, not just an interview — feedback/support — status: triaged (folding into the upcoming full-issue-triage spec pass; Anthony flagged as high priority, build order TBD in that pass)


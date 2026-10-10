# Context Map

Funded is a household bills and goals budgeting app, installed on a phone, where people share bills, pay and savings goals. Its vocabulary splits into four contexts.

## Contexts

- [Household](./docs/context/household.md) — the household, its members, join codes and how bills are settled (Joint Fund or Direct Pay)
- [Money](./docs/context/money.md) — bills, expenses, pay, goals, contribution rules and the health score
- [Notifications](./docs/context/notifications.md) — reminders, inbox, push, notify hour and where a tap leads
- [App shell](./docs/context/app-shell.md) — the installed app, its pages, toasts, patch notes and bug reports

## Relationships

- **Household → Money**: the payment mode decides how a bill is split and whether the Household total goes into a Joint Fund or is transferred directly; the household timezone decides when a due date falls.
- **Money → Notifications**: bills, pending pay and goals generate reminders, and a reminder's dedupe key follows the bill, pay or goal and its cycle.
- **Household → Notifications**: the household timezone and each member's notify hour decide when a reminder is delivered.
- **Notifications → App shell**: a notification's tap destination is a page or popup in the app, and the inbox is opened from the shell's bell.
- **Money → App shell**: Household Health, Upcoming Bills and Savings Goals appear on the Dashboard, and the Goals page is where goals live, never "Funds".

Glossary convention: a planned term (agreed but not built) stays in its glossary tagged "(planned, #ticket)" while a GitHub issue exists for it. Remove the tag when it ships; delete the entry if the ticket is dropped.

Workflow and process terms (orchestrator, subagents, labels, tickets, wrap-up) live in `CLAUDE.md`. Architectural decisions live in `docs/adr/`.

Non-glossary knowledge: binding build rules in `docs/conventions.md`, hard-won lessons and known items in `docs/lessons.md`, hosting, database and operations facts in `docs/environment.md`. Locked invariants and standing technical rules are in `SPEC.md` Part A.

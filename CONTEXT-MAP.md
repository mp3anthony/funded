# Context Map

Funded is a household bills and goals budgeting app, installed on a phone, where people share bills, pay and savings goals. Its vocabulary is split into lanes, one folder per lane under `docs/context/`.

New lanes are created as new folders under `docs/context/`, then listed here.

## Household (`docs/context/household/`)

- [household.md](./docs/context/household/household.md): the household, its members, join codes and how bills are settled (Joint Fund or Direct Pay)

## Money (`docs/context/money/`)

- [owed.md](./docs/context/money/owed.md): bills, expenses and the rules for what a household owes
- [bill-status.md](./docs/context/money/bill-status.md): how a bill is marked paid, overdue, paused or pending
- [income-and-pay.md](./docs/context/money/income-and-pay.md): pay, pay rules, bonuses and how money comes in
- [saving-and-planning.md](./docs/context/money/saving-and-planning.md): goals, contribution rules and planning ahead
- [verdict.md](./docs/context/money/verdict.md): the Dashboard answer to whether the bills are covered

## Notifications (`docs/context/notifications/`)

- [notifications.md](./docs/context/notifications/notifications.md): reminders, inbox, push, notify hour and where a tap leads

## App shell (`docs/context/app-shell/`)

- [the-app.md](./docs/context/app-shell/the-app.md): the installed app and the building blocks around every page
- [pages.md](./docs/context/app-shell/pages.md): what each page shows and does
- [keeping-informed.md](./docs/context/app-shell/keeping-informed.md): toasts, patch notes, issue reports and other surfaces that tell people what changed

## Relationships

- **Household to Money**: the payment mode decides how a bill is split and whether the Household total goes into a Joint Fund or is transferred directly; the household timezone decides when a due date falls.
- **Money to Notifications**: bills, pending pay and goals generate reminders; a reminder's dedupe key follows the item and its cycle.
- **Household to Notifications**: the household timezone and each member's notify hour decide when a reminder is delivered.
- **Notifications to App shell**: a tap leads to a page or popup in the app, and the inbox opens from the shell's bell.
- **Money to App shell**: the verdict and the Bills and Goals carousels appear on the Dashboard; goals live on the Goals page, never "Funds".

## Glossary convention

A planned term (agreed but not built) stays in its glossary tagged "(planned, #ticket)" while a GitHub issue exists for it. Remove the tag when it ships; delete the entry if the ticket is dropped.

## Where else

- Workflow and process terms (orchestrator, subagents, labels, tickets, wrap-up): `CLAUDE.md`, `docs/workflow.md`
- Architectural decisions: `docs/adr/`
- Binding build rules: `docs/conventions.md`; lessons and known items: `docs/lessons.md`; hosting, database and operations facts: `docs/environment.md`
- Locked invariants and standing technical rules: `SPEC.md` Part A
- UI rules: `DESIGN-REFERENCE.md`; out-of-spec inbox: `CHANGE-LOG.md`
- Issue tracker, triage labels and domain-docs config: `docs/agents/`; setup: `README.md`

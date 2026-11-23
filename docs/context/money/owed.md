# Money: What is owed

Bills, expenses and the rules for what a household owes.

**Bill**:
A fixed, recurring obligation with a due date, such as rent or a subscription. Bills and expenses share one list on the Bills page.
_Avoid_: Invoice (for the obligation), charge, payment

**Expense**:
Variable spending, such as groceries or fuel, that still counts toward the Household total. An expense has no frequency of its own and is treated as a weekly amount.
Added from the Add flow by choosing Expense; it asks for a weekly amount and no frequency or due date.
_Avoid_: Variable bill, spend, cost

**Manual bill**:
A bill the household pays by hand and must mark as paid.
_Avoid_: Unpaid bill, hand-paid bill

**Auto-pay bill**:
A bill that is taken automatically on its due date, so it cannot be marked Paid or Unpaid by hand.
_Avoid_: Direct debit, automatic bill

**Frequency**:
How often a bill, pay or contribution recurs: weekly, fortnightly or monthly, and yearly for bills.
_Avoid_: Cycle, interval, period

**Normalised amount**:
An amount converted to a common frequency before it is compared or added to any other, so weekly, fortnightly and monthly figures are never mixed raw.
_Avoid_: Converted amount, equivalent amount

**Due date**:
The day a bill must be paid, read in the household's timezone.
An active recurring autopay bill shows its saved date moved forward to the next one on or after today, counted from the saved date so month-end days clamp (a 31st bill shows Feb 28, then Mar 31).
A paused bill shows the label "Paused" instead of a date, and a one-off autopay bill whose saved date has passed shows "One-off"; the saved date is still kept for editing.
A bill saved without a date shows "No due date" (see Dateless bill); that is not a neutral label in this sense, but like them it appears only under the All filter.
Bills showing a neutral label ("Paused" or "One-off") appear only under the All filter on the Bills page.
_Avoid_: Deadline, payment date

**Dateless bill**:
A bill saved without a due date. It shows "No due date", sorts last in lists, still counts toward totals, never shows Due Soon or Overdue, appears only under the All filter, and sends no reminders.
Marking it Paid asks "When is it next due?"; the user can Skip for now (the bill stays Paid, shown as "Paid · no due date", until a date is added) or choose Don't ask again for this bill. 30 days after it was added,
the "No due date" label becomes an orange "Add due date" prompt, unless muted.
It sorts last within its category on the Bills page and last in the Dashboard Bills carousel (an unpaid one is listed there as "No due date", a Paid one is not listed).
The question is asked only for a manual, recurring, not paused bill that is not muted; one-off and paused dateless bills are just marked Paid.
Picking a date pays the cycle and makes the bill unpaid on that date (no Undo, no "Paid for" record). Don't ask again for this bill is stored per bill (`bills.due_date_prompt_muted`) and also hides the 30-day prompt.
The orange prompt replaces "Paid · no due date" too and opens the bill's Due date card. Adding a date to a Paid dateless bill makes it unpaid on that date (Overdue at once if the date has passed).
_Avoid_: Undated bill, open-ended bill

**One-off bill**:
A bill that happens once rather than repeating. The app cannot create one today (every saved bill is recurring); they exist only as older or seeded rows. An autopay one-off is reminded for its saved date only and stops once that date has passed.
_Avoid_: Single bill

**Invoice date**:
The date a bill was issued, optional and kept when known.
For recurring bills it stays in step with the due date: it moves forward alongside it, and for an active autopay bill it is worked out from the saved date to match the due date shown. Paused and one-off bills show it as saved.
A bill with none shows no invoice date at all.
_Avoid_: Bill date, issue date

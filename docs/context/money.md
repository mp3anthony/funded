# Money

What the household owes, earns and saves, and how the app judges whether it is keeping up.

## Language

### What is owed

**Bill**:
A fixed, recurring obligation with a due date, such as rent or a subscription. Bills and expenses share one list on the Bills page.
_Avoid_: Invoice (for the obligation), charge, payment

**Expense**:
Variable spending, such as groceries or fuel, that still counts toward the Household total. An expense has no frequency of its own and is treated as a weekly amount.
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
_Avoid_: Deadline, payment date

**Invoice date**:
The date a bill was issued, kept when known and moved forward alongside the due date.
_Avoid_: Bill date, issue date

### Bill status

**Due Soon**:
A bill that is unpaid and not yet past its due date.
_Avoid_: Pending, upcoming (as a status), open

**Overdue**:
A manual bill that is unpaid and past its due date.
_Avoid_: Late, missed, past due

**Paid**:
A bill settled for the current cycle. A paid recurring bill returns to unpaid when its next cycle begins.
_Avoid_: Done, settled, cleared

**Paused**:
A bill put on hold until it is resumed, so it is not treated as overdue or counted in the health score.
_Avoid_: Archived, disabled, inactive

**Mark as Paid**:
Recording that a manual bill has been paid. If the bill is already due or past due it rolls straight away; if it is paid early, only its status changes.
_Avoid_: Pay, complete, tick off

**Roll**:
Moving a recurring bill on to its next cycle: status returns to unpaid and the due date, and the invoice date when present, advance one frequency. The cycle just paid is recorded as the bill's last paid.
_Avoid_: Reset, renew, recur

**Undo**:
The quick undo in the toast straight after paying, restoring the bill exactly as it was. It is offered for a short time only.
_Avoid_: Revert, unpay, rollback

**Undo payment**:
The permanent button in the bill popup that puts a bill back on the cycle it was last paid for, as unpaid. One level only: it clears the last paid record, so it cannot be repeated.
_Avoid_: Revert, unpay, rollback

**Last paid** (shown as "Paid for <Month>"):
The due date of the most recently paid cycle, shown in the bill popup under Paid By. The month comes from the due date while the bill is Paid, otherwise from the stored record; empty shows nothing. Autopay bills show no Paid-for line.
_Avoid_: Paid on, payment date

### Income and pay

**Payday**:
A day a member gets paid, and the page where pay is scheduled, logged and reviewed.
_Avoid_: Salary day, income day

**Pay schedule**:
A member's recurring pay, with a next pay date, a frequency, and either a fixed amount or a variable one entered each time.
_Avoid_: Income source, pay plan, salary

**Log Pay**:
Recording that a scheduled pay has arrived, once its pay date has come. For variable pay the action reads "Enter Pay Amount" because the amount is typed in.
_Avoid_: Add income, record pay, deposit

**Pending pay**:
A pay the app logged automatically because its date passed without anyone logging it, waiting for a member to confirm or correct the amount.
_Avoid_: Unconfirmed income, draft pay, missed pay

**Surplus**:
Pay that comes in well above a member's average, which the app offers to allocate to a goal. The dashboard also shows a weekly surplus, which is income left after bills.
_Avoid_: Bonus, extra, leftover

### Saving and planning

**Goal**:
A savings target with a name and an amount to reach, shown on the Goals page. Goals are never called funds, and never sinking funds.
_Avoid_: Funds, fund, sinking fund, savings pot

**Contribution rule**:
An automation that moves part of a pay into a goal or a member's contribution whenever that pay exceeds a chosen threshold, as a fixed dollar amount or a percentage. The Settings row for these reads "Automation rules".
_Avoid_: Auto-save rule, transfer rule

**Household total**:
The recurring amount the household commits to across bills, expenses and active fixed-dollar contribution rules, shown at whichever frequency is selected on the Bills page. Percentage rules are left out because the next pay's surplus is unknown. Shown as the Total bar on the Bills page.
_Avoid_: Weekly draw, Bills total, Budget, Allowance

**Surplus Pool** (planned, #215):
Where extra pay above a member's usual pay can be held to cover bills. Today the Payday surplus popup offers it but it is a stub that records nothing. Definition still to be settled in #215.

### Household health

**Health score**:
A single 0-to-100 reading of how well the household is keeping up, based on overdue bills, goal progress and whether income covers obligations.
_Avoid_: Credit score, rating, grade

**Household Health**:
The dashboard card that shows the health score with a status label and this week's income, bills and surplus.
_Avoid_: Health page, finance score, dashboard score

**Fully Funded**:
The best Household Health status, shown when the health score is high. The lower statuses are On Track and Needs Attention; Not Set Up Yet appears when the household has no bills, goals or contributions.
_Avoid_: Funded, all paid, healthy

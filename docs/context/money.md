# Money

What the household owes, earns and saves, and how the app judges whether it is keeping up.

## Language

### What is owed

**Bill**:
A fixed, recurring obligation with a due date, such as rent or a subscription. Bills and expenses share one list on the Bills page.
_Avoid_: Invoice (for the obligation), charge, payment

**Expense**:
Variable spending, such as groceries or fuel, that still counts toward the Household total. An expense has no frequency of its own and is treated as a weekly amount. Added from the Add flow by choosing Expense; it asks for a weekly amount and no frequency or due date.
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
The day a bill must be paid, read in the household's timezone. An active recurring autopay bill shows its saved date moved forward to the next one on or after today, counted from the saved date so month-end days clamp (a 31st bill shows Feb 28, then Mar 31). A paused bill shows the label "Paused" instead of a date, and a one-off autopay bill whose saved date has passed shows "One-off"; the saved date is still kept for editing. A bill saved without a date shows "No due date" (see Dateless bill); that is not a neutral label in this sense, but like them it appears only under the All filter. Bills showing a neutral label ("Paused" or "One-off") appear only under the All filter on the Bills page.
_Avoid_: Deadline, payment date

**Dateless bill**:
A bill saved without a due date. It shows "No due date", sorts last in lists, still counts toward totals, never shows Due Soon or Overdue, appears only under the All filter, and sends no reminders. Marking it Paid asks "When is it next due?"; the user can Skip for now (the bill stays Paid, shown as "Paid · no due date", until a date is added) or choose Don't ask again for this bill. 30 days after it was added, the "No due date" label becomes an orange "Add due date" prompt, unless muted.
Built in v0.9.79 (#250). It sorts last within its category on the Bills page and last in the Dashboard Bills carousel (an unpaid one is listed there as "No due date", a Paid one is not listed). The question is asked only for a manual, recurring, not paused bill that is not muted; one-off and paused dateless bills are just marked Paid. Picking a date pays the cycle and makes the bill unpaid on that date (no Undo, no "Paid for" record). Don't ask again for this bill is stored per bill (`bills.due_date_prompt_muted`) and also hides the 30-day prompt. The orange prompt replaces "Paid · no due date" too and opens the bill's Due date card (R10). Adding a date to a Paid dateless bill makes it unpaid on that date (Overdue at once if the date has passed).
_Avoid_: Undated bill, open-ended bill

**One-off bill**:
A bill that happens once rather than repeating. The app cannot create one today (every saved bill is recurring); they exist only as older or seeded rows. An autopay one-off is reminded for its saved date only and stops once that date has passed.
_Avoid_: Single bill

**Invoice date**:
The date a bill was issued, optional and kept when known. For recurring bills it stays in step with the due date: it moves forward alongside it, and for an active autopay bill it is worked out from the saved date to match the due date shown. Paused and one-off bills show it as saved. A bill with none shows no invoice date at all.
_Avoid_: Bill date, issue date

### Bill status

**Due Soon**:
A bill that is unpaid, has a due date, and is not yet past it.
_Avoid_: Pending, upcoming (as a status), open

**Overdue**:
A manual bill that is unpaid and past its due date.
_Avoid_: Late, missed, past due

**Paid**:
A bill settled for the current cycle. A paid recurring bill returns to unpaid when its next cycle begins.
_Avoid_: Done, settled, cleared

**Paused**:
A bill put on hold until it is resumed. While paused it gets no reminders, is not treated as overdue, and does not count toward totals (see Counts toward totals). Its row shows an orange pause icon beside a greyed amount, with "Paused" in the date slot, and, like other neutral-label ("Paused" or "One-off") rows, shows only under the All filter, in its usual sort order (not moved to a separate section). On resume, if its due date has passed, it moves on to its next upcoming due date (missed cycles are skipped).
_Avoid_: Archived, disabled, inactive

**Mark as Paid**:
Recording that a manual bill has been paid. If the bill is already due or past due it rolls straight away; if it is paid early, only its status changes. For a bill with no due date, see Dateless bill.
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
A member's recurring pay, with a next pay date, a frequency, and either a fixed amount or a variable one entered each time. Any household member may view any member's pay schedule and edit its pay type, frequency, next date and amount (decided 2026-10-04); changing whose pay it is belongs to an owner with 2+ members (app rule, R11 #398). Adding: a member adds their own; only the household owner can add one for someone else (the New pay schedule flow asks "Whose pay" only of an owner, and only when 2+ members have joined). This is an app rule, not a database one (#396). A monthly pay schedule on the 29th-31st lands on the last day of a shorter month; once saved there it stays on that day until edited (#298).
_Avoid_: Income source, pay plan, salary

**Log Pay**:
Recording that a scheduled pay has arrived, once its pay date has come. Built in R20 (#407): the pay shows in the Payday "Needs you" strip ("Log pay" for fixed pay, "Enter amount" for variable); tapping it opens one small card. A known amount asks "Did $1,850 land?" with the pill "Yes, it landed", plus "Different amount" (swaps the card to an Amount box and optional Notes) and "Didn't get paid". With no known amount the card asks "How much did <name> get?". Anyone in the household can log anyone's pay. The date logged is today in the household timezone.
_Avoid_: Add income, record pay, deposit

**Pending pay**:
A pay the app logged automatically because its date passed without anyone logging it, waiting for a member to confirm or correct the amount.
Built in R19 (#406): a Pending pay is added to history only once its pay day has ended unlogged (logging on the day writes straight to history), by the Payday page on load and by the reminder cron even if nobody opens the app. A fixed-pay Pending is prefilled with the schedule amount; a variable-pay Pending has no amount (`pay_history.amount` is NULL, shown as "Amount needed"; only a Pending pay may have a NULL amount). A Pending pay sits in the Payday "Needs you" strip (R20, #407) with a "Confirm" pill that opens the same card as Log Pay ("Did $1,850 land?", or an Amount box when there is no amount), and a daily notification repeats until it is confirmed. Confirming a Pending pay does not run contribution rules or the surplus suggestion (follow-up filed). Deleting a pay from history only removes the record: the schedule's next pay date is never changed (R24, #411; decided with Anthony, because a row's date is not always the scheduled date). To redo a pay, edit the schedule's next date.
_Avoid_: Unconfirmed income, draft pay, missed pay

**Pay history** (built in R22, #409):
The History section at the bottom of Payday: a filter chip ("Everyone · 3 months") opens a pop-up with a tick box per member that has any pay on record (at least one stays ticked) and a period (4 weeks, 3 months, 12 months, All; default 3 months, not remembered). Under it a chart with one coloured line per ticked member (confirmed pays only; a Pending pay is not on the chart and a note says how many are left out). With one member a dashed line marks their average and the totals read Total, Pays, Average; with several, each member's period total and their share of the household's pay in that period (everyone, not just the ticked) sit under the chart. The list below is the same people and period, newest first, Pending included (its tick opens the Confirm Pay card), 15 at a time with Show more. Line colours follow the member order and are fixed per member. No chart library: plain SVG. Rules live in `src/lib/payChart.ts`.
_Avoid_: Recent pay history, contributor filter, income report

**Member pay card** (built in R21, #408):
A member's slide in the Payday carousel (swipe, dots, turns by itself with a pause button). Shows their name and avatar, the amount of their next pay (grey when it is a variable-pay estimate), a ring that fills toward the next pay ("Due now" and lime on or after pay day) and a line like "Fortnightly · in 5 days"; a member with 2+ pay schedules gets a tab per schedule. Tapping the card opens that member's sheet: pay schedules (each opens the pay schedule sheet), "Add pay schedule", Contribution (Joint Fund) and Rules. A member with no pay shows a grey "Set up <name>'s pay" card (only for themselves, or for an owner with 2+ members). Rules live in `src/lib/paydayCards.ts`.
_Avoid_: Income tile, payee card

**Needs you** (built in R20, #407):
The strip at the top of Payday, shown only when something needs action: a pay whose date has come (Log pay / Enter amount) or a Pending pay to confirm. Oldest pay date first, a Pending pay before a due pay on the same day, hidden when empty. Shows every member's pay, not only the viewer's. Rules live in `src/lib/needsYou.ts`.
_Avoid_: Inbox, to-do

**Didn't get paid** (built in R20, #407):
The ghost pill on the Log / Confirm Pay card, for a pay that did not arrive. It asks "Skip this pay?" (red pill "Skip pay"), then toasts "Pay skipped". Skipping a due pay moves the schedule on to its next date and logs nothing. Skipping a Pending pay deletes that row and leaves the schedule date alone, so the reminder job cannot recreate it. Nothing is kept as a "skipped" record: it is not in history and not in the average pay.
_Avoid_: Cancel pay, missed pay, void

**Average pay** (built in R19, #406; shown on the Payday member card since R21):
For a variable-pay schedule (per schedule, not per member), the average of its last 4 confirmed pays, ignoring Pending pays; needs at least 2 confirmed, else "Not enough pays yet". Rule lives in `src/lib/payHistory.ts` (`averagePay`). A variable-pay member card shows it in grey with "Estimate from your last 4 pays" (or "Not enough pays yet"). Replaced the old last-3-pays rule, which counted Pending $0 rows.
_Avoid_: Typical pay, expected pay

**Surplus**:
Pay that comes in well above a member's average (see Average pay), which the app offers to allocate to a goal. The dashboard also shows a weekly surplus, which is income left after bills.
_Avoid_: Bonus, extra, leftover

### Saving and planning

**Goal**:
A savings target with a name and an amount to reach, shown on the Goals page. Goals are never called funds, and never sinking funds.
_Avoid_: Funds, fund, sinking fund, savings pot

**Wish list goal** (planned, #377; renamed from "Just tracking" in F08, #472):
A goal kept only as a note of what something costs, with nothing being saved toward it. Shown in the Goals page Wish list group with name and cost only (Check impact is in the goal sheet), no ring or pace; never counted in any total, goal suggestions or milestone reminders, and never on the Dashboard goal cards (R17, #404). Stored in the existing goal status (today `paused`), so no schema change. Chosen in the Add goal flow's first question ("What type of goal?") since R08 (#395), and switchable later in the goal sheet's Type row since R11 (#398; switching keeps the saved amount and any rules); the Goals page (R17) and the places that count money already leave it out; the Dashboard header is the verdict since R25, and the Dashboard Bills and Goals cards follow at R26 and R27. Rules that already target a Wish list goal keep running and still count in the Bills Household total (known interim, see `docs/lessons.md`). The other type is an **Active goal** (was "Saving"). "Type" replaced "Kind" as the row and question word. "Wish List" is not a category any more: an old row that still carries it reads as Other. Stored values are unchanged (`kind: "saving" | "tracking"`, status `paused`). _Avoid_: Just tracking, Saving goal, Kind, Paused goal, wish item

**Impact calculator**:
A read-only pop-up on the Bills page ("Check impact", the chip after Filter) answering what a possible payment plan or subscription would do to the household. Built in R16 (#403), ships with the redesign. Inputs: optional name, payment amount, how often (default monthly), and number of payments or Ongoing. Shows the extra cost per week, fortnight, month and year, for a fixed count the total and how long it runs, the Household total now beside the new one (in the Bills page frequency, ignoring filters), and a coverage line ("Still covered", "Short $12 a week", or "Add your pay to check this" when there is no income). The coverage line is the Dashboard verdict run before and after adding the plan (R25): covered stays "Still covered", a plan that turns covered into short says "tips you over", and when the household was already short it says so. Saves nothing; "Turn into a bill" closes it and opens the Add flow at Name, prefilled: Ongoing becomes a Subscriptions bill; a fixed count becomes a Temporary bill with the note "N payments, then it stops", because the app cannot yet create bills that end. On the Goals page it only opens from a Wish list goal's sheet (F07, #471; there is no Check impact chip beside Filter any more), in **goal mode**: Still to save (target minus saved, never below $0, editable), Save it over N payments at a chosen frequency (default monthly), no Name and no Ongoing, no Household total. It shows "Takes $X of your $Y left a week" (the verdict's weekly leftover, or "You're already $N a week short" / "Add your pay to check this"), the cost per pay at the pay frequency the rule will run on (for example $400 over 12 monthly payments on fortnightly pay is $15.38 a pay), and the same coverage line. Its last button is **Create rule** (not Turn into a bill): it opens Add rule for that goal on the summary with the threshold at every pay and the per-pay amount filled in, still editable. The prefilled per-pay amount uses the current user's pay frequency. Creating a rule on a Wish list goal makes it an Active goal (status worked out from saved versus target). _Avoid_: Simulator, what-if

**Contribution rule**:
An automation that moves part of a pay into a goal or a member's contribution whenever that pay exceeds a chosen threshold, as a fixed dollar amount or a percentage. New rules go to a goal ("Add a rule" flow, the same owner-only "Whose pay" rule as pay schedules); existing contribution rules keep working and stay editable. Since R11 (#398) a rule is opened in its own rule sheet (on/off, whose pay, goal, threshold, amount, delete), reached from the goal sheet's "Rules for this goal" and, and from a member's Payday sheet (the Settings Automation rules row went in R29, #416); deleting a goal deletes its rules. Whose pay can be changed only by an owner with 2+ members.
Contribution amounts left Settings in R21 (#408): a member's contribution (Joint Fund only: amount and how often, "Not set" when empty) and the rules that run on their pay now sit in that member's Payday sheet. Any member can edit any member's contribution. Planned change (#377): Automation rules also leave Settings (R29); rules are listed in the goal sheet ("Rules for this goal", add pre-targeted to that goal). No header pills.
_Avoid_: Auto-save rule, transfer rule

**Suggest Split** (built in R23, #410):
The income-proportional calculator: each member's share is their monthly-normalised income divided by household income, times total monthly bills (bills, expenses and active fixed rules). It opens from the **Compare split** pill in the Payday header, in both payment modes, as an animated pop-up with three steps: Income (weekly pay), Share (% of household income), then Contribute (Joint Fund) or Cover (Direct Pay). Bars grow and numbers count up (instant with Reduce Motion). Joint Fund ends "Contribute $X a week" with an Apply pill per member that sets their contribution at their own pay frequency. Direct Pay ends "Cover X% of each bill" with one household "Apply to N bills" pill that fills split rows only for bills still on the default (a known assignee and no non-assignee split above $0; paused bills included, finished one-offs skipped): each other member covers their % of the bill (2 decimals) and the assignee takes the remainder. Bills with a custom split are left alone and the pop-up says how many; expenses are not touched. A failed Apply shows the shared red line (`setContribution` throws since R23). A variable-pay member blocks it if any of their variable schedules lacks an average (fewer than 2 confirmed pays); each schedule's average is converted at its own frequency and summed (R19). Rules in `src/lib/suggestSplit.ts`.
_Avoid_: Fair split, auto-split

**Household total**:
The recurring amount the household commits to across bills, expenses and active fixed-dollar contribution rules, shown at whichever frequency is selected on the Bills page. Percentage rules are left out because the next pay's surplus is unknown. Shown as the Total bar on the Bills page, which adds a muted line "N paused or finished, not counted" whenever any bills are excluded under Counts toward totals.
Built in R14 (#401, ships with the redesign): the Bills page shows a muted split line under it ("Bills · Expenses · Goals"). While any filter or search is active it becomes the **Filtered total** ("N of M items"): only the listed rows count, paused and finished bills count as 0, and goal contributions drop out because they cannot be filtered. The Dashboard always uses the unfiltered Household total.
_Avoid_: Weekly draw, Bills total, Budget, Allowance

**Counts toward totals**:
The one rule for whether a bill is included in the Total bar, weekly surplus and bill splits, the Dashboard verdict and contributions. The rule excludes only paused bills and finished one-offs (a one-off whose saved date has passed), the bills showing a neutral label ("Paused" or "One-off") instead of a date, so dateless bills count.
_Avoid_: Active bill, included bill

### Household verdict

**Verdict** (R25, #412):
The Dashboard header's plain-language answer to "are my bills covered?", in whole dollars a week. Bills here means counted bills plus expenses (paused bills and finished one-offs are left out; goal rules are not bills, so they are left out too). It checks two halves and the worse one wins. Half 1, pay: every pay schedule at its latest logged amount (else its saved amount) against bills, in both payment modes; Joint Fund contributions are not counted as income. Half 2: Joint Fund = member contributions against bills; Direct Pay = bills and expenses nobody pays for (a bill with an assignee counts as covered; otherwise only up to the sum of its splits; an expense is covered by its assignee or by its percentage splits, capped at 100%). A half is short only when the rounded gap is below zero. Short on either half reads red "Short $X a week" (X is the larger gap) with a muted line naming the half; otherwise no pay reads grey "Set up your pay", Joint Fund with no contributions reads grey "Set up contributions", no bills reads grey "Add your bills", and everything else reads lime "Bills covered" with the spare ("$140 a week left after bills."). Short beats grey, and grey is never red. Always weekly, whatever frequency the Bills page shows (the two Dashboard stat slides below it show their dollars in the Bills page frequency, but take their colour from this weekly check). The Impact calculator asks the same rule "and with this plan?". Replaced the health score (0 to 100), the Household Health card, Fully Funded and its other status labels. Rule in `src/lib/verdict.ts`; look and layout in `project/pages/dashboard.md` of the design doc.
_Avoid_: Score, grade

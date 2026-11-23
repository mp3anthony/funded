# Money: Income and pay

Pay, pay rules, bonuses and how money comes in.

**Payday**:
A day a member gets paid, and the page where pay is scheduled, logged and reviewed.
_Avoid_: Salary day, income day

**Pay schedule**:
A member's recurring pay, with a next pay date, a frequency, and either a fixed amount or a variable one entered each time.
Any household member may view any member's pay schedule and edit its pay type, frequency, next date and amount (decided 2026-10-04); changing whose pay it is belongs to an owner with 2+ members (app rule).
Adding: a member adds their own; only the household owner can add one for someone else (the New pay schedule flow asks "Whose pay" only of an owner, and only when 2+ members have joined). This is an app rule, not a database one (#396).
A monthly pay schedule on the 29th-31st lands on the last day of a shorter month; once saved there it stays on that day until edited (#298).
_Avoid_: Income source, pay plan, salary

**Log Pay**:
Recording that a scheduled pay has arrived, once its pay date has come. The pay shows in the Payday "Needs you" strip ("Log pay" for fixed pay, "Enter amount" for variable); tapping it opens one small card.
A known amount asks "Did $1,850 land?" with the pill "Yes, it landed", plus "Different amount" (swaps the card to an Amount box and optional Notes) and "Didn't get paid". With no known amount the card asks "How much did <name> get?".
Anyone in the household can log anyone's pay. The date logged is today in the household timezone.
_Avoid_: Add income, record pay, deposit

**Pending pay**:
A pay the app logged automatically because its date passed without anyone logging it, waiting for a member to confirm or correct the amount.
A Pending pay is added to history only once its pay day has ended unlogged (logging on the day writes straight to history), by the Payday page on load and by the reminder cron even if nobody opens the app.
A fixed-pay Pending is prefilled with the schedule amount; a variable-pay Pending has no amount (`pay_history.amount` is NULL, shown as "Amount needed"; only a Pending pay may have a NULL amount).
A Pending pay sits in the Payday "Needs you" strip with a "Confirm" pill that opens the same card as Log Pay ("Did $1,850 land?", or an Amount box when there is no amount), and a daily notification repeats until it is confirmed.
Confirming a Pending pay runs the member's rules and the surplus suggestion exactly like logging a pay by hand, once, with the confirmed amount (#454; skipping a Pending pay runs nothing).
Deleting a pay from history only removes the record: the schedule's next pay date is never changed (decided with Anthony, because a row's date is not always the scheduled date). To redo a pay, edit the schedule's next date.
_Avoid_: Unconfirmed income, draft pay, missed pay

**Pay history**:
The History section at the bottom of Payday: a filter chip ("Everyone · 3 months") opens a pop-up with a tick box per member that has any pay on record (at least one stays ticked) and a period (4 weeks, 3 months, 12 months, All;
default 3 months, not remembered).
Under it a chart with one coloured line per ticked member (confirmed pays only; a Pending pay is not on the chart and a note says how many are left out).
With one member a dashed line marks their average and the totals read Total, Pays, Average; with several, each member's period total and their share of the household's pay in that period (everyone, not just the ticked) sit under the chart.
The list below is the same people and period, newest first, Pending included (its tick opens the Confirm Pay card), 15 at a time with Show more. Line colours follow the member order and are fixed per member. No chart library: plain SVG.
Rules live in `src/lib/payChart.ts`.
Each row has a round note icon (filled when the pay has a note, quieter "Add note" when not) that opens a **Pay note** pop-up: the note, editable by anyone, Save greyed until changed, toast "Note saved"; notes only, no edit history,
empty text saves as no note.
A bonus row carries a small "Bonus" tag (see Bonus payment).
_Avoid_: Recent pay history, contributor filter, income report

**Member pay card**:
A member's slide in the Payday carousel (swipe, dots, turns by itself with a pause button).
Shows their name and avatar, the amount of their next pay (grey when it is a variable-pay estimate), a ring that fills toward the next pay ("Due now" and lime on or after pay day) and a line like "Fortnightly · in 5 days";
a member with 2+ pay schedules gets a tab per schedule.
Tapping the card opens that member's sheet: pay schedules (each opens the pay schedule sheet), "Add pay schedule", Contribution (Joint Fund) and Rules.
A member with no pay shows a grey "Set up <name>'s pay" card (only for themselves, or for an owner with 2+ members). Rules live in `src/lib/paydayCards.ts`.
_Avoid_: Income tile, payee card

**Needs you**:
The strip at the top of Payday, shown only when something needs action: a pay whose date has come (Log pay / Enter amount) or a Pending pay to confirm.
Oldest pay date first, a Pending pay before a due pay on the same day, hidden when empty. Shows every member's pay, not only the viewer's. Rules live in `src/lib/needsYou.ts`.
_Avoid_: Inbox, to-do

**Didn't get paid**:
The ghost pill on the Log / Confirm Pay card, for a pay that did not arrive. It asks "Skip this pay?" (red pill "Skip pay"), then toasts "Pay skipped". Skipping a due pay moves the schedule on to its next date and logs nothing.
Skipping a Pending pay deletes that row and leaves the schedule date alone, so the reminder job cannot recreate it. Nothing is kept as a "skipped" record: it is not in history and not in the average pay.
_Avoid_: Cancel pay, missed pay, void

**Average pay** (shown on the Payday member card):
For a variable-pay schedule (per schedule, not per member), the average of its last 4 confirmed pays, ignoring Pending pays; needs at least 2 confirmed, else "Not enough pays yet". Rule lives in `src/lib/payHistory.ts` (`averagePay`).
A variable-pay member card shows it in grey with "Estimate from your last 4 pays" (or "Not enough pays yet"). Replaced the old last-3-pays rule, which counted Pending $0 rows.
_Avoid_: Typical pay, expected pay

**Bonus payment**:
A one-off income logged from the Payday "+" (the "+" asks first: "Add a schedule" or "Add a bonus payment").
Whose pay (only with 2+ members; anyone can log for any accepted member), Amount, Date (today or earlier, household time), then a summary with optional Notes and "Save bonus".
Saved as a confirmed pay with no schedule and `is_bonus` true (`logBonus`): it moves no next pay date and runs no rules or surplus suggestion.
It shows in history (with a "Bonus" tag), on the chart line and in totals and shares, but not in weekly income, the verdict, a schedule's average pay (the single-member dashed Average also leaves it out), rules or surplus.
Deleting it works like any history row. Not the same as Surplus.
_Avoid_: Extra pay, one-off pay, windfall

**Surplus**:
Pay that comes in well above a member's average (see Average pay), which the app offers to allocate to a goal. The dashboard also shows a weekly surplus, which is income left after bills.
_Avoid_: Extra, leftover (a Bonus payment is a different thing: a one-off income, not a pay above average)

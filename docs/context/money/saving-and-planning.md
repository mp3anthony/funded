# Money: Saving and planning

Goals, contribution rules and planning ahead.

**Goal**:
A savings target with a name and an amount to reach, shown on the Goals page. Goals are never called funds, and never sinking funds.
_Avoid_: Funds, fund, sinking fund, savings pot

**Wish list goal** (renamed from "Just tracking", #472):
A goal kept only as a note of what something costs, with nothing being saved toward it.
Shown in the Goals page Wish list group with name and cost only (Check impact is in the goal sheet), no ring or pace; never counted in any total, goal suggestions or milestone reminders, and never on the Dashboard goal cards.
Stored in the existing goal status (today `paused`), so no schema change.
Chosen in the Add goal flow's first question ("What type of goal?"), and switchable later in the goal sheet's Type row (#398; switching keeps the saved amount and any rules); the Goals page,
the places that count money and the Dashboard leave it out.
Rules that already target a Wish list goal keep running and still count in the Bills Household total (known interim, see `docs/lessons.md`). The other type is an **Active goal** (was "Saving").
"Type" replaced "Kind" as the row and question word. "Wish List" is not a category any more: an old row that still carries it reads as Other.
Stored values are unchanged (`kind: "saving" | "tracking"`, status `paused`). _Avoid_: Just tracking, Saving goal, Kind, Paused goal, wish item

**Impact calculator**:
A read-only pop-up on the Bills page ("Check impact", the chip after Filter) answering what a possible payment plan or subscription would do to the household.
Inputs: optional name, payment amount, how often (default monthly), and number of payments or Ongoing.
Shows the extra cost per week, fortnight, month and year, for a fixed count the total and how long it runs, the Household total now beside the new one (in the Bills page frequency, ignoring filters), and a coverage line ("Still covered",
"Short $12 a week", or "Add your pay to check this" when there is no income).
The coverage line is the Dashboard verdict run before and after adding the plan: covered stays "Still covered", a plan that turns covered into short says "tips you over", and when the household was already short it says so.
Saves nothing; "Turn into a bill" closes it and opens the Add flow at Name, prefilled: Ongoing becomes a Subscriptions bill; a fixed count becomes a Temporary bill with the note "N payments, then it stops",
because the app cannot yet create bills that end.
On the Goals page it only opens from a Wish list goal's sheet (there is no Check impact chip beside Filter any more), in **goal mode**: Still to save (target minus saved, never below $0, editable),
Save it over N payments at a chosen frequency (default monthly), no Name and no Ongoing, no Household total.
It shows "Takes $X of your $Y left a week" (the verdict's weekly leftover, or "You're already $N a week short" / "Add your pay to check this"),
the cost per pay at the pay frequency the rule will run on (for example $400 over 12 monthly payments on fortnightly pay is $15.38 a pay), and the same coverage line.
Its last button is **Create rule** (not Turn into a bill): it opens Add rule for that goal on the summary with the threshold at every pay and the per-pay amount filled in, still editable.
The prefilled per-pay amount uses the current user's pay frequency. Creating a rule on a Wish list goal makes it an Active goal (status worked out from saved versus target). _Avoid_: Simulator, what-if

**Contribution rule**:
An automation that moves part of a pay into a goal or a member's contribution whenever that pay exceeds a chosen threshold, as a fixed dollar amount or a percentage.
New rules go to a goal ("Add a rule" flow, the same owner-only "Whose pay" rule as pay schedules); existing contribution rules keep working and stay editable.
A rule is opened in its own rule sheet (on/off, whose pay, goal, threshold, amount, delete), reached from the goal sheet's "Rules for this goal" and from a member's Payday sheet (the Settings Automation rules row went, #416);
deleting a goal deletes its rules.
Whose pay can be changed only by an owner with 2+ members.
Contribution amounts left Settings: a member's contribution (Joint Fund only: amount and how often, "Not set" when empty) and the rules that run on their pay now sit in that member's Payday sheet.
Any member can edit any member's contribution. Automation rules left Settings; rules are listed in the goal sheet ("Rules for this goal", add pre-targeted to that goal). No header pills.
_Avoid_: Auto-save rule, transfer rule

**Suggest Split**:
The income-proportional calculator: each member's share is their monthly-normalised income divided by household income, times total monthly bills (bills, expenses and active fixed rules).
It opens from the **Compare split** pill in the Payday header, in both payment modes, as an animated pop-up with three steps: Income (weekly pay), Share (% of household income), then Contribute (Joint Fund) or Cover (Direct Pay).
Bars grow and numbers count up (instant with Reduce Motion). Joint Fund ends "Contribute $X a week" with an Apply pill per member that sets their contribution at their own pay frequency.
Direct Pay ends "Cover X% of each bill" with one household "Apply to N bills" pill that fills split rows only for bills still on the default (a known assignee and no non-assignee split above $0; paused bills included,
finished one-offs skipped): each other member covers their % of the bill (2 decimals) and the assignee takes the remainder.
Bills with a custom split are left alone and the pop-up says how many; expenses are not touched. A failed Apply shows the shared red line (`setContribution` throws).
A variable-pay member blocks it if any of their variable schedules lacks an average (fewer than 2 confirmed pays); each schedule's average is converted at its own frequency and summed. Rules in `src/lib/suggestSplit.ts`.
_Avoid_: Fair split, auto-split

**Household total**:
The recurring amount the household commits to across bills, expenses and active fixed-dollar contribution rules, shown at whichever frequency is selected on the Bills page.
Percentage rules are left out because the next pay's surplus is unknown. Shown as the Total bar on the Bills page, which adds a muted line "N paused or finished, not counted" whenever any bills are excluded under Counts toward totals.
The Bills page shows a muted split line under it ("Bills · Expenses · Goals").
While any filter or search is active it becomes the **Filtered total** ("N of M items"): only the listed rows count, paused and finished bills count as 0, and goal contributions drop out because they cannot be filtered.
The Dashboard always uses the unfiltered Household total.
_Avoid_: Weekly draw, Bills total, Budget, Allowance

**Counts toward totals**:
The one rule for whether a bill is included in the Total bar, weekly surplus and bill splits, the Dashboard verdict and contributions.
The rule excludes only paused bills and finished one-offs (a one-off whose saved date has passed), the bills showing a neutral label ("Paused" or "One-off") instead of a date, so dateless bills count.
_Avoid_: Active bill, included bill

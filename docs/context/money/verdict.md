# Money: Household verdict

The Dashboard answer to whether the bills are covered.

**Verdict**:
The Dashboard header's plain-language answer to "are my bills covered?", in whole dollars a week.
Bills here means counted bills plus expenses (paused bills and finished one-offs are left out; goal rules are not bills, so they are left out too). It checks two halves and the worse one wins.
Half 1, pay: every pay schedule at its latest logged amount (else its saved amount) against bills, in both payment modes; Joint Fund contributions are not counted as income.
Half 2: Joint Fund = member contributions against bills; Direct Pay = bills and expenses nobody pays for (a bill with an assignee counts as covered; otherwise only up to the sum of its splits;
an expense is covered by its assignee or by its percentage splits, capped at 100%).
A half is short only when the rounded gap is below zero.
Short on either half reads red "Short $X a week" (X is the larger gap) with a muted line naming the half; otherwise no pay reads grey "Set up your pay", Joint Fund with no contributions reads grey "Set up contributions",
no bills reads grey "Add your bills", and everything else reads lime "Bills covered" with the spare ("$140 a week left after bills.").
Short beats grey, and grey is never red. Always weekly, whatever frequency the Bills page shows (the two Dashboard stat slides below it show their dollars in the Bills page frequency, but take their colour from this weekly check).
The Impact calculator asks the same rule "and with this plan?". Replaced the health score (0 to 100), the Household Health card, Fully Funded and its other status labels.
Rule in `src/lib/verdict.ts`; look and layout in `project/pages/dashboard.md` of the design doc.
_Avoid_: Score, grade

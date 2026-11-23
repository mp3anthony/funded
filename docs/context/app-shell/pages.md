# App shell: The pages

What each page of the app shows and does.

**Dashboard**:
The home page. One screen, no scroll. Top to bottom: the **Tip strip**, then the header verdict (a status dot, "Bills covered" or "Short $X a week", and one muted line),
then one slot holding the **Stats carousel** (or the Finish setting up card for owners while setup is unfinished; the slot stays empty for an owner until that card's dismissed flag has loaded, so stats never flash first),
then the **Bills carousel** and the **Goals carousel** (see below).
The Stats carousel is two auto-turning slides: **Pay vs bills** (both modes) and, in Joint Fund, **Contributions vs bills** or, in Direct Pay, **Splits vs shares** (what the splits leave uncovered).
Each shows one big number (spare, or short in red), a bar of how much of the pay or contributions the bills use, and a "Pay $X · Bills $Y" line; with nothing to compare it is grey with an empty bar and says what to set up.
The dollars follow the Bills page "amounts as" choice (read-only here, remembered per person on this device); the header stays weekly and sets each slide's colour, so they never disagree.
The **Bills carousel** is swipe-only, one card at a time with dots and a "View all" pill to the Bills page: the next five manual bills still to pay (not Auto-Pay, not paused, not Paid, no Paused or One-off label),
overdue first by plain date order, bills with no due date last A to Z.
A card shows the name, the countdown ("Due in 3 days", red "2 days overdue") and the bill's own amount with its frequency (not converted to the Bills page frequency); tapping it opens the bill's sheet.
The **Goals carousel** is the same shape: every goal: Active goals with a weekly rule contribution first, then other Active goals, then Wish list goals, most progress first within each group (Reached goals included),
each with a progress ring around the goal icon, "$saved of $target" and "+$X a week" from its rules (grey "No contribution set" when none; Wish list cards show no weekly line); "View all" goes to the Goals page.
With nothing to list, each shows one plain card ("No manual bills to pay", "No goals yet", only when there are no goals at all). The old collapse arrows are gone.
_Avoid_: Home screen, overview, summary

**Bills page**:
Where bills and expenses are listed, filtered, added and paid, with amounts shown in a chosen frequency.
The page has a Household total hero labelled with the chosen frequency ("Household total · weekly"; the frequency is picked in the Filter card as its first section, remembered per person on this device; the Dashboard adopts it too),
and one Filter chip (plus Check impact) opening a card with Frequency, Type, Due, Category and Edit Order, categories expanded by default with count and subtotal, rows alphabetical within a category,
a countdown line on each bill ("Due in 3 days", "2 days overdue", "Paid") and a one-tap tick to mark an unpaid manual bill paid (rows, countdown, tick, A to Z order, category subtotal,
which categories are closed remembered per person on this device; expense amounts follow the chosen frequency; paying early also shows an Undo message).
Layout in `project/pages/bills.md` of the design doc.
_Avoid_: Budget page, expenses page

**Goals page**:
Where goals are listed, added and topped up. It is called Goals in the navigation and everywhere users read.
The header total is the money saved across Active goals only ("Total saved", or "Filtered total" with a category chosen), with "N goals · $X still to go" under it.
One Filter chip opens a Category card with Apply, Reset and Edit order (a draft until Apply).
Active goals are grouped by category (the person's own order), progress high to low with Reached goals last; categories start open, and which ones a person closed is remembered per person on this phone (separate from Bills).
Each Active goal row has a progress ring around the goal icon, "$saved of $target", a **pace line** and a round "+" that adds money (gone once the goal is Reached).
The pace line reads "On track for 12 Dec", "Needs $40 a week for 12 Dec", "+$25 a week" (a rule is feeding it, no date), "Deadline reached" (past its date and not Reached), "Reached", or a grey "No contribution set".
Pace counts only active fixed-dollar rules on fixed-amount pay above the rule's threshold; percentage rules and variable pay are left out.
Wish list goals sit in their own **Wish list** group last (name and cost only; Check impact lives in the goal sheet), which ignores the Category filter and starts open. Layout in `project/pages/goals.md` of the design doc.
_Avoid_: Funds page, Funds, savings page

**Payday page**:
Where pay schedules are set up, pay is logged, pending pay is confirmed and recent pay history is read.
_Avoid_: Income page, pay page

**Settings**:
The page opened from the avatar top right (back circle to leave).
Top to bottom: an identity card that opens Profile (nickname editable, email shown read-only because it is the login); **Preferences** (Notifications row reading "Daily at 9:00 AM" with a green dot when push is live, or "Off,
tap to turn on" with an amber dot; Appearance as an inline Light / Dark / System choice, no pop-up); **Members** (round avatars, Owner / Member pills, a Pending pill, an owner-only round "+" that opens the Join code pop-up;
owners tap another member to edit them); **Household** (Household name, Payment mode, Timezone: owners tap to change, everyone else sees plain rows with an "Owner only" note); a Help card (Updates, which shows the app version,
Getting started, Report an issue); a quiet Log out card; and Leave household (Delete household for the only member) in its own red card at the bottom, above a small copyright line.
Contribution amounts live in the Payday member sheet and rules in the goal and member sheets (the old Automation rules row is gone).
Payment mode is one pop-up with two cards; picking the other shows the warning and a red "Switch to X" pill. Layout in `project/pages/settings.md` of the design doc.
_Avoid_: Preferences, profile page, admin

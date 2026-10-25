# App shell

What people see and touch around the money: the installed app, its pages and the surfaces that tell them what changed.

## Language

### The app

**Installed app**:
Funded added to a phone's home screen so it opens like a native app. It is designed mobile-first for this case and also works in a browser.
_Avoid_: Website, PWA (in user-facing copy), web app, native app

**Loading wheel**:
The logo with a spinner shown while the household's data loads, with a manual Retry if the connection fails.
_Avoid_: Splash screen, skeleton, spinner (as a name)

**Toast**:
The brief message that appears above the bottom navigation after an action, sometimes with one button such as Undo.
_Avoid_: Snackbar, banner, alert

**Step flow** (planned, #377):
A pop-up that creates something one question at a time: a card per essential field, then a summary card with an "Optional details" group of rows, then the main action. Choice cards are dropdowns that explain each option. Used for Add (bill or expense), Add Goal, New Pay Schedule and Add Rule. Smaller pop-ups are a single card (1-2 fields) or a confirm dialog (see Single card, Detail sheet, Confirm dialog below). Detail sheets double as the edit screen: each row opens that one field's card. Detail in `project/pages/popups.md` of the design doc. Closing after typing asks first in a confirm dialog. After a save the toast confirms ("Bill added") and the new row briefly highlights.
_Avoid_: Wizard, form, modal (as names)

**Single card** (planned, #377):
One pop-up card at the bottom of the screen for one or two fields, with one main pill (and sometimes a quieter second pill such as "Skip"). Saving shows "Saving…"; a failure keeps the card open with a red line and "Try again".
_Avoid_: Modal, form

**Detail sheet** (bills and expenses built in R10, #397; goal and pay schedule planned, #377):
A pop-up that shows one item (a bill, goal or pay schedule) as tappable rows. The main actions sit on top and a red Delete pill sits at the bottom; Delete asks first in a confirm dialog. A row opens a single card to edit that one field. There is no Edit button. A bill's status line (Paid, Paused, "Paid for September") is read-only; its Mark as Paid, Undo payment and Pause actions sit on top and wait for the save ("Saving…"), showing a red line if it fails. An expense sheet has no actions.
_Avoid_: Edit form, details modal

**Confirm dialog** (planned, #377):
A small centred question with Cancel and a red action pill, used before anything destructive. Replaces the browser's own confirm box. Settings (Delete household, Switch payment mode, Leave household), member (Remove member's second question) and profile photo confirms moved to it in R13; the Payday confirms are still the browser box (planned, #377).
_Avoid_: Alert, prompt

**Bottom navigation** (planned, #377):
The floating pill at the bottom with four slots: Dashboard, Payday, Bills, Goals. A lime ring slides to the current page. It fades away while the keyboard is open. Settings and Updates sit under no slot, so the ring fades out there.
_Avoid_: Tab bar, nav bar, menu

**Page header** (planned, #377):
The large title at the top of every page: Syne title, optional subtitle, a back circle on drill-down pages, a "+" circle where the page adds things, the bell (only when unread) and the avatar, which opens Settings. It scrolls with the page.
_Avoid_: Title bar, top bar

**Carousel** (built in R04, #391; first used by the Dashboard stats in R26):
A row of cards you swipe sideways, with dots underneath. Some turn by themselves and have a pause button; with Reduce Motion they change without sliding. Used for Dashboard stats (built, R26), Dashboard Bills and Goals (R27), and Payday contributors (built, R21).
_Avoid_: Slider, swiper, ticker

**Theme**:
The Light, Dark or System appearance, chosen under Appearance in Settings.
_Avoid_: Mode (payment mode is a different thing), skin, colour scheme

### The pages

**Dashboard**:
The home page. One screen, no scroll (planned, #377): a tip strip, a verdict header, the stats carousel (or the Finish setting up card for owners while setup is unfinished), a Bills carousel and a Goals carousel. Today (R26 built) the page is the **Tip strip**, then the header verdict (a status dot, "Bills covered" or "Short $X a week", and one muted line), then one slot holding the **Stats carousel** (or the Finish setting up card for owners while setup is unfinished; the slot stays empty for an owner until that card's dismissed flag has loaded, so stats never flash first), then the **Bills carousel** and the **Goals carousel** (R27 built, see below). The Stats carousel is two auto-turning slides: **Pay vs bills** (both modes) and, in Joint Fund, **Contributions vs bills** or, in Direct Pay, **Splits vs shares** (what the splits leave uncovered). Each shows one big number (spare, or short in red), a bar of how much of the pay or contributions the bills use, and a "Pay $X · Bills $Y" line; with nothing to compare it is grey with an empty bar and says what to set up. The dollars follow the Bills page "amounts as" choice (read-only here, remembered per person on this device); the header stays weekly and sets each slide's colour, so they never disagree. The **Bills carousel** is swipe-only, one card at a time with dots and a "View all" pill to the Bills page: the next five manual bills still to pay (not Auto-Pay, not paused, not Paid, no Paused or One-off label), overdue first by plain date order, bills with no due date last A to Z. A card shows the name, the countdown ("Due in 3 days", red "2 days overdue") and the bill's own amount with its frequency (not converted to the Bills page frequency); tapping it opens the bill's sheet. The **Goals carousel** is the same shape: up to three Active goals not yet Reached, most progress first, each with a progress ring around the goal icon, "$saved of $target" and "+$X a week" from its rules (grey "No contribution set" when none); "View all" goes to the Goals page. Wish list goals never show. With nothing to list, each shows one plain card ("No manual bills to pay", "No active goals yet"). The old collapse arrows are gone. Recent Activity was never built and is dropped from this entry.
_Avoid_: Home screen, overview, summary

**Bills page**:
Where bills and expenses are listed, filtered, added and paid, with amounts shown in a chosen frequency.
Planned redesign (#377; until it ships, today's page stands): a Household total hero labelled with the chosen frequency ("Household total · weekly"; the frequency is picked in the Filter card as its first section, remembered per person on this device, built in R14, moved into the card in F04; the Dashboard adopts it in R26), and one Filter chip (plus Check impact) opening a card with Frequency, Type, Due, Category and Edit Order, categories expanded by default with count and subtotal, rows alphabetical within a category, a countdown line on each bill ("Due in 3 days", "2 days overdue", "Paid") and a one-tap tick to mark an unpaid manual bill paid (built in R15 parts: rows, countdown, tick, A to Z order, category subtotal, which categories are closed remembered per person on this device; expense amounts follow the frequency pills; paying early also shows an Undo message). Detail in `project/pages/bills.md` of the design doc.
_Avoid_: Budget page, expenses page

**Goals page**:
Where goals are listed, added and topped up. It is called Goals in the navigation and everywhere users read.
Built in R17 (#404), ships with the redesign. The header total is the money saved across Active goals only ("Total saved", or "Filtered total" with a category chosen), with "N goals · $X still to go" under it. One Filter chip opens a Category card with Apply, Reset and Edit order (a draft until Apply, F04). Active goals are grouped by category (the person's own order), progress high to low with Reached goals last; categories start open, and which ones a person closed is remembered per person on this phone (separate from Bills). Each Active goal row has a progress ring around the goal icon, "$saved of $target", a **pace line** and a round "+" that adds money (gone once the goal is Reached). The pace line reads "On track for 12 Dec", "Needs $40 a week for 12 Dec", "+$25 a week" (a rule is feeding it, no date), "Deadline reached" (past its date and not Reached), "Reached", or a grey "No contribution set". Pace counts only active fixed-dollar rules on fixed-amount pay above the rule's threshold; percentage rules and variable pay are left out. Wish list goals sit in their own **Wish list** group group last (name and cost only; Check impact lives in the goal sheet), which ignores the Category filter and starts open. Detail in `project/pages/goals.md` of the design doc.
_Avoid_: Funds page, Funds, savings page

**Payday page**:
Where pay schedules are set up, pay is logged, pending pay is confirmed and recent pay history is read.
_Avoid_: Income page, pay page

**Settings**:
The page opened from the avatar top right (back circle to leave). Top to bottom: an identity card that opens Profile (nickname editable, email shown read-only because it is the login); **Preferences** (Notifications row reading "Daily at 9:00 AM" with a green dot when push is live, or "Off, tap to turn on" with an amber dot; Appearance as an inline Light / Dark / System choice, no pop-up); **Members** (round avatars, Owner / Member pills, a Pending pill, an owner-only round "+" that opens the Join code pop-up; owners tap another member to edit them); **Household** (Household name, Payment mode, Timezone: owners tap to change, everyone else sees plain rows with an "Owner only" note); a Help card (Updates, which shows the app version, Getting started, Report an issue); a quiet Log out card; and Leave household (Delete household for the only member) in its own red card at the bottom, above a small copyright line. Contribution amounts live in the Payday member sheet and rules in the goal and member sheets (the old Automation rules row is gone). Payment mode is one pop-up with two cards; picking the other shows the warning and a red "Switch to X" pill. Detail in `project/pages/settings.md` of the design doc.
_Avoid_: Preferences, profile page, admin

### Keeping people informed

**Updates card**:
Replaced the old What's new popup. A compact card pinned above the bottom navigation, shown once on the first open of a new version: version and date, the newest entry's first 2 bullets, "+N more" when there are extras, and a "See updates" link. It does not block the app. It stays until the person taps X or the link, with no auto-dismiss and nothing left behind. Toasts overlay it. Its title and link text use the page's new name (#311).
_Avoid_: Popup, modal, banner, update dialog, What's new popup

**Tip strip** (R26, #413):
A slim pill at the top of the Dashboard showing one tip at a time from `src/lib/dashboard-tips.ts`, fading to the next every 6 seconds (instant with Reduce Motion, paused while the app is in the background). The X hides it until the app is next opened (kept for this session only); it replaces the old scrolling tips ticker that sat above the bottom navigation.
_Avoid_: Ticker, banner

**Finish setting up card**:
A Dashboard card, shown to household owners only, listing what the household has none of yet (payday, bill, goal). Each row taps through to that page's add form. It leaves by itself once all three exist and returns if one goes missing again, unless that person tapped X, which hides it for good on every device. Takes the Stats carousel's slot at the top of the Dashboard (R26).
Fed by whatever the Setup hub left unticked at the end of Onboarding (R32). The sign-in screens (`/login`, `/reset-password`, `/confirm-email`, offline) get the new look with no behaviour change. Detail in `project/pages/onboarding.md` of the design doc.
_Avoid_: Checklist, setup wizard, onboarding (the first-run flow)

**Updates page**:
The page with two tabs: Patch Notes, listing what changed in each version newest first (showing only the newest month's entries) in plain user-facing language, and Known Issues. Named Updates (formerly the Patch notes page / What's new) because it also lists known issues, which are not "new". Reached from Settings as "Updates". Its tabs keep their names. The route stays `/patch-notes`. Old patch-note entries that say "What's new" stay as history.
_Avoid_: What's new, Patch notes page, changelog, release notes, version history

**Getting started guide**:
A short public page of optional missions covering the basics, reached from Settings as "Getting started" and linked from the Hazardous Schematics website. Anyone can open it, signed in or not.
_Avoid_: Tutorial, onboarding (the first-run setup, a different thing), tester guide

**Known Issues tab**:
A tab on the patch notes page listing problems already known, so members do not track issues themselves. Each item shows only a short plain-language note, never a title or number.
_Avoid_: Issue tracker, bug list, status page

**Known issue**:
A problem we already know about, flagged with the `known-issue` label on GitHub and given a short "User-facing blurb" for members to read. In anything members read, call it a "known issue" or "problem we know about", never "bug", "open issue" or "ticket".
_Avoid_: Bug (in member-facing text), open issue, ticket

**Issue report**:
What a member sends from Settings > Report an issue: a title, a description and an optional screenshot. An "issue" can be a bug, something that looks wrong, an idea, or something confusing. It reaches Anthony as a filed GitHub issue labelled `from-app`. Not the same as a known issue. (Renamed from "Bug report" in #261, R12.)
_Avoid_: Bug report, feedback, support ticket, complaint

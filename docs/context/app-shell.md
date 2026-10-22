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

**Carousel** (planned, #377):
A row of cards you swipe sideways, with dots underneath. Some turn by themselves and have a pause button; with Reduce Motion they change without sliding. Used for Dashboard stats, Dashboard Bills and Goals, and Payday contributors.
_Avoid_: Slider, swiper, ticker (the Dashboard ticker stays separate until it is replaced)

**Theme**:
The Light, Dark or System appearance, chosen under Appearance in Settings.
_Avoid_: Mode (payment mode is a different thing), skin, colour scheme

### The pages

**Dashboard**:
The home page. One screen, no scroll (planned, #377): a tip strip, a verdict header, the stats carousel (or the Finish setting up card for owners while setup is unfinished), a Bills carousel and a Goals carousel. Today it shows the Finish setting up card, Household Health, Upcoming Bills and Savings Goals. Recent Activity was never built and is dropped from this entry.
_Avoid_: Home screen, overview, summary

**Bills page**:
Where bills and expenses are listed, filtered, added and paid, with amounts shown in a chosen frequency.
Planned redesign (#377; until it ships, today's page stands): a Household total hero with frequency pills (remembered per person on this device, built in R14; the Dashboard adopts it in R26), filter chips for Type and Due plus a Filter pill for Category and Edit Order, categories expanded by default with count and subtotal, rows alphabetical within a category, a countdown line on each bill ("Due in 3 days", "2 days overdue", "Paid") and a one-tap tick to mark an unpaid manual bill paid. Detail in `project/pages/bills.md` of the design doc.
_Avoid_: Budget page, expenses page

**Goals page**:
Where goals are listed, added and topped up. It is called Goals in the navigation and everywhere users read.
Planned (#377): Saving goals show a progress ring and a pace line, with a quiet Wish list group of Just tracking goals at the bottom; a "+" circle on each Saving row tops it up. Detail in `project/pages/goals.md` of the design doc.
_Avoid_: Funds page, Funds, savings page

**Payday page**:
Where pay schedules are set up, pay is logged, pending pay is confirmed and recent pay history is read.
_Avoid_: Income page, pay page

**Settings**:
The page for account, notifications, appearance, household settings, members, Updates, the Getting started guide, issue reporting and leaving the household.
Planned change (#377): opened from the avatar top right. An identity card opens Profile (email read-only); Preferences (Notifications, inline Light/Dark/System Appearance); Members with a "+" to invite (Join code sheet); owner-only Household settings (Household name, Payment mode, Timezone; members see them read-only); a Help card (Updates, Getting started, Report an issue); Leave household in its own red card. Contribution amounts and Automation rules move to Payday and Goals. Detail in `project/pages/settings.md` of the design doc.
_Avoid_: Preferences, profile page, admin

### Keeping people informed

**Updates card**:
Replaced the old What's new popup. A compact card pinned above the bottom navigation, shown once on the first open of a new version: version and date, the newest entry's first 2 bullets, "+N more" when there are extras, and a "See updates" link. It does not block the app. It stays until the person taps X or the link, with no auto-dismiss and nothing left behind. While it shows, the dashboard tips ticker is hidden; Toasts still overlay it. Its title and link text use the page's new name (#311).
_Avoid_: Popup, modal, banner, update dialog, What's new popup

**Finish setting up card**:
A Dashboard card, shown to household owners only, listing what the household has none of yet (payday, bill, goal). Each row taps through to that page's add form. It leaves by itself once all three exist and returns if one goes missing again, unless that person tapped X, which hides it for good on every device. Sits at the top of the Dashboard.
Planned (#377): fed by whatever the Setup hub left unticked at the end of Onboarding. The sign-in screens (`/login`, `/reset-password`, `/confirm-email`, offline) get the new look with no behaviour change. Detail in `project/pages/onboarding.md` of the design doc.
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

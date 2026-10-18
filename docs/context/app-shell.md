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

**Theme**:
The Light, Dark or System appearance, chosen under Appearance in Settings.
_Avoid_: Mode (payment mode is a different thing), skin, colour scheme

### The pages

**Dashboard**:
The home page. One screen, no scroll (planned redesign, #377): a tip strip, a verdict header, the stats carousel (or the Finish setting up card for owners while setup is unfinished), a Bills carousel and a Goals carousel. Today it shows the Finish setting up card, Household Health, Upcoming Bills and Savings Goals.
_Avoid_: Home screen, overview, summary

**Bills page**:
Where bills and expenses are listed, filtered, added and paid, with amounts shown in a chosen frequency.
_Avoid_: Budget page, expenses page

**Goals page**:
Where goals are listed, added and topped up. It is called Goals in the navigation and everywhere users read.
_Avoid_: Funds page, Funds, savings page

**Payday page**:
Where pay schedules are set up, pay is logged, pending pay is confirmed and recent pay history is read.
_Avoid_: Income page, pay page

**Settings**:
The page for account, notifications, appearance, household settings, members, Updates, the Getting started guide, bug reporting and leaving the household.
_Avoid_: Preferences, profile page, admin

### Keeping people informed

**Updates card**:
Replaced the old What's new popup. A compact card pinned above the bottom navigation, shown once on the first open of a new version: version and date, the newest entry's first 2 bullets, "+N more" when there are extras, and a "See updates" link. It does not block the app. It stays until the person taps X or the link, with no auto-dismiss and nothing left behind. While it shows, the dashboard tips ticker is hidden; Toasts still overlay it. Its title and link text use the page's new name (#311).
_Avoid_: Popup, modal, banner, update dialog, What's new popup

**Finish setting up card**:
A Dashboard card, shown to household owners only, listing what the household has none of yet (payday, bill, goal). Each row taps through to that page's add form. It leaves by itself once all three exist and returns if one goes missing again, unless that person tapped X, which hides it for good on every device. Sits at the top of the Dashboard.
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

**Bug report**:
A problem a member submits from Settings with a title and description, which reaches Anthony as a filed issue.
_Avoid_: Feedback, support ticket, complaint

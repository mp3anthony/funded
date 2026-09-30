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
The home page, showing Household Health, Upcoming Bills, Savings Goals and Recent Activity.
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
The page for account, notifications, appearance, household settings, members, What's new, bug reporting and leaving the household.
_Avoid_: Preferences, profile page, admin

### Keeping people informed

**What's new popup**:
The popup shown once, the first time someone opens the app on a new version, pointing to the latest changes.
_Avoid_: Update dialog, changelog modal, release popup

**Patch notes page**:
The page listing what changed in each version, newest first, in plain user-facing language. It is reached from Settings as "What's new".
_Avoid_: Changelog, release notes, version history

**Known Issues tab** (planned, #152):
A tab on the patch notes page listing problems already known, so members do not track issues themselves.
_Avoid_: Issue tracker, bug list, status page

**Bug report**:
A problem a member submits from Settings with a title and description, which reaches Anthony as a filed issue.
_Avoid_: Feedback, support ticket, complaint

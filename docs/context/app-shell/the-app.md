# App shell: The app

The installed app and the building blocks around every page.

**Installed app**:
Funded added to a phone's home screen so it opens like a native app. It is designed mobile-first for this case and also works in a browser.
_Avoid_: Website, PWA (in user-facing copy), web app, native app

**Loading wheel**:
The logo with a spinner shown while the household's data loads, with a manual Retry if the connection fails.
_Avoid_: Splash screen, skeleton, spinner (as a name)

**Reset link landing** (#490):
A password reset link always ends on the new-password page, wherever it first lands, and never opens the app. Setting the new password signs the person out everywhere; they sign in again with it.
_Avoid_: Recovery login

**Toast**:
The brief message that appears above the bottom navigation after an action, sometimes with one button such as Undo.
_Avoid_: Snackbar, banner, alert

**Step flow**:
A pop-up that creates something one question at a time: a card per essential field, then a summary card with an "Optional details" group of rows, then the main action. Choice cards are dropdowns that explain each option.
Used for Add (bill or expense), Add Goal, New Pay Schedule and Add Rule. Smaller pop-ups are a single card (1-2 fields) or a confirm dialog (see Single card, Detail sheet, Confirm dialog below).
Detail sheets double as the edit screen: each row opens that one field's card. Layout in `project/pages/popups.md` of the design doc. Closing after typing asks first in a confirm dialog.
After a save the toast confirms ("Bill added") and the new row briefly highlights.
_Avoid_: Wizard, form, modal (as names)

**Single card**:
One pop-up card at the bottom of the screen for one or two fields, with one main pill (and sometimes a quieter second pill such as "Skip"). Saving shows "Saving…"; a failure keeps the card open with a red line and "Try again".
_Avoid_: Modal, form

**Detail sheet**:
A pop-up that shows one item (a bill, goal or pay schedule) as tappable rows. The main actions sit on top and a red Delete pill sits at the bottom; Delete asks first in a confirm dialog. A row opens a single card to edit that one field.
There is no Edit button. A bill's status line (Paid, Paused, "Paid for September") is read-only; its Mark as Paid, Undo payment and Pause actions sit on top and wait for the save ("Saving…"), showing a red line if it fails.
An expense sheet has no actions.
_Avoid_: Edit form, details modal

**Confirm dialog**:
A small centred question with Cancel and a red action pill, used before anything destructive. Replaces the browser's own confirm box.
Settings (Delete household, Switch payment mode, Leave household), member (Remove member's second question) and profile photo confirms moved to it.
The one browser confirm left is deleting a row in Pay history (known item, `docs/lessons.md`).
_Avoid_: Alert, prompt

**Bottom navigation**:
The floating pill at the bottom with four slots: Dashboard, Payday, Bills, Goals. A lime ring slides to the current page. It fades away while the keyboard is open. Settings and Updates sit under no slot, so the ring fades out there.
_Avoid_: Tab bar, nav bar, menu

**Page header**:
The large title at the top of every page: Syne title, optional subtitle, a back circle on drill-down pages, a "+" circle where the page adds things, the bell (only when unread) and the avatar, which opens Settings. It scrolls with the page.
_Avoid_: Title bar, top bar

**Carousel** (first used by the Dashboard stats):
A row of cards you swipe sideways, with dots underneath. Some turn by themselves and have a pause button; with Reduce Motion they change without sliding. Used for Dashboard stats, Dashboard Bills and Goals, and Payday contributors.
_Avoid_: Slider, swiper, ticker

**Theme**:
The Light, Dark or System appearance, chosen under Appearance in Settings.
_Avoid_: Mode (payment mode is a different thing), skin, colour scheme

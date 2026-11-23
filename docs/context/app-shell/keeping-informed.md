# App shell: Keeping people informed

Toasts, patch notes, issue reports and other surfaces that tell people what changed.

**Updates card**:
Replaced the old What's new popup.
A compact card pinned above the bottom navigation, shown once on the first open of a new version: version and date, the newest entry's first 2 bullets, "+N more" when there are extras, and a "See updates" link. It does not block the app.
It stays until the person taps X or the link, with no auto-dismiss and nothing left behind. Toasts overlay it. Its title and link text use the page's new name (#311).
_Avoid_: Popup, modal, banner, update dialog, What's new popup

**Tip strip**:
A slim pill at the top of the Dashboard showing one tip at a time from `src/lib/dashboard-tips.ts`, fading to the next every 6 seconds (instant with Reduce Motion, paused while the app is in the background).
The X hides it until the app is next opened (kept for this session only); it replaces the old scrolling tips ticker that sat above the bottom navigation.
_Avoid_: Ticker, banner

**Finish setting up card**:
A Dashboard card, shown to household owners only, listing what the household has none of yet (payday, bill, goal). Each row taps through to that page's add form.
It leaves by itself once all three exist and returns if one goes missing again, unless that person tapped X, which hides it for good on every device. Takes the Stats carousel's slot at the top of the Dashboard.
Fed by whatever the Setup hub left unticked at the end of Onboarding. The sign-in screens (`/login`, `/reset-password`, `/confirm-email`, offline) get the new look with no behaviour change. Layout in `project/pages/onboarding.md` of the design doc.
_Avoid_: Checklist, setup wizard, onboarding (the first-run flow)

**Updates page**:
The page with two tabs: Patch Notes, listing what changed in each version newest first (showing only the newest month's entries) in plain user-facing language, and Known Issues.
Named Updates (formerly the Patch notes page / What's new) because it also lists known issues, which are not "new". Reached from Settings as "Updates". Its tabs keep their names. The route stays `/patch-notes`.
Old patch-note entries that say "What's new" stay as history.
_Avoid_: What's new, Patch notes page, changelog, release notes, version history

**Getting started guide**:
A short public page of optional missions covering the basics, reached from Settings as "Getting started" and linked from the Hazardous Schematics website. Anyone can open it, signed in or not.
_Avoid_: Tutorial, onboarding (the first-run setup, a different thing), tester guide

**Known Issues tab**:
A tab on the patch notes page listing problems already known, so members do not track issues themselves. Each item shows only a short plain-language note, never a title or number.
_Avoid_: Issue tracker, bug list, status page

**Known issue**:
A problem we already know about, flagged with the `known-issue` label on GitHub and given a short "User-facing blurb" for members to read.
In anything members read, call it a "known issue" or "problem we know about", never "bug", "open issue" or "ticket".
_Avoid_: Bug (in member-facing text), open issue, ticket

**Issue report**:
What a member sends from Settings > Report an issue: a title, a description and an optional screenshot. An "issue" can be a bug, something that looks wrong, an idea, or something confusing.
It reaches Anthony as a filed GitHub issue labelled `from-app`. Not the same as a known issue. (Renamed from "Bug report" in #261.)
_Avoid_: Bug report, feedback, support ticket, complaint

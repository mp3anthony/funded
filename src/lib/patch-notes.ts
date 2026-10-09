/**
 * Patch notes — hand-written, user-facing blurbs per release (Slice 14,
 * #113). Kept deliberately separate from HANDOFF.md: HANDOFF is written for
 * the Orchestrator (internal, technical, ticket-tracking); this file is
 * written for the end user reading "What's new" inside the app.
 *
 * Every version bump gets an entry here as part of the same PR — including
 * backend-only or under-the-hood changes with no visible UI difference.
 * Write it in plain language a non-technical user would understand, framed
 * around the practical effect (what's more reliable, what behaves
 * differently) rather than the mechanism. A change with genuinely zero
 * user-facing effect still gets a short one-line entry saying so (e.g.
 * "cleaned up something behind the scenes — no visible change") rather than
 * being skipped.
 *
 * List newest first. `version` must match `APP_VERSION` in
 * `src/lib/version.ts` for the entry to be treated as "new" by the
 * first-open popup.
 */

export interface PatchNoteEntry {
  /** Must match the app's version string (see src/lib/version.ts). */
  version: string;
  /** Short, human-readable date, e.g. "September 2026". No need to be exact to the day. */
  date: string;
  /** Short, plain-English bullet points — no internal ticket numbers or jargon. */
  highlights: string[];
}

export const patchNotes: PatchNoteEntry[] = [
  {
    version: "0.9.65",
    date: "October 2026",
    highlights: [
      "Auto-pay bills now show an Invoice Date that keeps up with the Due Date, instead of getting stuck on an old month.",
      "Invoice dates on older manual bills that had fallen behind have been corrected.",
      "A bill with no invoice date no longer shows \"N/A\" in its popup; the row is simply left out.",
    ],
  },
  {
    version: "0.9.64",
    date: "October 2026",
    highlights: [
      "Behind-the-scenes tightening of who can change household and member details. Nothing looks different.",
      "If joining a household with a code fails because of a connection problem, you now get a clear \"try again\" message.",
    ],
  },
  {
    version: "0.9.63",
    date: "October 2026",
    highlights: [
      "Paused bills no longer send reminders, and any reminders already waiting for a bill are cleared when you pause it.",
      "Resuming a bill whose due date passed while it was paused now moves it on to its next due date instead of showing it as Overdue.",
      "Editing a paused bill no longer un-pauses it.",
    ],
  },
  {
    version: "0.9.62",
    date: "October 2026",
    highlights: [
      "The credit at the bottom of Settings now reads © 2026 HazardousSchematics.com.",
    ],
  },
  {
    version: "0.9.61",
    date: "October 2026",
    highlights: [
      "New: a Getting started guide. Find it in Settings, between What's new and Report a bug.",
      "It walks through the basics in nine short missions. They're all optional, so try as many or as few as you like.",
    ],
  },
  {
    version: "0.9.60",
    date: "October 2026",
    highlights: [
      "Paying a bill early, or paying a one-off or paused bill, now quietly clears its reminder instead of erasing it. If you then mark it unpaid, you won't get the same reminder pushed to you again.",
      "If you've already cleared or paid a reminder, a scheduled push for it no longer arrives later that day.",
    ],
  },
  {
    version: "0.9.59",
    date: "October 2026",
    highlights: [
      "The notification setting formerly called \"Lodge Payment Reminders\" is now \"Confirm Pending Pay Reminders\". It works exactly the same, just with a clearer name.",
    ],
  },
  {
    version: "0.9.58",
    date: "October 2026",
    highlights: [
      "Open a bill and you can now see which month you last paid it for, under Paid By (for example \"Paid for September\"). The year shows too if it wasn't this year. Bills you haven't paid since this update show nothing yet.",
      "There's a new Undo payment button on the bill. It puts the bill back on the date you paid it for, as unpaid. It undoes one payment only.",
      "Heads up: if that date has already passed, the bill shows as Overdue again and overdue reminders start again.",
    ],
  },
  {
    version: "0.9.57",
    date: "September 2026",
    highlights: [
      "Marking an overdue bill (or one due today) as paid now moves it straight on to its next due date, instead of sitting on the old date for a while.",
      "A short message confirms which month you paid and when the bill is next due. It has an Undo button for a few seconds straight after you tap, in case you tapped by mistake — after that, you can still fix it by editing the bill's dates.",
      "Paying a bill early works the same as before: it stays marked paid until its due date comes around.",
    ],
  },
  {
    version: "0.9.56",
    date: "September 2026",
    highlights: [
      "Marking a bill as paid no longer jumps its due date ahead straight away. It stays on the date you paid it for, then moves on to the next due date by itself once that date arrives.",
      "Bills you've paid now come back as due for the next round, so they show up in Upcoming Bills and send reminders again instead of going quiet for good.",
      "Invoice dates now move forward along with the due date.",
      "Auto-pay bills no longer have a Mark as Paid button, since they pay themselves.",
      "Mark as Unpaid now just undoes the tap and leaves the date alone.",
      "Editing a paid bill no longer marks it unpaid.",
      "Bills that were stuck on Paid have been reset to their next upcoming due date.",
    ],
  },
  {
    version: "0.9.55",
    date: "September 2026",
    highlights: [
      "Tapping a goal notification now opens that goal straight away on the Goals page, instead of just the page.",
      "If the goal has since been deleted, you'll just land on the Goals page as normal.",
    ],
  },
  {
    version: "0.9.54",
    date: "September 2026",
    highlights: [
      "Tapping a payday reminder now opens the box to log that pay straight away — or, if the pay has already been saved as waiting for confirmation, the box to confirm it.",
      "Tapping a \"confirm your payment\" reminder now opens that exact payment ready to confirm.",
      "If there's nothing left to do (already logged or confirmed), you'll just land on Payday as normal.",
    ],
  },
  {
    version: "0.9.53",
    date: "September 2026",
    highlights: [
      "Fixed the Report a Bug form on some Android phones losing everything you'd typed (and closing itself) if the screen went blank for a moment while picking a screenshot. If that happens again, your title and description will now come back automatically — even if you took a while choosing the screenshot — you'll just need to re-attach it, since the picked photo itself can't be recovered.",
    ],
  },
  {
    version: "0.9.52",
    date: "September 2026",
    highlights: [
      "Tapping a notification now takes you to the right place: payday and \"confirm your payment\" reminders open Payday, goal milestones open Goals, and bill reminders still open that bill.",
      "Payday, payment-confirmation and goal notifications in the in-app notification list can now be tapped too, just like bill reminders.",
      "Notifications now show the new light Funded icon.",
    ],
  },
  {
    version: "0.9.51",
    date: "September 2026",
    highlights: [
      "On iPhone, the Funded home-screen icon should now show the new light icon instead of the old black one. If yours still looks dark, remove Funded from your home screen and add it again from Safari.",
      "The small Funded icon shown in browser tabs now uses the new light design too.",
    ],
  },
  {
    version: "0.9.50",
    date: "September 2026",
    highlights: [
      "When you're viewing only Expenses on the Bills page, the Due Date filter is now greyed out and switches back to \"All\" — expenses don't have due dates, so it wouldn't do anything (and could otherwise hide all your expenses).",
      "The \"nothing found\" message on the Bills page now says whether it's bills or expenses it couldn't find, based on the Type you've picked.",
    ],
  },
  {
    version: "0.9.49",
    date: "September 2026",
    highlights: [
      "New Type filter on the Bills page: pick Bills or Expenses to see just one or the other, or All to see both together like before. It works alongside search and the other filters, and the total at the top stays the same whichever you pick.",
    ],
  },
  {
    version: "0.9.48",
    date: "September 2026",
    highlights: [
      "New light app icon: browser tabs now show it when your device is in light mode, and it is the icon used when you add Funded to your Home Screen. Icons already on your Home Screen will not change on their own. To get the new one, remove the app and add it again.",
    ],
  },
  {
    version: "0.9.47",
    date: "September 2026",
    highlights: [
      "Added a light version of the app icon behind the scenes — no visible change.",
    ],
  },
  {
    version: "0.9.46",
    date: "September 2026",
    highlights: [
      "Simplified the bug report confirmation screen.",
    ],
  },
  {
    version: "0.9.45",
    date: "September 2026",
    highlights: [
      "Fixed the screenshot attach button on the Report a Bug page not responding on some devices, and added support for more photo formats (including iPhone's default HEIC format and GIFs). Also made the \"invalid file\"/\"too large\" message easier to spot if a screenshot can't be attached.",
      "On the Bills page, filtering by Due Date (This Week, This Month, or Overdue) used to make all your expenses vanish from the list with no explanation. Expenses don't have a due date to filter by, so they're now clearly labelled as hidden while one of those filters is active, instead of silently disappearing.",
    ],
  },
  {
    version: "0.9.44",
    date: "September 2026",
    highlights: [
      "Fixed the weekly income, weekly surplus, and health score on your dashboard not updating when your pay comes in higher or lower than usual, for people on a fixed pay schedule (e.g. back pay, a bonus, or a short pay). It now always reflects your latest logged pay, just like it already did for variable-pay schedules.",
    ],
  },
  {
    version: "0.9.43",
    date: "September 2026",
    highlights: [
      "Fixed a bug where some auto-pay bills were incorrectly showing up as \"overdue\" in push notifications, even though they weren't actually overdue.",
      "Notifications that arrive late because your device was offline or asleep now show the time they were actually sent, instead of showing up as \"just now\" whenever your phone catches up.",
    ],
  },
  {
    version: "0.9.42",
    date: "September 2026",
    highlights: [
      "When you minimise both Upcoming Bills and Savings Goals on your dashboard, a small scrolling tips banner now appears above the bottom nav with quick pointers on using the app. Hover over it to pause the scroll, and tap the X to dismiss it — it'll come back next time you minimise both cards again.",
    ],
  },
  {
    version: "0.9.41",
    date: "September 2026",
    highlights: [
      "Bill reminder notifications should now arrive closer to the time you actually chose in your settings, instead of sometimes showing up at a random point during the day.",
    ],
  },
  {
    version: "0.9.40",
    date: "September 2026",
    highlights: [
      "The in-app bug report form now shows a live character count under the description box while you type, so it's easy to see how much you've written.",
      "Also quietly keeps better notes in the background while you're filling out a bug report, so if the description field ever stops accepting input again, there's actual evidence to track down what happened.",
    ],
  },
  {
    version: "0.9.39",
    date: "September 2026",
    highlights: [
      "Fixed a bug where automatic-payment bills were incorrectly sending \"overdue\" notifications every day, even for bills that weren't actually overdue — the app's own Bills list and health score never showed them as overdue, so the notifications no longer will either. A bill that's genuinely overdue (even accounting for its regular repeat schedule) will still keep reminding you daily until it's paid.",
    ],
  },
  {
    version: "0.9.38",
    date: "September 2026",
    highlights: [
      "The sign-in, sign-up, forgot-password, password-reset, and confirm-your-email screens now ease into view smoothly instead of popping straight onto the screen.",
      "Error and success messages on those screens (wrong password, link expired, password updated, etc.) now fade and settle into place instead of appearing abruptly.",
      "Small touch-ups so buttons on those screens — like the show/hide password eye icon — respond with the same subtle press feedback used everywhere else in the app.",
    ],
  },
  {
    version: "0.9.37",
    date: "September 2026",
    highlights: [
      "Polished animations across Bills, Payday, and the account/profile menus to feel more consistent with the rest of the app — dropdowns, sheets, and pop-ups now ease in at the same speed and rhythm everywhere instead of a mix of slightly different timings.",
      "Bills and expenses now gently fade into view when you expand a category, matching how the Goals list already behaves.",
    ],
  },
  {
    version: "0.9.36",
    date: "September 2026",
    highlights: [
      "The Goals page and the dashboard's Savings Goals card got a motion polish pass: categories and the goals list now expand and collapse smoothly instead of snapping open, and saved amounts / progress percentages count up smoothly when they change (like adding money to a goal) instead of jumping straight to the new number.",
      "Small touch-ups: a goal's row gives a gentle press feedback when tapped, and progress bars now ease into their new width at the same speed as the rest of the app.",
    ],
  },
  {
    version: "0.9.35",
    date: "September 2026",
    highlights: [
      "Notifications now show up right at the time you actually picked in \"Notify me at\", instead of sometimes arriving early.",
      "An overdue bill now reminds you every day until it's paid — before this fix, some overdue bills weren't reminding you at all, or only reminded you once.",
      "Notification Settings has a new toggle for these daily overdue reminders so you can turn them off if you'd rather not get them. Tapping a bill notification now takes you straight to the bill to mark it paid there, matching how the main Bills list works — the old snooze option and the in-list \"Mark Paid\" button have been removed.",
    ],
  },
  {
    version: "0.9.31",
    date: "September 2026",
    highlights: [
      "The weekly total on the Bills page (and the suggested-split calculation in Joint Fund settings) now actually includes your expenses and any active fixed-dollar goal-contribution rules, not just bills — so the number you pull into the joint account each week reflects everything real that needs to come out of it.",
    ],
  },
  {
    version: "0.9.30",
    date: "September 2026",
    highlights: [
      "When adding or editing an expense, you can now choose to split it by percentage across household members instead of assigning it to just one person — handy for shared costs like groceries. The app checks your percentages add up to 100% before letting you save.",
    ],
  },
  {
    version: "0.9.29",
    date: "September 2026",
    highlights: [
      "You can now add expenses, not just bills. A bill is a fixed cost like rent or a subscription; an expense is everyday variable spending like groceries or fuel, and both count toward your weekly amount needed. They now show together in one list on the Bills page, with a small tag on each row so you can tell which is which.",
      "Bills and expenses also got a visual polish pass, so the list is easier to scan at a glance.",
    ],
  },
  {
    version: "0.9.27",
    date: "September 2026",
    highlights: [
      "Notifications, notify time, and push status are now one \"Notifications\" row in Settings, instead of three separate ones.",
      "Smoother animations throughout — dialogs, the dashboard health numbers, and expand/collapse sections all feel a bit more polished now.",
    ],
  },
  {
    version: "0.9.23",
    date: "September 2026",
    highlights: [
      "You can now set your own preferred notification time in Settings — \"Notify me at\" is independent for each household member.",
      "New reminders: a nudge to log your pay once payday arrives, and a heads-up when a savings goal hits 25/50/75/100% of its target.",
    ],
  },
  {
    version: "0.9.22",
    date: "September 2026",
    highlights: [
      "Households outside Sydney can now set their own timezone in Settings, so bill and reminder due dates line up with your local day. Only the household owner can change it.",
    ],
  },
  {
    version: "0.9.21",
    date: "September 2026",
    highlights: [
      "You can now report a bug directly from Settings — add a title, a description, and an optional screenshot, and it goes straight to the development team.",
    ],
  },
  {
    version: "0.9.20",
    date: "September 2026",
    highlights: [
      "You can now see what's changed in each update — look for \"What's new\" in Settings.",
    ],
  },
  {
    version: "0.9.19",
    date: "September 2026",
    highlights: [
      "Fixed a bug where the app could feel stuck loading after losing and regaining an internet connection.",
      "The app now reliably updates itself to the latest version after every release, instead of sometimes hanging onto an old cached copy.",
    ],
  },
  {
    version: "0.9.18",
    date: "September 2026",
    highlights: ["Cleaned up an old, unused screen behind the scenes — no visible change."],
  },
  {
    version: "0.9.17",
    date: "September 2026",
    highlights: [
      "A brand-new household with no bills, goals, or contributions yet now shows a clear \"Not Set Up Yet\" status instead of a misleading fully-funded score.",
    ],
  },
  {
    version: "0.9.16",
    date: "September 2026",
    highlights: [
      "Fixed a rare bug where switching between household members in the same session could send a notification to the wrong household.",
    ],
  },
  {
    version: "0.9.15",
    date: "September 2026",
    highlights: [
      "Fixed a bug where joining a new household right after leaving one could occasionally leave behind old data that should have been cleaned up.",
    ],
  },
  {
    version: "0.9.14",
    date: "September 2026",
    highlights: [
      "Fixed a rare timing issue on slow connections where bills, goals, or members could briefly appear to vanish after reopening the app.",
    ],
  },
  {
    version: "0.9.13",
    date: "September 2026",
    highlights: [
      "Each account can now only belong to one household at a time, closing a loophole that could let someone accidentally join a second one.",
    ],
  },
  {
    version: "0.9.12",
    date: "August 2026",
    highlights: [
      "The Household Health card on your dashboard now starts expanded so you can see your numbers at a glance.",
      "Removed member avatars from the Payday page for a cleaner look.",
    ],
  },
];

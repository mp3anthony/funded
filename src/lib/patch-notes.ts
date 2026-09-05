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

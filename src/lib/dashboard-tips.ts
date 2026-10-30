/**
 * Dashboard tip strip content (#151, R26) — short, friendly tips about using
 * the app's actual features, shown one at a time in the strip at the top of
 * the Dashboard.
 *
 * Deliberately a flat, easily-editable list rather than scattered inline
 * JSX so the copy can be tweaked without touching the strip component, and
 * so it can become data-driven (contextual/per-user tips) later without a
 * rewrite. Static and non-contextual — see #151's "out of scope" list.
 */
// Staleness check: whenever a shipped feature renames, removes, or changes a
// user-facing flow, review this list and update/add/remove tips to match.
// Do this alongside the patch-notes update for that version bump — don't let
// tips drift from what the app actually does.
export const dashboardTips: string[] = [
  "Tip: Tap a bill on the Bills page to mark it paid, edit it or split it.",
  "Tip: Auto-pay bills stay off your Dashboard, so it only shows what you pay by hand.",
  "Tip: Add a goal on the Goals page to track a holiday or an emergency fund.",
  "Tip: Log your pay on Payday as soon as it lands to keep your numbers right.",
  "Tip: Pick your own \"Notify me at\" time in Settings, separate from the household.",
  "Tip: Groceries and fuel are expenses, not bills. Add one from the Bills page.",
  "Tip: The line at the top shows if your bills are covered this week.",
  "Tip: Split a shared bill or expense by percentage in a couple of taps.",
  "Tip: Found a problem? Report it from Settings, with an optional screenshot.",
  "Tip: Not sure you paid? Open the bill. Undo payment fixes a mis-tap.",
  "Tip: Tap Check impact on Bills to see what a new subscription would cost you.",
  "Tip: Pay day arrived? Tap it under Needs you on Payday when the money lands.",
  "Tip: Not saving yet? Add it as a Wish list goal and it waits there.",
  "Tip: Check \"Updates\" in Settings to see what's new.",
  "Tip: New to Funded? Settings > Getting started has a short guide.",
];

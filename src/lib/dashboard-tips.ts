/**
 * Dashboard tips ticker content (#151) — short, friendly tips about using
 * the app's actual features, shown in the bottom ticker banner when both
 * Upcoming Bills and Savings Goals are minimised.
 *
 * Deliberately a flat, easily-editable list rather than scattered inline
 * JSX so the copy can be tweaked without touching the ticker component, and
 * so it can become data-driven (contextual/per-user tips) later without a
 * rewrite. Static and non-contextual for this ticket — see #151's "out of
 * scope" list.
 */
// Staleness check: whenever a shipped feature renames, removes, or changes a
// user-facing flow, review this list and update/add/remove tips to match.
// Do this alongside the patch-notes update for that version bump — don't let
// tips drift from what the app actually does.
export const dashboardTips: string[] = [
  "Tip: Tap a bill on the Bills page to mark it paid, edit it, or split it across household members.",
  "Tip: Set up auto-pay bills separately from manual ones — auto-pay bills won't clutter your Upcoming Bills reminders.",
  "Tip: Add a savings goal on the Goals page to start tracking progress toward things like a holiday or an emergency fund.",
  "Tip: Log your pay on the Payday page as soon as it lands so your weekly numbers stay accurate.",
  "Tip: You can set your own \"Notify me at\" time in Settings, independent from the rest of your household.",
  "Tip: Everyday variable spending — groceries, fuel — belongs as an expense, not a bill. Add one from the Bills page.",
  "Tip: The Household Health card on your dashboard gives you an at-a-glance read on how funded you are this week.",
  "Tip: Split a shared bill or expense by percentage across household members in a couple of taps.",
  "Tip: Found a bug? Report it straight from Settings — add a title, description, and an optional screenshot.",
  "Tip: Check \"What's new\" in Settings any time to see what's changed in the latest update.",
];

/**
 * Pure helpers for the Setup hub, the last onboarding screen (R32, #419).
 * Import-free so node:test can run them directly (see onboarding.test.mjs).
 * The Welcome and create-household screens live in onboardingCreate.ts.
 */

export type HubRowKey = "pay" | "bill" | "goal";

export interface HubRow {
  key: HubRowKey;
  label: string;
}

/** The three optional rows, in the order the hub shows them. */
export const HUB_ROWS: readonly HubRow[] = [
  { key: "pay", label: "Add your pay" },
  { key: "bill", label: "Add a bill" },
  { key: "goal", label: "Add a goal" },
];

export type HubDone = Record<HubRowKey, boolean>;

export function emptyHubDone(): HubDone {
  return { pay: false, bill: false, goal: false };
}

/** A new done-map with `key` ticked. A ticked row stays ticked if added to again. */
export function markDone(done: HubDone, key: HubRowKey): HubDone {
  return { ...done, [key]: true };
}

/** True when the row has a saved item (shows the green tick). */
export function rowDone(done: HubDone, key: HubRowKey): boolean {
  return done[key] === true;
}

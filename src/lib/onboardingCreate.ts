/**
 * Pure rules for the full-screen create-household flow (R31, #418). Import-free
 * so node:test can run them directly (see onboardingCreate.test.mjs).
 */

/** Same cap as the Household name card in Settings. */
export const HOUSEHOLD_NAME_MAX = 60;

export type PaymentModeValue = "direct" | "joint";

export const DEFAULT_PAYMENT_MODE: PaymentModeValue = "direct";

export const PAYMENT_MODE_OPTIONS: readonly { value: PaymentModeValue; label: string; description: string }[] = [
  {
    value: "direct",
    label: "Direct Pay",
    description:
      "No shared account; each person pays their share of each bill directly. Suits flatmates or couples with separate money.",
  },
  {
    value: "joint",
    label: "Joint Fund",
    description:
      "Everyone puts money into one shared account and bills are paid from it. Suits households with a joint account.",
  },
];

export const PAYMENT_MODE_NOTE = "You can change this later in Settings.";

export type CreateScreen = "name" | "mode";

export const CREATE_SCREENS: readonly CreateScreen[] = ["name", "mode"];

/** Name card is valid once it has a non-blank name. */
export function isHouseholdNameValid(name: string): boolean {
  return name.trim().length > 0;
}

/** The name as it is saved: trimmed and capped. */
export function cleanHouseholdName(name: string): string {
  return name.trim().slice(0, HOUSEHOLD_NAME_MAX);
}

/** Joint Fund is the `is_joint_fund` column; Direct Pay is false. */
export function isJointFund(mode: PaymentModeValue): boolean {
  return mode === "joint";
}

/** The screen after `from`, or null on the last one (where Next creates the household). */
export function nextScreen(from: CreateScreen): CreateScreen | null {
  const i = CREATE_SCREENS.indexOf(from);
  return i >= 0 && i < CREATE_SCREENS.length - 1 ? CREATE_SCREENS[i + 1] : null;
}

/** The screen before `from`, or null on the first one (where Back returns to Welcome). */
export function prevScreen(from: CreateScreen): CreateScreen | null {
  const i = CREATE_SCREENS.indexOf(from);
  return i > 0 ? CREATE_SCREENS[i - 1] : null;
}

/** Whether Next on this screen can run: valid input, and not while a create is running. */
export function canContinue(screen: CreateScreen, args: { name: string; creating: boolean }): boolean {
  if (args.creating) return false;
  return screen === "name" ? isHouseholdNameValid(args.name) : true;
}

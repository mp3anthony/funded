/**
 * Remembered "amounts as" frequency for the Bills page (R14, #401).
 * Stored per person in this browser only (no database column, on purpose).
 *
 * Deliberately has ZERO imports so `frequencyPreference.test.mjs` can run it
 * under plain `node --test`. Erasable TypeScript syntax only.
 */

export type FrequencyType = "weekly" | "fortnightly" | "monthly" | "yearly";

export const DEFAULT_FREQUENCY: FrequencyType = "weekly";

export function isFrequency(v: unknown): v is FrequencyType {
  return v === "weekly" || v === "fortnightly" || v === "monthly" || v === "yearly";
}

function key(userId: string): string {
  return `funded:displayFrequency:${userId}`;
}

/** Saved choice for this person, or "weekly" if none / storage unavailable. */
export function loadFrequency(userId: string): FrequencyType {
  try {
    const raw = globalThis.localStorage?.getItem(key(userId));
    return isFrequency(raw) ? raw : DEFAULT_FREQUENCY;
  } catch {
    return DEFAULT_FREQUENCY;
  }
}

export function saveFrequency(userId: string, f: FrequencyType): void {
  try {
    globalThis.localStorage?.setItem(key(userId), f);
  } catch {
    // Private mode or blocked storage: the choice just won't be remembered.
  }
}

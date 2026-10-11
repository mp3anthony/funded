/**
 * Timezone for a newly created household (#249). Pure helpers, no app imports,
 * so they can be unit tested with node --test. Only call from user-triggered
 * async actions (never at module scope or render): the reader needs a browser.
 */

export const DEFAULT_HOUSEHOLD_TIMEZONE = "Australia/Sydney";

/** True only for a non-empty string that Intl.DateTimeFormat accepts as an IANA zone. */
export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.trim() === "") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The timezone the phone reports, or undefined if it cannot say. */
export function readDeviceTimezone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Timezone to save on a new household: the creating phone's zone if valid,
 * else Australia/Sydney. Never throws.
 */
export function resolveNewHouseholdTimezone(
  readDeviceTz: () => string | undefined = readDeviceTimezone
): string {
  try {
    const tz = readDeviceTz();
    if (isValidTimezone(tz)) return tz;
  } catch {
    // fall through to default
  }
  return DEFAULT_HOUSEHOLD_TIMEZONE;
}

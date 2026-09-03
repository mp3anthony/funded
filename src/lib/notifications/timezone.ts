const DEFAULT_TZ = 'Australia/Sydney';

/**
 * Returns the current calendar date in the given IANA timezone as a
 * 'YYYY-MM-DD' string. Falls back to Australia/Sydney if the timezone
 * is malformed so a single bad household row cannot crash the cron.
 */
export function todayInZone(tz: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }
}

/**
 * Returns the current hour-of-day (0-23) in the given IANA timezone.
 * Falls back to Australia/Sydney if the timezone is malformed, matching
 * `todayInZone`'s fallback behavior — a single bad household row must not
 * crash the cron.
 *
 * Used by the hourly push-reminders cron (Slice 11, #96 half B) to compare
 * a household's current local hour against each member's chosen
 * `notify_hour` (Slice 9, #97).
 */
export function hourInZone(tz: string, now = new Date()): number {
  try {
    return Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(now)
    );
  } catch {
    return Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: DEFAULT_TZ,
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(now)
    );
  }
}

/**
 * Whole-day difference (toYmd - fromYmd) between two 'YYYY-MM-DD' strings,
 * computed in UTC so it is unaffected by the runtime's local timezone.
 */
export function diffDaysYmd(fromYmd: string, toYmd: string): number {
  const d = (s: string) => Math.floor(Date.parse(s + 'T00:00:00Z') / 86400000);
  return d(toYmd) - d(fromYmd);
}

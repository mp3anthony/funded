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

/**
 * Returns the UTC offset (in milliseconds) of `tz` at the instant `date`,
 * expressed as (local-reading-of-`date`-in-`tz`, interpreted as UTC) minus
 * (`date`'s actual UTC epoch ms). E.g. for Australia/Sydney (+10/+11) this
 * is positive. Internal helper for `zonedDateAtHour`.
 */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUtcMs = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtcMs - date.getTime();
}

/**
 * Constructs "date `dateYmd` at local hour `hour`:00:00 in timezone `tz`",
 * returned as the equivalent UTC `Date`. Used by the daily push-reminders
 * cron (Slice 11 v2) to compute each reminder's `scheduled_for` from a
 * household's timezone and a user's chosen `notify_hour`.
 *
 * Uses the standard two-pass Intl.DateTimeFormat offset technique (no new
 * dependency): treat `dateYmd`+`hour` as if it were already UTC to get an
 * approximate instant, read that instant's actual offset in `tz`, then
 * subtract the offset to get the real instant. This is exact except across
 * a DST transition that falls exactly on the target local hour, which is
 * an acceptable trade-off for a once-a-day reminder timestamp (worst case
 * off by the DST delta, ~1 hour, on the specific handful of days per year
 * a household's local clock actually shifts).
 *
 * Falls back to Australia/Sydney if `tz` is malformed, matching
 * `todayInZone`/`hourInZone`'s fallback behavior.
 */
export function zonedDateAtHour(dateYmd: string, hour: number, tz: string): Date {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const guessMs = Date.UTC(y, (m || 1) - 1, d || 1, hour, 0, 0);
  try {
    const offset = tzOffsetMs(new Date(guessMs), tz);
    return new Date(guessMs - offset);
  } catch {
    const offset = tzOffsetMs(new Date(guessMs), DEFAULT_TZ);
    return new Date(guessMs - offset);
  }
}

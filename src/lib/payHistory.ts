/**
 * Pay history rules (R19, #406): Pending pays, the average of the last 4
 * confirmed pays, and the helpers the reminder and cron code share.
 *
 * Deliberately has ZERO imports so `payHistory.test.mjs` can run it under plain
 * `node --test`. Erasable TypeScript syntax only (no enums, no parameter
 * properties). Dates are "YYYY-MM-DD" strings; `today` is passed in (the
 * household-local day), never read from the clock here.
 */

/** How many of the newest confirmed pays the average uses. */
export const AVERAGE_PAY_WINDOW = 4;
/** Fewer confirmed pays than this and there is no average yet. */
export const AVERAGE_PAY_MIN_CONFIRMED = 2;

export interface PayRow {
  id?: string;
  pay_schedule_id: string | number | null;
  pay_date: string;
  created_at?: string | null;
  amount: number | null;
  status?: string | null;
}

export interface PayScheduleLike {
  id: string | number;
  member_id: string | number;
  frequency?: string | null;
  is_fixed_amount: boolean;
  amount: number | null;
}

/** A Pending pay is one the person has not confirmed yet. */
export function isPendingPay(h: { status?: string | null }): boolean {
  return h.status === "pending";
}

/** Newest first: pay date, then created_at as the tie-break. Never relies on fetch order. */
function newestFirst(a: PayRow, b: PayRow): number {
  if (a.pay_date !== b.pay_date) return a.pay_date < b.pay_date ? 1 : -1;
  const ac = a.created_at ?? "";
  const bc = b.created_at ?? "";
  if (ac === bc) return 0;
  return ac < bc ? 1 : -1;
}

/**
 * Average of the newest 4 confirmed pays for one schedule, or null with fewer
 * than 2. Anything not 'pending' counts as confirmed (a null status is
 * confirmed); rows with no amount are skipped.
 */
export function averagePay(scheduleId: string | number, history: readonly PayRow[]): number | null {
  const confirmed = history
    .filter(
      (h) =>
        String(h.pay_schedule_id ?? "") === String(scheduleId) &&
        !isPendingPay(h) &&
        h.amount !== null &&
        h.amount !== undefined,
    )
    .sort(newestFirst)
    .slice(0, AVERAGE_PAY_WINDOW);
  if (confirmed.length < AVERAGE_PAY_MIN_CONFIRMED) return null;
  const sum = confirmed.reduce((s, h) => s + Number(h.amount), 0);
  return sum / confirmed.length;
}

/** Amount of the newest row for a schedule that has an amount (Pending rows with no amount are skipped). */
export function latestLoggedAmount(scheduleId: string | number, history: readonly PayRow[]): number | null {
  const rows = history
    .filter(
      (h) =>
        String(h.pay_schedule_id ?? "") === String(scheduleId) &&
        h.amount !== null &&
        h.amount !== undefined,
    )
    .sort(newestFirst);
  return rows.length > 0 ? Number(rows[0].amount) : null;
}

/** The Pending rows to insert for paydays that passed unlogged. */
export function buildPendingPayRows(
  schedule: PayScheduleLike,
  missedDates: readonly string[],
  householdId: string | number,
) {
  const known = schedule.is_fixed_amount && Number(schedule.amount) > 0;
  return missedDates.map((payDate) => ({
    household_id: householdId,
    member_id: schedule.member_id,
    pay_schedule_id: schedule.id,
    amount: known ? Number(schedule.amount) : null,
    pay_date: payDate,
    notes: known
      ? "Automatically logged missed pay"
      : "Automatically logged missed pay — amount needs review",
    status: "pending" as const,
  }));
}

/** One Confirm Pending Pay reminder per pay per day, so it repeats daily until handled. */
export function lodgePaymentDedupeKey(historyId: string | number, todayYmd: string): string {
  return `${historyId}-lodge_payment-${todayYmd}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

/** "yesterday's pay", "Tuesday's pay", "last week's pay", "your pay from 4 Oct", or "your pay". */
export function pendingPayPhrase(payYmd: string, todayYmd: string): string {
  const pay = (payYmd ?? "").slice(0, 10);
  if (!YMD_RE.test(pay) || !YMD_RE.test(todayYmd ?? "")) return "your pay";
  const diff = dayNumber(todayYmd) - dayNumber(pay);
  if (diff < 0) return "your pay";
  if (diff === 0) return "today's pay";
  if (diff === 1) return "yesterday's pay";
  if (diff <= 6) return `${WEEKDAYS[new Date(dayNumber(pay) * 86400000).getUTCDay()]}'s pay`;
  if (diff <= 13) return "last week's pay";
  const [, m, d] = pay.split("-").map(Number);
  return `your pay from ${d} ${MONTHS[m - 1]}`;
}

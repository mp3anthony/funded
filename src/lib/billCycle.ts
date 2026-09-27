/**
 * Bill cycle maths for the paid-bill rollover (Slice 17, #187).
 *
 * A bill marked Paid stays Paid (same due date) until that due date arrives
 * in the household's timezone; then it rolls exactly ONE cycle: status back
 * to unpaid, `due_date` +1 cycle, `invoice_date` +1 cycle in lockstep. The
 * rollover is persisted by the push-reminders cron route and, as a
 * belt-and-braces catch-up, by AppContext's load path — both share this
 * module so they can never disagree.
 *
 * Deliberately has ZERO imports: `src/lib/billCycle.test.mjs` runs it under
 * plain `node --test` (Node's built-in TypeScript type stripping), so it must
 * not pull in path aliases, React, or anything else. Keep it that way — and
 * keep it to erasable TypeScript syntax only (no enums/namespaces).
 */

/** Status a rolled bill returns to. `mapBillFromDb` recomputes Overdue from the date. */
export const UNPAID_STATUS = 'Due Soon';

/** Minimal shape of a `bills` DB row that the rollover reads. */
export interface RolloverBillRow {
  status?: string | null;
  is_recurring?: boolean | null;
  is_paused?: boolean | null;
  due_date?: string | null;
  invoice_date?: string | null;
  frequency?: string | null;
  payment_type?: string | null;
}

/** Columns to write back when a bill rolls. */
export interface RolloverPatch {
  status: string;
  due_date?: string;
  invoice_date?: string | null;
}

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toYmd(y: number, m0: number, d: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}

/** Days in month `m0` (0-based) of year `y`, via UTC so no DST involvement. */
function daysInMonth(y: number, m0: number): number {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
}

/**
 * Moves a 'YYYY-MM-DD' date forward `n` whole cycles of `frequency`.
 *
 * - weekly: +7n days; fortnightly: +14n days (pure UTC day maths, so DST
 *   weekends can't shift the result by a day).
 * - monthly (and any unknown / mixed-case frequency): +n months counted from
 *   the BASE date, clamping the day to the target month's length
 *   (Jan 31 +1 → Feb 28/29, Jan 31 +2 → Mar 31). This matches Postgres
 *   `date + n * interval '1 month'`, which the one-off data-fix migration uses.
 * - yearly: +12n months with the same clamp (Feb 29 +1 → Feb 28).
 *
 * Input that isn't a 'YYYY-MM-DD' date is returned unchanged.
 */
export function addCycles(ymd: string, frequency: string | null | undefined, n: number): string {
  const match = YMD_RE.exec(ymd ?? '');
  if (!match) return ymd;
  const y = Number(match[1]);
  const m0 = Number(match[2]) - 1;
  const d = Number(match[3]);

  const freq = (frequency ?? '').toLowerCase();

  if (freq === 'weekly' || freq === 'fortnightly') {
    const step = freq === 'weekly' ? 7 : 14;
    const t = new Date(Date.UTC(y, m0, d + step * n));
    return toYmd(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  }

  const months = freq === 'yearly' ? 12 * n : n;
  const total = y * 12 + m0 + months;
  const ty = Math.floor(total / 12);
  const tm0 = total - ty * 12;
  const td = Math.min(d, daysInMonth(ty, tm0));
  return toYmd(ty, tm0, td);
}

/**
 * Returns the columns to write if `bill` should roll over today, else null.
 *
 * Rolls only when: status is exactly 'Paid', the bill is recurring, not
 * paused, and its due date is today or earlier (`todayYmd` = today in the
 * household's timezone). Always exactly +1 cycle, even if the due date is
 * several cycles in the past — only one cycle was paid.
 *
 * Autopay bills (payment_type 'auto', any case) only get their status reset:
 * their displayed date already rolls via `adjustAutopayBillDate`.
 *
 * Callers must apply the patch with a conditional update
 * (`status = 'Paid' AND due_date = <old>`) so a concurrent roller (cron vs
 * app load) can't move the date twice.
 */
export function computeRollover(bill: RolloverBillRow, todayYmd: string): RolloverPatch | null {
  if (!bill || bill.status !== 'Paid') return null;
  if (bill.is_recurring === false) return null;
  if (bill.is_paused) return null;

  const due = bill.due_date ? bill.due_date.slice(0, 10) : '';
  if (!YMD_RE.test(due)) return null;
  if (due > todayYmd) return null;

  if ((bill.payment_type ?? '').toLowerCase() === 'auto') {
    return { status: UNPAID_STATUS };
  }

  const invoice = bill.invoice_date ? bill.invoice_date.slice(0, 10) : null;
  return {
    status: UNPAID_STATUS,
    due_date: addCycles(due, bill.frequency, 1),
    invoice_date: invoice ? addCycles(invoice, bill.frequency, 1) : null,
  };
}

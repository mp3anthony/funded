/**
 * Bill cycle maths for the paid-bill rollover (Slice 17, #187).
 *
 * A bill marked Paid stays Paid (same due date) until that due date arrives
 * in the household's timezone; then it rolls exactly ONE cycle: status back
 * to unpaid, `due_date` +1 cycle, `invoice_date` +1 cycle in lockstep. The
 * rollover is persisted by the push-reminders cron route and, as a
 * belt-and-braces catch-up, by AppContext's load path — both share this
 * module so they can never disagree. Since #205 a bill whose due date has
 * already arrived rolls at the moment it is marked Paid (`computePaidRoll`),
 * with an Undo (`computeUndoPaidRoll`).
 *
 * Autopay bills never persist a date roll: the UI derives the shown due date
 * (`adjustAutopayBillDate`, which delegates to `autopayRollForward` here) and,
 * since #282, the shown invoice date too (`displayedInvoiceDate`). The
 * invoice derivation is display-only; nothing derived is ever stored except
 * when the user saves an edit, which stores both dates together.
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
  last_paid_for?: string | null;
}

/** Columns to write back when a bill rolls. */
export interface RolloverPatch {
  status: string;
  due_date?: string;
  invoice_date?: string | null;
  /** Due date of the cycle just paid (#211). Set by a roll of a manual bill, never cleared. */
  last_paid_for?: string;
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

/* ── Autopay display derivation (#282) ────────────────────────────────── */

/**
 * Steps a saved autopay due date forward one cycle at a time until it is on
 * or after `todayYmd`, returning the shown due date and how many cycles it
 * moved. This is the exact legacy `adjustAutopayBillDate` loop (step-by-step,
 * so month-end days drift: Jan 31 +1 gives Mar 3, not Feb 28), moved here so
 * the due date and the derived invoice date share one cycle count. Capped at
 * 100 steps. Pure UTC maths, no timezone or DST involvement.
 *
 * Input that isn't a 'YYYY-MM-DD' date, or is already today or later,
 * returns the input string unchanged with 0 cycles.
 */
export function autopayRollForward(
  dueYmd: string,
  frequency: string | null | undefined,
  todayYmd: string,
): { dueYmd: string; cycles: number } {
  const match = YMD_RE.exec(dueYmd ?? '');
  if (!match) return { dueYmd, cycles: 0 };
  const t = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const freq = (frequency || 'monthly').toLowerCase();
  const cur = () => toYmd(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());

  let cycles = 0;
  while (cur() < todayYmd && cycles < 100) {
    cycles++;
    if (freq === 'weekly') t.setUTCDate(t.getUTCDate() + 7);
    else if (freq === 'fortnightly') t.setUTCDate(t.getUTCDate() + 14);
    else if (freq === 'yearly') t.setUTCFullYear(t.getUTCFullYear() + 1);
    else t.setUTCMonth(t.getUTCMonth() + 1);
  }
  if (cycles === 0) return { dueYmd, cycles: 0 };
  return { dueYmd: cur(), cycles };
}

/**
 * The invoice date to SHOW for a bill (#282); display only, nothing stored.
 *
 * Active recurring autopay bills never persist a roll, so their saved invoice
 * date goes stale. Here it moves forward by the same number of cycles the
 * shown due date moved (`autopayRollForward`), counted from the base date with
 * the `addCycles` clamp (Jan 31 +1 gives Feb 28, +2 gives Mar 31). Everything
 * else shows the saved date: manual bills (their roll persists both dates),
 * paused and one-off bills, and bills with an invalid due date. Null when blank.
 */
export function displayedInvoiceDate(bill: RolloverBillRow, todayYmd: string): string | null {
  const inv = bill?.invoice_date ? bill.invoice_date.slice(0, 10) : null;
  if (!inv) return null;
  if ((bill.payment_type ?? '').toLowerCase() !== 'auto') return inv;
  if (bill.is_recurring === false) return inv;
  if (bill.is_paused) return inv;
  const due = bill.due_date ? bill.due_date.slice(0, 10) : '';
  if (!YMD_RE.test(due)) return inv;
  const { cycles } = autopayRollForward(due, bill.frequency, todayYmd);
  return cycles > 0 ? addCycles(inv, bill.frequency, cycles) : inv;
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
 * their displayed due AND invoice dates are derived for display
 * (`adjustAutopayBillDate`, `displayedInvoiceDate`), never stored. They never
 * get `last_paid_for`.
 *
 * A manual roll records the cycle just paid: `last_paid_for` = the old due
 * date (#211). The roll sets it and never clears it.
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
    last_paid_for: due,
  };
}

/* ── Paused bills (#201) ──────────────────────────────────────────────── */

/** False for a paused bill: paused bills get no reminders at all (#201). */
export function billSendsReminders(bill: { is_paused?: boolean | null; status?: string | null }): boolean {
  return !(bill?.is_paused === true || bill?.status === 'Paused');
}

/**
 * Columns to write when a paused bill is resumed, if its due date has passed
 * while it was paused (#201); else null (just un-pause, dates untouched).
 * `todayYmd` = today in the household's timezone.
 *
 * "Passed" means due < today for an unpaid bill (due today is still due) and
 * due <= today for a Paid bill (a Paid bill rolls once its due date arrives).
 * Missed cycles are skipped, not caught up: the new due date is the first
 * date on or after today, counted from the BASE date (never step by step, so
 * month-end days clamp the same way as `addCycles`). `invoice_date` moves in
 * lockstep. A Paid bill's resume roll records the cycle it was paid for in
 * `last_paid_for` (same rule as `computeRollover`, #211); an unpaid roll
 * never touches it. Autopay bills reuse `computeRollover` (status reset only;
 * their date rolls via `adjustAutopayBillDate`). One-off bills return null.
 */
export function computeResumeRoll(bill: RolloverBillRow, todayYmd: string): RolloverPatch | null {
  if (!bill) return null;
  if (bill.is_recurring === false) return null;

  const due = bill.due_date ? bill.due_date.slice(0, 10) : '';
  if (!YMD_RE.test(due)) return null;

  if ((bill.payment_type ?? '').toLowerCase() === 'auto') {
    return computeRollover({ ...bill, is_paused: false }, todayYmd);
  }

  const paid = bill.status === 'Paid';
  if (paid && due > todayYmd) return null;
  if (!paid && due >= todayYmd) return null;

  let n = 1;
  while (addCycles(due, bill.frequency, n) < todayYmd) {
    n++;
    if (n > 5000) return null;
  }

  const invoice = bill.invoice_date ? bill.invoice_date.slice(0, 10) : null;
  return {
    status: UNPAID_STATUS,
    due_date: addCycles(due, bill.frequency, n),
    invoice_date: invoice ? addCycles(invoice, bill.frequency, n) : null,
    ...(paid ? { last_paid_for: due } : {}),
  };
}

/** Edit payloads only carry `is_paused` when it is a real boolean; edits never flip it by accident. */
export function pausedFieldForEdit(billData: { is_paused?: unknown }): { is_paused?: boolean } {
  return typeof billData?.is_paused === 'boolean' ? { is_paused: billData.is_paused } : {};
}

/* ── Instant roll at Mark-as-Paid time (#205) ─────────────────────────── */

/**
 * Columns to write when a bill is marked Paid, if its due date has already
 * arrived (today or earlier, `todayYmd` = today in the household's timezone):
 * the cycle being paid is the current/overdue one, so the bill goes straight
 * to the next cycle instead of sitting Paid until the cron catches up.
 *
 * Same eligibility as `computeRollover` (recurring, not paused, due date
 * today or earlier) because it IS that rollover, just applied at tap time.
 * The patch inherits `last_paid_for` (the old due date) from the rollover.
 * Returns null when marking Paid should only set status (paying early,
 * one-off bills, paused bills) — and for autopay, which can't be marked Paid.
 *
 * Callers must guard the write on the row still having the due date they
 * read (`due_date = <old>`) so a double tap / second device / the cron can't
 * move the date twice.
 */
export function computePaidRoll(bill: RolloverBillRow, todayYmd: string): RolloverPatch | null {
  if (!bill) return null;
  if ((bill.payment_type ?? '').toLowerCase() === 'auto') return null;
  const patch = computeRollover({ ...bill, status: 'Paid' }, todayYmd);
  if (!patch || !patch.due_date) return null;
  return patch;
}

/** What Undo writes back: the row exactly as it was before the instant roll. */
export interface UndoPaidRollPatch {
  status: string;
  due_date: string;
  invoice_date: string | null;
  last_paid_for: string | null;
}

/**
 * Undo patch for an instant roll: restores the pre-tap due date, invoice
 * date and status (the bill was unpaid/overdue before the mis-tap). A
 * pre-tap status of 'Paid' (or missing) becomes UNPAID_STATUS — restoring
 * Paid on a due-or-past date would just be rolled again by the cron /
 * on-load catch-up. `last_paid_for` goes back to its pre-tap value exactly
 * (empty stays empty). Returns null if the pre-tap row has no due date.
 */
export function computeUndoPaidRoll(preRoll: RolloverBillRow): UndoPaidRollPatch | null {
  if (!preRoll || !preRoll.due_date) return null;
  const status = preRoll.status && preRoll.status !== 'Paid' ? preRoll.status : UNPAID_STATUS;
  return {
    status,
    due_date: preRoll.due_date,
    invoice_date: preRoll.invoice_date ?? null,
    last_paid_for: preRoll.last_paid_for ? preRoll.last_paid_for.slice(0, 10) : null,
  };
}

/**
 * True when two due-date values name the same calendar day (compares the
 * 'YYYY-MM-DD' part, so a DB value with a time suffix still matches). Two
 * missing values count as the same; one missing and one present do not.
 * Used to spot a stale screen: the DB row is on a different cycle from the
 * one the user tapped Mark as Paid on.
 */
export function sameDueDate(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = a ? String(a).slice(0, 10) : '';
  const db = b ? String(b).slice(0, 10) : '';
  return da === db;
}

/**
 * dedupe_key prefix shared by every reminder for one bill cycle — the
 * due-soon row (`${id}-${due}-manual_bill`) and each daily overdue row
 * (`${id}-${due}-manual_bill-overdue-${today}`). MUST match the key shapes
 * in src/lib/notifications/generateReminders.ts. Used to mark just the paid
 * cycle's reminders read when a bill is paid (rolled or not), leaving the next cycle's alone.
 */
export function oldCycleNotificationKeyPrefix(billId: string | number, dueYmd: string): string {
  return `${String(billId)}-${String(dueYmd).slice(0, 10)}-`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Toast text after an instant roll: "Paid for <Month> — next due <Month D>".
 * <Month> is the month of the cycle just paid (the old due date). The year is
 * added to the next-due date only when it differs from the paid cycle's year
 * (e.g. December → January). Pure string maths — no Date parsing, so no
 * timezone can shift the day.
 */
export function paidRollToastMessage(oldDueYmd: string, newDueYmd: string): string {
  const oldMatch = YMD_RE.exec(oldDueYmd ?? '');
  const newMatch = YMD_RE.exec(newDueYmd ?? '');
  if (!oldMatch || !newMatch) return 'Marked as paid';
  const paidMonth = MONTH_NAMES[Number(oldMatch[2]) - 1];
  const nextMonth = MONTH_NAMES[Number(newMatch[2]) - 1];
  const nextDay = Number(newMatch[3]);
  const yearSuffix = newMatch[1] !== oldMatch[1] ? `, ${newMatch[1]}` : '';
  return `Paid for ${paidMonth} — next due ${nextMonth} ${nextDay}${yearSuffix}`;
}

/* ── Last paid record and Undo payment (#211) ─────────────────────────── */

/**
 * True when the "Undo payment" button may show: `last_paid_for` is a valid
 * date, the bill is manual, recurring, not paused, not Paid, and its due
 * date is exactly one cycle after `last_paid_for` (so it is still the cycle
 * the last payment rolled to; an edited date or changed frequency hides it).
 */
export function canUndoPayment(row: RolloverBillRow): boolean {
  if (!row) return false;
  const lpf = row.last_paid_for ? row.last_paid_for.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lpf)) return false;
  if ((row.payment_type ?? '').toLowerCase() === 'auto') return false;
  if (row.is_recurring === false) return false;
  if (row.is_paused) return false;
  if (row.status === 'Paid') return false;
  if (!row.due_date) return false;
  return sameDueDate(row.due_date, addCycles(lpf, row.frequency, 1));
}

/** What Undo payment writes: the bill back on the paid cycle, unpaid, record cleared. */
export interface UndoPaymentPatch {
  status: string;
  due_date: string;
  invoice_date: string | null;
  last_paid_for: null;
}

/**
 * Patch for Undo payment, or null if `canUndoPayment` is false. `due_date`
 * is `last_paid_for` exactly (Jan 31 stays Jan 31, no reverse-clamp drift);
 * `invoice_date` steps back one cycle when present.
 */
export function computeUndoPayment(row: RolloverBillRow): UndoPaymentPatch | null {
  if (!canUndoPayment(row)) return null;
  const invoice = row.invoice_date ? row.invoice_date.slice(0, 10) : null;
  return {
    status: UNPAID_STATUS,
    due_date: (row.last_paid_for as string).slice(0, 10),
    invoice_date: invoice ? addCycles(invoice, row.frequency, -1) : null,
    last_paid_for: null,
  };
}

/**
 * "Paid for September" label for the bill popup. The year is added only when
 * it differs from today's year (household timezone `todayYmd`), e.g.
 * "Paid for December 2025". Null for a missing / invalid date.
 */
export function paidForLabel(ymd: string | null | undefined, todayYmd: string): string | null {
  const m = YMD_RE.exec(ymd ?? '');
  if (!m) return null;
  const month = MONTH_NAMES[Number(m[2]) - 1];
  if (!month) return null;
  const t = YMD_RE.exec(todayYmd ?? '');
  const showYear = !t || t[1] !== m[1];
  return `Paid for ${month}${showYear ? ` ${m[1]}` : ''}`;
}

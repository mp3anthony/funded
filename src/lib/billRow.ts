/**
 * Pure rules for the Bills list rows (R15, #402): the countdown line, whether a
 * row shows the tick, the row order and the category subtotal.
 *
 * Deliberately has ZERO imports so `billRow.test.mjs` can run it under plain
 * `node --test`. Erasable TypeScript syntax only. Date maths is string-based
 * (no `Date`), so the household-timezone "today" never drifts.
 */

export type CountdownTone = "neutral" | "overdue" | "paid" | "muted";

export interface Countdown {
  text: string;
  tone: CountdownTone;
}

export interface RowBill {
  id: string | number;
  name: string;
  amount: number;
  frequency?: string | null;
  status: string;
  payment_type?: string | null;
  is_paused?: boolean | null;
  due_date?: string | null;
  dueLabel?: string | null;
}

/** Days from 'YYYY-MM-DD' a to 'YYYY-MM-DD' b (UTC day numbers, so no DST or zone drift). */
export function dayDiff(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = toYmd.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function plural(n: number): string {
  return n === 1 ? "1 day" : `${n} days`;
}

/**
 * The line under a bill's name. `hint` is `dueDateHint` for a dateless bill
 * ("paid-no-due-date" is the only value that changes the text).
 * Order: label (Paused / One-off), Paid, no date, then the day count.
 */
export function dueCountdown(bill: RowBill, todayYmd: string, hint: string = "none"): Countdown {
  if (bill.dueLabel) return { text: bill.dueLabel, tone: "muted" };
  const raw = bill.due_date && String(bill.due_date).trim() ? String(bill.due_date).slice(0, 10) : "";
  if (bill.status === "Paid") {
    return { text: !raw || hint === "paid-no-due-date" ? "Paid · no due date" : "Paid", tone: "paid" };
  }
  if (!raw) return { text: "No due date", tone: "muted" };
  const diff = dayDiff(todayYmd, raw);
  if (diff === 0) return { text: "Due today", tone: "neutral" };
  if (diff === 1) return { text: "Due tomorrow", tone: "neutral" };
  if (diff > 1) return { text: `Due in ${diff} days`, tone: "neutral" };
  return { text: `${plural(-diff)} overdue`, tone: "overdue" };
}

/** The one-tap tick: manual, not paused, not already Paid, no Paused / One-off label. */
export function showTick(bill: RowBill): boolean {
  if ((bill.payment_type ?? "").toLowerCase() === "auto") return false;
  return bill.is_paused !== true && bill.status !== "Paid" && !bill.dueLabel;
}

export interface RowLike {
  kind: "bill" | "expense";
  item: { id: string | number; name: string };
}

/** A to Z by name (case-insensitive), ties: bill before expense, then id. */
export function compareRows(a: RowLike, b: RowLike): number {
  const byName = a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" });
  if (byName !== 0) return byName;
  if (a.kind !== b.kind) return a.kind === "bill" ? -1 : 1;
  return String(a.item.id).localeCompare(String(b.item.id), undefined, { numeric: true });
}

export interface SubtotalRow {
  kind: "bill" | "expense";
  item: { amount: number; frequency?: string | null; is_paused?: boolean | null; dueLabel?: string | null };
}

/**
 * Sum of the LISTED rows in one category at the chosen frequency. Bills that do
 * not count toward totals (paused, one-off) add 0; expenses are weekly figures.
 */
export function categorySubtotal(
  rows: SubtotalRow[],
  frequency: string,
  deps: {
    convert: (amount: number, from: string, to: string) => number;
    countsTowardTotals: (bill: { is_paused?: boolean | null; dueLabel?: string | null }) => boolean;
  },
): number {
  return rows.reduce((sum, row) => {
    if (row.kind === "expense") return sum + deps.convert(row.item.amount, "weekly", frequency);
    return deps.countsTowardTotals(row.item)
      ? sum + deps.convert(row.item.amount, row.item.frequency || "monthly", frequency)
      : sum;
  }, 0);
}

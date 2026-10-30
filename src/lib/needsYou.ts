/**
 * Rules for the Payday "Needs you" strip and the Log / Confirm Pay card
 * (R20, #407): which pays need action, how they are ordered, and the card's
 * wording.
 *
 * Deliberately has ZERO imports so `needsYou.test.mjs` can run it under plain
 * `node --test`. Erasable TypeScript syntax only (no enums, no parameter
 * properties). Dates are "YYYY-MM-DD" strings; `todayYmd` is passed in (the
 * household-local day), never read from the clock here.
 */

export type NeedsYouKind = "log" | "enter" | "confirm";

export interface NeedsYouRow {
  /** Stable React key: `log-<scheduleId>` or `confirm-<historyId>`. */
  key: string;
  /** log = fixed pay due; enter = pay due with no known amount; confirm = Pending pay. */
  kind: NeedsYouKind;
  scheduleId: string | null;
  historyId: string | null;
  memberId: string;
  payDate: string;
  frequency: string | null;
  /** The amount the pay is expected to be, or null when nobody knows yet. */
  amount: number | null;
}

export interface NeedsYouSchedule {
  id: string | number;
  member_id: string | number;
  frequency?: string | null;
  is_fixed_amount: boolean;
  amount: number | null;
  next_pay_date: string;
}

export interface NeedsYouHistory {
  id: string | number;
  member_id: string | number;
  pay_schedule_id: string | number | null;
  pay_date: string;
  amount: number | null;
  status?: string | null;
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** True when a pay date has come (on or before the household-local day). Blank `todayYmd` = not known yet = false. */
export function isLoggableYmd(nextPayYmd: string, todayYmd: string): boolean {
  if (!YMD_RE.test(todayYmd ?? "")) return false;
  const next = (nextPayYmd ?? "").slice(0, 10);
  if (!YMD_RE.test(next)) return false;
  return next <= todayYmd;
}

function knownAmount(n: number | null | undefined): number | null {
  const v = Number(n);
  return n !== null && n !== undefined && Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * The rows for the strip: schedules whose pay date has come, plus Pending
 * pays. Oldest pay date first; on the same day Pending before a due pay; then
 * member name.
 */
export function buildNeedsYou({
  schedules,
  history,
  todayYmd,
  memberName,
}: {
  schedules: readonly NeedsYouSchedule[];
  history: readonly NeedsYouHistory[];
  todayYmd: string;
  memberName: (memberId: string) => string;
}): NeedsYouRow[] {
  const rows: NeedsYouRow[] = [];

  for (const s of schedules) {
    if (!isLoggableYmd(s.next_pay_date, todayYmd)) continue;
    const amount = s.is_fixed_amount ? knownAmount(s.amount) : null;
    rows.push({
      key: `log-${s.id}`,
      kind: amount === null ? "enter" : "log",
      scheduleId: String(s.id),
      historyId: null,
      memberId: String(s.member_id),
      payDate: s.next_pay_date.slice(0, 10),
      frequency: s.frequency ?? null,
      amount,
    });
  }

  for (const h of history) {
    if (h.status !== "pending") continue;
    const schedule = schedules.find((s) => String(s.id) === String(h.pay_schedule_id ?? ""));
    rows.push({
      key: `confirm-${h.id}`,
      kind: "confirm",
      scheduleId: h.pay_schedule_id === null || h.pay_schedule_id === undefined ? null : String(h.pay_schedule_id),
      historyId: String(h.id),
      memberId: String(h.member_id),
      payDate: h.pay_date.slice(0, 10),
      frequency: schedule?.frequency ?? null,
      amount: knownAmount(h.amount),
    });
  }

  return rows.sort((a, b) => {
    if (a.payDate !== b.payDate) return a.payDate < b.payDate ? -1 : 1;
    const aPending = a.kind === "confirm";
    const bPending = b.kind === "confirm";
    if (aPending !== bPending) return aPending ? -1 : 1;
    return memberName(a.memberId).localeCompare(memberName(b.memberId));
  });
}

/** The pill on a strip row. */
export function rowActionLabel(kind: NeedsYouKind): string {
  if (kind === "log") return "Log pay";
  if (kind === "enter") return "Enter amount";
  return "Confirm";
}

/** "ask" when the amount is known (one tap to say it landed), else "amount" (type it in). */
export function cardMode(amount: number | null): "ask" | "amount" {
  return knownAmount(amount) === null ? "amount" : "ask";
}

/** "$1,850" for whole dollars, "$1,850.50" otherwise. */
export function moneyLabel(n: number): string {
  const whole = Math.round(n * 100) % 100 === 0;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Card title when the amount is known. */
export function askTitle(amount: number): string {
  return `Did ${moneyLabel(amount)} land?`;
}

/** Card title when the amount has to be typed in. */
export function amountTitle(memberName: string): string {
  return `How much did ${memberName} get?`;
}

/** "24 Oct" for a YYYY-MM-DD date. */
export function shortDate(ymd: string): string {
  const [, m, d] = (ymd ?? "").slice(0, 10).split("-").map(Number);
  if (!m || !d || m < 1 || m > 12) return ymd ?? "";
  return `${d} ${MONTHS[m - 1]}`;
}

/** "Fortnightly · 24 Oct" (or just the date when the frequency is unknown). */
export function payLine(frequency: string | null | undefined, payYmd: string): string {
  const date = shortDate(payYmd);
  if (!frequency) return date;
  return `${frequency.charAt(0).toUpperCase()}${frequency.slice(1)} · ${date}`;
}

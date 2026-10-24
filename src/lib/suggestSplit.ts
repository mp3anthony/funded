/**
 * Suggest Split rules (R23, #410): each member's income, their share of the
 * household, what they should put in (Joint Fund) or cover per bill (Direct
 * Pay), and which bills a Direct Pay "Apply" may touch.
 *
 * Deliberately has ZERO imports so `suggestSplit.test.mjs` can run it under
 * plain `node --test`. Erasable TypeScript syntax only. The frequency
 * converter (`convertAmount` from utils) is passed in rather than imported.
 */

export type PayFrequency = "weekly" | "fortnightly" | "monthly";
export type Convert = (amount: number, from: string, to: string) => number;

interface MemberLike {
  id: string | number;
}

interface ScheduleLike {
  id: string | number;
  member_id: string | number;
  frequency: PayFrequency;
  is_fixed_amount: boolean;
  amount?: number | null;
  created_at: string;
}

// A member whose income is known: resolved to a monthly figure, plus the
// frequency their own contribution should be applied at.
export interface MemberIncomeResult<M extends MemberLike = MemberLike> {
  member: M;
  blocked: false;
  monthlyIncome: number;
  ownFrequency: PayFrequency;
}

// A member the split cannot be computed for yet, and why.
export interface MemberBlockedResult<M extends MemberLike = MemberLike> {
  member: M;
  blocked: true;
  reason: "missing pay schedule" | "not enough pay history yet";
}

export type MemberSplitInput<M extends MemberLike = MemberLike> =
  | MemberIncomeResult<M>
  | MemberBlockedResult<M>;

/**
 * Resolves each household member's monthly-normalised income from their pay
 * schedules (the #106 algorithm):
 * - No pay schedules at all: blocked ("missing pay schedule").
 * - Each fixed-amount schedule adds its own amount, converted to monthly.
 * - Each variable schedule adds its own average (R19, #406: the last 4
 *   confirmed pays of that schedule, at least 2) at that schedule's own
 *   frequency. Any variable schedule without an average blocks the member
 *   ("not enough pay history yet"), since income would be understated.
 * - A member's "own pay frequency" (where their contribution is applied) is
 *   their single schedule's frequency, or for several schedules the frequency
 *   of the most recently created one.
 */
export function computeMemberIncomes<M extends MemberLike>(
  members: M[],
  paySchedules: ScheduleLike[],
  calculateAveragePay: (scheduleId: string) => number | null,
  convert: Convert
): MemberSplitInput<M>[] {
  return members.map((member): MemberSplitInput<M> => {
    const schedules = paySchedules.filter((s) => String(s.member_id) === String(member.id));

    if (schedules.length === 0) {
      return { member, blocked: true, reason: "missing pay schedule" };
    }

    let monthlyIncome = 0;
    for (const schedule of schedules) {
      if (schedule.is_fixed_amount) {
        monthlyIncome += convert(schedule.amount ?? 0, schedule.frequency, "monthly");
      } else {
        const avg = calculateAveragePay(String(schedule.id));
        if (avg === null) {
          return { member, blocked: true, reason: "not enough pay history yet" };
        }
        monthlyIncome += convert(avg, schedule.frequency, "monthly");
      }
    }

    const ownFrequency: PayFrequency =
      schedules.length === 1
        ? schedules[0].frequency
        : [...schedules].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0].frequency;

    return { member, blocked: false, monthlyIncome, ownFrequency };
  });
}

export interface SplitRow<M extends MemberLike = MemberLike> extends MemberIncomeResult<M> {
  /** 0 to 1: this member's part of household monthly income. */
  share: number;
  monthlyDollars: number;
  weeklyDollars: number;
  /** The same figure at the member's own pay frequency (what Apply saves). */
  ownFrequencyDollars: number;
  /** Their income per week, for the Income step. */
  weeklyIncome: number;
}

/**
 * The split itself: share = member monthly income / household monthly income;
 * dollars = share x total monthly bills. Returns [] when any member is blocked.
 */
export function computeSplit<M extends MemberLike>(
  results: MemberSplitInput<M>[],
  totalMonthlyBills: number,
  convert: Convert
): SplitRow<M>[] {
  if (results.some((r) => r.blocked)) return [];
  const open = results.filter((r): r is MemberIncomeResult<M> => !r.blocked);
  const household = open.reduce((sum, r) => sum + r.monthlyIncome, 0);
  return open.map((r) => {
    const share = household > 0 ? r.monthlyIncome / household : 0;
    const monthlyDollars = share * totalMonthlyBills;
    return {
      ...r,
      share,
      monthlyDollars,
      weeklyDollars: convert(monthlyDollars, "monthly", "weekly"),
      ownFrequencyDollars: convert(monthlyDollars, "monthly", r.ownFrequency),
      weeklyIncome: convert(r.monthlyIncome, "monthly", "weekly"),
    };
  });
}

interface BillLike {
  id: string | number;
  amount: number;
  assignee_id?: string | null;
  dueLabel?: string | null;
}

interface SplitLike {
  bill_id: string | number;
  member_id: string | number;
  amount: number;
  is_assignee?: boolean | null;
}

/**
 * The bills Direct Pay "Apply" may fill in: a bill is still on the default when
 * it has an assignee and no split row hands a non-assignee member more than $0.
 * Finished one-offs are skipped; paused bills are included (they resume later).
 */
export function defaultSplitBills<B extends BillLike>(bills: B[], billSplits: SplitLike[]): B[] {
  return bills.filter((bill) => {
    if (!bill.assignee_id) return false;
    if (bill.dueLabel === "One-off") return false;
    const assignee = String(bill.assignee_id);
    return !billSplits.some(
      (s) =>
        String(s.bill_id) === String(bill.id) &&
        String(s.member_id) !== assignee &&
        Number(s.amount) > 0
    );
  });
}

export interface DirectPayRow {
  member_id: string;
  amount: number;
  is_assignee: boolean;
  status: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Split rows for one bill. `shares` maps member id to a 0-1 fraction of the
 * household. `existingStatus` maps member id to the status of the row they
 * already have on this bill (kept; new rows are "Pending"). Each non-assignee member covers share x bill amount (2 decimals,
 * a row only when above $0); the assignee takes the remainder, never below 0.
 */
export function directPaySplitRows(
  bill: { amount: number },
  shares: Record<string, number>,
  assigneeId: string,
  existingStatus: Record<string, string> = {}
): DirectPayRow[] {
  const total = Number(bill.amount) || 0;
  const rows: DirectPayRow[] = [];
  let others = 0;
  for (const [memberId, share] of Object.entries(shares)) {
    if (memberId === String(assigneeId)) continue;
    const amount = round2(Math.max(0, share) * total);
    if (amount <= 0) continue;
    others = round2(others + amount);
    rows.push({ member_id: memberId, amount, is_assignee: false, status: existingStatus[memberId] || "Pending" });
  }
  rows.push({
    member_id: String(assigneeId),
    amount: Math.max(0, round2(total - others)),
    is_assignee: true,
    status: existingStatus[String(assigneeId)] || "Pending",
  });
  return rows;
}

/** Whole-number percent for display ("Cover 62% of each bill"). */
export function percentLabel(share: number): string {
  const pct = share * 100;
  return `${Math.abs(pct - Math.round(pct)) < 0.05 ? Math.round(pct) : pct.toFixed(1)}%`;
}

/** Formatter for a count-up percent figure whose final value is share x 100. */
export function percentFigure(share: number): (n: number) => string {
  const digits = percentLabel(share).includes(".") ? 1 : 0;
  return (n) => `${n.toFixed(digits)}%`;
}

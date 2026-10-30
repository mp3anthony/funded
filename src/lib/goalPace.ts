/**
 * Goals page rules (R17, #404): Saving vs Just tracking, Reached, totals,
 * sorting and the "pace" line under each Saving goal.
 *
 * Deliberately has ZERO imports so `goalPace.test.mjs` can run it under plain
 * `node --test`. Erasable TypeScript syntax only (no enums, no parameter
 * properties). Dates are "YYYY-MM-DD" strings; `today` is passed in (the
 * household-local day), never read from the clock here.
 */

export interface PaceGoal {
  id: string | number;
  name?: string;
  currentAmount: number;
  targetAmount: number;
  deadline: string | null;
  status?: string | null;
}

export interface PaceRule {
  member_id: string;
  threshold_amount: number;
  action_type: string;
  action_target_id: string | number;
  amount_to_add: number;
  amount_type: string;
  is_active: boolean;
}

export interface PaceSchedule {
  member_id: string;
  amount: number | null;
  frequency: string;
  is_fixed_amount: boolean;
}

export type PaceKind = "reached" | "onTrack" | "needs" | "rule" | "past" | "none";

export interface Pace {
  kind: PaceKind;
  text: string;
}

/** Just tracking = status "paused" (no schema change; see addGoalFlow). */
export function isTracking(g: { status?: string | null }): boolean {
  return g.status === "paused";
}

/** The one definition of Reached: saved is at or above the target. Never `status === "completed"`. */
export function isReached(g: { currentAmount: number; targetAmount: number }): boolean {
  return g.targetAmount > 0 && g.currentAmount >= g.targetAmount;
}

/** Only Saving goals: everything that counts money (totals, health, suggestions) uses this. */
export function savingGoals<T extends { status?: string | null }>(funds: readonly T[]): T[] {
  return funds.filter((g) => !isTracking(g));
}

/** Goal count, saved dollars and dollars still to go (Reached goals add nothing to go) over the given Saving goals. */
export function savingTotals(goals: readonly { currentAmount: number; targetAmount: number }[]) {
  let saved = 0;
  let toGo = 0;
  for (const g of goals) {
    saved += g.currentAmount;
    if (!isReached(g)) toGo += Math.max(g.targetAmount - g.currentAmount, 0);
  }
  return { count: goals.length, saved, toGo };
}

function progress(g: { currentAmount: number; targetAmount: number }): number {
  return g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
}

/** Progress high to low, Reached goals last, then A to Z. Returns a new array. */
export function sortByProgress<T extends { name?: string; currentAmount: number; targetAmount: number }>(
  goals: readonly T[]
): T[] {
  return [...goals].sort((a, b) => {
    const ra = isReached(a) ? 1 : 0;
    const rb = isReached(b) ? 1 : 0;
    if (ra !== rb) return ra - rb;
    const d = progress(b) - progress(a);
    if (d !== 0) return d;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

/** Wish list order: cost high to low, then A to Z. Returns a new array. */
export function sortByCost<T extends { name?: string; targetAmount: number }>(goals: readonly T[]): T[] {
  return [...goals].sort((a, b) => b.targetAmount - a.targetAmount || (a.name ?? "").localeCompare(b.name ?? ""));
}

function ymdToDay(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
}

/** Whole days from today to the deadline (negative once past), or null if either date is unreadable. */
export function daysUntil(deadline: string, today: string): number | null {
  const a = ymdToDay(deadline);
  const b = ymdToDay(today);
  return a === null || b === null ? null : Math.round(a - b);
}

/** Weeks left to the deadline, never below one (a deadline this week needs it all in one go). Null if past or unreadable. */
export function weeksUntil(deadline: string, today: string): number | null {
  const days = daysUntil(deadline, today);
  if (days === null || days < 0) return null;
  return Math.max(days / 7, 1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Dec" from "2026-12-12" (no time zone maths). */
export function shortDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ""}`.trim();
}

const PAYS_PER_WEEK: Record<string, number> = { weekly: 1, fortnightly: 0.5, monthly: 12 / 52 };

/**
 * Dollars a week that this goal's active fixed-dollar rules add. A rule fires
 * when a pay is strictly above its threshold, per member, so only that member's
 * fixed-amount schedules above the threshold count, each at its own frequency.
 * Percentage rules and variable-pay schedules are left out (stated, not guessed).
 */
export function weeklyFromRules(
  goalId: string | number,
  rules: readonly PaceRule[],
  schedules: readonly PaceSchedule[]
): number {
  let total = 0;
  for (const r of rules) {
    if (!r.is_active || r.action_type !== "goal" || r.amount_type !== "fixed") continue;
    if (String(r.action_target_id) !== String(goalId)) continue;
    for (const s of schedules) {
      if (String(s.member_id) !== String(r.member_id)) continue;
      if (!s.is_fixed_amount || s.amount === null || !(s.amount > r.threshold_amount)) continue;
      total += r.amount_to_add * (PAYS_PER_WEEK[s.frequency] ?? 0);
    }
  }
  return total;
}

function dollars(n: number): string {
  const r = Math.round(n * 100) / 100;
  return `$${Number.isInteger(r) ? r : r.toFixed(2)}`;
}

/** The pace line under a Saving goal row. */
export function pace(
  goal: PaceGoal,
  rules: readonly PaceRule[],
  schedules: readonly PaceSchedule[],
  today: string
): Pace {
  if (isReached(goal)) return { kind: "reached", text: "Reached" };

  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const weekly = weeklyFromRules(goal.id, rules, schedules);

  if (goal.deadline) {
    const days = daysUntil(goal.deadline, today);
    if (days !== null) {
      if (days < 0) return { kind: "past", text: "Deadline reached" };
      const weeks = Math.max(days / 7, 1);
      const when = shortDate(goal.deadline);
      if (weekly > 0 && weekly * weeks >= remaining) return { kind: "onTrack", text: `On track for ${when}` };
      const needed = Math.ceil(remaining / weeks);
      return { kind: "needs", text: `Needs $${needed} a week for ${when}` };
    }
  }

  if (weekly > 0) return { kind: "rule", text: `+${dollars(weekly)} a week` };
  return { kind: "none", text: "No contribution set" };
}

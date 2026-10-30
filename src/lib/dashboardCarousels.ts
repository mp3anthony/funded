/**
 * Which bills and goals the Dashboard carousels show (R27, #414).
 *
 * Deliberately has ZERO imports so `dashboardCarousels.test.mjs` can run it under plain
 * `node --test` (sibling imports need a file extension there, which the app's bundler
 * rejects). The goal helpers from `goalPace.ts` are therefore passed in as `deps`.
 * Erasable TypeScript syntax only. Dates are "YYYY-MM-DD" strings.
 */

export const DASHBOARD_BILLS_MAX = 5;

export interface CarouselBill {
  id: string | number;
  name: string;
  status: string;
  payment_type?: string | null;
  is_paused?: boolean | null;
  due_date?: string | null;
  dueLabel?: string | null;
}

/**
 * Manual, unpaid, not paused, no Paused / One-off label. Dated bills by due date (overdue
 * first, oldest first), bills with no due date last (A to Z). At most 5. `todayYmd` is
 * accepted for the caller's countdown and does not change the order (overdue sorts first
 * by plain date order).
 */
export function dashboardBills<T extends CarouselBill>(bills: readonly T[], todayYmd?: string): T[] {
  void todayYmd;
  const day = (b: T) => (b.due_date && String(b.due_date).trim() ? String(b.due_date).slice(0, 10) : "");
  return bills
    .filter(
      (b) =>
        (b.payment_type ?? "").toLowerCase() !== "auto" &&
        b.is_paused !== true &&
        !b.dueLabel &&
        b.status !== "Paid"
    )
    .sort((a, b) => {
      const da = day(a);
      const db = day(b);
      if (!da && !db) return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      if (!da) return 1;
      if (!db) return -1;
      if (da !== db) return da < db ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    })
    .slice(0, DASHBOARD_BILLS_MAX);
}

export interface CarouselGoal {
  id: string | number;
  name?: string;
  currentAmount: number;
  targetAmount: number;
  status?: string | null;
}

/** The `goalPace.ts` helpers this file needs, injected so it stays import-free. */
export interface GoalDeps<G extends CarouselGoal, R, S> {
  /** Wish list = Just tracking (status "paused"). */
  isWish: (g: G) => boolean;
  sortByProgress: (goals: readonly G[]) => G[];
  weeklyFromRules: (goalId: string | number, rules: readonly R[], schedules: readonly S[]) => number;
}

export interface DashboardGoal<G> {
  goal: G;
  /** Whole-percent progress, 0 to 100. */
  percent: number;
  /** Wish list goal: no weekly line is shown. */
  isWish: boolean;
  /** "+$X a week" or "No contribution set"; empty for a Wish list goal. */
  weeklyText: string;
  hasContribution: boolean;
}

function dollars(n: number): string {
  const r = Math.round(n * 100) / 100;
  return `$${Number.isInteger(r) ? r : r.toFixed(2)}`;
}

/**
 * Every goal (F09, #473): Active goals with a weekly rule contribution first, then other
 * Active goals, then Wish list goals. Each group keeps `sortByProgress` order. Reached goals
 * are included. Wish list cards carry no weekly text.
 */
export function dashboardGoals<G extends CarouselGoal, R, S>(
  funds: readonly G[],
  rules: readonly R[],
  schedules: readonly S[],
  deps: GoalDeps<G, R, S>
): DashboardGoal<G>[] {
  const wish = funds.filter((g) => deps.isWish(g));
  const active = funds.filter((g) => !deps.isWish(g));
  const withWeekly = (goal: G) => ({ goal, weekly: deps.weeklyFromRules(goal.id, rules, schedules) });
  const sortedActive = deps.sortByProgress(active).map(withWeekly);
  const ordered = [
    ...sortedActive.filter((x) => x.weekly > 0),
    ...sortedActive.filter((x) => !(x.weekly > 0)),
    ...deps.sortByProgress(wish).map((goal) => ({ goal, weekly: 0 })),
  ];
  return ordered.map(({ goal, weekly }) => {
    const isWish = deps.isWish(goal);
    const percent =
      goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
    return {
      goal,
      percent,
      isWish,
      weeklyText: isWish ? "" : weekly > 0 ? `+${dollars(weekly)} a week` : "No contribution set",
      hasContribution: !isWish && weekly > 0,
    };
  });
}

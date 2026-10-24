// The Dashboard verdict (R25, #412): "Bills covered" / "Short $X a week" in one line.
// Plain TS (no imports, no enums, no parameter properties) so node can run the tests on it.
// `convert` (convertAmount) is passed in; the caller hands over only the bills that count
// (paused and finished left out) and each pay schedule already resolved to one amount.

export type Convert = (amount: number, from: string, to: string) => number;

export interface VerdictBill {
  id: string | number;
  amount: number;
  frequency: string;
  assignee_id?: string | null;
}
export interface VerdictExpense {
  id: string | number;
  /** Expense amounts are weekly. */
  amount: number;
  split_mode: string;
  assignee_id: string | null;
}
export interface VerdictBillSplit {
  bill_id: string | number;
  amount: number;
}
export interface VerdictExpenseSplit {
  expense_id: string | number;
  percentage: number;
}
export interface VerdictAmount {
  amount: number;
  frequency: string;
}

export interface VerdictInput {
  isJointFund: boolean;
  bills: VerdictBill[];
  expenses: VerdictExpense[];
  billSplits: VerdictBillSplit[];
  expenseSplits: VerdictExpenseSplit[];
  /** Every pay schedule at its latest logged amount, else its saved amount. */
  pays: VerdictAmount[];
  /** Joint Fund member contributions. */
  contributions: VerdictAmount[];
  /** A plan being tried in the Impact calculator, weekly. */
  extraWeekly?: number;
  /**
   * Weekly dollars that active goal rules move into goals (F01, #464). Only the Impact calculator
   * passes it, so its coverage line matches its Household total lines; the Dashboard header
   * leaves it out (bills + expenses only). Direct Pay's second half ignores it (judged on pay only).
   */
  goalsWeekly?: number;
  convert: Convert;
}

/** unset = nothing to compare against yet; short = gap below zero; ok = covered. */
export interface Half {
  status: "unset" | "short" | "ok";
  /** Whole dollars: spare when 0 or more, negative when short. 0 when unset. */
  gap: number;
}

export interface Verdict {
  tone: "ok" | "bad" | "neutral";
  headline: string;
  detail: string;
  /** The larger shortfall in whole dollars; 0 when nothing is short. */
  shortBy: number;
  halves: { income: Half; cover: Half };
}

const dollars = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Whole dollars once; `+ 0` turns a rounded -0 into 0 so under 50 cents short counts as covered.
const whole = (n: number) => Math.round(n) + 0;

const sum = (list: number[]) => list.reduce((s, n) => s + n, 0);

function halfFrom(gap: number): Half {
  return { status: gap < 0 ? "short" : "ok", gap };
}
const UNSET: Half = { status: "unset", gap: 0 };

/** Weekly bills + expenses (goal rules are not bills, so they are not in here). */
export function weeklyObligations(args: {
  bills: VerdictBill[];
  expenses: VerdictExpense[];
  convert: Convert;
}): number {
  return (
    sum(args.bills.map((b) => args.convert(b.amount || 0, b.frequency || "monthly", "weekly"))) +
    sum(args.expenses.map((e) => e.amount || 0))
  );
}

/** Weekly bills + expenses that no assignee or split pays for (Direct Pay). */
export function weeklyUncovered(args: {
  bills: VerdictBill[];
  expenses: VerdictExpense[];
  billSplits: VerdictBillSplit[];
  expenseSplits: VerdictExpenseSplit[];
  convert: Convert;
}): number {
  const { convert } = args;
  let uncovered = 0;
  for (const b of args.bills) {
    if (b.assignee_id) continue;
    const frequency = b.frequency || "monthly";
    const amount = b.amount || 0;
    const splits = sum(
      args.billSplits.filter((s) => String(s.bill_id) === String(b.id)).map((s) => s.amount || 0),
    );
    uncovered += convert(Math.max(0, amount - splits), frequency, "weekly");
  }
  for (const e of args.expenses) {
    const amount = e.amount || 0;
    if (e.split_mode === "percentage") {
      const pct = sum(
        args.expenseSplits.filter((s) => String(s.expense_id) === String(e.id)).map((s) => s.percentage || 0),
      );
      uncovered += amount * (1 - Math.min(1, pct / 100));
    } else if (!e.assignee_id) {
      uncovered += amount;
    }
  }
  return uncovered;
}

/** Are the household's weekly bills covered? See docs/context/money.md ("Verdict"). */
export function verdict(input: VerdictInput): Verdict {
  const { convert } = input;
  const extra = input.extraWeekly ?? 0;
  const goals = input.goalsWeekly ?? 0;
  const obligations =
    weeklyObligations({ bills: input.bills, expenses: input.expenses, convert }) + goals + extra;

  // Half 1: pay against bills. Both payment modes.
  const pay = sum(input.pays.map((p) => convert(p.amount || 0, p.frequency, "weekly")));
  const income: Half = pay > 0 ? halfFrom(whole(pay - obligations)) : UNSET;

  // Half 2: Joint Fund = contributions against bills; Direct Pay = what the splits leave bare.
  let cover: Half;
  if (input.isJointFund) {
    const contributed = sum(input.contributions.map((c) => convert(c.amount || 0, c.frequency, "weekly")));
    cover = contributed > 0 ? halfFrom(whole(contributed - obligations)) : UNSET;
  } else {
    // A plan being checked has no splits yet; judge it on pay only, or every plan would read short.
    const uncovered = weeklyUncovered({ ...input, convert });
    cover = halfFrom(-whole(uncovered));
  }

  const shortBy = Math.max(0, -income.gap, -cover.gap);
  const shape = (tone: Verdict["tone"], headline: string, detail: string): Verdict => ({
    tone,
    headline,
    detail,
    shortBy,
    halves: { income, cover },
  });

  if (income.status === "short" || cover.status === "short") {
    const lines: string[] = [];
    if (income.status === "short") lines.push(`Pay is ${dollars(income.gap)} a week short of bills.`);
    if (cover.status === "short") {
      lines.push(
        input.isJointFund
          ? `Contributions are ${dollars(cover.gap)} a week short of bills.`
          : `Splits leave ${dollars(cover.gap)} a week of bills uncovered.`,
      );
    }
    return shape("bad", `Short ${dollars(shortBy)} a week`, lines.join(" "));
  }
  if (income.status === "unset") {
    return shape("neutral", "Set up your pay", "Add pay on Payday to see if your bills are covered.");
  }
  if (cover.status === "unset") {
    return shape("neutral", "Set up contributions", "Set what each member puts in on Payday.");
  }
  if (obligations <= 0) {
    return shape("neutral", "Add your bills", "Add a bill and this will say if your pay covers it.");
  }
  return shape("ok", "Bills covered", `${dollars(income.gap)} a week left after bills.`);
}

/** One Dashboard stats slide (R26, #413). Amounts are in the requested frequency. */
export interface StatSlide {
  /** cover = Joint Fund contributions; splits = Direct Pay splits. */
  kind: "income" | "cover" | "splits";
  /** From the weekly verdict halves, so a slide never disagrees with the header's colour. */
  status: "unset" | "short" | "ok";
  title: string;
  /** Whole dollars: spare when 0 or more, negative when short. 0 when unset. */
  big: number;
  /** Pay, contributions or the covered part of bills. 0 when unset. */
  from: number;
  /** Bills + expenses. */
  obligations: number;
  /** Bar fraction 0..1 (full = the bills use all of it). 0 when unset. */
  fill: number;
  caption: string;
}

export interface StatsSlides {
  frequency: string;
  income: StatSlide;
  cover: StatSlide;
}

/**
 * The two Dashboard stat slides (R26, #413). Status comes from `verdict()` (weekly, whole
 * dollars); only the shown dollars follow `frequency`, so a hair under $0.50 short still
 * reads "ok" with $0 left, never a stray negative.
 */
export function verdictStats(input: VerdictInput & { frequency: string }): StatsSlides {
  const { convert, frequency } = input;
  const halves = verdict({ ...input, extraWeekly: 0 }).halves;
  const toShown = (weekly: number) => whole(convert(weekly, "weekly", frequency));

  const obligationsWeekly = weeklyObligations({ bills: input.bills, expenses: input.expenses, convert });
  const obligations = toShown(obligationsWeekly);
  const noBills = obligationsWeekly <= 0;

  const unsetSlide = (kind: StatSlide["kind"], title: string, caption: string): StatSlide => ({
    kind,
    status: "unset",
    title,
    big: 0,
    from: 0,
    obligations,
    fill: 0,
    caption,
  });
  const NO_BILLS = "Add a bill and this will say if your pay covers it.";

  // Slide 1: pay against bills (both payment modes).
  const payWeekly = sum(input.pays.map((p) => convert(p.amount || 0, p.frequency, "weekly")));
  let income: StatSlide;
  if (halves.income.status === "unset") {
    income = unsetSlide("income", "Pay vs bills", "Add pay on Payday to see if your bills are covered.");
  } else if (noBills) {
    income = { ...unsetSlide("income", "Pay vs bills", NO_BILLS), from: toShown(payWeekly) };
  } else {
    const pay = toShown(payWeekly);
    const short = halves.income.status === "short";
    income = {
      kind: "income",
      status: halves.income.status,
      title: "Pay vs bills",
      big: short ? Math.min(-1, toShown(payWeekly - obligationsWeekly)) : Math.max(0, toShown(payWeekly - obligationsWeekly)),
      from: pay,
      obligations,
      fill: payWeekly > 0 ? Math.min(1, obligationsWeekly / payWeekly) : 0,
      caption: `Pay ${dollars(pay)} · Bills ${dollars(obligations)}`,
    };
  }

  // Slide 2: Joint Fund = contributions against bills; Direct Pay = bills the splits cover.
  let cover: StatSlide;
  if (input.isJointFund) {
    const title = "Contributions vs bills";
    const contributedWeekly = sum(input.contributions.map((c) => convert(c.amount || 0, c.frequency, "weekly")));
    if (halves.cover.status === "unset") {
      cover = unsetSlide("cover", title, "Set what each member puts in on Payday.");
    } else if (noBills) {
      cover = { ...unsetSlide("cover", title, NO_BILLS), from: toShown(contributedWeekly) };
    } else {
      const contributed = toShown(contributedWeekly);
      const short = halves.cover.status === "short";
      cover = {
        kind: "cover",
        status: halves.cover.status,
        title,
        big: short
          ? Math.min(-1, toShown(contributedWeekly - obligationsWeekly))
          : Math.max(0, toShown(contributedWeekly - obligationsWeekly)),
        from: contributed,
        obligations,
        fill: contributedWeekly > 0 ? Math.min(1, obligationsWeekly / contributedWeekly) : 0,
        caption: `Contributions ${dollars(contributed)} · Bills ${dollars(obligations)}`,
      };
    }
  } else {
    const title = "Splits vs shares";
    if (noBills) {
      cover = unsetSlide("splits", title, NO_BILLS);
    } else {
      const uncoveredWeekly = weeklyUncovered({ ...input, convert });
      const uncovered = toShown(uncoveredWeekly);
      const short = halves.cover.status === "short";
      const covered = Math.max(0, obligations - uncovered);
      cover = {
        kind: "splits",
        status: halves.cover.status,
        title,
        big: short ? Math.min(-1, -uncovered) : 0,
        from: covered,
        obligations,
        fill: short ? Math.max(0, Math.min(1, 1 - uncoveredWeekly / obligationsWeekly)) : 1,
        caption: short
          ? `Covered ${dollars(covered)} · Bills ${dollars(obligations)}`
          : `All ${dollars(obligations)} of bills covered`,
      };
    }
  }

  return { frequency, income, cover };
}

// Pure rules for the Impact calculator (R16, #403).
// Plain TS (no imports, no enums, no parameter properties) so node can run the tests on it.
// The helpers that live in alias-importing files (convertAmount) are passed in as `convert`.

export type Convert = (amount: number, from: string, to: string) => number;

export interface ImpactCosts {
  weekly: number;
  fortnightly: number;
  monthly: number;
  yearly: number;
}

/** The extra cost of one payment plan at each frequency. */
export function extraCosts(amount: number, frequency: string, convert: Convert): ImpactCosts {
  return {
    weekly: convert(amount, frequency, "weekly"),
    fortnightly: convert(amount, frequency, "fortnightly"),
    monthly: convert(amount, frequency, "monthly"),
    yearly: convert(amount, frequency, "yearly"),
  };
}

export const MAX_PAYMENTS = 1200;

/** "6", " 12 " give a whole number from 1 to 1200 (100 years of monthly payments); anything else (0, 2.5, "", "abc") gives null. */
export function parsePayments(str: string): number | null {
  const t = str.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= MAX_PAYMENTS ? n : null;
}

/** What it costs in full. Ongoing (null payments) has no end, so no total. */
export function totalCost(amount: number, payments: number | null): number | null {
  return payments === null ? null : Math.round(amount * payments * 100) / 100;
}

/** How long a fixed plan runs: "6 months", "1 year", "10 weeks". Null for Ongoing. */
export function planLength(frequency: string, payments: number | null): string | null {
  if (payments === null) return null;
  let count = payments;
  let unit = "week";
  if (frequency === "yearly") unit = "year";
  else if (frequency === "monthly") unit = "month";
  else if (frequency === "fortnightly") count = payments * 2;
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export interface BillPrefill {
  type: "bill";
  name: string;
  amount: string;
  frequency: string;
  category: string;
  notes: string;
}

/**
 * What "Turn into a bill" hands the Add flow. The app cannot yet create bills that
 * end, so a fixed count becomes a Temporary bill with a note; Ongoing is a Subscription.
 */
export function billPrefill(args: {
  name: string;
  amount: string;
  frequency: string;
  payments: number | null;
}): BillPrefill {
  const ongoing = args.payments === null;
  return {
    type: "bill",
    name: args.name.trim(),
    amount: args.amount,
    frequency: args.frequency,
    category: ongoing ? "Subscriptions" : "Temporary",
    notes: ongoing ? "" : `${args.payments} ${args.payments === 1 ? "payment" : "payments"}, then it stops.`,
  };
}

/* ── Weekly income and coverage ───────────────────────────── */

interface ContributionLike {
  amount: number;
  frequency: string;
}
interface ScheduleLike {
  id: string;
  amount: number | null;
  frequency: string;
}
interface HistoryLike {
  pay_schedule_id: string | null;
  amount: number | null;
  pay_date: string;
}

/**
 * Weekly income the way the Dashboard counts it today: Joint Fund = what members
 * contribute; Direct Pay = each pay schedule at its latest logged amount (else its
 * saved amount). R25 (Dashboard verdict) may replace this; keep the two in step.
 */
export function weeklyIncome(args: {
  isJointFund: boolean;
  contributions: ContributionLike[];
  schedules: ScheduleLike[];
  history: HistoryLike[];
  convert: Convert;
}): number {
  const { convert } = args;
  if (args.isJointFund) {
    return args.contributions.reduce((sum, c) => sum + convert(c.amount, c.frequency, "weekly"), 0);
  }
  return args.schedules.reduce((sum, s) => {
    let amount = s.amount ?? 0;
    const latest = args.history
      .filter((h) => h.pay_schedule_id === s.id && h.amount !== null)
      .sort((a, b) => b.pay_date.localeCompare(a.pay_date))[0];
    if (latest) amount = latest.amount as number;
    return sum + convert(amount, s.frequency, "weekly");
  }, 0);
}

export interface Coverage {
  /** neutral = no income to compare against; ok = still covered; bad = short. */
  tone: "neutral" | "ok" | "bad";
  /** "Still covered" / "Short $12 a week" / "Add your pay to check this". */
  headline: string;
  /** One muted line of meaning. */
  detail: string;
  /** True only when the plan turns a covered household into a short one. */
  flips: boolean;
}

const dollars = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/**
 * Would the weekly bills still be covered by weekly income once the plan is added?
 * `weeklyBills` is the household's current weekly bills (paused and finished left out).
 */
export function coverage(args: { weeklyIncome: number; weeklyBills: number; extraWeekly: number }): Coverage {
  const { weeklyIncome: income, weeklyBills: bills, extraWeekly: extra } = args;
  if (!(income > 0)) {
    return {
      tone: "neutral",
      headline: "Add your pay to check this",
      detail: "Set up pay on Payday and this will say whether you stay covered.",
      flips: false,
    };
  }
  // Whole dollars once, up front, so the headline and the detail never disagree.
  // `+ 0` turns a rounded -0 into 0, so a shortfall under 50 cents counts as covered.
  const before = Math.round(income - bills) + 0;
  const after = Math.round(income - bills - extra) + 0;
  if (after >= 0) {
    return {
      tone: "ok",
      headline: "Still covered",
      detail: `${dollars(after)} a week left after bills.`,
      flips: false,
    };
  }
  if (before >= 0) {
    return {
      tone: "bad",
      headline: `Short ${dollars(after)} a week`,
      detail: `You have ${dollars(before)} a week to spare now, so this tips you over.`,
      flips: true,
    };
  }
  return {
    tone: "bad",
    headline: `Short ${dollars(after)} a week`,
    detail: `Already short ${dollars(before)} a week, this makes it worse.`,
    flips: false,
  };
}

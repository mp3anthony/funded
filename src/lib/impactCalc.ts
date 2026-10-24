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

/* ── Coverage (the Dashboard verdict, before and after the plan) ───────── */

/** The slice of a Verdict (lib/verdict.ts) the calculator reads. */
export interface VerdictLike {
  tone: "ok" | "bad" | "neutral";
  headline: string;
  detail: string;
  shortBy: number;
  halves: {
    income: { status: string; gap: number };
    cover: { status: string; gap: number };
  };
}

export interface Coverage {
  /** neutral = nothing to compare against; ok = still covered; bad = short. */
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
 * What the plan does to the Dashboard verdict. `before` is the verdict as it stands,
 * `after` is the same verdict with the plan's weekly cost added (`extraWeekly`).
 */
export function impactFromVerdict(before: VerdictLike, after: VerdictLike): Coverage {
  if (after.tone === "neutral") {
    if (after.halves.income.status === "unset") {
      return {
        tone: "neutral",
        headline: "Add your pay to check this",
        detail: "Set up pay on Payday and this will say whether you stay covered.",
        flips: false,
      };
    }
    return { tone: "neutral", headline: after.headline, detail: after.detail, flips: false };
  }
  if (after.tone === "ok") {
    return { tone: "ok", headline: "Still covered", detail: after.detail, flips: false };
  }
  const flips = before.tone === "ok";
  let detail = after.detail;
  if (flips && after.halves.cover.status !== "short") {
    detail = `You have ${dollars(before.halves.income.gap)} a week to spare now, so this tips you over.`;
  } else if (before.tone === "bad") {
    detail = `Already short ${dollars(before.shortBy)} a week, this makes it worse.`;
  }
  return { tone: "bad", headline: after.headline, detail, flips };
}

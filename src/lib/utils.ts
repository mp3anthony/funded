import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type Bill, type Fund, type PayHistory, type PaySchedule, type BillSplit, type Expense, type ExpenseSplit } from "@/context/AppContext";
import { type HouseholdContribution, type ContributionRule } from "@/types";

/**
 * className combiner for the editorial UI primitives — clsx for conditional
 * joining, tailwind-merge to resolve conflicting Tailwind utilities so a
 * caller's `className` override wins cleanly over a default.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Parses a date string robustly, handling both "YYYY-MM-DD" and natural date formats like "June 30, 2026".
 */
export function parseBillDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + "T00:00:00");
  }
  
  let parsed = new Date(dateStr + "T00:00:00");
  if (isNaN(parsed.getTime())) {
    parsed = new Date(dateStr);
  }
  
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  
  return parsed;
}

/**
 * Dynamic due date adjustment for auto-pay bills.
 * If a bill is auto-pay and its due date is in the past, advance it iteratively
 * by its frequency until it is today or in the future.
 * Returns the date in YYYY-MM-DD local format to avoid timezone offset bugs.
 */
export function adjustAutopayBillDate(dueDateStr: string, frequency: string, paymentType?: string): string {
  if (!dueDateStr) return dueDateStr;
  const isAutoPay = paymentType?.toLowerCase() === "auto";
  if (!isAutoPay) return dueDateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tempDate = parseBillDate(dueDateStr);
  tempDate.setHours(0, 0, 0, 0);

  if (tempDate.getTime() < today.getTime()) {
    const freq = (frequency || "monthly").toLowerCase();
    let limit = 0;
    while (tempDate.getTime() < today.getTime() && limit < 100) {
      limit++;
      if (freq === "weekly") {
        tempDate.setDate(tempDate.getDate() + 7);
      } else if (freq === "fortnightly" || freq === "fortnightly" || freq === "fortnightly" || freq === "fortnightly") {
        tempDate.setDate(tempDate.getDate() + 14);
      } else if (freq === "monthly") {
        tempDate.setMonth(tempDate.getMonth() + 1);
      } else if (freq === "yearly") {
        tempDate.setFullYear(tempDate.getFullYear() + 1);
      } else {
        tempDate.setMonth(tempDate.getMonth() + 1);
      }
    }
    const year = tempDate.getFullYear();
    const month = String(tempDate.getMonth() + 1).padStart(2, "0");
    const day = String(tempDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return dueDateStr;
}


/**
 * Calculates a financial health score (0-100) based on:
 * - Bills management (40% weight)
 * - Goals/contributions progress (30% weight)
 * - Budget coverage (30% weight) — the "obligations" side of this now
 *   folds in expenses and active fixed-$ goal-contribution rules alongside
 *   bills (Issue #98, Slice 5 of 6, Decision #5: expenses fold into the
 *   existing budget-coverage half rather than becoming a separate scored
 *   component). `expenses`/`expenseSplits` mirror bills-client.tsx's
 *   `totalBills` treatment (implicitly-weekly amounts); `contributionRules`
 *   feeds `sumActiveFixedContributionRules` (see that function's own doc
 *   comment for why percentage-of-surplus rules are excluded). Bills
 *   Management (40%) and Goals/Contributions (30%) below are untouched by
 *   this slice.
 */
export function calculateHealthScore(
  bills: Bill[],
  goals: Fund[],
  _payHistory: PayHistory[],
  householdContributions: HouseholdContribution[],
  paySchedules: PaySchedule[],
  isJointFund: boolean,
  billSplits: BillSplit[],
  expenses: Expense[],
  expenseSplits: ExpenseSplit[],
  contributionRules: ContributionRule[]
): number {
  const activeBills = bills.filter(b => !b.is_paused);

  // 1. Bills Management (40% weight)
  // - If no bills are overdue: 100%
  // - For each overdue bill: deduct 20 points (max deduction 100)
  // - If all bills are due in the future: 100%
  let billsScore = 100;
  const overdueBills = activeBills.filter((b) => b.status === "Overdue");
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const allInFuture = activeBills.length > 0 && activeBills.every((b) => {
    const dStr = b.dueDate || b.due_date || "";
    if (!dStr) return false;
    return parseBillDate(dStr).getTime() > now.getTime();
  });

  if (allInFuture) {
    billsScore = 100;
  } else if (overdueBills.length > 0) {
    billsScore = Math.max(0, 100 - overdueBills.length * 20);
  } else {
    billsScore = 100;
  }

  // 2. Goals/Contributions Progress (30% weight)
  // - Check if there are any active goals or joint fund contributions
  // - If user has set up contributions (householdContributions exist): 80% base
  // - If goals have any progress (currentAmount > 0): add 20%
  // - If no goals or contributions set up: 50% (neutral, not penalized)
  let goalsScore = 50;
  const hasContributions = householdContributions && householdContributions.length > 0;
  const hasGoals = goals && goals.length > 0;

  if (hasContributions || hasGoals) {
    const base = 80;
    const hasProgress = goals && goals.some((g) => g.currentAmount > 0);
    goalsScore = base + (hasProgress ? 20 : 0);
    if (goalsScore > 100) goalsScore = 100;
  } else {
    goalsScore = 50;
  }

  // 3. Budget Coverage (30% weight)
  // - If isJointFund is true: compare contributions to bills
  // - If isJointFund is false: compare split assignments to bills
  let budgetScore = 0;

  const totalMonthlyExpenses = activeBills.reduce((sum, bill) => {
    const amount = bill.amount || 0;
    const freq = bill.frequency || "monthly";
    return sum + convertAmount(amount, freq, "monthly");
  }, 0)
    // Issue #98, Slice 5 of 6: this "obligations" denominator now covers
    // bills + expenses + active fixed-$ goal-contribution rules, mirroring
    // bills-client.tsx's `totalBills` (Slice 4). Expenses have no
    // `frequency` column by design (schema decision: "no recurring-frequency
    // semantics") — an expense's flat `amount` is implicitly a WEEKLY
    // figure, the same convention the sub-slice 1 migration preserved as-is
    // when it moved the 4 real groceries/fuel rows out of `bills` (they were
    // weekly bills before the move, and their dollar amounts were carried
    // over unchanged). Percentage-of-surplus contribution rules are
    // deliberately excluded — see sumActiveFixedContributionRules' own
    // comment for why (can't know a future payday's surplus in advance).
    + expenses.reduce((sum, e) => sum + convertAmount(e.amount, "weekly", "monthly"), 0)
    + sumActiveFixedContributionRules(contributionRules, paySchedules, "monthly");

  if (isJointFund) {
    const totalMonthlyContributions = householdContributions.reduce((sum, contribution) => {
      const amount = contribution.amount || 0;
      return sum + convertAmount(amount, contribution.frequency, "monthly");
    }, 0);

    if (totalMonthlyExpenses === 0) {
      budgetScore = 100;
    } else {
      budgetScore = Math.min(100, (totalMonthlyContributions / totalMonthlyExpenses) * 100);
    }
  } else {
    // Direct Pay mode: sum up all split amounts, normalized to monthly based on parent bill's frequency
    let totalMonthlySplits = billSplits.reduce((sum, split) => {
      const parentBill = activeBills.find((b) => String(b.id) === String(split.bill_id));
      if (!parentBill) return sum;
      const freq = parentBill.frequency || "monthly";
      const amount = split.amount || 0;
      return sum + convertAmount(amount, freq, "monthly");
    }, 0);

    // Issue #98, Slice 5 of 6: extend the numerator with expense-split
    // coverage, mirroring the exact asymmetry that already exists for
    // bills above — only `split_mode === "percentage"` expenses contribute
    // here; a whole-item/assignee expense, like a whole-item/assignee bill,
    // contributes nothing to this numerator (pre-existing behavior,
    // deliberately not "fixed" here). Each split's dollar amount is
    // `expense.amount * (split.percentage / 100)`, then converted from the
    // implicitly-weekly expense figure to monthly (same convention used
    // everywhere else expenses appear in this codebase).
    totalMonthlySplits += expenseSplits.reduce((sum, split) => {
      const parentExpense = expenses.find((e) => String(e.id) === String(split.expense_id));
      if (!parentExpense || parentExpense.split_mode !== "percentage") return sum;
      const dollarAmount = parentExpense.amount * ((split.percentage || 0) / 100);
      return sum + convertAmount(dollarAmount, "weekly", "monthly");
    }, 0);

    if (totalMonthlyExpenses === 0) {
      budgetScore = 100;
    } else {
      budgetScore = Math.min(100, (totalMonthlySplits / totalMonthlyExpenses) * 100);
    }
  }

  // Final weighted health score
  const finalScore = billsScore * 0.4 + goalsScore * 0.3 + budgetScore * 0.3;
  return Math.round(finalScore);
}

/**
 * Formats a date string relative to the current local date (e.g. "Today", "Yesterday", "3 days ago").
 */
export function getRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const date = parseBillDate(dateStr);
  date.setHours(0, 0, 0, 0);
  
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === -1) return "Tomorrow";
  
  if (diffDays < -1) {
    // Future date
    const absDays = Math.abs(diffDays);
    if (absDays < 7) {
      return `In ${absDays} days`;
    }
  } else if (diffDays > 1 && diffDays < 7) {
    // Past date within a week
    return `${diffDays} days ago`;
  }
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Converts a dollar amount from one billing frequency (weekly, fortnightly, monthly, yearly) to another.
 * Uses budgeting coefficients: 4.33 weeks per month, 2.16 by-weeks per month.
 */
export function convertAmount(amount: number, fromFrequency: string, toFrequency: string): number {
  if (!fromFrequency || !toFrequency) return amount;
  
  const from = fromFrequency.toLowerCase();
  const to = toFrequency.toLowerCase();
  
  if (from === to) return amount;
  
  // Convert to monthly first (base unit)
  let monthly: number;
  switch (from) {
    case "weekly":
      monthly = amount * 4.33;
      break;
    case "fortnightly":
    case "fortnightly":
      monthly = amount * 2.16;
      break;
    case "monthly":
      monthly = amount;
      break;
    case "yearly":
      monthly = amount / 12;
      break;
    default:
      monthly = amount;
  }

  // Convert from monthly to target frequency
  switch (to) {
    case "weekly":
      return monthly / 4.33;
    case "fortnightly":
    case "fortnightly":
      return monthly / 2.16;
    case "monthly":
      return monthly;
    case "yearly":
      return monthly * 12;
    default:
      return monthly;
  }
}

/**
 * Issue #98, Slice 4 of 6: sums active fixed-$ goal-contribution rules into the
 * weekly-draw / suggested-split totals (bills-client.tsx's Total Bar and
 * ContributionSettingsSheet.tsx's SuggestSplitPanel). Both `action_type`s
 * ("goal" and "contribution") count — either way it's real money that needs
 * to be drawn from the triggering member's pay. Percentage-of-surplus rules
 * (`amount_type === "percentage"`) are deliberately EXCLUDED — their payout
 * depends on a future payday's surplus that can't be known in advance, and
 * this codebase's existing philosophy (the #106 3-pay-minimum gate for
 * variable income) is to block/omit rather than guess when a real number
 * isn't available. Confirmed decision, issue #98 comment (2026-09-05).
 *
 * Each rule's amount is converted from the triggering member's own pay-
 * schedule frequency to `toFrequency` (same `convertAmount` helper bills use).
 * A member with exactly one pay schedule uses that schedule's frequency. A
 * member with zero or more than one (e.g. two jobs, potentially at different
 * frequencies) has no single "their" frequency to anchor on, so the rule's
 * amount is treated as already-monthly — the same missing-frequency fallback
 * bills already use elsewhere (`bill.frequency || "monthly"`).
 */
export function sumActiveFixedContributionRules(
  rules: ContributionRule[],
  paySchedules: Pick<PaySchedule, "member_id" | "frequency">[],
  toFrequency: string
): number {
  return rules
    .filter((rule) => rule.is_active && rule.amount_type === "fixed")
    .reduce((sum, rule) => {
      const memberSchedules = paySchedules.filter(
        (s) => String(s.member_id) === String(rule.member_id)
      );
      const fromFrequency = memberSchedules.length === 1 ? memberSchedules[0].frequency : "monthly";
      return sum + convertAmount(rule.amount_to_add, fromFrequency, toFrequency);
    }, 0);
}


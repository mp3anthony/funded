import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { type PaySchedule } from "@/context/AppContext";
import { type ContributionRule } from "@/types";

const twMerge = extendTailwindMerge({
  extend: { theme: { radius: ["card", "sheet", "input"] } },
});

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
 * SuggestSplitSheet.tsx). Both `action_type`s
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


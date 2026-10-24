"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { type Member, type Bill, type Expense, type PaySchedule } from "@/context/AppContext";
import { type ContributionRule } from "@/types";
import { convertAmount, sumActiveFixedContributionRules } from "@/lib/utils";
import { countsTowardTotals } from "@/lib/billCycle";

/* Suggest Split: the income-proportional contribution calculator. Moved out of
   ContributionSettingsSheet in R21 (#408); opened from the Payday "Compare
   split" pill. Behaviour unchanged until R23 redesigns it. */

type PayFrequency = "weekly" | "fortnightly" | "monthly";

// A member with at least one pay schedule and no history gaps: their income
// resolved to a monthly figure, plus the frequency their own contribution
// should be applied at.
interface MemberIncomeResult {
  member: Member;
  blocked: false;
  monthlyIncome: number;
  ownFrequency: PayFrequency;
}

// A member the split cannot be computed for yet, and why.
interface MemberBlockedResult {
  member: Member;
  blocked: true;
  reason: "missing pay schedule" | "not enough pay history yet";
}

type MemberSplitInput = MemberIncomeResult | MemberBlockedResult;

/**
 * Resolves each household member's monthly-normalized income from their pay
 * schedules, per the agreed #106 algorithm:
 * - No pay schedules at all → blocked ("missing pay schedule").
 * - Each fixed-amount schedule contributes its own amount, converted to
 *   monthly, summed individually.
 * - Each variable schedule has its own average (R19, #406:
 *   calculateAveragePay(scheduleId) = the last 4 confirmed pays of that
 *   schedule, at least 2). Each average is converted to monthly using that
 *   schedule's own frequency and the results are summed. If any variable
 *   schedule has no average yet, the member is blocked ("not enough pay
 *   history yet"), since their income would otherwise be understated.
 * - A member's "own pay frequency" (used later to apply a recommendation at
 *   their own cadence) is their single schedule's frequency, or — for a
 *   member with more than one schedule (e.g. two jobs) — the frequency of
 *   whichever schedule was created most recently, across ALL of their
 *   schedules (fixed and variable alike). The issue doesn't specify a
 *   tie-break for the multi-schedule case beyond "reasonable", so recency
 *   of created_at is the chosen rule.
 */
function computeMemberIncomes(
  members: Member[],
  paySchedules: PaySchedule[],
  calculateAveragePay: (scheduleId: string) => number | null
): MemberSplitInput[] {
  return members.map((member) => {
    const schedules = paySchedules.filter((s) => String(s.member_id) === String(member.id));

    if (schedules.length === 0) {
      return { member, blocked: true, reason: "missing pay schedule" };
    }

    const fixedSchedules = schedules.filter((s) => s.is_fixed_amount);
    const variableSchedules = schedules.filter((s) => !s.is_fixed_amount);

    let monthlyIncome = 0;
    for (const schedule of fixedSchedules) {
      monthlyIncome += convertAmount(schedule.amount ?? 0, schedule.frequency, "monthly");
    }

    // One average per variable schedule (R19, #406), each at its own
    // frequency. Any schedule without an average yet blocks the member.
    for (const schedule of variableSchedules) {
      const avg = calculateAveragePay(String(schedule.id));
      if (avg === null) {
        return { member, blocked: true, reason: "not enough pay history yet" };
      }
      monthlyIncome += convertAmount(avg, schedule.frequency, "monthly");
    }

    let ownFrequency: PayFrequency;
    if (schedules.length === 1) {
      ownFrequency = schedules[0].frequency;
    } else {
      const mostRecent = [...schedules].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      ownFrequency = mostRecent.frequency;
    }

    return { member, blocked: false, monthlyIncome, ownFrequency };
  });
}

interface SuggestSplitPanelProps {
  householdMembers: Member[];
  bills: Bill[];
  expenses: Expense[];
  contributionRules: ContributionRule[];
  paySchedules: PaySchedule[];
  calculateAveragePay: (scheduleId: string) => number | null;
  setContribution: (memberId: string, amount: number, frequency: PayFrequency) => Promise<void>;
  /** Open with the split already showing (the Payday "Compare split" pop-up). */
  startExpanded?: boolean;
}

export default function SuggestSplitPanel({
  householdMembers,
  bills,
  expenses,
  contributionRules,
  paySchedules,
  calculateAveragePay,
  setContribution,
  startExpanded = false,
}: SuggestSplitPanelProps) {
  const [isExpanded, setIsExpanded] = useState(startExpanded);

  const memberIncomes = useMemo(
    () => computeMemberIncomes(householdMembers, paySchedules, calculateAveragePay),
    [householdMembers, paySchedules, calculateAveragePay]
  );

  const blockedMembers = memberIncomes.filter((r): r is MemberBlockedResult => r.blocked);
  const unblockedMembers = memberIncomes.filter((r): r is MemberIncomeResult => !r.blocked);

  // Previously mirrored calculateHealthScore's totalMonthlyExpenses calc
  // exactly (active bills only, converted to monthly). Issue #98, Slice 4 of
  // 6 intentionally widens this split's total beyond that — it now also
  // includes expenses and active fixed-$ goal-contribution rules, per the
  // issue's core scope decision (the weekly-draw/split figure households
  // actually pull together should reflect all real recurring+variable spend,
  // not just bills). This means the two numbers diverge until Slice 5 (health
  // score integration, separate PR) folds expenses into calculateHealthScore
  // too — deliberately NOT touched here, that's Slice 5's job.
  //
  // Expenses have no `frequency` column (schema decision: "no
  // recurring-frequency semantics") — an expense's flat `amount` is
  // implicitly a WEEKLY figure, same convention the sub-slice 1 migration
  // preserved as-is when it moved the real groceries/fuel bill-rows (each
  // previously a weekly bill) into `expenses` unchanged.
  //
  // Percentage-of-surplus contribution rules are deliberately excluded — see
  // sumActiveFixedContributionRules' own comment for why (can't know a future
  // payday's surplus in advance).
  const totalMonthlyBills = useMemo(() => {
    const billsTotal = bills
      .filter(countsTowardTotals)
      .reduce((sum, bill) => sum + convertAmount(bill.amount || 0, bill.frequency || "monthly", "monthly"), 0);
    const expensesTotal = expenses.reduce((sum, e) => sum + convertAmount(e.amount, "weekly", "monthly"), 0);
    const rulesTotal = sumActiveFixedContributionRules(contributionRules, paySchedules, "monthly");
    return billsTotal + expensesTotal + rulesTotal;
  }, [bills, expenses, contributionRules, paySchedules]);

  const totalHouseholdMonthlyIncome =
    blockedMembers.length === 0 ? unblockedMembers.reduce((sum, r) => sum + r.monthlyIncome, 0) : 0;

  const splitResults = useMemo(() => {
    if (blockedMembers.length > 0) return [];
    return unblockedMembers.map((r) => {
      const splitPct = totalHouseholdMonthlyIncome > 0 ? r.monthlyIncome / totalHouseholdMonthlyIncome : 0;
      const recommendedMonthly = splitPct * totalMonthlyBills;
      return { ...r, splitPct, recommendedMonthly };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberIncomes, totalHouseholdMonthlyIncome, totalMonthlyBills]);

  if (householdMembers.length === 0) return null;

  return (
    <div className="mb-4 pb-5 border-b border-white/5">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between py-2 px-3 rounded-input border border-border bg-background hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <Sparkles size={12} className="text-primary" />
          Suggest Split
        </span>
        {isExpanded ? (
          <ChevronUp size={14} className="text-muted" />
        ) : (
          <ChevronDown size={14} className="text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {blockedMembers.length > 0 ? (
            <div className="rounded-input border border-border bg-background px-3 py-3 space-y-1.5">
              <p className="text-xs text-muted font-body">
                Can&apos;t suggest a split yet — set these up first:
              </p>
              <ul className="space-y-1">
                {blockedMembers.map((b) => (
                  <li key={b.member.id} className="text-xs font-body text-foreground">
                    <span className="font-semibold">{b.member.name}</span>{" "}
                    {b.reason === "missing pay schedule"
                      ? "hasn't set up a pay schedule yet."
                      : "doesn't have enough pays yet (needs at least 2 confirmed pays)."}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              {splitResults.map((r) => (
                <SuggestedSplitRow
                  key={r.member.id}
                  result={r}
                  onApply={(amount, frequency) => setContribution(String(r.member.id), amount, frequency)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SuggestedSplitRowProps {
  result: MemberIncomeResult & { splitPct: number; recommendedMonthly: number };
  onApply: (amount: number, frequency: PayFrequency) => Promise<void>;
}

function SuggestedSplitRow({ result, onApply }: SuggestedSplitRowProps) {
  const { member, splitPct, recommendedMonthly, ownFrequency } = result;
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const weekly = convertAmount(recommendedMonthly, "monthly", "weekly");
  const fortnightly = convertAmount(recommendedMonthly, "monthly", "fortnightly");
  const monthly = recommendedMonthly;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const amountAtOwnFrequency = convertAmount(recommendedMonthly, "monthly", ownFrequency);
      await onApply(amountAtOwnFrequency, ownFrequency);
      setIsApplied(true);
      setTimeout(() => setIsApplied(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="rounded-input border border-border bg-background px-3 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="h-6 w-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center text-foreground font-bold text-[10px] shrink-0">
              {member.avatar || member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-foreground truncate pr-2">{member.name}</span>
        </div>
        <span className="text-[10px] text-primary font-bold uppercase">
          {(splitPct * 100).toFixed(1)}%
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[10px] text-muted">
        <span>Weekly: ${weekly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span>
          Fortnightly: ${fortnightly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span>Monthly: ${monthly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <button
        onClick={handleApply}
        disabled={isApplying}
        className={`self-start py-1.5 px-4 rounded-input text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
          isApplied
            ? "bg-primary/25 text-primary border border-primary/30"
            : "bg-primary text-primary-fg hover:brightness-110 active:scale-95 cursor-pointer"
        }`}
      >
        {isApplying ? (
          <span>Applying...</span>
        ) : isApplied ? (
          <>
            <Check size={12} />
            <span>Applied</span>
          </>
        ) : (
          <span>Apply &mdash; {ownFrequency}</span>
        )}
      </button>
    </div>
  );
}

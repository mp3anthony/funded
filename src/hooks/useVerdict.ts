"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { countsTowardTotals } from "@/lib/billCycle";
import { latestLoggedAmount } from "@/lib/payHistory";
import { convertAmount, sumActiveFixedContributionRules } from "@/lib/utils";
import { verdict, verdictStats, type StatsSlides, type Verdict, type VerdictInput } from "@/lib/verdict";

/** The household's numbers shaped for `lib/verdict.ts`; shared by the verdict and the stats slides. */
export function useVerdictInput(): VerdictInput {
  const {
    bills,
    expenses,
    billSplits,
    expenseSplits,
    paySchedules,
    payHistory,
    householdContributions,
    isJointFund,
  } = useApp();

  return useMemo(
    () => ({
      isJointFund,
      bills: bills.filter(countsTowardTotals),
      expenses,
      billSplits,
      expenseSplits,
      pays: paySchedules.map((s) => ({
        amount: latestLoggedAmount(s.id, payHistory) ?? s.amount ?? 0,
        frequency: s.frequency,
      })),
      contributions: householdContributions,
      convert: convertAmount,
    }),
    [
      isJointFund,
      bills,
      expenses,
      billSplits,
      expenseSplits,
      paySchedules,
      payHistory,
      householdContributions,
    ],
  );
}

/**
 * The Dashboard verdict for the current household (R25, #412). `extraWeekly` adds a
 * plan's weekly cost on top, which is how the Impact calculator asks "and with this?".
 * `includeGoals` also counts active fixed goal rules, weekly (F01, #464): only the Impact
 * calculator sets it, so it matches that dialog's Household total; the Dashboard header does not.
 */
export function useVerdict(extraWeekly = 0, includeGoals = false): Verdict {
  const input = useVerdictInput();
  const { contributionRules, paySchedules } = useApp();
  return useMemo(() => {
    const goalsWeekly = includeGoals
      ? sumActiveFixedContributionRules(contributionRules, paySchedules, "weekly")
      : 0;
    return verdict({ ...input, extraWeekly, goalsWeekly });
  }, [input, extraWeekly, includeGoals, contributionRules, paySchedules]);
}

/** The two Dashboard stat slides (R26, #413) in the given frequency. */
export function useVerdictStats(frequency: string): StatsSlides {
  const input = useVerdictInput();
  return useMemo(() => verdictStats({ ...input, frequency }), [input, frequency]);
}

"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { countsTowardTotals } from "@/lib/billCycle";
import { latestLoggedAmount } from "@/lib/payHistory";
import { convertAmount } from "@/lib/utils";
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
 */
export function useVerdict(extraWeekly = 0): Verdict {
  const input = useVerdictInput();
  return useMemo(() => verdict({ ...input, extraWeekly }), [input, extraWeekly]);
}

/** The two Dashboard stat slides (R26, #413) in the given frequency. */
export function useVerdictStats(frequency: string): StatsSlides {
  const input = useVerdictInput();
  return useMemo(() => verdictStats({ ...input, frequency }), [input, frequency]);
}

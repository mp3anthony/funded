"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { countsTowardTotals } from "@/lib/billCycle";
import { latestLoggedAmount } from "@/lib/payHistory";
import { convertAmount } from "@/lib/utils";
import { verdict, type Verdict } from "@/lib/verdict";

/**
 * The Dashboard verdict for the current household (R25, #412). `extraWeekly` adds a
 * plan's weekly cost on top, which is how the Impact calculator asks "and with this?".
 */
export function useVerdict(extraWeekly = 0): Verdict {
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
    () =>
      verdict({
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
        extraWeekly,
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
      extraWeekly,
    ],
  );
}

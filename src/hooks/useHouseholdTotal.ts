"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { countsTowardTotals } from "@/lib/billCycle";
import { splitTotals } from "@/lib/billsFilters";
import { convertAmount, sumActiveFixedContributionRules } from "@/lib/utils";
import type { FrequencyType } from "@/lib/frequencyPreference";

/**
 * The whole household's total (bills + expenses + active fixed goal rules) in
 * the given frequency, ignoring every filter. The Impact calculator compares
 * against this on both Bills and Goals (R17, #404).
 */
export function useHouseholdTotal(frequency: FrequencyType): number {
  const { bills, expenses, contributionRules, paySchedules } = useApp();
  return useMemo(
    () =>
      splitTotals({
        bills,
        expenses,
        listedBills: bills,
        listedExpenses: expenses,
        goalsTotal: sumActiveFixedContributionRules(contributionRules, paySchedules, frequency),
        filterActive: false,
        frequency,
        deps: { convert: convertAmount, countsTowardTotals },
      }).total,
    [bills, expenses, contributionRules, paySchedules, frequency],
  );
}

// Exact frequency conversion (F01, #464). No imports so node can run the tests on it.
// utils.convertAmount delegates here.

/** Payments per year at each billing frequency: exact (52 weeks, 26 fortnights, 12 months). */
const PAYMENTS_PER_YEAR: Record<string, number> = { weekly: 52, fortnightly: 26, monthly: 12, yearly: 1 };

/**
 * Converts a dollar amount between weekly, fortnightly, monthly and yearly. Exact: a fortnight
 * is two weeks, a month is 52/12 weeks. An unknown frequency is treated as monthly.
 */
export function convertFrequency(amount: number, fromFrequency: string, toFrequency: string): number {
  if (!fromFrequency || !toFrequency) return amount;
  const from = fromFrequency.toLowerCase();
  const to = toFrequency.toLowerCase();
  if (from === to) return amount;
  const perYearFrom = PAYMENTS_PER_YEAR[from] ?? 12;
  const perYearTo = PAYMENTS_PER_YEAR[to] ?? 12;
  return (amount * perYearFrom) / perYearTo;
}

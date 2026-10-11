/**
 * Pure helpers for the onboarding wizard (#248). Import-free so node:test can
 * run them directly (see onboarding.test.mjs).
 */

/** Steps 1 to 6: household, payment mode, payday, bill, goal, Setup Complete. */
export const TOTAL_STEPS = 6;

/** Steps with "Skip for now": payday, first bill, first goal. */
export const SKIPPABLE_STEPS: readonly number[] = [3, 4, 5];

/** Fixed pay needs an amount above zero; variable pay needs none. A date is always required. */
export function isPaydayValid(p: { date: string; isFixed: boolean; amount: string }): boolean {
  if (p.date === "") return false;
  if (!p.isFixed) return true;
  const n = parseFloat(p.amount);
  return Number.isFinite(n) && n > 0;
}

/** Name, amount above zero and a due date (frequency always has a value). */
export function isBillValid(b: { name: string; amount: string; dueDate: string }): boolean {
  const n = parseFloat(b.amount);
  return b.name.trim().length > 0 && Number.isFinite(n) && n > 0 && b.dueDate !== "";
}

/** Name and a target above zero. */
export function isGoalValid(g: { name: string; target: string }): boolean {
  const n = parseFloat(g.target);
  return g.name.trim().length > 0 && Number.isFinite(n) && n > 0;
}

export interface FooterState {
  showBack: boolean;
  showSkip: boolean;
  /** "next" = Next button, "enter" = Enter App (step 6). */
  primary: "next" | "enter";
}

/**
 * What the wizard footer shows. `saved` says whether this step's data is
 * already written, which hides Skip so a revisited step can't be saved twice.
 * Step 6 has no Back: everything before it is already saved.
 */
export function footerFor(step: number, state: { saved: boolean }): FooterState {
  if (step >= TOTAL_STEPS) return { showBack: false, showSkip: false, primary: "enter" };
  return {
    showBack: step > 1,
    showSkip: SKIPPABLE_STEPS.includes(step) && !state.saved,
    primary: "next",
  };
}

export type SummaryCell =
  | { kind: "skipped" }
  | { kind: "variable" }
  | { kind: "amount"; amount: number };

/** One Setup Complete cell from a saved snapshot (null = skipped / never saved). */
export function summaryCell(saved: { isFixed?: boolean; amount: number } | null): SummaryCell {
  if (!saved) return { kind: "skipped" };
  if (saved.isFixed === false) return { kind: "variable" };
  return { kind: "amount", amount: saved.amount };
}

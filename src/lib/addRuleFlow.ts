// Pure rules for the Add rule flow, R09 (#396).
// Plain TS (no imports, no enums, no parameter properties) so node can run the tests on it.
// The parse and label helpers are small copies of the ones in `addFlow.ts` on purpose:
// node's test runner cannot resolve a relative .ts import (and tsc rejects the extension).

export type AmountType = "fixed" | "percentage";

export interface Option {
  value: string;
  label: string;
  description?: string;
}

export const AMOUNT_TYPE_OPTIONS: Option[] = [
  {
    value: "fixed",
    label: "A set amount",
    description: "The same dollar amount goes to the goal each time the rule runs.",
  },
  {
    value: "percentage",
    label: "A percentage of the extra",
    description: "A share of what's above your threshold. 50% means half of the extra.",
  },
];

export interface AddRuleValues {
  /** Member id as a string. "" = not chosen (the owner's card, or still loading). */
  member: string;
  /** "" = no goal chosen yet. */
  goalId: string;
  /** Dollars as typed. "0" means every pay. */
  threshold: string;
  amountType: AmountType;
  /** Dollars (set amount) or 0.01 to 100 (percentage), as typed. */
  amount: string;
}

export function initialValues(goalId: string = ""): AddRuleValues {
  return { member: "", goalId, threshold: "", amountType: "fixed", amount: "" };
}

/** The essential cards in order. The member card is only for an owner with 2+ members. */
export function stepKeys(canPickMember: boolean): string[] {
  const keys = canPickMember ? ["member"] : [];
  keys.push("goal", "threshold", "amountType", "amount");
  return keys;
}

/**
 * Whose pay the rule is for. An owner's pick wins; an owner who has not picked
 * falls back to themselves; a non-owner is always themselves.
 */
export function effectiveMember(
  member: string,
  { isOwner, currentId }: { isOwner: boolean; currentId: string }
): string {
  return isOwner && member !== "" ? member : currentId;
}

function cleanNumber(str: string): number | null {
  const cleaned = str.replace(/[\s,]/g, "").replace(/^\$/, "");
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** "12.50", "1,200", "$40", " 7 " give a number above 0; anything else gives null. */
export function parseAmount(str: string): number | null {
  const n = cleanNumber(str);
  return n !== null && n > 0 ? n : null;
}

/** Threshold: 0 or more (0 = every pay, because rules use "pay is above"). "" and negatives give null. */
export function parseThreshold(str: string): number | null {
  const n = cleanNumber(str);
  return n !== null && n >= 0 ? n : null;
}

/** Percentage: 0.01 to 100 inclusive. Anything else gives null. */
export function parsePercent(str: string): number | null {
  const n = cleanNumber(str);
  return n !== null && n >= 0.01 && n <= 100 ? n : null;
}

/** The amount for the chosen type: set amount above $0, or a percentage 0.01 to 100. */
export function parseRuleAmount(type: AmountType, str: string): number | null {
  return type === "percentage" ? parsePercent(str) : parseAmount(str);
}

/** Switching set amount <-> percentage clears a typed amount (the old number means something else). */
export function applyAmountTypeChange(v: AddRuleValues, amountType: AmountType): AddRuleValues {
  if (amountType === v.amountType) return v;
  return { ...v, amountType, amount: "" };
}

/** "$1,200.00" */
export function amountLabel(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Summary value for the Threshold row. */
export function thresholdLabel(str: string): string {
  const n = parseThreshold(str);
  if (n === null) return "—";
  return n === 0 ? "Every pay" : `Over ${amountLabel(n)}`;
}

/** Summary value for the Amount row. */
export function ruleAmountLabel(type: AmountType, str: string): string {
  const n = parseRuleAmount(type, str);
  if (n === null) return "—";
  return type === "percentage" ? `${n}%` : amountLabel(n);
}

export function optionLabel(options: readonly Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/** The shape `addRule` reads. New rules always go to a goal. */
export function buildRulePayload(v: AddRuleValues, memberId: string) {
  return {
    member_id: memberId,
    threshold_amount: parseThreshold(v.threshold) ?? 0,
    action_type: "goal" as const,
    action_target_id: v.goalId,
    amount_to_add: parseRuleAmount(v.amountType, v.amount) ?? 0,
    amount_type: v.amountType,
    is_active: true,
  };
}

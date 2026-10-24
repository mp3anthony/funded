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

// ── Rule detail sheet (R11, #398) ───────────────────────────────────────────

/** The rule sheet's one-field cards. The amount card carries the type too. */
export type RuleField = "member" | "goal" | "threshold" | "amount";

/** What the sheet needs from a rule (a `ContributionRule` fits). */
export interface RuleLike {
  member_id: string | number;
  threshold_amount: number | string;
  action_type: "goal" | "contribution";
  action_target_id: string | number;
  amount_to_add: number | string;
  amount_type?: AmountType | null;
  is_active: boolean;
}

/** Edit values for a rule. A contribution rule has no goal, so `goalId` is "". */
export function valuesFromRule(r: RuleLike): AddRuleValues {
  return {
    member: String(r.member_id),
    goalId: r.action_type === "goal" ? String(r.action_target_id) : "",
    threshold: String(r.threshold_amount),
    amountType: r.amount_type === "percentage" ? "percentage" : "fixed",
    amount: String(r.amount_to_add),
  };
}

/** Why Save is blocked for this field's card, or null. `goalIds` are the goals that exist. */
export function ruleFieldError(field: RuleField, v: AddRuleValues, goalIds: readonly string[]): string | null {
  if (field === "goal" && !goalIds.includes(v.goalId)) return "Choose a goal";
  if (field === "threshold" && parseThreshold(v.threshold) === null) return "Enter an amount of $0 or more";
  if (field === "amount" && parseRuleAmount(v.amountType, v.amount) === null) {
    return v.amountType === "percentage" ? "Enter 0.01 to 100" : "Enter an amount above $0";
  }
  return null;
}

/**
 * What `updateRule` takes. Keeps the rule's action type and on/off state. A goal
 * rule points at the chosen goal; a contribution rule points at
 * `contributionTargetId` (the member's contribution row, worked out by the caller).
 */
export function ruleUpdate(v: AddRuleValues, rule: RuleLike, contributionTargetId: string) {
  return {
    member_id: v.member,
    threshold_amount: parseThreshold(v.threshold) ?? 0,
    action_type: rule.action_type,
    action_target_id: rule.action_type === "goal" ? v.goalId : contributionTargetId,
    amount_to_add: parseRuleAmount(v.amountType, v.amount) ?? 0,
    amount_type: v.amountType,
    is_active: rule.is_active,
  };
}

/** One list row for a rule: "$50" or "10% of the extra" (with "Name · " first when given), and "Every pay" or "Over $200.00" (+ " · Off"). */
export function ruleRowText(rule: RuleLike, memberName: string | null): { label: string; value: string } {
  const type: AmountType = rule.amount_type === "percentage" ? "percentage" : "fixed";
  const amount = parseRuleAmount(type, String(rule.amount_to_add));
  const what = amount === null ? "—" : type === "percentage" ? `${amount}% of the extra` : Number.isInteger(amount) ? `$${amount}` : amountLabel(amount);
  const value = thresholdLabel(String(rule.threshold_amount)) + (rule.is_active ? "" : " · Off");
  return { label: memberName ? `${memberName} · ${what}` : what, value };
}

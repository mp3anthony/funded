// Pure rules for the New pay schedule flow, R09 (#396).
// Plain TS (no imports, no enums, no parameter properties) so node can run the tests on it.
// `parseAmount` / `amountLabel` are small copies of the ones in `addFlow.ts` on purpose:
// node's test runner cannot resolve a relative .ts import (and tsc rejects the extension).

export type PayType = "fixed" | "variable";
export type PayFrequency = "weekly" | "fortnightly" | "monthly";

export interface Option {
  value: string;
  label: string;
  description?: string;
}

export const PAY_TYPE_OPTIONS: Option[] = [
  {
    value: "fixed",
    label: "Fixed",
    description: "The same amount every payday. Log Pay fills it in.",
  },
  {
    value: "variable",
    label: "Variable",
    description: "Changes each time, like shifts or commission. You enter it when it lands.",
  },
];

export const PAY_FREQUENCY_OPTIONS: Option[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
];

export interface AddPayValues {
  /** Member id as a string. "" = not chosen (the owner's card, or still loading). */
  member: string;
  payType: PayType;
  frequency: PayFrequency;
  /** YYYY-MM-DD, "" = not set yet (required). */
  nextPayDate: string;
  /** Fixed only. Kept in state when switching to Variable, so switching back restores it. */
  amount: string;
}

export function initialValues(): AddPayValues {
  return { member: "", payType: "fixed", frequency: "monthly", nextPayDate: "", amount: "" };
}

/** The essential cards in order. The member card is only for an owner with 2+ members; Variable skips Amount. */
export function stepKeys({ canPickMember, payType }: { canPickMember: boolean; payType: PayType }): string[] {
  const keys = canPickMember ? ["member"] : [];
  keys.push("payType", "frequency", "nextPayDate");
  if (payType === "fixed") keys.push("amount");
  return keys;
}

/**
 * Whose pay is saved. An owner's pick wins; an owner who has not picked (or a
 * pick that is gone) falls back to themselves; a non-owner is always themselves.
 * `members` (optional) are the ids a pick may be.
 */
export function effectiveMember(
  member: string,
  { isOwner, currentId, memberIds }: { isOwner: boolean; currentId: string; memberIds?: string[] }
): string {
  if (isOwner && member !== "" && (!memberIds || memberIds.includes(member))) return member;
  return currentId;
}

/** "12.50", "1,200", "$40", " 7 " give a number above 0; anything else gives null. */
export function parseAmount(str: string): number | null {
  const cleaned = str.replace(/[\s,]/g, "").replace(/^\$/, "");
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "$1,200.00" */
export function amountLabel(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Summary value for the Next payday row. */
export function dateLabel(ymd: string): string {
  if (!ymd) return "Not set";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function optionLabel(options: readonly Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/** The DOM id and highlight key of a Payday row: shared by the Add flow and the Payday page. */
export function payScheduleRowKey(id: string | number): string {
  return `pay-schedule-${id}`;
}

/** The shape `addPaySchedule` reads. Variable pay saves no amount. */
export function buildPaySchedulePayload(v: AddPayValues, memberId: string) {
  const fixed = v.payType === "fixed";
  return {
    member_id: memberId,
    frequency: v.frequency,
    is_fixed_amount: fixed,
    amount: fixed ? (parseAmount(v.amount) ?? 0) : null,
    next_pay_date: v.nextPayDate,
  };
}

// ── Pay schedule detail sheet (R11, #398) ───────────────────────────────────

/** The pay schedule sheet's one-field cards. */
export type PayField = "member" | "payType" | "frequency" | "nextPayDate" | "amount";

/** What the sheet needs from a pay schedule (a `PaySchedule` fits). */
export interface ScheduleLike {
  member_id: string | number;
  frequency: string;
  is_fixed_amount: boolean;
  amount: number | null;
  next_pay_date: string;
}

/** Edit values for a pay schedule. */
export function valuesFromSchedule(s: ScheduleLike): AddPayValues {
  return {
    member: String(s.member_id),
    payType: s.is_fixed_amount ? "fixed" : "variable",
    frequency: (s.frequency as PayFrequency) || "monthly",
    nextPayDate: s.next_pay_date ? String(s.next_pay_date).slice(0, 10) : "",
    amount: s.is_fixed_amount && s.amount !== null && s.amount !== undefined ? String(s.amount) : "",
  };
}

/** Why Save is blocked for this field's card, or null. Fixed pay needs an amount, on the pay type card too. */
export function payFieldError(field: PayField, v: AddPayValues): string | null {
  if (field === "member" && v.member === "") return "Pick whose pay";
  if (field === "nextPayDate" && v.nextPayDate === "") return "Pick a date";
  if ((field === "payType" || field === "amount") && v.payType === "fixed" && parseAmount(v.amount) === null) {
    return "Enter an amount above $0";
  }
  return null;
}

/** What `updatePaySchedule` takes (the whole schedule; Variable saves no amount). */
export function payScheduleUpdate(v: AddPayValues) {
  return buildPaySchedulePayload(v, v.member);
}

/** Only an owner with 2+ accepted members can change whose pay a schedule or rule is. */
export function canPickMember(isOwner: boolean, acceptedCount: number): boolean {
  return isOwner && acceptedCount >= 2;
}

/** The "Whose pay" choices: accepted members, plus the current one if they are not accepted (so the card never shows blank). */
export function memberOptions(
  accepted: readonly { id: string | number; name: string }[],
  currentId: string
): Option[] {
  const list: Option[] = accepted.map((m) => ({ value: String(m.id), label: m.name }));
  if (currentId && !list.some((o) => o.value === currentId)) list.push({ value: currentId, label: "Former member" });
  return list;
}

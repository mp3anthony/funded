// Pure rules for the Add a bonus payment flow, F13 (#477).
// Plain TS (no imports, no enums, no parameter properties) so node can run the tests on it.
// `parseAmount` / `amountLabel` / `dateLabel` are small copies of the ones in `addPayFlow.ts` on purpose:
// node's test runner cannot resolve a relative .ts import (and tsc rejects the extension).

export interface AddBonusValues {
  /** Member id as a string. "" = not chosen (falls back to the current user). */
  member: string;
  amount: string;
  /** YYYY-MM-DD, household-local today by default. */
  date: string;
  notes: string;
}

export function initialValues(todayYmd: string): AddBonusValues {
  return { member: "", amount: "", date: todayYmd, notes: "" };
}

/** "Whose pay" is only asked with 2 or more accepted members. */
export function stepKeys({ canPickMember }: { canPickMember: boolean }): string[] {
  return canPickMember ? ["member", "amount", "date"] : ["amount", "date"];
}

/**
 * Whose bonus is saved. Anyone can log for any accepted member: a pick that is
 * in `memberIds` wins, otherwise the current user.
 */
export function effectiveMember(member: string, currentId: string, memberIds: readonly string[]): string {
  return member !== "" && memberIds.includes(member) ? member : currentId;
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

/** A real YYYY-MM-DD that is not after today (a bonus has already landed). */
export function isValidBonusDate(ymd: string, todayYmd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd ?? "")) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const real = new Date(Date.UTC(y, m - 1, d));
  if (real.getUTCFullYear() !== y || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) return false;
  return ymd <= todayYmd;
}

/** Summary value for the Date row. */
export function dateLabel(ymd: string): string {
  if (!ymd) return "Not set";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

/** The shape `logBonus` reads. Empty notes save as null. */
export function buildBonusPayload(v: AddBonusValues, memberId: string) {
  const notes = v.notes.trim();
  return {
    memberId,
    amount: parseAmount(v.amount) ?? 0,
    payDate: v.date,
    notes: notes === "" ? null : notes,
  };
}

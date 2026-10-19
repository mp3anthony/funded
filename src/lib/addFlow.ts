// Pure rules for the Add flow (bill or expense), R07 (#394).
// Plain TS (no imports, no enums, no parameter properties) so node can run the tests on it.

export type ItemType = "bill" | "expense";
export type PaymentType = "Manual" | "Auto";
export type SplitBasis = "percentage" | "amount";

export interface Option {
  value: string;
  label: string;
  description?: string;
}

/** The one category list for bills and expenses (also the Bills page order default). */
export const ITEM_CATEGORIES: string[] = [
  "Household Bills",
  "Living Costs",
  "Debt & Finance",
  "Loans",
  "Subscriptions",
  "Temporary",
  "Other",
];

/** Lowercase on purpose: `bills_frequency_check` allows only these values. */
export const FREQUENCY_OPTIONS: Option[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const TYPE_OPTIONS: Option[] = [
  {
    value: "bill",
    label: "Bill",
    description:
      "Something fixed on a schedule with a due date, like rent, power or a subscription. You mark it paid each time.",
  },
  {
    value: "expense",
    label: "Expense",
    description:
      "Everyday spending that changes, like groceries or fuel. No due date; counted as a weekly amount.",
  },
];

export const PAYMENT_OPTIONS: Option[] = [
  { value: "Manual", label: "Manual", description: "You mark it paid each time." },
  {
    value: "Auto",
    label: "Auto-Pay",
    description: "Taken automatically on the due date. No need to mark it paid.",
  },
];

/** How long the new row glows after an add (ms). */
export const HIGHLIGHT_MS = 1600;

export interface AddFlowValues {
  type: ItemType;
  name: string;
  amount: string;
  frequency: string;
  /** "" = no due date (#250). */
  dueDate: string;
  category: string;
  /** Member id; "" until the current member is known. */
  assignee: string;
  paymentType: PaymentType;
  /** Bill, Joint Fund household only. Direct Pay households are always "individual". */
  billSplitMode: "joint" | "individual";
  splitBasis: SplitBasis;
  /** Bill: typed share per NON-assignee member id (the assignee takes the rest). */
  shares: Record<string, string>;
  expenseSplit: "assignee" | "percentage";
  /** Expense percentage mode: typed % per member id. */
  percentages: Record<string, string>;
  notes: string;
}

export interface AddedItem {
  kind: ItemType;
  id: string;
  category: string;
}

export interface SplitRow {
  member_id: string;
  amount: number;
  is_assignee: boolean;
}

/** Everything a split rule needs to know about the household. */
export interface SplitContext {
  /** Same list everywhere in the flow (the app's `members`). */
  memberIds: readonly string[];
  isJointFund: boolean;
  /** Used when `values.assignee` is still "" (the current member had not loaded yet). */
  fallbackAssigneeId?: string;
}

const num = (s: string | undefined): number => {
  const n = parseFloat(s || "0");
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The DOM id and highlight key of a list row: shared by the Add flow and the Bills page. */
export function rowKey(kind: ItemType, id: string | number): string {
  return `${kind}-${id}`;
}

export function submitLabel(type: ItemType): string {
  return type === "bill" ? "Add bill" : "Add expense";
}
export function successToast(type: ItemType): string {
  return type === "bill" ? "Bill added" : "Expense added";
}
export function flowTitle(type: ItemType): string {
  return type === "bill" ? "Add a bill" : "Add an expense";
}

/** The essential cards in order. Expenses skip How often and Due date. */
export function stepKeys(type: ItemType): string[] {
  return type === "bill"
    ? ["type", "name", "amount", "frequency", "dueDate"]
    : ["type", "name", "amount"];
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

/** Summary value for the Amount row: "$40.00 a week" for expenses, "—" when not valid yet. */
export function amountSummary(type: ItemType, str: string): string {
  const n = parseAmount(str);
  if (n === null) return "—";
  return type === "expense" ? `${amountLabel(n)} a week` : amountLabel(n);
}

/** Summary value for the Due date row. */
export function dueDateLabel(ymd: string): string {
  if (!ymd) return "No due date";
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

export function initialValues(args: {
  currentMemberId: string | number;
  isJointFund: boolean;
}): AddFlowValues {
  return {
    type: "bill",
    name: "",
    amount: "",
    frequency: "monthly",
    dueDate: "",
    category: "Other",
    assignee: args.currentMemberId ? String(args.currentMemberId) : "",
    paymentType: "Manual",
    billSplitMode: args.isJointFund ? "joint" : "individual",
    splitBasis: "percentage",
    shares: {},
    expenseSplit: "assignee",
    percentages: {},
    notes: "",
  };
}

/**
 * Switching Bill <-> Expense. An amount already typed is cleared: a $100 a
 * month bill must not silently become $100 a week.
 */
export function applyTypeChange(v: AddFlowValues, type: ItemType): AddFlowValues {
  if (type === v.type) return v;
  return { ...v, type, amount: v.amount.trim() !== "" ? "" : v.amount };
}

/** The assignee to use: the chosen one, else the current member (adopted at save time). */
export function effectiveAssignee(v: AddFlowValues, fallbackId = ""): string {
  return v.assignee || fallbackId;
}

/* ── Bill split ───────────────────────────────────────────── */

interface BillSplitArgs {
  memberIds: readonly string[];
  assigneeId: string;
  mode: SplitBasis;
  /** Typed shares for non-assignee members. */
  values: Record<string, string>;
  total: number;
}

/** What the others have taken, the cap (100 or the bill amount) and what is left. */
export function billRemaining(a: BillSplitArgs): { others: number; cap: number; remaining: number } {
  let others = 0;
  for (const id of a.memberIds) if (id !== a.assigneeId) others += num(a.values[id]);
  const cap = a.mode === "percentage" ? 100 : a.total;
  return { others, cap, remaining: cap - others };
}

/** True when the others' shares add up to more than the bill. */
export function billSplitOver(a: BillSplitArgs): boolean {
  return billRemaining(a).remaining < -0.01;
}

/** One row per member, 2dp. The assignee takes whatever the others leave (never below 0). */
export function billSplitResults(a: BillSplitArgs): SplitRow[] {
  const { remaining } = billRemaining(a);
  return a.memberIds.map((id) => {
    const isAssignee = id === a.assigneeId;
    const units = isAssignee ? Math.max(0, remaining) : num(a.values[id]);
    const amount = a.mode === "percentage" ? (units / 100) * a.total : units;
    return { member_id: id, amount: round2(amount), is_assignee: isAssignee };
  });
}

function billArgs(v: AddFlowValues, ctx: SplitContext): BillSplitArgs {
  return {
    memberIds: ctx.memberIds,
    assigneeId: effectiveAssignee(v, ctx.fallbackAssigneeId),
    mode: v.splitBasis,
    values: v.shares,
    total: parseAmount(v.amount) ?? 0,
  };
}

/** True when any non-assignee member has a share typed in. */
export function billSplitTouched(v: AddFlowValues, ctx: SplitContext): boolean {
  const assignee = effectiveAssignee(v, ctx.fallbackAssigneeId);
  return ctx.memberIds.some((id) => id !== assignee && num(v.shares[id]) > 0);
}

/** Joint Fund bills in Joint mode save no rows; every other bill saves one row per member. */
export function buildBillSplits(v: AddFlowValues, ctx: SplitContext): SplitRow[] {
  if (ctx.isJointFund && v.billSplitMode === "joint") return [];
  return billSplitResults(billArgs(v, ctx));
}

/* ── Expense split ────────────────────────────────────────── */

export function percentTotal(memberIds: readonly string[], pct: Record<string, string>): number {
  return memberIds.reduce((sum, id) => sum + num(pct[id]), 0);
}

export function expensePercentValid(
  memberIds: readonly string[],
  pct: Record<string, string>
): boolean {
  return Math.abs(percentTotal(memberIds, pct) - 100) < 0.001;
}

/** Rows only for members above 0%. */
export function expenseSplitRows(
  memberIds: readonly string[],
  pct: Record<string, string>
): { member_id: string; percentage: number }[] {
  return memberIds
    .map((id) => ({ member_id: id, percentage: num(pct[id]) }))
    .filter((r) => r.percentage > 0);
}

/* ── Split card validity and summary ──────────────────────── */

/** False when the split would not add up (over-allocated bill, expense not at 100%). */
export function splitValid(v: AddFlowValues, ctx: SplitContext): boolean {
  if (v.type === "bill") {
    if (ctx.isJointFund && v.billSplitMode === "joint") return true;
    return !billSplitOver(billArgs(v, ctx));
  }
  if (v.expenseSplit === "assignee") return true;
  return expensePercentValid(ctx.memberIds, v.percentages);
}

/** The Split row on the summary. "—" when there is nobody to put it on. */
export function splitSummary(
  v: AddFlowValues,
  ctx: SplitContext,
  assigneeName: string
): { label: string; invalid: boolean } {
  const allOn = ctx.memberIds.length > 0 && assigneeName ? `All on ${assigneeName}` : "—";
  if (v.type === "bill") {
    if (ctx.isJointFund && v.billSplitMode === "joint") return { label: "Joint Fund", invalid: false };
    if (!splitValid(v, ctx)) return { label: "Doesn't add up", invalid: true };
    return { label: billSplitTouched(v, ctx) ? "Shared" : allOn, invalid: false };
  }
  if (v.expenseSplit === "percentage") {
    return expensePercentValid(ctx.memberIds, v.percentages)
      ? { label: "By percentage", invalid: false }
      : { label: "Doesn't add up", invalid: true };
  }
  return { label: allOn, invalid: false };
}

/* ── Payloads (the shapes addBill / addExpense already read) ─ */

export function buildBillPayload(v: AddFlowValues, fallbackAssigneeId = "") {
  return {
    name: v.name.trim(),
    amount: parseAmount(v.amount) ?? 0,
    category: v.category,
    // Invoice date is not asked in Add; it stays editable in the edit sheet.
    invoiceDate: "",
    dueDate: v.dueDate,
    paymentType: v.paymentType,
    assignee: effectiveAssignee(v, fallbackAssigneeId),
    notes: v.notes,
    frequency: v.frequency.toLowerCase(),
  };
}

export function buildExpensePayload(v: AddFlowValues, ctx: SplitContext) {
  const isPercentage = v.expenseSplit === "percentage";
  return {
    name: v.name.trim(),
    amount: parseAmount(v.amount) ?? 0,
    category: v.category,
    split_mode: v.expenseSplit,
    assignee_id: isPercentage ? null : effectiveAssignee(v, ctx.fallbackAssigneeId) || null,
    splits: isPercentage ? expenseSplitRows(ctx.memberIds, v.percentages) : [],
    notes: v.notes,
  };
}

/** Something was entered or changed (feeds `hasChanges` via the caller). */
export function dirtyValues(v: AddFlowValues, fallbackAssigneeId = ""): AddFlowValues {
  return { ...v, assignee: effectiveAssignee(v, fallbackAssigneeId) };
}

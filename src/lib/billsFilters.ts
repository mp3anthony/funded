/**
 * Pure logic for the Bills page filters and totals (R14, #401).
 *
 * Deliberately has ZERO imports so `billsFilters.test.mjs` can run it under
 * plain `node --test`. The helpers that live in alias-importing files
 * (convertAmount, countsTowardTotals, isDateless) are passed in as `deps`.
 * Erasable TypeScript syntax only.
 */

export type TypeFilter = "all" | "bills" | "expenses";
export type DueFilter = "all" | "week" | "month" | "overdue";

export interface FilterState {
  type: TypeFilter;
  due: DueFilter;
  /** "All" or a category name. */
  category: string;
  search: string;
}

export const NO_FILTERS: FilterState = { type: "all", due: "all", category: "All", search: "" };

export interface FilterBill {
  name: string;
  category?: string | null;
  amount: number;
  frequency?: string | null;
  dueLabel?: string | null;
  due_date?: string | null;
  dueDate?: string;
  status?: string;
}

export interface FilterExpense {
  name: string;
  category?: string | null;
  amount: number;
}

export interface FilterDeps {
  convert: (amount: number, from: string, to: string) => number;
  countsTowardTotals: (bill: FilterBill) => boolean;
  isDateless: (bill: FilterBill) => boolean;
}

/** True when any of Type, Due, Category or search narrows the list. */
export function isFilterActive(s: FilterState): boolean {
  return s.type !== "all" || s.due !== "all" || s.category !== "All" || s.search.trim() !== "";
}

/** Expenses have no due date, so choosing Type = Expenses resets Due to All. */
export function dueAfterTypeChange(type: TypeFilter, currentDue: DueFilter): DueFilter {
  return type === "expenses" ? "all" : currentDue;
}

/** The three choices held in the Filter card until Apply (search is separate). */
export interface FilterDraft {
  type: TypeFilter;
  due: DueFilter;
  category: string;
}

export const DEFAULT_DRAFT: FilterDraft = { type: "all", due: "all", category: "All" };

/** Expenses have no due date, so a draft with Type = Expenses always has Due = Any. */
export function normaliseDraft(d: FilterDraft): FilterDraft {
  return { ...d, due: dueAfterTypeChange(d.type, d.due) };
}

/** Seeds the Filter card's draft from the live filters (each time the card opens). */
export function draftFromFilters(s: FilterState): FilterDraft {
  return normaliseDraft({ type: s.type, due: s.due, category: s.category });
}

/** True when the draft is every default (the Reset target). */
export function isDraftDefault(d: FilterDraft): boolean {
  return d.type === "all" && d.due === "all" && d.category === "All";
}

/** The dot on the Filter chip: Type, Due or Category is not default. Search has its own bar. */
export function isFilterChipActive(s: Pick<FilterState, "type" | "due" | "category">): boolean {
  return s.type !== "all" || s.due !== "all" || s.category !== "All";
}

function matchesSearchAndCategory(
  item: { name: string; category?: string | null },
  s: FilterState,
): boolean {
  if (s.search.trim() !== "") {
    if (!item.name.toLowerCase().includes(s.search.toLowerCase())) return false;
  }
  if (s.category !== "All" && item.category !== s.category) return false;
  return true;
}

/** Does this bill belong in the list? `today` is local midnight. */
export function matchesBillFilters(
  bill: FilterBill,
  s: FilterState,
  today: Date,
  deps: Pick<FilterDeps, "isDateless">,
): boolean {
  if (s.type === "expenses") return false;
  if (!matchesSearchAndCategory(bill, s)) return false;

  // #288: bills showing a label (Paused / One-off) have no date, so they only appear under All.
  // #250: same for bills with no due date.
  if (bill.dueLabel || deps.isDateless(bill)) return s.due === "all";

  const d = bill.due_date ? new Date(bill.due_date + "T00:00:00") : new Date(bill.dueDate as string);
  if (isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);

  if (s.due === "week") return diffDays >= 0 && diffDays <= 7;
  if (s.due === "month") return diffDays >= 0 && diffDays <= 30;
  if (s.due === "overdue") return d.getTime() < today.getTime() && bill.status !== "Paid";
  return true;
}

/** Expenses have no due date, so any Due filter other than All hides them (#164). */
export function matchesExpenseFilters(expense: FilterExpense, s: FilterState): boolean {
  if (s.due !== "all") return false;
  if (s.type === "bills") return false;
  return matchesSearchAndCategory(expense, s);
}

/** True when only the Due filter is hiding expenses (Type All, some expense matches search/category). */
export function expensesHiddenByDue(expenses: FilterExpense[], s: FilterState): boolean {
  if (s.due === "all" || s.type !== "all") return false;
  return expenses.some((e) => matchesSearchAndCategory(e, s));
}

export interface SplitTotals {
  bills: number;
  expenses: number;
  goals: number;
  total: number;
  listedCount: number;
  totalCount: number;
}

/**
 * Household total (no filter) or Filtered total (any filter): bills + expenses +
 * goals, split out. Filtered counts only listed rows, paused/finished bills as 0,
 * and drops goals (they cannot be filtered). Expenses are weekly figures.
 */
export function splitTotals(args: {
  bills: FilterBill[];
  expenses: FilterExpense[];
  listedBills: FilterBill[];
  listedExpenses: FilterExpense[];
  /** Active fixed goal contributions at the chosen frequency. */
  goalsTotal: number;
  filterActive: boolean;
  frequency: string;
  deps: Pick<FilterDeps, "convert" | "countsTowardTotals">;
}): SplitTotals {
  const { filterActive, frequency, deps } = args;
  const billRows = filterActive ? args.listedBills : args.bills;
  const expenseRows = filterActive ? args.listedExpenses : args.expenses;
  const bills = billRows.reduce(
    (sum, b) =>
      deps.countsTowardTotals(b) ? sum + deps.convert(b.amount, b.frequency || "monthly", frequency) : sum,
    0,
  );
  const expenses = expenseRows.reduce((sum, e) => sum + deps.convert(e.amount, "weekly", frequency), 0);
  const goals = filterActive ? 0 : args.goalsTotal;
  return {
    bills,
    expenses,
    goals,
    total: bills + expenses + goals,
    listedCount: args.listedBills.length + args.listedExpenses.length,
    totalCount: args.bills.length + args.expenses.length,
  };
}

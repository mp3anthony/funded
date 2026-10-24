// Pure rules for the Add goal flow, R08 (#395).
// Plain TS (no imports, no enums, no parameter properties) so node can run the tests on it.
// `parseAmount` / `amountLabel` are small copies of the ones in `addFlow.ts` on purpose:
// node's test runner cannot resolve a relative .ts import (and tsc rejects the extension).

export type GoalKind = "saving" | "tracking";
export type GoalStatus = "not_started" | "in_progress" | "completed" | "paused";

export interface Option {
  value: string;
  label: string;
  description?: string;
}

/** The goal categories (also the Goals page default order). Moved here from the Goals page. */
export const GOAL_CATEGORIES: string[] = [
  "Home & Living",
  "Vacation & Travel",
  "Wish List",
  "Education",
  "Debt & Finance",
  "Savings",
  "Emergency",
  "Other",
];

export const KIND_OPTIONS: Option[] = [
  {
    value: "saving",
    label: "Saving",
    description: "You're putting money towards it. Shows progress and counts in your savings.",
  },
  {
    value: "tracking",
    label: "Just tracking",
    description: "Just a note of what something costs. Nothing is saved towards it yet.",
  },
];

export interface AddGoalValues {
  kind: GoalKind;
  name: string;
  target: string;
  /** Saving only. "" counts as $0. */
  saved: string;
  /** "" = no deadline. */
  deadline: string;
  category: string;
}

export interface AddedGoal {
  id: string;
  category: string;
}

/** Category a goal starts in, per kind (swapped only while the person has not chosen one). */
const SAVING_DEFAULT = "Savings";
const TRACKING_DEFAULT = "Wish List";

export function initialValues(): AddGoalValues {
  return {
    kind: "saving",
    name: "",
    target: "",
    saved: "",
    deadline: "",
    category: SAVING_DEFAULT,
  };
}

/**
 * Switching Saving <-> Just tracking. The category follows the kind
 * (Savings <-> Wish List) only while it still holds the other kind's default,
 * so a category the person picked is never overwritten.
 */
export function applyKindChange(v: AddGoalValues, kind: GoalKind): AddGoalValues {
  if (kind === v.kind) return v;
  let category = v.category;
  if (kind === "tracking" && category === SAVING_DEFAULT) category = TRACKING_DEFAULT;
  else if (kind === "saving" && category === TRACKING_DEFAULT) category = SAVING_DEFAULT;
  return { ...v, kind, category };
}

/** The essential cards in order. Just tracking skips "Already saved". */
export function stepKeys(kind: GoalKind): string[] {
  return kind === "saving" ? ["kind", "name", "target", "saved"] : ["kind", "name", "target"];
}

/** "12.50", "1,200", "$40", " 7 " give a number above 0; anything else gives null. */
export function parseAmount(str: string): number | null {
  const cleaned = str.replace(/[\s,]/g, "").replace(/^\$/, "");
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Already saved: "" is $0; any number from 0 up (above the target is allowed); anything else null. */
export function parseSaved(str: string): number | null {
  if (str.trim() === "") return 0;
  const cleaned = str.replace(/[\s,]/g, "").replace(/^\$/, "");
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** "$1,200.00" */
export function amountLabel(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Summary value for the Deadline row. */
export function deadlineLabel(ymd: string): string {
  if (!ymd) return "No deadline";
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

/** The DOM id and highlight key of a goal row: shared by the Add flow and the Goals page. */
export function goalRowKey(id: string | number): string {
  return `goal-${id}`;
}

/**
 * The status a new goal is saved with (no Status question is asked).
 * Just tracking -> paused; saved reaches the target -> completed; some saved -> in progress.
 */
export function goalStatus(v: AddGoalValues): GoalStatus {
  if (v.kind === "tracking") return "paused";
  const target = parseAmount(v.target) ?? 0;
  const saved = parseSaved(v.saved) ?? 0;
  if (target > 0 && saved >= target) return "completed";
  if (saved > 0) return "in_progress";
  return "not_started";
}

/** The shape `addFund` already reads (minus the placeholder id, which the database replaces). */
export function buildGoalPayload(v: AddGoalValues) {
  return {
    name: v.name.trim(),
    category: v.category,
    targetAmount: parseAmount(v.target) ?? 0,
    currentAmount: v.kind === "tracking" ? 0 : (parseSaved(v.saved) ?? 0),
    deadline: v.deadline || null,
    status: goalStatus(v),
  };
}

// ── Goal detail sheet (R11, #398) ───────────────────────────────────────────

/** The goal sheet's one-field cards. */
export type GoalField = "name" | "kind" | "target" | "saved" | "deadline" | "category";

/** What the sheet needs from a goal (a `Fund` fits). */
export interface GoalLike {
  name: string;
  category?: string | null;
  currentAmount: number;
  targetAmount: number;
  deadline?: string | null;
  status?: string | null;
}

/** Edit values for a goal. Just tracking = status "paused". */
export function valuesFromGoal(g: GoalLike): AddGoalValues {
  return {
    kind: g.status === "paused" ? "tracking" : "saving",
    name: g.name,
    target: String(g.targetAmount),
    saved: String(g.currentAmount),
    deadline: g.deadline ? String(g.deadline).slice(0, 10) : "",
    category: (g.category ?? "").trim() || "Other",
  };
}

/** Why Save is blocked for this field's card, or null. */
export function goalFieldError(field: GoalField, v: AddGoalValues): string | null {
  if (field === "name" && v.name.trim() === "") return "Enter a name";
  if (field === "target" && parseAmount(v.target) === null) return "Enter an amount above $0";
  if (field === "saved" && parseSaved(v.saved) === null) return "Enter $0 or more";
  return null;
}

/**
 * What `updateGoal` takes. It writes every column, so every field save sends
 * the whole goal; the status is worked out again each time. Just tracking keeps
 * its saved amount (switching back restores it). `member_id` is passed through
 * so a save never clears it.
 */
export function goalUpdate(v: AddGoalValues, goal: { member_id?: string | null }) {
  return {
    name: v.name.trim(),
    category: v.category,
    targetAmount: parseAmount(v.target) ?? 0,
    currentAmount: parseSaved(v.saved) ?? 0,
    deadline: v.deadline || null,
    status: goalStatus(v),
    member_id: goal.member_id ?? null,
  };
}

/** The status line on the goal sheet. */
export function goalStatusLabel(g: { status?: string | null; currentAmount: number; targetAmount: number }): string {
  if (g.status === "paused") return "Just tracking";
  if (g.targetAmount > 0 && g.currentAmount >= g.targetAmount) return "Reached";
  return "Saving";
}

/** The Category choices, plus the goal's own category when it is an old one not in the list. */
export function goalCategoryOptions(current?: string | null): Option[] {
  const list: Option[] = GOAL_CATEGORIES.map((c) => ({ value: c, label: c }));
  const cur = (current ?? "").trim();
  if (cur && !GOAL_CATEGORIES.includes(cur)) list.push({ value: cur, label: cur });
  return list;
}

/** The rules that put money into this goal (not old "Add to Contribution" rules). Ids may be a number or a string. */
export function rulesForGoal<T extends { action_type: string; action_target_id: string | number }>(
  rules: readonly T[],
  goalId: string | number
): T[] {
  return rules.filter((r) => r.action_type === "goal" && String(r.action_target_id) === String(goalId));
}

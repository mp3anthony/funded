// Pure navigation and label rules for the step-flow pop-up (R06, #393).
// Plain TS (no imports) so node can run the tests on it.

/** Key of the final summary card. */
export const STEP_SUMMARY = "__summary";

export const NEXT_LABEL = "Next";
export const SKIP_LABEL = "Skip";
export const DONE_LABEL = "Done";
export const KEEP_EDITING_LABEL = "Keep editing";
export const DISCARD_LABEL = "Discard";

/** Title of the discard question, e.g. "Discard this bill?". */
export function discardTitle(noun: string): string {
  return `Discard this ${noun}?`;
}

/**
 * The card to show. `at` if it still exists (a step, an extra, or the summary);
 * otherwise the first step; otherwise the summary when there are no steps.
 * Covers steps that disappear mid-flow (e.g. Type -> Expense drops Due date).
 */
export function resolveStep(
  keys: readonly string[],
  at: string,
  extraKeys: readonly string[] = []
): string {
  if (at === STEP_SUMMARY || keys.includes(at) || extraKeys.includes(at)) return at;
  return keys.length > 0 ? keys[0] : STEP_SUMMARY;
}

/** The step after `at`; the summary after the last step (or for an unknown key). */
export function nextStep(keys: readonly string[], at: string): string {
  const i = keys.indexOf(at);
  if (i < 0 || i >= keys.length - 1) return STEP_SUMMARY;
  return keys[i + 1];
}

/** Where Next or Skip goes: back to the summary in a detour, else the next step. */
export function advanceTarget(keys: readonly string[], at: string, detour: boolean): string {
  return detour ? STEP_SUMMARY : nextStep(keys, at);
}

/** The step before `at`: the last step from the summary, null on the first step. */
export function prevStep(keys: readonly string[], at: string): string | null {
  if (at === STEP_SUMMARY) return keys.length > 0 ? keys[keys.length - 1] : null;
  const i = keys.indexOf(at);
  if (i <= 0) return null;
  return keys[i - 1];
}

/**
 * Progress dots: one per step plus the summary as the last dot.
 * An extra card (`onExtra`) shows the summary dot, since it is reached from there.
 * An unknown key shows the first dot.
 */
export function dotState(
  keys: readonly string[],
  at: string,
  onExtra = false
): { count: number; active: number } {
  const count = keys.length + 1;
  if (onExtra || at === STEP_SUMMARY) return { count, active: keys.length };
  const i = keys.indexOf(at);
  return { count, active: i < 0 ? 0 : i };
}

/** Back circle works: not while saving; always in a detour; else not on the first card. */
export function canGoBack(args: {
  isFirst: boolean;
  detour: boolean;
  saving: boolean;
}): boolean {
  if (args.saving) return false;
  if (args.detour) return true;
  return !args.isFirst;
}

/** Closing asks first only when something was entered and no save is running. */
export function shouldConfirmDiscard(dirty: boolean, saving: boolean): boolean {
  return dirty && !saving;
}

/** Pill label on a step card: "Done" when returning to the summary, else "Next". */
export function nextPillLabel(detour: boolean): string {
  return detour ? DONE_LABEL : NEXT_LABEL;
}

const isEmpty = (v: unknown) => v === "" || v === null || v === undefined;
const normalise = (v: unknown) => (isEmpty(v) ? "" : JSON.stringify(v));

/**
 * True when any value differs from its starting value. "", null and undefined
 * all count as empty; arrays and objects compare by content.
 */
export function hasChanges(
  current: Record<string, unknown>,
  initial: Record<string, unknown>
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(initial)]);
  for (const k of keys) {
    if (normalise(current[k]) !== normalise(initial[k])) return true;
  }
  return false;
}

/** The selected option's explanation, or undefined when nothing matches. */
export function choiceDescription(
  options: readonly { value: string; description?: string }[],
  value: string
): string | undefined {
  return options.find((o) => o.value === value)?.description;
}

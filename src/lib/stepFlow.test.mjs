// Runtime tests for the step-flow navigation rules (R06, #393).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STEP_SUMMARY,
  NEXT_LABEL,
  SKIP_LABEL,
  DONE_LABEL,
  KEEP_EDITING_LABEL,
  DISCARD_LABEL,
  discardTitle,
  resolveStep,
  nextStep,
  advanceTarget,
  prevStep,
  dotState,
  canGoBack,
  shouldConfirmDiscard,
  nextPillLabel,
  hasChanges,
  choiceDescription,
} from "./stepFlow.ts";

const keys = ["name", "amount", "due"];

test("exact labels", () => {
  assert.equal(NEXT_LABEL, "Next");
  assert.equal(SKIP_LABEL, "Skip");
  assert.equal(DONE_LABEL, "Done");
  assert.equal(KEEP_EDITING_LABEL, "Keep editing");
  assert.equal(DISCARD_LABEL, "Discard");
  assert.equal(discardTitle("bill"), "Discard this bill?");
  assert.equal(discardTitle("expense"), "Discard this expense?");
});

test("resolveStep keeps a known card and falls back otherwise", () => {
  assert.equal(resolveStep(keys, "amount"), "amount");
  assert.equal(resolveStep(keys, STEP_SUMMARY), STEP_SUMMARY);
  assert.equal(resolveStep(keys, "gone"), "name");
  assert.equal(resolveStep([], "gone"), STEP_SUMMARY);
  assert.equal(resolveStep([], STEP_SUMMARY), STEP_SUMMARY);
});

test("resolveStep lets an extra survive the clamp", () => {
  assert.equal(resolveStep(keys, "category", ["category"]), "category");
  assert.equal(resolveStep(keys, "category"), "name");
});

test("nextStep goes forward and ends on the summary", () => {
  assert.equal(nextStep(keys, "name"), "amount");
  assert.equal(nextStep(keys, "amount"), "due");
  assert.equal(nextStep(keys, "due"), STEP_SUMMARY);
  assert.equal(nextStep([], "x"), STEP_SUMMARY);
  assert.equal(nextStep(keys, "unknown"), STEP_SUMMARY);
});

test("prevStep goes back, last step from the summary, null on the first", () => {
  assert.equal(prevStep(keys, "amount"), "name");
  assert.equal(prevStep(keys, STEP_SUMMARY), "due");
  assert.equal(prevStep(keys, "name"), null);
  assert.equal(prevStep([], STEP_SUMMARY), null);
  assert.equal(prevStep(keys, "unknown"), null);
});

test("dotState counts the summary as the last dot", () => {
  assert.deepEqual(dotState(keys, "name"), { count: 4, active: 0 });
  assert.deepEqual(dotState(keys, "due"), { count: 4, active: 2 });
  assert.deepEqual(dotState(keys, STEP_SUMMARY), { count: 4, active: 3 });
  assert.deepEqual(dotState(keys, "unknown"), { count: 4, active: 0 });
  assert.deepEqual(dotState([], STEP_SUMMARY), { count: 1, active: 0 });
});

test("an extra card shows the summary dot", () => {
  assert.deepEqual(dotState(keys, "category", true), { count: 4, active: 3 });
});

test("canGoBack", () => {
  assert.equal(canGoBack({ isFirst: true, detour: false, saving: false }), false);
  assert.equal(canGoBack({ isFirst: false, detour: false, saving: false }), true);
  assert.equal(canGoBack({ isFirst: true, detour: true, saving: false }), true);
  assert.equal(canGoBack({ isFirst: false, detour: false, saving: true }), false);
  assert.equal(canGoBack({ isFirst: false, detour: true, saving: true }), false);
});

test("shouldConfirmDiscard", () => {
  assert.equal(shouldConfirmDiscard(true, false), true);
  assert.equal(shouldConfirmDiscard(false, false), false);
  assert.equal(shouldConfirmDiscard(true, true), false);
  assert.equal(shouldConfirmDiscard(false, true), false);
});

test("nextPillLabel", () => {
  assert.equal(nextPillLabel(false), "Next");
  assert.equal(nextPillLabel(true), "Done");
});

test("a skip in a detour returns to the summary, not the next step", () => {
  assert.equal(advanceTarget(keys, "name", true), STEP_SUMMARY);
  assert.equal(advanceTarget(keys, "name", false), "amount");
  assert.equal(advanceTarget(keys, "due", false), STEP_SUMMARY);
});

test("hasChanges treats empty values alike", () => {
  assert.equal(hasChanges({ a: "", b: null }, { a: undefined, b: "" }), false);
  assert.equal(hasChanges({}, { a: "" }), false);
  assert.equal(hasChanges({ a: "x" }, { a: "" }), true);
  assert.equal(hasChanges({ a: "x" }, {}), true);
  assert.equal(hasChanges({ a: 0 }, { a: "" }), true);
  assert.equal(hasChanges({ a: "x" }, { a: "x" }), false);
});

test("hasChanges compares arrays and objects by content", () => {
  assert.equal(hasChanges({ split: ["a", "b"] }, { split: ["a", "b"] }), false);
  assert.equal(hasChanges({ split: ["a", "c"] }, { split: ["a", "b"] }), true);
  assert.equal(hasChanges({ o: { x: 1 } }, { o: { x: 1 } }), false);
  assert.equal(hasChanges({ split: [] }, { split: "" }), true);
});

test("choiceDescription", () => {
  const opts = [
    { value: "bill", label: "Bill", description: "Repeats on a date." },
    { value: "expense", label: "Expense" },
  ];
  assert.equal(choiceDescription(opts, "bill"), "Repeats on a date.");
  assert.equal(choiceDescription(opts, "expense"), undefined);
  assert.equal(choiceDescription(opts, ""), undefined);
});

// Runtime tests for the Add goal flow rules (R08, #395).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GOAL_CATEGORIES,
  KIND_OPTIONS,
  stepKeys,
  parseAmount,
  parseSaved,
  amountLabel,
  deadlineLabel,
  goalRowKey,
  goalStatus,
  buildGoalPayload,
  applyKindChange,
  initialValues,
} from "./addGoalFlow.ts";

const withValues = (p) => ({ ...initialValues(), ...p });

test("stepKeys: Saving asks Already saved, Just tracking does not", () => {
  assert.deepEqual(stepKeys("saving"), ["kind", "name", "target", "saved"]);
  assert.deepEqual(stepKeys("tracking"), ["kind", "name", "target"]);
});

test("parseAmount needs a number above 0", () => {
  assert.equal(parseAmount("1,200"), 1200);
  assert.equal(parseAmount("$40.5"), 40.5);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount("-5"), null);
});

test("parseSaved: blank is $0, 0 or more is fine, junk is null", () => {
  assert.equal(parseSaved(""), 0);
  assert.equal(parseSaved("  "), 0);
  assert.equal(parseSaved("0"), 0);
  assert.equal(parseSaved("250.50"), 250.5);
  assert.equal(parseSaved("99999"), 99999);
  assert.equal(parseSaved("-1"), null);
  assert.equal(parseSaved("x"), null);
});

test("goalStatus: tracking is paused, then completed / in progress / not started", () => {
  assert.equal(goalStatus(withValues({ kind: "tracking", target: "500", saved: "900" })), "paused");
  assert.equal(goalStatus(withValues({ target: "500", saved: "" })), "not_started");
  assert.equal(goalStatus(withValues({ target: "500", saved: "0" })), "not_started");
  assert.equal(goalStatus(withValues({ target: "500", saved: "100" })), "in_progress");
  assert.equal(goalStatus(withValues({ target: "500", saved: "500" })), "completed");
  assert.equal(goalStatus(withValues({ target: "500", saved: "600" })), "completed");
});

test("buildGoalPayload", () => {
  assert.deepEqual(
    buildGoalPayload(withValues({ name: "  Holiday ", target: "2,000", saved: "150", deadline: "2027-03-01" })),
    {
      name: "Holiday",
      category: "Savings",
      targetAmount: 2000,
      currentAmount: 150,
      deadline: "2027-03-01",
      status: "in_progress",
    }
  );
  const t = buildGoalPayload(
    withValues({ kind: "tracking", name: "TV", target: "900", saved: "300", category: "Wish List" })
  );
  assert.equal(t.currentAmount, 0);
  assert.equal(t.status, "paused");
  assert.equal(t.deadline, null);
});

test("applyKindChange swaps the category default only while untouched", () => {
  const toTracking = applyKindChange(initialValues(), "tracking");
  assert.equal(toTracking.kind, "tracking");
  assert.equal(toTracking.category, "Wish List");
  assert.equal(applyKindChange(toTracking, "saving").category, "Savings");
  const picked = withValues({ category: "Education" });
  assert.equal(applyKindChange(picked, "tracking").category, "Education");
  const same = initialValues();
  assert.equal(applyKindChange(same, "saving"), same);
});

test("initialValues", () => {
  assert.deepEqual(initialValues(), {
    kind: "saving",
    name: "",
    target: "",
    saved: "",
    deadline: "",
    category: "Savings",
  });
});

test("GOAL_CATEGORIES and KIND_OPTIONS", () => {
  assert.equal(GOAL_CATEGORIES.length, 8);
  assert.ok(GOAL_CATEGORIES.includes("Wish List") && GOAL_CATEGORIES.includes("Savings"));
  assert.deepEqual(KIND_OPTIONS.map((o) => o.value), ["saving", "tracking"]);
});

test("goalRowKey, amountLabel, deadlineLabel", () => {
  assert.equal(goalRowKey("abc"), "goal-abc");
  assert.equal(goalRowKey(7), "goal-7");
  assert.equal(amountLabel(1200), "$1,200.00");
  assert.equal(deadlineLabel(""), "No deadline");
  assert.match(deadlineLabel("2027-03-01"), /2027/);
});

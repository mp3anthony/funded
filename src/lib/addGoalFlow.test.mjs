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
  displayCategory,
  valuesFromGoal,
  goalCategoryOptions,
  goalStatusLabel,
  initialValues,
} from "./addGoalFlow.ts";

const withValues = (p) => ({ ...initialValues(), ...p });

test("stepKeys: Active goal asks Already saved, Wish list does not", () => {
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
    withValues({ kind: "tracking", name: "TV", target: "900", saved: "300", category: "Other" })
  );
  assert.equal(t.currentAmount, 0);
  assert.equal(t.status, "paused");
  assert.equal(t.deadline, null);
});

test("applyKindChange changes the kind only, never the category", () => {
  const toTracking = applyKindChange(initialValues(), "tracking");
  assert.equal(toTracking.kind, "tracking");
  assert.equal(toTracking.category, "Savings");
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
  assert.equal(GOAL_CATEGORIES.length, 7);
  assert.ok(!GOAL_CATEGORIES.includes("Wish List") && GOAL_CATEGORIES.includes("Savings"));
  assert.deepEqual(KIND_OPTIONS.map((o) => o.value), ["saving", "tracking"]);
});

test("goalRowKey, amountLabel, deadlineLabel", () => {
  assert.equal(goalRowKey("abc"), "goal-abc");
  assert.equal(goalRowKey(7), "goal-7");
  assert.equal(amountLabel(1200), "$1,200.00");
  assert.equal(deadlineLabel(""), "No deadline");
  assert.match(deadlineLabel("2027-03-01"), /2027/);
});

test("type labels: Active goal / Wish list (F08)", () => {
  assert.deepEqual(KIND_OPTIONS.map((o) => [o.value, o.label]), [["saving", "Active goal"], ["tracking", "Wish list"]]);
  assert.equal(goalStatusLabel({ status: "paused", currentAmount: 0, targetAmount: 10 }), "Wish list");
  assert.equal(goalStatusLabel({ status: "in_progress", currentAmount: 1, targetAmount: 10 }), "Active goal");
});

test("displayCategory: retired Wish List and blank read as Other, nothing else changes", () => {
  assert.equal(displayCategory("Wish List"), "Other");
  assert.equal(displayCategory(" Wish List "), "Other");
  assert.equal(displayCategory(""), "Other");
  assert.equal(displayCategory(null), "Other");
  assert.equal(displayCategory(undefined), "Other");
  assert.equal(displayCategory("Education"), "Education");
});

test("legacy Wish List category reads as Other in the goal sheet and the category card", () => {
  const g = { name: "Xbox", category: "Wish List", currentAmount: 0, targetAmount: 400, status: "paused" };
  assert.equal(valuesFromGoal(g).category, "Other");
  const opts = goalCategoryOptions("Wish List").map((o) => o.value);
  assert.ok(!opts.includes("Wish List"));
  assert.equal(opts.filter((v) => v === "Other").length, 1);
});

import { activeStatus } from "./addGoalFlow.ts";

test("activeStatus (F07): completed at target, in progress with some saved, else not started", () => {
  assert.equal(activeStatus(400, 400), "completed");
  assert.equal(activeStatus(500, 400), "completed");
  assert.equal(activeStatus(1, 400), "in_progress");
  assert.equal(activeStatus(0, 400), "not_started");
  assert.equal(activeStatus(0, 0), "not_started");
});

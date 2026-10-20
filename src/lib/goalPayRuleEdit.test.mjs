// Runtime tests for the goal, pay schedule and rule detail sheet rules (R11, #398).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  valuesFromGoal,
  goalFieldError,
  goalUpdate,
  goalStatusLabel,
  goalCategoryOptions,
  rulesForGoal,
  applyKindChange,
} from "./addGoalFlow.ts";
import {
  valuesFromSchedule,
  payFieldError,
  payScheduleUpdate,
  canPickMember,
  memberOptions,
} from "./addPayFlow.ts";
import {
  valuesFromRule,
  ruleFieldError,
  ruleUpdate,
  ruleRowText,
  applyAmountTypeChange,
} from "./addRuleFlow.ts";

const goal = (p = {}) => ({
  name: "Holiday",
  category: "Vacation & Travel",
  currentAmount: 200,
  targetAmount: 1000,
  deadline: "2027-03-01T00:00:00",
  status: "in_progress",
  ...p,
});

test("valuesFromGoal: paused is Just tracking, deadline is sliced, odd category falls back", () => {
  assert.equal(valuesFromGoal(goal({ status: "paused" })).kind, "tracking");
  assert.equal(valuesFromGoal(goal({ status: "completed" })).kind, "saving");
  const v = valuesFromGoal(goal());
  assert.equal(v.saved, "200");
  assert.equal(v.target, "1000");
  assert.equal(v.deadline, "2027-03-01");
  assert.equal(valuesFromGoal(goal({ category: "", deadline: null })).category, "Other");
  assert.equal(valuesFromGoal(goal({ deadline: null })).deadline, "");
});

test("goalUpdate keeps member_id and works the status out again", () => {
  const v = valuesFromGoal(goal());
  assert.equal(goalUpdate(v, { member_id: "m1" }).member_id, "m1");
  assert.equal(goalUpdate(v, {}).member_id, null);
  assert.equal(goalUpdate(v, {}).status, "in_progress");
  assert.equal(goalUpdate({ ...v, saved: "1000" }, {}).status, "completed");
  assert.equal(goalUpdate({ ...v, saved: "" }, {}).status, "not_started");
  assert.equal(goalUpdate({ ...v, saved: "" }, {}).currentAmount, 0);
  assert.equal(goalUpdate({ ...v, deadline: "" }, {}).deadline, null);
  assert.equal(goalUpdate({ ...v, name: "  Trip " }, {}).name, "Trip");
});

test("goalUpdate: Just tracking is paused and keeps the saved amount", () => {
  const v = applyKindChange(valuesFromGoal(goal()), "tracking");
  const u = goalUpdate(v, {});
  assert.equal(u.status, "paused");
  assert.equal(u.currentAmount, 200);
});

test("goalFieldError", () => {
  const v = valuesFromGoal(goal());
  assert.equal(goalFieldError("name", { ...v, name: " " }), "Enter a name");
  assert.equal(goalFieldError("name", v), null);
  assert.equal(goalFieldError("target", { ...v, target: "0" }), "Enter an amount above $0");
  assert.equal(goalFieldError("saved", { ...v, saved: "abc" }), "Enter $0 or more");
  assert.equal(goalFieldError("saved", { ...v, saved: "" }), null);
  assert.equal(goalFieldError("saved", { ...v, saved: "5000" }), null, "above the target is allowed");
  assert.equal(goalFieldError("deadline", v), null);
});

test("goalStatusLabel", () => {
  assert.equal(goalStatusLabel(goal({ status: "paused" })), "Just tracking");
  assert.equal(goalStatusLabel(goal({ currentAmount: 1000 })), "Reached");
  assert.equal(goalStatusLabel(goal()), "Saving");
  assert.equal(goalStatusLabel(goal({ status: "completed", currentAmount: 50 })), "Saving");
});

test("goalCategoryOptions keeps a legacy category", () => {
  const plain = goalCategoryOptions("Savings");
  assert.ok(!plain.some((o) => o.value === "Emergency Fund"));
  const legacy = goalCategoryOptions("Emergency Fund");
  assert.equal(legacy[legacy.length - 1].value, "Emergency Fund");
  assert.equal(legacy.length, plain.length + 1);
});

test("rulesForGoal: goal rules only, number or string ids", () => {
  const rules = [
    { id: "a", action_type: "goal", action_target_id: "7" },
    { id: "b", action_type: "goal", action_target_id: "8" },
    { id: "c", action_type: "contribution", action_target_id: "7" },
  ];
  assert.deepEqual(rulesForGoal(rules, 7).map((r) => r.id), ["a"]);
  assert.deepEqual(rulesForGoal(rules, "8").map((r) => r.id), ["b"]);
  assert.deepEqual(rulesForGoal(rules, 9), []);
});

const sched = (p = {}) => ({
  member_id: "m1",
  frequency: "fortnightly",
  is_fixed_amount: true,
  amount: 1500,
  next_pay_date: "2026-11-05",
  ...p,
});

test("payScheduleUpdate: Fixed keeps the amount, Variable saves none", () => {
  const v = valuesFromSchedule(sched());
  assert.deepEqual(payScheduleUpdate(v), {
    member_id: "m1",
    frequency: "fortnightly",
    is_fixed_amount: true,
    amount: 1500,
    next_pay_date: "2026-11-05",
  });
  const variable = payScheduleUpdate({ ...v, payType: "variable" });
  assert.equal(variable.amount, null);
  assert.equal(variable.is_fixed_amount, false);
  const fromVariable = valuesFromSchedule(sched({ is_fixed_amount: false, amount: null }));
  assert.equal(fromVariable.payType, "variable");
  assert.equal(fromVariable.amount, "");
});

test("payFieldError", () => {
  const v = valuesFromSchedule(sched());
  assert.equal(payFieldError("nextPayDate", { ...v, nextPayDate: "" }), "Pick a date");
  assert.equal(payFieldError("amount", { ...v, amount: "0" }), "Enter an amount above $0");
  assert.equal(payFieldError("payType", { ...v, amount: "" }), "Enter an amount above $0");
  assert.equal(payFieldError("payType", { ...v, payType: "variable", amount: "" }), null);
  assert.equal(payFieldError("member", { ...v, member: "" }), "Pick whose pay");
  assert.equal(payFieldError("frequency", v), null);
});

test("canPickMember matrix", () => {
  assert.equal(canPickMember(true, 2), true);
  assert.equal(canPickMember(true, 1), false);
  assert.equal(canPickMember(false, 3), false);
  assert.equal(canPickMember(false, 0), false);
});

test("memberOptions adds the current member when not accepted", () => {
  const accepted = [{ id: 1, name: "Ant" }, { id: "2", name: "Hannah" }];
  assert.deepEqual(memberOptions(accepted, "2").map((o) => o.value), ["1", "2"]);
  const withGone = memberOptions(accepted, "9");
  assert.equal(withGone[2].value, "9");
  assert.equal(memberOptions(accepted, "").length, 2);
});

const rule = (p = {}) => ({
  member_id: "m1",
  threshold_amount: 200,
  action_type: "goal",
  action_target_id: "g1",
  amount_to_add: 50,
  amount_type: "fixed",
  is_active: true,
  ...p,
});

test("ruleUpdate keeps action_type and is_active, and retargets a goal rule", () => {
  const r = rule({ is_active: false });
  const v = { ...valuesFromRule(r), goalId: "g2", amount: "75" };
  const u = ruleUpdate(v, r, "c1");
  assert.equal(u.action_type, "goal");
  assert.equal(u.is_active, false);
  assert.equal(u.action_target_id, "g2");
  assert.equal(u.amount_to_add, 75);
  assert.equal(u.amount_type, "fixed");
  assert.equal(u.threshold_amount, 200);
});

test("ruleUpdate: a contribution rule points at the contribution target", () => {
  const r = rule({ action_type: "contribution", action_target_id: "c9" });
  const v = valuesFromRule(r);
  assert.equal(v.goalId, "");
  const u = ruleUpdate(v, r, "c9");
  assert.equal(u.action_type, "contribution");
  assert.equal(u.action_target_id, "c9");
  assert.equal(ruleUpdate({ ...v, member: "m2" }, r, "c2").action_target_id, "c2");
});

test("ruleFieldError", () => {
  const v = valuesFromRule(rule());
  assert.equal(ruleFieldError("goal", { ...v, goalId: "zzz" }, ["g1"]), "Choose a goal");
  assert.equal(ruleFieldError("goal", v, ["g1"]), null);
  assert.equal(ruleFieldError("threshold", { ...v, threshold: "-1" }, []), "Enter an amount of $0 or more");
  assert.equal(ruleFieldError("threshold", { ...v, threshold: "0" }, []), null);
  const pct = { ...v, amountType: "percentage" };
  assert.equal(ruleFieldError("amount", { ...pct, amount: "101" }, []), "Enter 0.01 to 100");
  assert.equal(ruleFieldError("amount", { ...pct, amount: "100" }, []), null);
  assert.equal(ruleFieldError("amount", { ...v, amount: "0" }, []), "Enter an amount above $0");
  assert.equal(ruleFieldError("member", v, []), null);
});

test("applyAmountTypeChange clears the typed amount", () => {
  const v = valuesFromRule(rule());
  const next = applyAmountTypeChange(v, "percentage");
  assert.equal(next.amountType, "percentage");
  assert.equal(next.amount, "");
});

test("ruleRowText", () => {
  assert.deepEqual(ruleRowText(rule({ threshold_amount: 0 }), null), { label: "$50", value: "Every pay" });
  assert.deepEqual(ruleRowText(rule({ amount_type: "percentage", amount_to_add: 10 }), "Ant"), {
    label: "Ant · 10% of the extra",
    value: "Over $200.00",
  });
  assert.equal(ruleRowText(rule({ is_active: false }), null).value, "Over $200.00 · Off");
  assert.equal(ruleRowText(rule({ amount_to_add: 12.5 }), null).label, "$12.50");
});

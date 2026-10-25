// Runtime tests for the Add rule flow rules (R09, #396).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AMOUNT_TYPE_OPTIONS,
  stepKeys,
  effectiveMember,
  parseAmount,
  parseThreshold,
  parsePercent,
  parseRuleAmount,
  applyAmountTypeChange,
  thresholdLabel,
  ruleAmountLabel,
  optionLabel,
  buildRulePayload,
  initialValues,
} from "./addRuleFlow.ts";

const withValues = (p) => ({ ...initialValues(), ...p });

test("stepKeys: member card only when pickable", () => {
  assert.deepEqual(stepKeys(false), ["goal", "threshold", "amountType", "amount"]);
  assert.deepEqual(stepKeys(true), ["member", "goal", "threshold", "amountType", "amount"]);
});

test("effectiveMember: owner's pick wins, owner falls back, non-owner is always themselves", () => {
  assert.equal(effectiveMember("2", { isOwner: true, currentId: "1" }), "2");
  assert.equal(effectiveMember("", { isOwner: true, currentId: "1" }), "1");
  assert.equal(effectiveMember("2", { isOwner: false, currentId: "1" }), "1");
});

test("initialValues can pre-pick a goal", () => {
  assert.equal(initialValues().goalId, "");
  assert.equal(initialValues("g1").goalId, "g1");
  assert.equal(initialValues().amountType, "fixed");
});

test("parseThreshold: 0 is allowed (every pay), blanks and negatives are not", () => {
  assert.equal(parseThreshold("0"), 0);
  assert.equal(parseThreshold(""), null);
  assert.equal(parseThreshold("-1"), null);
  assert.equal(parseThreshold("1,200"), 1200);
  assert.equal(parseThreshold("$250.5"), 250.5);
  assert.equal(parseThreshold("abc"), null);
});

test("parsePercent: 0.01 to 100 inclusive", () => {
  assert.equal(parsePercent("0.01"), 0.01);
  assert.equal(parsePercent("100"), 100);
  assert.equal(parsePercent("50"), 50);
  assert.equal(parsePercent("0"), null);
  assert.equal(parsePercent("100.01"), null);
  assert.equal(parsePercent(""), null);
});

test("parseAmount and parseRuleAmount follow the chosen type", () => {
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("1,000"), 1000);
  assert.equal(parseRuleAmount("fixed", "150"), 150);
  assert.equal(parseRuleAmount("fixed", "0"), null);
  assert.equal(parseRuleAmount("fixed", "150000"), 150000);
  assert.equal(parseRuleAmount("percentage", "150"), null);
  assert.equal(parseRuleAmount("percentage", "25"), 25);
});

test("applyAmountTypeChange clears a typed amount, same type changes nothing", () => {
  const v = withValues({ amount: "50", threshold: "100" });
  const same = applyAmountTypeChange(v, "fixed");
  assert.equal(same, v);
  const next = applyAmountTypeChange(v, "percentage");
  assert.equal(next.amountType, "percentage");
  assert.equal(next.amount, "");
  assert.equal(next.threshold, "100");
});

test("labels", () => {
  assert.equal(thresholdLabel("1000"), "Over $1,000.00");
  assert.equal(thresholdLabel("0"), "Every pay");
  assert.equal(thresholdLabel(""), "—");
  assert.equal(ruleAmountLabel("fixed", "75"), "$75.00");
  assert.equal(ruleAmountLabel("percentage", "12.5"), "12.5%");
  assert.equal(ruleAmountLabel("percentage", "101"), "—");
  assert.equal(optionLabel(AMOUNT_TYPE_OPTIONS, "fixed"), "A set amount");
  assert.equal(optionLabel(AMOUNT_TYPE_OPTIONS, "percentage"), "A percentage of the extra");
});

test("payload: always a goal rule, active, numbers parsed", () => {
  const p = buildRulePayload(
    withValues({ goalId: "g1", threshold: "1,000", amountType: "percentage", amount: "40" }),
    "3"
  );
  assert.deepEqual(p, {
    member_id: "3",
    threshold_amount: 1000,
    action_type: "goal",
    action_target_id: "g1",
    amount_to_add: 40,
    amount_type: "percentage",
    is_active: true,
  });
  const zero = buildRulePayload(withValues({ goalId: "g1", threshold: "0", amount: "20" }), "3");
  assert.equal(zero.threshold_amount, 0);
  assert.equal(zero.amount_type, "fixed");
});

test("initialValues (F07): prefill sets threshold and amount, still a fixed amount", () => {
  const v = initialValues("g1", { threshold: "0", amount: "15.38" });
  assert.equal(v.threshold, "0");
  assert.equal(v.amount, "15.38");
  assert.equal(v.amountType, "fixed");
  assert.equal(initialValues("g1").threshold, "");
});

// Runtime tests for the New pay schedule flow rules (R09, #396).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PAY_TYPE_OPTIONS,
  PAY_FREQUENCY_OPTIONS,
  stepKeys,
  effectiveMember,
  parseAmount,
  amountLabel,
  dateLabel,
  optionLabel,
  payScheduleRowKey,
  buildPaySchedulePayload,
  initialValues,
} from "./addPayFlow.ts";

const withValues = (p) => ({ ...initialValues(), ...p });

test("stepKeys: member card only when pickable, Amount only for Fixed", () => {
  assert.deepEqual(stepKeys({ canPickMember: false, payType: "fixed" }), [
    "payType",
    "frequency",
    "nextPayDate",
    "amount",
  ]);
  assert.deepEqual(stepKeys({ canPickMember: false, payType: "variable" }), [
    "payType",
    "frequency",
    "nextPayDate",
  ]);
  assert.deepEqual(stepKeys({ canPickMember: true, payType: "fixed" }), [
    "member",
    "payType",
    "frequency",
    "nextPayDate",
    "amount",
  ]);
  assert.deepEqual(stepKeys({ canPickMember: true, payType: "variable" }), [
    "member",
    "payType",
    "frequency",
    "nextPayDate",
  ]);
});

test("effectiveMember: owner's pick wins, owner falls back, non-owner is always themselves", () => {
  assert.equal(effectiveMember("2", { isOwner: true, currentId: "1" }), "2");
  assert.equal(effectiveMember("", { isOwner: true, currentId: "1" }), "1");
  assert.equal(effectiveMember("2", { isOwner: false, currentId: "1" }), "1");
  assert.equal(effectiveMember("", { isOwner: false, currentId: "1" }), "1");
  // a pick that is no longer a member falls back
  assert.equal(effectiveMember("9", { isOwner: true, currentId: "1", memberIds: ["1", "2"] }), "1");
  assert.equal(effectiveMember("2", { isOwner: true, currentId: "1", memberIds: ["1", "2"] }), "2");
  // still loading: nobody to save as
  assert.equal(effectiveMember("", { isOwner: false, currentId: "" }), "");
});

test("parseAmount needs a number above 0", () => {
  assert.equal(parseAmount("1,200"), 1200);
  assert.equal(parseAmount("$40.5"), 40.5);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount("-5"), null);
});

test("labels", () => {
  assert.equal(amountLabel(1200), "$1,200.00");
  assert.equal(dateLabel(""), "Not set");
  assert.match(dateLabel("2026-11-05"), /2026/);
  assert.equal(optionLabel(PAY_TYPE_OPTIONS, "variable"), "Variable");
  assert.equal(optionLabel(PAY_FREQUENCY_OPTIONS, "fortnightly"), "Fortnightly");
  assert.equal(optionLabel(PAY_FREQUENCY_OPTIONS, "nope"), "nope");
  assert.equal(payScheduleRowKey(7), "pay-schedule-7");
});

test("options: Fixed is first (the default) and both pay types explain themselves", () => {
  assert.equal(PAY_TYPE_OPTIONS[0].value, "fixed");
  assert.ok(PAY_TYPE_OPTIONS.every((o) => o.description));
  assert.deepEqual(
    PAY_FREQUENCY_OPTIONS.map((o) => o.value),
    ["weekly", "fortnightly", "monthly"]
  );
  assert.equal(initialValues().payType, "fixed");
  assert.equal(initialValues().frequency, "monthly");
});

test("payload: Fixed sends the number, Variable sends no amount", () => {
  const fixed = buildPaySchedulePayload(
    withValues({ amount: "1,250.50", nextPayDate: "2026-11-05", frequency: "weekly" }),
    "3"
  );
  assert.deepEqual(fixed, {
    member_id: "3",
    frequency: "weekly",
    is_fixed_amount: true,
    amount: 1250.5,
    next_pay_date: "2026-11-05",
  });
  const variable = buildPaySchedulePayload(
    withValues({ payType: "variable", amount: "500", nextPayDate: "2026-11-05" }),
    "3"
  );
  assert.equal(variable.is_fixed_amount, false);
  assert.equal(variable.amount, null);
});

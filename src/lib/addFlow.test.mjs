// Runtime tests for the Add flow rules (R07, #394).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ITEM_CATEGORIES,
  FREQUENCY_OPTIONS,
  TYPE_OPTIONS,
  PAYMENT_OPTIONS,
  parseAmount,
  amountLabel,
  amountSummary,
  dueDateLabel,
  stepKeys,
  submitLabel,
  successToast,
  flowTitle,
  rowKey,
  initialValues,
  applyTypeChange,
  billSplitResults,
  billSplitOver,
  billRemaining,
  buildBillSplits,
  buildBillPayload,
  buildExpensePayload,
  expensePercentValid,
  expenseSplitRows,
  splitValid,
  splitSummary,
} from "./addFlow.ts";

const ids = ["a", "b", "c"];
const base = (over = {}) => ({ ...initialValues({ currentMemberId: "a", isJointFund: false }), ...over });
const ctx = (over = {}) => ({ memberIds: ids, isJointFund: false, fallbackAssigneeId: "a", ...over });

test("parseAmount", () => {
  for (const bad of ["", "abc", "0", "-5", "1e3", "0x10", "$"]) assert.equal(parseAmount(bad), null, bad);
  assert.equal(parseAmount("12.50"), 12.5);
  assert.equal(parseAmount("1,200"), 1200);
  assert.equal(parseAmount("$40"), 40);
  assert.equal(parseAmount(" 7 "), 7);
});

test("amountLabel and summaries", () => {
  assert.equal(amountLabel(1200), "$1,200.00");
  assert.equal(amountSummary("bill", "40"), "$40.00");
  assert.equal(amountSummary("expense", "40"), "$40.00 a week");
  assert.equal(amountSummary("bill", ""), "—");
  assert.equal(dueDateLabel(""), "No due date");
  assert.notEqual(dueDateLabel("2026-11-05"), "No due date");
});

test("stepKeys: bill has 5 cards in order, expense 3", () => {
  assert.deepEqual(stepKeys("bill"), ["type", "name", "amount", "frequency", "dueDate"]);
  assert.deepEqual(stepKeys("expense"), ["type", "name", "amount"]);
});

test("labels and toasts per type", () => {
  assert.equal(submitLabel("bill"), "Add bill");
  assert.equal(submitLabel("expense"), "Add expense");
  assert.equal(successToast("bill"), "Bill added");
  assert.equal(successToast("expense"), "Expense added");
  assert.equal(flowTitle("bill"), "Add a bill");
  assert.equal(flowTitle("expense"), "Add an expense");
});

test("option lists: types explain themselves, frequencies are lowercase, 7 categories", () => {
  assert.ok(TYPE_OPTIONS.every((o) => o.description));
  assert.deepEqual(FREQUENCY_OPTIONS.map((o) => o.value), ["weekly", "fortnightly", "monthly", "yearly"]);
  assert.deepEqual(PAYMENT_OPTIONS.map((o) => o.value), ["Manual", "Auto"]);
  assert.equal(ITEM_CATEGORIES.length, 7);
  assert.ok(ITEM_CATEGORIES.includes("Other"));
});

test("rowKey is the row wrapper id (shared by the flow and the Bills page)", () => {
  assert.equal(rowKey("bill", "12"), "bill-12");
  assert.equal(rowKey("expense", 7), "expense-7");
});

test("initialValues defaults", () => {
  const v = initialValues({ currentMemberId: "m1", isJointFund: true });
  assert.equal(v.type, "bill");
  assert.equal(v.frequency, "monthly");
  assert.equal(v.dueDate, "");
  assert.equal(v.category, "Other");
  assert.equal(v.assignee, "m1");
  assert.equal(v.paymentType, "Manual");
  assert.equal(v.billSplitMode, "joint");
  assert.equal(v.expenseSplit, "assignee");
  assert.equal(initialValues({ currentMemberId: "m1", isJointFund: false }).billSplitMode, "individual");
  assert.equal(initialValues({ currentMemberId: "", isJointFund: false }).assignee, "");
});

test("applyTypeChange clears a typed amount, keeps an empty one, ignores no change", () => {
  const v = base({ amount: "100" });
  assert.equal(applyTypeChange(v, "expense").amount, "");
  assert.equal(applyTypeChange(v, "expense").type, "expense");
  assert.equal(applyTypeChange(base(), "expense").amount, "");
  assert.equal(applyTypeChange(v, "bill"), v);
});

test("billSplitResults: assignee takes the percentage remainder", () => {
  const rows = billSplitResults({
    memberIds: ids, assigneeId: "a", mode: "percentage", values: { b: "30", c: "20" }, total: 200,
  });
  assert.deepEqual(rows.map((r) => r.member_id), ids);
  assert.deepEqual(rows.map((r) => r.amount), [100, 60, 40]);
  assert.deepEqual(rows.map((r) => r.is_assignee), [true, false, false]);
});

test("billSplitResults: rounding to 2dp", () => {
  const rows = billSplitResults({
    memberIds: ["a", "b"], assigneeId: "a", mode: "percentage", values: { b: "33.33" }, total: 100,
  });
  assert.deepEqual(rows.map((r) => r.amount), [66.67, 33.33]);
});

test("billSplitResults: amount mode remainder, and untouched = assignee takes all", () => {
  const rows = billSplitResults({
    memberIds: ids, assigneeId: "b", mode: "amount", values: { a: "10", c: "5.5" }, total: 50,
  });
  assert.deepEqual(rows.map((r) => r.amount), [10, 34.5, 5.5]);
  const none = billSplitResults({ memberIds: ids, assigneeId: "a", mode: "percentage", values: {}, total: 80 });
  assert.deepEqual(none.map((r) => r.amount), [80, 0, 0]);
});

test("billSplitOver: others over the cap -> assignee 0 and over", () => {
  const a = { memberIds: ids, assigneeId: "a", mode: "amount", values: { b: "60", c: "50" }, total: 100 };
  assert.equal(billSplitOver(a), true);
  assert.equal(billSplitResults(a)[0].amount, 0);
  assert.equal(billSplitOver({ ...a, values: { b: "60", c: "40" } }), false);
  assert.equal(billSplitOver({ ...a, mode: "percentage", values: { b: "60", c: "50" } }), true);
  assert.equal(billRemaining({ ...a, values: {} }).remaining, 100);
});

test("amount edited down after amount-mode shares: now over, summary says so", () => {
  const v = base({ amount: "100", splitBasis: "amount", shares: { b: "60" } });
  assert.equal(splitValid(v, ctx()), true);
  const edited = { ...v, amount: "50" };
  assert.equal(splitValid(edited, ctx()), false);
  assert.deepEqual(splitSummary(edited, ctx(), "Ann"), { label: "Doesn't add up", invalid: true });
});

test("buildBillSplits: Joint -> none; Direct Pay and Individual -> a row per member", () => {
  assert.deepEqual(buildBillSplits(base({ amount: "90", billSplitMode: "joint" }), ctx({ isJointFund: true })), []);
  const ind = buildBillSplits(base({ amount: "90", billSplitMode: "individual" }), ctx({ isJointFund: true }));
  assert.equal(ind.length, 3);
  // Direct Pay: mode is ignored, always individual (assignee 100% when untouched).
  const dp = buildBillSplits(base({ amount: "90", billSplitMode: "joint" }), ctx());
  assert.deepEqual(dp.map((r) => r.amount), [90, 0, 0]);
  assert.equal(dp[0].is_assignee, true);
});

test("split summary labels", () => {
  const dp = base({ amount: "90" });
  assert.deepEqual(splitSummary(dp, ctx(), "Ann"), { label: "All on Ann", invalid: false });
  assert.deepEqual(splitSummary({ ...dp, shares: { b: "20" } }, ctx(), "Ann"), { label: "Shared", invalid: false });
  assert.equal(splitSummary(base({ billSplitMode: "joint" }), ctx({ isJointFund: true }), "Ann").label, "Joint Fund");
  assert.equal(splitSummary(dp, ctx({ memberIds: [] }), "").label, "—");
  const ex = base({ type: "expense" });
  assert.equal(splitSummary(ex, ctx(), "Ann").label, "All on Ann");
  assert.equal(splitSummary({ ...ex, expenseSplit: "percentage", percentages: { a: "50", b: "50" } }, ctx(), "Ann").label, "By percentage");
  assert.equal(splitSummary({ ...ex, expenseSplit: "percentage", percentages: { a: "50" } }, ctx(), "Ann").invalid, true);
});

test("expensePercentValid and expenseSplitRows", () => {
  assert.equal(expensePercentValid(ids, { a: "50", b: "50" }), true);
  assert.equal(expensePercentValid(ids, { a: "50", b: "49.9" }), false);
  assert.equal(expensePercentValid(ids, { a: "50", b: "50.0005" }), true);
  assert.deepEqual(expenseSplitRows(ids, { a: "60", b: "40", c: "0" }), [
    { member_id: "a", percentage: 60 },
    { member_id: "b", percentage: 40 },
  ]);
});

test("buildBillPayload", () => {
  const p = buildBillPayload(base({ name: "  Internet ", amount: "$89.90", frequency: "Monthly", paymentType: "Auto", notes: "n" }));
  assert.equal(p.name, "Internet");
  assert.equal(p.amount, 89.9);
  assert.equal(p.frequency, "monthly");
  assert.equal(p.paymentType, "Auto");
  assert.equal(p.dueDate, "");
  assert.equal(p.invoiceDate, "");
  assert.equal(p.category, "Other");
  assert.equal(p.assignee, "a");
  assert.deepEqual(Object.keys(p).sort(), ["amount", "assignee", "category", "dueDate", "frequency", "invoiceDate", "name", "notes", "paymentType"]);
});

test("buildBillPayload adopts the current member when the assignee is still empty", () => {
  assert.equal(buildBillPayload(base({ assignee: "" }), "late").assignee, "late");
  assert.equal(buildBillPayload(base({ assignee: "b" }), "late").assignee, "b");
});

test("buildExpensePayload: assignee mode has no rows, percentage mode drops the assignee", () => {
  const one = buildExpensePayload(base({ type: "expense", name: "Groceries", amount: "150" }), ctx());
  assert.equal(one.split_mode, "assignee");
  assert.equal(one.assignee_id, "a");
  assert.deepEqual(one.splits, []);
  assert.equal(one.amount, 150);
  const pct = buildExpensePayload(
    base({ type: "expense", name: "G", amount: "150", expenseSplit: "percentage", percentages: { a: "70", b: "30" } }),
    ctx()
  );
  assert.equal(pct.split_mode, "percentage");
  assert.equal(pct.assignee_id, null);
  assert.deepEqual(pct.splits, [{ member_id: "a", percentage: 70 }, { member_id: "b", percentage: 30 }]);
  assert.equal(buildExpensePayload(base({ type: "expense", assignee: "" }), ctx({ fallbackAssigneeId: "" })).assignee_id, null);
});

// Runtime tests for the bill and expense edit rules (R10, #397).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ITEM_CATEGORIES,
  categoryOptions,
  valuesFromBill,
  valuesFromExpense,
  billFieldError,
  expenseFieldError,
  billUpdate,
  expenseUpdate,
  splitBreakdownLabel,
} from "./addFlow.ts";

const ctx = (over = {}) => ({
  memberIds: ["a", "b"],
  isJointFund: false,
  fallbackAssigneeId: "a",
  ...over,
});

const bill = (over = {}) => ({
  name: "Internet",
  amount: 80,
  category: "Household Bills",
  frequency: "Monthly",
  due_date: "2026-11-05",
  invoice_date: null,
  payment_type: "manual",
  assignee_id: "a",
  notes: null,
  ...over,
});

const people = [
  { id: "a", name: "Ann" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Cy" },
];

const run = (field, values, over = {}) =>
  billUpdate({
    field,
    values,
    ctx: ctx(),
    hadSplits: false,
    bill: { status: "Due Soon", hadDueDate: true },
    unpaidStatus: "Due Soon",
    ...over,
  });

test("categoryOptions: the list, plus an old category that is not in it", () => {
  assert.deepEqual(
    categoryOptions("Other").map((o) => o.value),
    ITEM_CATEGORIES
  );
  const legacy = categoryOptions("Uncategorized");
  assert.equal(legacy.length, ITEM_CATEGORIES.length + 1);
  assert.deepEqual(legacy[legacy.length - 1], { value: "Uncategorized", label: "Uncategorized" });
  assert.equal(categoryOptions("").length, ITEM_CATEGORIES.length);
});

test("valuesFromBill: plain bill", () => {
  const v = valuesFromBill(bill(), [], ctx());
  assert.equal(v.type, "bill");
  assert.equal(v.amount, "80");
  assert.equal(v.frequency, "monthly");
  assert.equal(v.dueDate, "2026-11-05");
  assert.equal(v.invoiceDate, "");
  assert.equal(v.paymentType, "Manual");
  assert.equal(v.assignee, "a");
  assert.equal(v.billSplitMode, "individual");
  assert.equal(v.notes, "");
  assert.deepEqual(v.shares, {});
});

test("valuesFromBill: autopay, dates trimmed to the day, notes kept", () => {
  const v = valuesFromBill(
    bill({ payment_type: "auto", due_date: "2026-11-05T00:00:00+00:00", invoice_date: "2026-10-20", notes: "pin 1234" }),
    [],
    ctx()
  );
  assert.equal(v.paymentType, "Auto");
  assert.equal(v.dueDate, "2026-11-05");
  assert.equal(v.invoiceDate, "2026-10-20");
  assert.equal(v.notes, "pin 1234");
});

test("valuesFromBill: assignee falls back to the assignee split row", () => {
  const rows = [
    { member_id: "b", amount: 30, is_assignee: false },
    { member_id: "a", amount: 50, is_assignee: true },
  ];
  assert.equal(valuesFromBill(bill({ assignee_id: undefined }), rows, ctx()).assignee, "a");
  assert.equal(valuesFromBill(bill({ assignee_id: undefined }), [], ctx()).assignee, "");
});

test("valuesFromBill: Joint only when Joint Fund and no rows; shares come from the rows", () => {
  assert.equal(valuesFromBill(bill(), [], ctx({ isJointFund: true })).billSplitMode, "joint");
  const rows = [
    { member_id: "a", amount: 50, is_assignee: true },
    { member_id: "b", amount: 30, is_assignee: false },
  ];
  const v = valuesFromBill(bill(), rows, ctx({ isJointFund: true }));
  assert.equal(v.billSplitMode, "individual");
  assert.equal(v.splitBasis, "amount");
  assert.deepEqual(v.shares, { b: "30" });
});

test("valuesFromExpense: assignee mode and percentage mode", () => {
  const one = valuesFromExpense({ name: "Groceries", amount: 150, assignee_id: "a", split_mode: "assignee" }, []);
  assert.equal(one.type, "expense");
  assert.equal(one.expenseSplit, "assignee");
  assert.equal(one.assignee, "a");
  const pct = valuesFromExpense(
    { name: "G", amount: 150, assignee_id: null, split_mode: "percentage" },
    [
      { member_id: "a", percentage: 60 },
      { member_id: "b", percentage: 40 },
    ]
  );
  assert.equal(pct.expenseSplit, "percentage");
  assert.equal(pct.assignee, "");
  assert.deepEqual(pct.percentages, { a: "60", b: "40" });
});

test("billUpdate: renaming sends no dates and leaves the splits alone", () => {
  const v = valuesFromBill(bill({ payment_type: "auto" }), [], ctx());
  const { data, splits } = run("name", { ...v, name: " Fibre " });
  assert.equal(data.name, "Fibre");
  assert.ok(!("dueDate" in data) && !("invoiceDate" in data));
  assert.equal(splits, undefined);
  assert.equal(data.paymentType, "Auto");
  assert.equal(data.frequency, "monthly");
  assert.equal(data.amount, 80);
  assert.equal(data.assignee, "a");
});

test("billUpdate: only the edited date is sent", () => {
  const v = valuesFromBill(bill(), [], ctx());
  const due = run("dueDate", { ...v, dueDate: "2026-12-01" });
  assert.equal(due.data.dueDate, "2026-12-01");
  assert.ok(!("invoiceDate" in due.data));
  const inv = run("invoiceDate", { ...v, invoiceDate: "2026-11-30" });
  assert.equal(inv.data.invoiceDate, "2026-11-30");
  assert.ok(!("dueDate" in inv.data));
  // Clearing sends an empty string (updateBill stores null).
  assert.equal(run("dueDate", { ...v, dueDate: "" }).data.dueDate, "");
});

test("billUpdate: a Paid bill with no date that gets one goes back to unpaid", () => {
  const v = valuesFromBill(bill({ due_date: null }), [], ctx());
  const given = run("dueDate", { ...v, dueDate: "2026-12-01" }, { bill: { status: "Paid", hadDueDate: false } });
  assert.equal(given.data.status, "Due Soon");
  const stillPaid = run("dueDate", { ...v, dueDate: "" }, { bill: { status: "Paid", hadDueDate: false } });
  assert.ok(!("status" in stillPaid.data));
  const dated = run("dueDate", { ...v, dueDate: "2026-12-01" }, { bill: { status: "Paid", hadDueDate: true } });
  assert.ok(!("status" in dated.data));
});

test("billUpdate: other fields never send splits, even on a shared bill", () => {
  const rows = [
    { member_id: "a", amount: 50, is_assignee: true },
    { member_id: "b", amount: 30, is_assignee: false },
  ];
  const v = valuesFromBill(bill(), rows, ctx());
  for (const field of ["name", "frequency", "category", "autoPay", "notes", "dueDate", "invoiceDate"]) {
    assert.equal(run(field, v, { hadSplits: true }).splits, undefined, field);
  }
});

test("billUpdate: amount rebuilds the splits only when the bill had some", () => {
  const rows = [
    { member_id: "a", amount: 50, is_assignee: true },
    { member_id: "b", amount: 30, is_assignee: false },
  ];
  const v = { ...valuesFromBill(bill(), rows, ctx()), amount: "100" };
  const without = run("amount", v, { hadSplits: false });
  assert.equal(without.splits, undefined);
  assert.equal(without.data.amount, 100);
  const withRows = run("amount", v, { hadSplits: true });
  // Bob keeps his dollar share; the assignee takes the rest.
  assert.deepEqual(withRows.splits, [
    { member_id: "a", amount: 70, is_assignee: true },
    { member_id: "b", amount: 30, is_assignee: false },
  ]);
  // A rebuild carries no status, so updateBill resets every row to Pending (as the old sheet did).
  assert.ok(withRows.splits.every((r) => !("status" in r)));
  const ctxSrc = readFileSync(new URL("../context/AppContext.tsx", import.meta.url), "utf8");
  assert.ok(ctxSrc.includes('status: split.status || "Pending"'), "updateBill defaults split status to Pending");
});

test("billUpdate: assignee rebuilds only with rows; split always rebuilds", () => {
  const rows = [
    { member_id: "a", amount: 50, is_assignee: true },
    { member_id: "b", amount: 30, is_assignee: false },
  ];
  // The card clears the shares when the assignee changes, so the whole bill lands on the new person.
  const moved = { ...valuesFromBill(bill(), rows, ctx()), assignee: "b", shares: {} };
  assert.equal(run("assignee", moved, { hadSplits: false }).splits, undefined);
  assert.deepEqual(run("assignee", moved, { hadSplits: true }).splits, [
    { member_id: "a", amount: 0, is_assignee: false },
    { member_id: "b", amount: 80, is_assignee: true },
  ]);
  assert.equal(run("assignee", moved).data.assignee, "b");
  // Split always sends rows (even from "none"), and Joint mode sends none (clears the rows).
  const plain = valuesFromBill(bill(), [], ctx());
  assert.equal(run("split", plain).splits.length, 2);
  const joint = { ...valuesFromBill(bill(), [], ctx({ isJointFund: true })) };
  assert.deepEqual(billUpdate({ field: "split", values: joint, ctx: ctx({ isJointFund: true }), hadSplits: true, bill: { status: "x", hadDueDate: true }, unpaidStatus: "x" }).splits, []);
});

test("billFieldError", () => {
  const v = valuesFromBill(bill(), [], ctx());
  assert.equal(billFieldError("name", { ...v, name: "  " }, ctx()), "Enter a name");
  assert.equal(billFieldError("name", v, ctx()), null);
  assert.equal(billFieldError("amount", { ...v, amount: "0" }, ctx()), "Enter an amount above $0");
  assert.equal(billFieldError("amount", { ...v, amount: "abc" }, ctx()), "Enter an amount above $0");
  assert.equal(billFieldError("amount", { ...v, amount: "$1,200.50" }, ctx()), null);
  assert.equal(billFieldError("assignee", { ...v, assignee: "" }, ctx({ fallbackAssigneeId: "" })), "Pick who looks after it");
  assert.equal(billFieldError("notes", { ...v, notes: "" }, ctx()), null);
});

test("billFieldError: amount blocked when a shared bill's other shares would not fit", () => {
  const rows = [
    { member_id: "a", amount: 50, is_assignee: true },
    { member_id: "b", amount: 30, is_assignee: false },
  ];
  const v = valuesFromBill(bill(), rows, ctx());
  assert.equal(billFieldError("amount", { ...v, amount: "20" }, ctx()), "The other shares add up to more than this amount");
  assert.equal(billFieldError("amount", { ...v, amount: "30" }, ctx()), null);
  assert.equal(billFieldError("split", { ...v, amount: "20" }, ctx()), "The shares add up to more than the bill");
});

test("expenseUpdate: non-split edits send no splits", () => {
  const v = valuesFromExpense(
    { name: "Groceries", amount: 150, assignee_id: null, split_mode: "percentage", notes: "x" },
    [{ member_id: "a", percentage: 100 }]
  );
  const { data } = expenseUpdate({ field: "amount", values: { ...v, amount: "160" }, ctx: ctx() });
  assert.equal(data.amount, 160);
  assert.ok(!("splits" in data));
  assert.equal(data.split_mode, "percentage");
  assert.equal(data.assignee_id, null);
  assert.equal(data.notes, "x");
});

test("expenseUpdate: the Split card sends rows (percentage) or an empty list (assignee)", () => {
  const base = valuesFromExpense({ name: "G", amount: 10, assignee_id: "a", split_mode: "assignee" }, []);
  const pct = expenseUpdate({
    field: "split",
    values: { ...base, expenseSplit: "percentage", percentages: { a: "70", b: "30" } },
    ctx: ctx(),
  });
  assert.equal(pct.data.split_mode, "percentage");
  assert.equal(pct.data.assignee_id, null);
  assert.deepEqual(pct.data.splits, [
    { member_id: "a", percentage: 70 },
    { member_id: "b", percentage: 30 },
  ]);
  const one = expenseUpdate({ field: "split", values: base, ctx: ctx() });
  assert.equal(one.data.assignee_id, "a");
  assert.deepEqual(one.data.splits, []);
});

test("expenseFieldError", () => {
  const v = valuesFromExpense({ name: "G", amount: 10, assignee_id: "a", split_mode: "assignee" }, []);
  assert.equal(expenseFieldError("name", { ...v, name: "" }, ctx()), "Enter a name");
  assert.equal(expenseFieldError("amount", { ...v, amount: "-3" }, ctx()), "Enter an amount above $0");
  const bad = { ...v, expenseSplit: "percentage", percentages: { a: "60", b: "30" } };
  assert.equal(expenseFieldError("split", bad, ctx()), "Percentages must add up to 100%");
  assert.equal(
    expenseFieldError("split", { ...bad, percentages: { a: "60", b: "40" } }, ctx()),
    null
  );
  assert.equal(expenseFieldError("category", v, ctx()), null);
});

test("splitBreakdownLabel", () => {
  const o = { isJointFund: false, assigneeName: "Ann" };
  assert.equal(splitBreakdownLabel([], people, o), "All on Ann");
  assert.equal(splitBreakdownLabel([], people, { isJointFund: true, assigneeName: "Ann" }), "Joint Fund");
  assert.equal(splitBreakdownLabel([], people, { isJointFund: false }), "—");
  assert.equal(
    splitBreakdownLabel([{ member_id: "a", amount: 80 }, { member_id: "b", amount: 0 }], people, o),
    "All on Ann"
  );
  assert.equal(
    splitBreakdownLabel([{ member_id: "a", amount: 50 }, { member_id: "b", amount: 30 }], people, o),
    "Ann $50.00 and Bob $30.00"
  );
  assert.equal(
    splitBreakdownLabel([{ member_id: "a", percentage: 60 }, { member_id: "b", percentage: 40 }], people, o),
    "Ann 60% and Bob 40%"
  );
  assert.equal(
    splitBreakdownLabel(
      [{ member_id: "a", amount: 40 }, { member_id: "b", amount: 30 }, { member_id: "c", amount: 10 }],
      people,
      o
    ),
    "Shared by 3"
  );
});

// Runtime tests for the Suggest Split rules (R23, #410).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeMemberIncomes,
  computeSplit,
  defaultSplitBills,
  directPaySplitRows,
  percentLabel,
} from "./suggestSplit.ts";

// Same factors as utils.convertAmount (exact: 52 weeks, 26 fortnights, 12 months a year).
const per = { weekly: 52 / 12, fortnightly: 26 / 12, monthly: 1, yearly: 1 / 12 };
const convert = (a, from, to) => (a * per[from]) / per[to];

const m = (id) => ({ id, name: `M${id}` });
const sched = (p) => ({ id: "s" + p.member_id, is_fixed_amount: true, frequency: "weekly", created_at: "2026-01-01", ...p });

test("computeMemberIncomes: blocks without a schedule or an average", () => {
  const r = computeMemberIncomes(
    [m("1"), m("2"), m("3")],
    [sched({ member_id: "2", is_fixed_amount: false, id: "v2" }), sched({ member_id: "3", amount: 100 })],
    () => null,
    convert
  );
  assert.deepEqual([r[0].blocked && r[0].reason, r[1].blocked && r[1].reason, r[2].blocked], [
    "missing pay schedule",
    "not enough pay history yet",
    false,
  ]);
});

test("computeMemberIncomes: sums schedules, own frequency = most recent", () => {
  const [r] = computeMemberIncomes(
    [m("1")],
    [
      sched({ member_id: "1", id: "a", amount: 100, frequency: "weekly", created_at: "2026-01-01" }),
      sched({ member_id: "1", id: "b", is_fixed_amount: false, frequency: "monthly", created_at: "2026-03-01" }),
    ],
    (id) => (id === "b" ? 200 : null),
    convert
  );
  assert.equal(r.blocked, false);
  assert.ok(Math.abs(r.monthlyIncome - (100 * (52 / 12) + 200)) < 1e-9);
  assert.equal(r.ownFrequency, "monthly");
});

test("computeSplit: shares sum to 1 and dollars to the total; blocked gives nothing", () => {
  const results = computeMemberIncomes(
    [m("1"), m("2")],
    [sched({ member_id: "1", amount: 300 }), sched({ member_id: "2", amount: 100 })],
    () => null,
    convert
  );
  const rows = computeSplit(results, 1000, convert);
  assert.equal(rows[0].share, 0.75);
  assert.equal(rows[1].share, 0.25);
  assert.equal(rows[0].monthlyDollars + rows[1].monthlyDollars, 1000);
  assert.ok(Math.abs(rows[0].weeklyDollars - 750 / (52 / 12)) < 1e-9);
  assert.equal(computeSplit([{ member: m("1"), blocked: true, reason: "missing pay schedule" }], 1000, convert).length, 0);
});

test("computeSplit: zero household income gives zero shares", () => {
  const rows = computeSplit([{ member: m("1"), blocked: false, monthlyIncome: 0, ownFrequency: "weekly" }], 500, convert);
  assert.equal(rows[0].share, 0);
  assert.equal(rows[0].monthlyDollars, 0);
});

test("defaultSplitBills: assignee needed, custom splits and finished one-offs skipped, paused kept", () => {
  const bills = [
    { id: 1, amount: 100, assignee_id: "a" },
    { id: 2, amount: 100, assignee_id: null },
    { id: 3, amount: 100, assignee_id: "a" },
    { id: 4, amount: 100, assignee_id: "a", dueLabel: "One-off" },
    { id: 5, amount: 100, assignee_id: "a", dueLabel: "Paused" },
    { id: 6, amount: 100, assignee_id: "a" },
  ];
  const splits = [
    { bill_id: 3, member_id: "b", amount: 40 },
    { bill_id: 6, member_id: "b", amount: 0 },
    { bill_id: 6, member_id: "a", amount: 100, is_assignee: true },
  ];
  assert.deepEqual(defaultSplitBills(bills, splits).map((b) => b.id), [1, 5, 6]);
});

test("directPaySplitRows: others pay share x amount, assignee takes the remainder", () => {
  const rows = directPaySplitRows({ amount: 100 }, { a: 0.5, b: 0.3333, c: 0.1667 }, "a");
  assert.deepEqual(
    rows.map((r) => [r.member_id, r.amount, r.is_assignee]),
    [["b", 33.33, false], ["c", 16.67, false], ["a", 50, true]]
  );
  assert.equal(rows.reduce((s, r) => s + r.amount, 0), 100);
  assert.ok(rows.every((r) => r.status === "Pending"));
});

test("directPaySplitRows: never below zero, zero-share members get no row", () => {
  const rows = directPaySplitRows({ amount: 10 }, { a: 0, b: 1.2, c: 0 }, "a");
  assert.deepEqual(rows.map((r) => [r.member_id, r.amount]), [["b", 12], ["a", 0]]);
});

test("percentLabel", () => {
  assert.equal(percentLabel(0.62), "62%");
  assert.equal(percentLabel(0.6249), "62.5%");
});

test("directPaySplitRows: keeps a member's existing status, new rows are Pending", () => {
  const rows = directPaySplitRows({ amount: 100 }, { a: 0.5, b: 0.5 }, "a", { a: "Paid" });
  assert.deepEqual(rows.map((r) => [r.member_id, r.status]), [["b", "Pending"], ["a", "Paid"]]);
});

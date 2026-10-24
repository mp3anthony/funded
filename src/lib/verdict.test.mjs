// Unit tests for src/lib/verdict.ts (R25, #412).
import { test } from "node:test";
import assert from "node:assert/strict";
import { verdict, verdictStats, weeklyObligations, weeklyUncovered } from "./verdict.ts";

// Stand-in convert: weekly is the base; fortnight x2, month x4, year x52.
const PER_WEEK = { weekly: 1, fortnightly: 0.5, monthly: 0.25, yearly: 1 / 52 };
const convert = (amount, from, to) => (amount * PER_WEEK[from]) / PER_WEEK[to];

const base = (o = {}) => ({
  isJointFund: false,
  bills: [],
  expenses: [],
  billSplits: [],
  expenseSplits: [],
  pays: [],
  contributions: [],
  convert,
  ...o,
});
const bill = (o = {}) => ({ id: "b1", amount: 100, frequency: "weekly", assignee_id: "m1", ...o });
const expense = (o = {}) => ({ id: "e1", amount: 20, split_mode: "assignee", assignee_id: "m1", ...o });

test("weeklyObligations: bills at their frequency plus weekly expenses", () => {
  const w = weeklyObligations({
    bills: [bill({ amount: 40, frequency: "monthly" }), bill({ id: "b2", amount: 10 })],
    expenses: [expense({ amount: 30 })],
    convert,
  });
  assert.equal(w, 10 + 10 + 30);
});

test("Direct Pay: pay covers bills -> Bills covered with the spare", () => {
  const v = verdict(base({ bills: [bill()], pays: [{ amount: 240, frequency: "weekly" }] }));
  assert.equal(v.tone, "ok");
  assert.equal(v.headline, "Bills covered");
  assert.equal(v.detail, "$140 a week left after bills.");
  assert.equal(v.shortBy, 0);
});

test("Direct Pay: pay short of bills -> red, names the pay half", () => {
  const v = verdict(base({ bills: [bill({ amount: 300 })], pays: [{ amount: 250, frequency: "weekly" }] }));
  assert.equal(v.tone, "bad");
  assert.equal(v.headline, "Short $50 a week");
  assert.equal(v.detail, "Pay is $50 a week short of bills.");
  assert.equal(v.shortBy, 50);
});

test("no pay at all -> grey Set up your pay, never red", () => {
  const v = verdict(base({ bills: [bill()] }));
  assert.equal(v.tone, "neutral");
  assert.equal(v.headline, "Set up your pay");
  assert.equal(v.halves.income.status, "unset");
});

test("pay set but nothing to pay -> Add your bills", () => {
  const v = verdict(base({ pays: [{ amount: 500, frequency: "weekly" }] }));
  assert.equal(v.tone, "neutral");
  assert.equal(v.headline, "Add your bills");
});

test("under half a dollar short counts as covered; over is short", () => {
  const pays = [{ amount: 100, frequency: "weekly" }];
  const ok = verdict(base({ bills: [bill({ amount: 100.4 })], pays }));
  assert.equal(ok.tone, "ok");
  assert.equal(ok.detail, "$0 a week left after bills.");
  const short = verdict(base({ bills: [bill({ amount: 100.6 })], pays }));
  assert.equal(short.tone, "bad");
  assert.equal(short.headline, "Short $1 a week");
});

test("Direct Pay: a bill with no assignee and no splits is uncovered", () => {
  const v = verdict(
    base({
      bills: [bill({ assignee_id: undefined, amount: 60 })],
      pays: [{ amount: 500, frequency: "weekly" }],
    }),
  );
  assert.equal(v.tone, "bad");
  assert.equal(v.headline, "Short $60 a week");
  assert.equal(v.detail, "Splits leave $60 a week of bills uncovered.");
});

test("Direct Pay: splits cover a bill up to its amount, no more", () => {
  const b = bill({ assignee_id: undefined, amount: 100 });
  const part = weeklyUncovered({
    bills: [b],
    expenses: [],
    billSplits: [
      { bill_id: "b1", amount: 30 },
      { bill_id: "b1", amount: 50 },
    ],
    expenseSplits: [],
    convert,
  });
  assert.equal(part, 20);
  const over = weeklyUncovered({
    bills: [b],
    expenses: [],
    billSplits: [
      { bill_id: "b1", amount: 90 },
      { bill_id: "b1", amount: 90 },
    ],
    expenseSplits: [],
    convert,
  });
  assert.equal(over, 0);
});

test("Direct Pay: split amounts are in the bill's own frequency", () => {
  const u = weeklyUncovered({
    bills: [bill({ assignee_id: undefined, amount: 40, frequency: "monthly" })],
    expenses: [],
    billSplits: [{ bill_id: "b1", amount: 20 }],
    expenseSplits: [],
    convert,
  });
  assert.equal(u, 5); // $20 left a month = $5 a week
});

test("Direct Pay expenses: assignee covers, percentages capped at 100", () => {
  const args = { bills: [], billSplits: [], convert };
  assert.equal(weeklyUncovered({ ...args, expenses: [expense()], expenseSplits: [] }), 0);
  assert.equal(weeklyUncovered({ ...args, expenses: [expense({ assignee_id: null })], expenseSplits: [] }), 20);
  const pct = expense({ split_mode: "percentage", assignee_id: null });
  assert.equal(
    weeklyUncovered({ ...args, expenses: [pct], expenseSplits: [{ expense_id: "e1", percentage: 60 }] }),
    8,
  );
  assert.equal(
    weeklyUncovered({
      ...args,
      expenses: [pct],
      expenseSplits: [
        { expense_id: "e1", percentage: 80 },
        { expense_id: "e1", percentage: 80 },
      ],
    }),
    0,
  );
  assert.equal(weeklyUncovered({ ...args, expenses: [pct], expenseSplits: [] }), 20);
});

test("Joint Fund: contributions short of bills -> red, names contributions", () => {
  const v = verdict(
    base({
      isJointFund: true,
      bills: [bill({ amount: 200 })],
      pays: [{ amount: 1000, frequency: "weekly" }],
      contributions: [{ amount: 150, frequency: "weekly" }],
    }),
  );
  assert.equal(v.tone, "bad");
  assert.equal(v.headline, "Short $50 a week");
  assert.equal(v.detail, "Contributions are $50 a week short of bills.");
});

test("Joint Fund: no contributions set -> grey Set up contributions", () => {
  const v = verdict(
    base({ isJointFund: true, bills: [bill()], pays: [{ amount: 1000, frequency: "weekly" }] }),
  );
  assert.equal(v.tone, "neutral");
  assert.equal(v.headline, "Set up contributions");
});

test("Joint Fund: contributions are not income", () => {
  const v = verdict(
    base({
      isJointFund: true,
      bills: [bill({ amount: 100 })],
      pays: [{ amount: 90, frequency: "weekly" }],
      contributions: [{ amount: 500, frequency: "weekly" }],
    }),
  );
  assert.equal(v.tone, "bad");
  assert.equal(v.detail, "Pay is $10 a week short of bills.");
});

test("both halves short names both and headlines the larger gap", () => {
  const v = verdict(
    base({
      isJointFund: true,
      bills: [bill({ amount: 200 })],
      pays: [{ amount: 190, frequency: "weekly" }],
      contributions: [{ amount: 150, frequency: "weekly" }],
    }),
  );
  assert.equal(v.headline, "Short $50 a week");
  assert.equal(
    v.detail,
    "Pay is $10 a week short of bills. Contributions are $50 a week short of bills.",
  );
});

test("short beats unset: pay short while contributions are unset still reads red", () => {
  const v = verdict(
    base({ isJointFund: true, bills: [bill({ amount: 200 })], pays: [{ amount: 150, frequency: "weekly" }] }),
  );
  assert.equal(v.tone, "bad");
  assert.equal(v.headline, "Short $50 a week");
});

test("extraWeekly adds to the bills and to Direct Pay's uncovered", () => {
  const input = base({ bills: [bill()], pays: [{ amount: 120, frequency: "weekly" }] });
  assert.equal(verdict(input).tone, "ok");
  const withPlan = verdict({ ...input, extraWeekly: 32 });
  assert.equal(withPlan.tone, "bad");
  // Pay is $12 short; the plan is not counted as uncovered splits.
  assert.equal(withPlan.headline, "Short $12 a week");
});

test("extraWeekly alone (no bills yet) with pay set is not 'Add your bills'", () => {
  const input = base({
    isJointFund: true,
    pays: [{ amount: 100, frequency: "weekly" }],
    contributions: [{ amount: 100, frequency: "weekly" }],
  });
  assert.equal(verdict(input).headline, "Add your bills");
  assert.equal(verdict({ ...input, extraWeekly: 10 }).tone, "ok");
});

// ── verdictStats (R26, #413) ──
const stats = (o = {}) => verdictStats(base({ frequency: "weekly", ...o }));

test("stats: pay slide, covered -> spare, bar = bills / pay", () => {
  const s = stats({ bills: [bill()], pays: [{ amount: 400, frequency: "weekly" }] });
  assert.equal(s.income.status, "ok");
  assert.equal(s.income.big, 300);
  assert.equal(s.income.from, 400);
  assert.equal(s.income.obligations, 100);
  assert.equal(s.income.fill, 0.25);
  assert.equal(s.income.caption, "Pay $400 · Bills $100");
});

test("stats: pay slide short -> negative big, full bar", () => {
  const s = stats({ bills: [bill({ amount: 300 })], pays: [{ amount: 250, frequency: "weekly" }] });
  assert.equal(s.income.status, "short");
  assert.equal(s.income.big, -50);
  assert.equal(s.income.fill, 1);
});

test("stats: dollars follow the frequency, status stays weekly", () => {
  const s = stats({
    frequency: "monthly",
    bills: [bill({ amount: 100 })],
    pays: [{ amount: 400, frequency: "weekly" }],
  });
  assert.equal(s.income.big, 1200);
  assert.equal(s.income.from, 1600);
  assert.equal(s.income.status, "ok");
  assert.equal(s.income.fill, 0.25);
});

test("stats: under 50 cents short stays ok with 0 spare, never negative zero", () => {
  const s = stats({ frequency: "monthly", bills: [bill({ amount: 100.3 })], pays: [{ amount: 100, frequency: "weekly" }] });
  assert.equal(s.income.status, "ok");
  assert.ok(Object.is(s.income.big, 0));
});

test("stats: no pay -> unset, grey, empty bar, tells what to set up", () => {
  const s = stats({ bills: [bill()] });
  assert.equal(s.income.status, "unset");
  assert.equal(s.income.big, 0);
  assert.equal(s.income.fill, 0);
  assert.match(s.income.caption, /Add pay on Payday/);
});

test("stats: no bills -> neutral Add a bill, no divide by zero", () => {
  const s = stats({ pays: [{ amount: 400, frequency: "weekly" }] });
  assert.equal(s.income.status, "unset");
  assert.equal(s.income.fill, 0);
  assert.match(s.income.caption, /Add a bill/);
  assert.match(s.cover.caption, /Add a bill/);
});

test("stats: Joint Fund contributions slide", () => {
  const s = stats({
    isJointFund: true,
    bills: [bill({ amount: 100 })],
    pays: [{ amount: 400, frequency: "weekly" }],
    contributions: [{ amount: 60, frequency: "weekly" }],
  });
  assert.equal(s.cover.title, "Contributions vs bills");
  assert.equal(s.cover.status, "short");
  assert.equal(s.cover.big, -40);
  assert.equal(s.cover.fill, 1);
  const none = stats({ isJointFund: true, bills: [bill()], pays: [{ amount: 400, frequency: "weekly" }] });
  assert.equal(none.cover.status, "unset");
  assert.match(none.cover.caption, /Set what each member/);
});

test("stats: Direct Pay splits slide shows what no one pays for", () => {
  const s = stats({
    bills: [bill({ assignee_id: null, amount: 100 })],
    billSplits: [{ bill_id: "b1", amount: 70 }],
    pays: [{ amount: 400, frequency: "weekly" }],
  });
  assert.equal(s.cover.title, "Splits vs shares");
  assert.equal(s.cover.status, "short");
  assert.equal(s.cover.big, -30);
  assert.equal(s.cover.from, 70);
  assert.equal(s.cover.fill, 0.7);
  const ok = stats({ bills: [bill()], pays: [{ amount: 400, frequency: "weekly" }] });
  assert.equal(ok.cover.status, "ok");
  assert.equal(ok.cover.big, 0);
  assert.equal(ok.cover.fill, 1);
});

test("stats: spare rounds once from the weekly gap, like the header", () => {
  const s = stats({ bills: [bill({ amount: 50.6 })], pays: [{ amount: 100.4, frequency: "weekly" }] });
  assert.equal(s.income.big, 50);
  assert.equal(s.income.from, 100);
});

test("stats: Direct Pay slide has kind splits", () => {
  const s = stats({ bills: [bill()], pays: [{ amount: 400, frequency: "weekly" }] });
  assert.equal(s.cover.kind, "splits");
});

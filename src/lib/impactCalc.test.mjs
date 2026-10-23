// Unit tests for src/lib/impactCalc.ts (R16, #403).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extraCosts,
  parsePayments,
  totalCost,
  planLength,
  weeklyIncome,
  coverage,
  billPrefill,
} from "./impactCalc.ts";

// Stand-in convert: weekly is the base; fortnight x2, month x4, year x52.
const PER_WEEK = { weekly: 1, fortnightly: 0.5, monthly: 0.25, yearly: 1 / 52 };
const convert = (amount, from, to) => (amount * PER_WEEK[from]) / PER_WEEK[to];

test("extraCosts: a weekly amount at every frequency", () => {
  assert.deepEqual(extraCosts(10, "weekly", convert), {
    weekly: 10,
    fortnightly: 20,
    monthly: 40,
    yearly: 520,
  });
  assert.equal(extraCosts(40, "monthly", convert).weekly, 10);
});

test("parsePayments: whole numbers of 1 or more only", () => {
  assert.equal(parsePayments("6"), 6);
  assert.equal(parsePayments(" 12 "), 12);
  assert.equal(parsePayments("0"), null);
  assert.equal(parsePayments("2.5"), null);
  assert.equal(parsePayments(""), null);
  assert.equal(parsePayments("abc"), null);
  assert.equal(parsePayments("-3"), null);
  assert.equal(parsePayments("1200"), 1200);
  assert.equal(parsePayments("1201"), null);
});

test("totalCost: rounds to cents, null when ongoing", () => {
  assert.equal(totalCost(12.5, 6), 75);
  assert.equal(totalCost(0.1, 3), 0.3);
  assert.equal(totalCost(10, null), null);
});

test("planLength: each frequency, singular and plural, null when ongoing", () => {
  assert.equal(planLength("weekly", 10), "10 weeks");
  assert.equal(planLength("weekly", 1), "1 week");
  assert.equal(planLength("fortnightly", 5), "10 weeks");
  assert.equal(planLength("fortnightly", 1), "2 weeks");
  assert.equal(planLength("monthly", 6), "6 months");
  assert.equal(planLength("monthly", 1), "1 month");
  assert.equal(planLength("yearly", 2), "2 years");
  assert.equal(planLength("yearly", 1), "1 year");
  assert.equal(planLength("monthly", null), null);
});

test("weeklyIncome: Joint Fund counts contributions only", () => {
  const out = weeklyIncome({
    isJointFund: true,
    contributions: [
      { amount: 40, frequency: "monthly" },
      { amount: 5, frequency: "weekly" },
    ],
    schedules: [{ id: "s1", amount: 1000, frequency: "weekly" }],
    history: [],
    convert,
  });
  assert.equal(out, 15);
});

test("weeklyIncome: Direct Pay uses the latest logged amount, else the saved one, null as 0", () => {
  const schedules = [
    { id: "s1", amount: 100, frequency: "weekly" },
    { id: "s2", amount: 80, frequency: "weekly" },
    { id: "s3", amount: null, frequency: "weekly" },
  ];
  const history = [
    { pay_schedule_id: "s1", amount: 120, pay_date: "2026-10-01" },
    { pay_schedule_id: "s1", amount: 150, pay_date: "2026-10-15" },
    { pay_schedule_id: "s1", amount: null, pay_date: "2026-10-20" }, // no amount: ignored
    { pay_schedule_id: "other", amount: 999, pay_date: "2026-10-30" },
  ];
  const out = weeklyIncome({ isJointFund: false, contributions: [], schedules, history, convert });
  assert.equal(out, 150 + 80 + 0);
});

test("coverage: neutral with no income", () => {
  const c = coverage({ weeklyIncome: 0, weeklyBills: 50, extraWeekly: 10 });
  assert.equal(c.tone, "neutral");
  assert.equal(c.headline, "Add your pay to check this");
  assert.equal(c.flips, false);
});

test("coverage: still covered", () => {
  const c = coverage({ weeklyIncome: 500, weeklyBills: 400, extraWeekly: 50 });
  assert.equal(c.tone, "ok");
  assert.equal(c.headline, "Still covered");
  assert.equal(c.flips, false);
});

test("coverage: tips a covered household into short (flips)", () => {
  const c = coverage({ weeklyIncome: 500, weeklyBills: 480, extraWeekly: 32 });
  assert.equal(c.tone, "bad");
  assert.equal(c.headline, "Short $12 a week");
  assert.equal(c.flips, true);
});

test("coverage: already short stays short, no flip", () => {
  const c = coverage({ weeklyIncome: 500, weeklyBills: 520, extraWeekly: 10 });
  assert.equal(c.tone, "bad");
  assert.equal(c.headline, "Short $30 a week");
  assert.equal(c.flips, false);
});

test("coverage: rounds once to whole dollars, so text never disagrees", () => {
  // Short by 40 cents rounds to 0: covered.
  const a = coverage({ weeklyIncome: 500, weeklyBills: 480, extraWeekly: 20.4 });
  assert.equal(a.tone, "ok");
  assert.equal(a.headline, "Still covered");
  assert.equal(a.detail, "$0 a week left after bills.");
  // Exactly 50 cents short still rounds to 0: covered. 60 cents short rounds to $1: short, and it tips over.
  assert.equal(coverage({ weeklyIncome: 500, weeklyBills: 480, extraWeekly: 20.5 }).headline, "Still covered");
  const b = coverage({ weeklyIncome: 500, weeklyBills: 480, extraWeekly: 20.6 });
  assert.equal(b.headline, "Short $1 a week");
  assert.equal(b.flips, true);
  // 11.6 spare then 12.4 short: rounds to $12 spare and $1 short (never a mismatched pair).
  const c = coverage({ weeklyIncome: 500, weeklyBills: 488.4, extraWeekly: 12.8 });
  assert.equal(c.headline, "Short $1 a week");
  assert.equal(c.detail, "You have $12 a week to spare now, so this tips you over.");
  // Already short by 40 cents (rounds to 0 now) and a little more: the flip follows the rounded numbers.
  const d = coverage({ weeklyIncome: 500, weeklyBills: 500.4, extraWeekly: 0 });
  assert.equal(d.headline, "Still covered");
  assert.equal(d.flips, false);
  // Already short by $20 stays short, no flip.
  assert.equal(coverage({ weeklyIncome: 500, weeklyBills: 520.4, extraWeekly: 5 }).flips, false);
});

test("billPrefill: fixed count is a Temporary bill with a note", () => {
  const p = billPrefill({ name: "  Laptop  ", amount: "50", frequency: "fortnightly", payments: 6 });
  assert.deepEqual(p, {
    type: "bill",
    name: "Laptop",
    amount: "50",
    frequency: "fortnightly",
    category: "Temporary",
    notes: "6 payments, then it stops.",
  });
  assert.equal(
    billPrefill({ name: "", amount: "5", frequency: "weekly", payments: 1 }).notes,
    "1 payment, then it stops.",
  );
});

test("billPrefill: ongoing is a Subscription with no note", () => {
  const p = billPrefill({ name: "", amount: "9.99", frequency: "monthly", payments: null });
  assert.equal(p.name, "");
  assert.equal(p.category, "Subscriptions");
  assert.equal(p.notes, "");
});

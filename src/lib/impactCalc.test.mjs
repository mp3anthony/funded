// Unit tests for src/lib/impactCalc.ts (R16, #403).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extraCosts,
  parsePayments,
  totalCost,
  planLength,
  impactFromVerdict,
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

const verdictLike = (o = {}) => ({
  tone: "ok",
  headline: "Bills covered",
  detail: "$50 a week left after bills.",
  shortBy: 0,
  halves: { income: { status: "ok", gap: 50 }, cover: { status: "ok", gap: 50 } },
  ...o,
});
const shortLike = (by, o = {}) =>
  verdictLike({
    tone: "bad",
    headline: `Short $${by} a week`,
    detail: `Pay is $${by} a week short of bills.`,
    shortBy: by,
    halves: { income: { status: "short", gap: -by }, cover: { status: "ok", gap: 0 } },
    ...o,
  });

test("impactFromVerdict: neutral with no pay", () => {
  const unset = verdictLike({
    tone: "neutral",
    headline: "Set up your pay",
    halves: { income: { status: "unset", gap: 0 }, cover: { status: "ok", gap: 0 } },
  });
  const c = impactFromVerdict(unset, unset);
  assert.equal(c.tone, "neutral");
  assert.equal(c.headline, "Add your pay to check this");
  assert.equal(c.flips, false);
});

test("impactFromVerdict: neutral for unset contributions keeps the verdict's words", () => {
  const unset = verdictLike({
    tone: "neutral",
    headline: "Set up contributions",
    detail: "Set what each member puts in on Payday.",
    halves: { income: { status: "ok", gap: 10 }, cover: { status: "unset", gap: 0 } },
  });
  const c = impactFromVerdict(unset, unset);
  assert.equal(c.tone, "neutral");
  assert.equal(c.headline, "Set up contributions");
});

test("impactFromVerdict: still covered", () => {
  const c = impactFromVerdict(verdictLike(), verdictLike({ detail: "$10 a week left after bills." }));
  assert.equal(c.tone, "ok");
  assert.equal(c.headline, "Still covered");
  assert.equal(c.detail, "$10 a week left after bills.");
  assert.equal(c.flips, false);
});

test("impactFromVerdict: tips a covered household into short (flips)", () => {
  const c = impactFromVerdict(verdictLike(), shortLike(12));
  assert.equal(c.tone, "bad");
  assert.equal(c.headline, "Short $12 a week");
  assert.equal(c.detail, "You have $50 a week to spare now, so this tips you over.");
  assert.equal(c.flips, true);
});

test("impactFromVerdict: flip caused by the cover half uses the verdict's own line", () => {
  const after = shortLike(8, {
    detail: "Contributions are $8 a week short of bills.",
    halves: { income: { status: "ok", gap: 5 }, cover: { status: "short", gap: -8 } },
  });
  const c = impactFromVerdict(verdictLike(), after);
  assert.equal(c.flips, true);
  assert.equal(c.detail, "Contributions are $8 a week short of bills.");
});

test("impactFromVerdict: already short stays short, no flip", () => {
  const c = impactFromVerdict(shortLike(30), shortLike(40));
  assert.equal(c.tone, "bad");
  assert.equal(c.headline, "Short $40 a week");
  assert.equal(c.detail, "Already short $30 a week, this makes it worse.");
  assert.equal(c.flips, false);
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

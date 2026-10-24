// Runtime tests for the Payday member card rules (R21, #408).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  memberCards,
  daysUntil,
  cycleDays,
  ringPercent,
  dueText,
  cardLine,
  cardAmount,
  ESTIMATE_NOTE,
  NO_ESTIMATE_NOTE,
  moneyLabel,
  parseAmount,
  contributionLine,
  contributionSeed,
  rulesForMember,
  memberCardKey,
  scheduleRow,
  shortDate,
} from "./paydayCards.ts";

const member = (id, name, p = {}) => ({ id, name, user_id: `u-${id}`, invitation_status: "accepted", ...p });
const sched = (p) => ({
  id: "s1",
  member_id: "a",
  frequency: "fortnightly",
  is_fixed_amount: true,
  amount: 1850,
  next_pay_date: "2026-10-30",
  created_at: "2026-01-01T00:00:00Z",
  ...p,
});

test("memberCards: pay first by soonest date, then members with no pay by name", () => {
  const members = [member("c", "Cat"), member("b", "Ben"), member("a", "Ana"), member("d", "Dee")];
  const schedules = [
    sched({ id: "s1", member_id: "b", next_pay_date: "2026-11-02" }),
    sched({ id: "s2", member_id: "a", next_pay_date: "2026-10-30" }),
  ];
  const cards = memberCards(members, schedules);
  assert.deepEqual(cards.map((c) => c.member.id), ["a", "b", "c", "d"]);
  assert.deepEqual(cards[2].schedules, []);
});

test("memberCards: one member's schedules are soonest first, ties by creation then id", () => {
  const schedules = [
    sched({ id: "s3", next_pay_date: "2026-11-10" }),
    sched({ id: "s2", next_pay_date: "2026-10-30", created_at: "2026-02-01T00:00:00Z" }),
    sched({ id: "s1", next_pay_date: "2026-10-30", created_at: "2026-01-01T00:00:00Z" }),
  ];
  const [card] = memberCards([member("a", "Ana")], schedules);
  assert.deepEqual(card.schedules.map((s) => s.id), ["s1", "s2", "s3"]);
});

test("memberCards: a pending member gets no card, unless they already have pay", () => {
  const pending = member("p", "Pat", { user_id: null, invitation_status: "pending" });
  assert.equal(memberCards([pending], []).length, 0);
  const cards = memberCards([pending], [sched({ member_id: "p" })]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].schedules.length, 1);
});

test("memberCards: schedules of someone who is not a member are ignored; ids compare as strings", () => {
  const cards = memberCards([member(1, "Ana")], [sched({ id: "x", member_id: "1" }), sched({ id: "y", member_id: "zz" })]);
  assert.deepEqual(cards[0].schedules.map((s) => s.id), ["x"]);
});

test("daysUntil: whole days, negative after, null for bad dates", () => {
  assert.equal(daysUntil("2026-10-29", "2026-10-24"), 5);
  assert.equal(daysUntil("2026-10-24", "2026-10-24"), 0);
  assert.equal(daysUntil("2026-10-20", "2026-10-24"), -4);
  assert.equal(daysUntil("2026-11-01", "2026-10-31"), 1);
  assert.equal(daysUntil("2026-10-24T00:00:00Z", "2026-10-24"), 0);
  assert.equal(daysUntil("2026-10-24", ""), null);
  assert.equal(daysUntil("nope", "2026-10-24"), null);
});

test("cycleDays", () => {
  assert.equal(cycleDays("weekly"), 7);
  assert.equal(cycleDays("fortnightly"), 14);
  assert.equal(cycleDays("monthly"), 30);
});

test("ringPercent: fills toward pay day, full on and after it, empty when unknown", () => {
  assert.equal(ringPercent(14, "fortnightly"), 0);
  assert.equal(ringPercent(7, "fortnightly"), 50);
  assert.equal(ringPercent(1, "fortnightly"), 93);
  assert.equal(ringPercent(0, "fortnightly"), 100);
  assert.equal(ringPercent(-3, "weekly"), 100);
  assert.equal(ringPercent(null, "weekly"), 0);
  // A date more than a whole cycle away never goes below empty.
  assert.equal(ringPercent(40, "weekly"), 0);
});

test("dueText and cardLine", () => {
  assert.equal(dueText(5), "in 5 days");
  assert.equal(dueText(1), "in 1 day");
  assert.equal(dueText(0), "Due now");
  assert.equal(dueText(-2), "Due now");
  assert.equal(dueText(null), "");
  assert.equal(cardLine("fortnightly", 5), "Fortnightly · in 5 days");
  assert.equal(cardLine("weekly", null), "Weekly");
});

test("cardAmount: fixed shows its amount; variable shows the average as an estimate", () => {
  assert.deepEqual(cardAmount({ is_fixed_amount: true, amount: 1850 }, null), { amount: 1850, estimate: false, note: null });
  assert.deepEqual(cardAmount({ is_fixed_amount: true, amount: null }, null), { amount: null, estimate: false, note: null });
  assert.deepEqual(cardAmount({ is_fixed_amount: false, amount: null }, 920.5), {
    amount: 920.5,
    estimate: true,
    note: ESTIMATE_NOTE,
  });
  assert.deepEqual(cardAmount({ is_fixed_amount: false, amount: null }, null), {
    amount: null,
    estimate: true,
    note: NO_ESTIMATE_NOTE,
  });
  assert.equal(ESTIMATE_NOTE, "Estimate from your last 4 pays");
  assert.equal(NO_ESTIMATE_NOTE, "Not enough pays yet");
});

test("moneyLabel and parseAmount", () => {
  assert.equal(moneyLabel(1850), "$1,850");
  assert.equal(moneyLabel(1850.5), "$1,850.50");
  assert.equal(parseAmount("$1,200"), 1200);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("abc"), null);
});

test("contributionLine and contributionSeed", () => {
  assert.equal(contributionLine({ amount: 50, frequency: "weekly" }), "$50 a week");
  assert.equal(contributionLine({ amount: "120.5", frequency: "fortnightly" }), "$120.50 a fortnight");
  assert.equal(contributionLine({ amount: 300, frequency: "monthly" }), "$300 a month");
  assert.equal(contributionLine(null), "Not set");
  assert.equal(contributionLine({ amount: 0, frequency: "weekly" }), "Not set");
  assert.deepEqual(contributionSeed({ amount: 50, frequency: "monthly" }, "weekly"), { amount: "50", frequency: "monthly" });
  assert.deepEqual(contributionSeed(null, "fortnightly"), { amount: "", frequency: "fortnightly" });
  assert.deepEqual(contributionSeed(null, undefined), { amount: "", frequency: "weekly" });
});

test("rulesForMember: only that member's rules, oldest first", () => {
  const rules = [
    { id: "r2", member_id: "a", created_at: "2026-03-01" },
    { id: "r1", member_id: "a", created_at: "2026-01-01" },
    { id: "r3", member_id: "b", created_at: "2026-02-01" },
  ];
  assert.deepEqual(rulesForMember(rules, "a").map((r) => r.id), ["r1", "r2"]);
  assert.deepEqual(rulesForMember(rules, "zz"), []);
});

test("memberCardKey, scheduleRow and shortDate", () => {
  assert.equal(memberCardKey("m-1"), "member-pay-m-1");
  assert.deepEqual(scheduleRow(sched({})), { label: "Fortnightly · $1,850", value: "Next 30 Oct" });
  assert.deepEqual(scheduleRow(sched({ is_fixed_amount: false, amount: null, frequency: "weekly" })), {
    label: "Weekly · Variable",
    value: "Next 30 Oct",
  });
  assert.equal(shortDate("2026-10-05"), "5 Oct");
  assert.equal(shortDate("garbage"), "garbage");
});

// Runtime tests for the Needs you strip rules (R20, #407).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isLoggableYmd,
  buildNeedsYou,
  rowActionLabel,
  cardMode,
  moneyLabel,
  askTitle,
  amountTitle,
  shortDate,
  payLine,
} from "./needsYou.ts";

const names = { a: "Ana", b: "Ben" };
const memberName = (id) => names[id] ?? "?";
const sched = (p) => ({
  id: "s1",
  member_id: "a",
  frequency: "fortnightly",
  is_fixed_amount: true,
  amount: 1850,
  next_pay_date: "2026-10-24",
  ...p,
});
const hist = (p) => ({
  id: "h1",
  member_id: "a",
  pay_schedule_id: "s1",
  pay_date: "2026-10-20",
  amount: 1850,
  status: "pending",
  ...p,
});
const build = (schedules, history, todayYmd = "2026-10-24") =>
  buildNeedsYou({ schedules, history, todayYmd, memberName });

test("isLoggableYmd: on or before today, blank today = false, bad dates = false", () => {
  assert.equal(isLoggableYmd("2026-10-24", "2026-10-24"), true);
  assert.equal(isLoggableYmd("2026-10-23", "2026-10-24"), true);
  assert.equal(isLoggableYmd("2026-10-25", "2026-10-24"), false);
  assert.equal(isLoggableYmd("2026-10-24", ""), false);
  assert.equal(isLoggableYmd("nope", "2026-10-24"), false);
});

test("a due fixed schedule is a log row, a due variable one is an enter row", () => {
  const rows = build([sched({}), sched({ id: "s2", member_id: "b", is_fixed_amount: false, amount: null })], []);
  assert.deepEqual(rows.map((r) => [r.kind, r.amount]), [["log", 1850], ["enter", null]]);
});

test("a fixed schedule with no saved amount asks for the amount", () => {
  const [row] = build([sched({ amount: 0 })], []);
  assert.equal(row.kind, "enter");
  assert.equal(row.amount, null);
});

test("a schedule not due yet is left out", () => {
  assert.deepEqual(build([sched({ next_pay_date: "2026-10-25" })], []), []);
  assert.deepEqual(build([sched({})], [], ""), []);
});

test("only Pending history is a confirm row; amount null stays null", () => {
  const rows = build(
    [sched({ next_pay_date: "2026-11-07" })],
    [hist({}), hist({ id: "h2", status: "confirmed" }), hist({ id: "h3", amount: null })],
  );
  assert.deepEqual(rows.map((r) => [r.key, r.kind, r.amount, r.frequency]), [
    ["confirm-h1", "confirm", 1850, "fortnightly"],
    ["confirm-h3", "confirm", null, "fortnightly"],
  ]);
  assert.equal(rows[0].historyId, "h1");
  assert.equal(rows[0].scheduleId, "s1");
});

test("order: oldest pay date first, Pending before a same-day due pay, then member name", () => {
  const rows = build(
    [
      sched({ id: "s1", member_id: "b", next_pay_date: "2026-10-20" }),
      sched({ id: "s2", member_id: "a", next_pay_date: "2026-10-20" }),
      sched({ id: "s3", member_id: "a", next_pay_date: "2026-10-22" }),
    ],
    [hist({ id: "h9", member_id: "b", pay_schedule_id: "gone", pay_date: "2026-10-20" }), hist({ id: "h8", pay_date: "2026-10-18" })],
  );
  assert.deepEqual(rows.map((r) => r.key), [
    "confirm-h8",
    "confirm-h9",
    "log-s2",
    "log-s1",
    "log-s3",
  ]);
});

test("rowActionLabel and cardMode", () => {
  assert.equal(rowActionLabel("log"), "Log pay");
  assert.equal(rowActionLabel("enter"), "Enter amount");
  assert.equal(rowActionLabel("confirm"), "Confirm");
  assert.equal(cardMode(1850), "ask");
  assert.equal(cardMode(null), "amount");
  assert.equal(cardMode(0), "amount");
});

test("moneyLabel and titles", () => {
  assert.equal(moneyLabel(1850), "$1,850");
  assert.equal(moneyLabel(1850.5), "$1,850.50");
  assert.equal(moneyLabel(0.99), "$0.99");
  assert.equal(askTitle(1850), "Did $1,850 land?");
  assert.equal(amountTitle("Ana"), "How much did Ana get?");
});

test("shortDate and payLine", () => {
  assert.equal(shortDate("2026-10-24"), "24 Oct");
  assert.equal(shortDate("2026-01-05"), "5 Jan");
  assert.equal(payLine("fortnightly", "2026-10-24"), "Fortnightly · 24 Oct");
  assert.equal(payLine(null, "2026-10-24"), "24 Oct");
});

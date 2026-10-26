// Runtime tests for the Add a bonus payment rules (F13, #477).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialValues,
  stepKeys,
  effectiveMember,
  parseAmount,
  amountLabel,
  isValidBonusDate,
  dateLabel,
  buildBonusPayload,
} from "./addBonusFlow.ts";

test("initial values default the date to today and leave the member blank", () => {
  assert.deepEqual(initialValues("2026-10-26"), { member: "", amount: "", date: "2026-10-26", notes: "" });
});

test("Whose pay card only with 2 or more members", () => {
  assert.deepEqual(stepKeys({ canPickMember: true }), ["member", "amount", "date"]);
  assert.deepEqual(stepKeys({ canPickMember: false }), ["amount", "date"]);
});

test("anyone can pick any accepted member; a gone pick falls back to the current user", () => {
  assert.equal(effectiveMember("m2", "m1", ["m1", "m2"]), "m2");
  assert.equal(effectiveMember("", "m1", ["m1", "m2"]), "m1");
  assert.equal(effectiveMember("m9", "m1", ["m1", "m2"]), "m1");
});

test("amount must be above $0", () => {
  assert.equal(parseAmount("1,200.50"), 1200.5);
  assert.equal(parseAmount("$40"), 40);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount(""), null);
  assert.equal(amountLabel(1200), "$1,200.00");
});

test("date: real, not after today", () => {
  assert.equal(isValidBonusDate("2026-10-26", "2026-10-26"), true);
  assert.equal(isValidBonusDate("2026-10-25", "2026-10-26"), true);
  assert.equal(isValidBonusDate("2026-10-27", "2026-10-26"), false);
  assert.equal(isValidBonusDate("2026-02-30", "2026-10-26"), false);
  assert.equal(isValidBonusDate("", "2026-10-26"), false);
  assert.equal(dateLabel(""), "Not set");
});

test("payload trims notes and saves empty notes as null", () => {
  const base = { member: "", amount: "250", date: "2026-10-26", notes: "  " };
  assert.deepEqual(buildBonusPayload(base, "m1"), { memberId: "m1", amount: 250, payDate: "2026-10-26", notes: null });
  assert.equal(buildBonusPayload({ ...base, notes: " Christmas " }, "m1").notes, "Christmas");
});

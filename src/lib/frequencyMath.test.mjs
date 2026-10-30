// Unit tests for src/lib/frequencyMath.ts (F01, #464): exact frequency factors.
import { test } from "node:test";
import assert from "node:assert/strict";
import { convertFrequency } from "./frequencyMath.ts";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test("a fortnight is exactly two weeks (a 2,004.32 fortnight is 1,002.16 a week)", () => {
  close(convertFrequency(2004.32, "fortnightly", "weekly"), 1002.16);
  close(convertFrequency(1002.16, "weekly", "fortnightly"), 2004.32);
});

test("a month is 52/12 weeks and 26/12 fortnights", () => {
  close(convertFrequency(100, "monthly", "weekly"), (100 * 12) / 52);
  close(convertFrequency(100, "monthly", "fortnightly"), (100 * 12) / 26);
  close(convertFrequency(52, "weekly", "monthly"), 52 * (52 / 12));
});

test("a year is 52 weeks, 26 fortnights, 12 months", () => {
  close(convertFrequency(520, "yearly", "weekly"), 10);
  close(convertFrequency(520, "yearly", "fortnightly"), 20);
  close(convertFrequency(120, "yearly", "monthly"), 10);
  close(convertFrequency(10, "weekly", "yearly"), 520);
});

test("round trips are lossless", () => {
  for (const a of ["weekly", "fortnightly", "monthly", "yearly"]) {
    for (const b of ["weekly", "fortnightly", "monthly", "yearly"]) {
      close(convertFrequency(convertFrequency(123.45, a, b), b, a), 123.45);
    }
  }
});

test("same, missing and unknown frequencies", () => {
  assert.equal(convertFrequency(50, "weekly", "weekly"), 50);
  assert.equal(convertFrequency(50, "", "weekly"), 50);
  assert.equal(convertFrequency(50, "weekly", ""), 50);
  close(convertFrequency(50, "bogus", "monthly"), 50);
  close(convertFrequency(50, "WEEKLY", "Fortnightly"), 100);
});

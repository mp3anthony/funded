// Guard for the bottom-nav slots (R03, #390).
import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_SLOTS, navIndexForPath } from "./navSlots.ts";

test("four slots in order with the right routes", () => {
  assert.deepEqual(
    NAV_SLOTS.map((s) => [s.name, s.href]),
    [
      ["Dashboard", "/"],
      ["Payday", "/payday"],
      ["Bills", "/bills"],
      ["Goals", "/funds"],
    ]
  );
});

test("labels are sentence case, never Funds, never all caps", () => {
  for (const s of NAV_SLOTS) {
    assert.notEqual(s.name, "Funds");
    assert.notEqual(s.name, s.name.toUpperCase());
  }
});

test("navIndexForPath matches exactly and ignores a trailing slash", () => {
  assert.equal(navIndexForPath("/"), 0);
  assert.equal(navIndexForPath("/payday"), 1);
  assert.equal(navIndexForPath("/bills/"), 2);
  assert.equal(navIndexForPath("/funds"), 3);
});

test("navIndexForPath is -1 off the four tabs", () => {
  for (const p of ["/settings", "/patch-notes", "/login", "/bills/123", null, undefined]) {
    assert.equal(navIndexForPath(p), -1);
  }
});

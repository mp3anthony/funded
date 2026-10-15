import { test } from "node:test";
import assert from "node:assert/strict";
import {
  missingSetupItems,
  shouldShowFinishSetup,
  finishSetupHref,
  hasAddSheetParam,
  stripAddSheetParam,
} from "./finishSetup.ts";

test("missingSetupItems: all missing, in card order", () => {
  assert.deepEqual(missingSetupItems({ payScheduleCount: 0, billCount: 0, goalCount: 0 }), ["payday", "bill", "goal"]);
});
test("missingSetupItems: none missing", () => {
  assert.deepEqual(missingSetupItems({ payScheduleCount: 1, billCount: 3, goalCount: 2 }), []);
});
test("missingSetupItems: only bills deleted", () => {
  assert.deepEqual(missingSetupItems({ payScheduleCount: 1, billCount: 0, goalCount: 1 }), ["bill"]);
});

test("shouldShowFinishSetup: owner, not dismissed, something missing", () => {
  assert.equal(shouldShowFinishSetup({ isOwner: true, dismissed: false, missing: ["bill"] }), true);
});
test("shouldShowFinishSetup: non-owner never", () => {
  assert.equal(shouldShowFinishSetup({ isOwner: false, dismissed: false, missing: ["bill"] }), false);
});
test("shouldShowFinishSetup: dismissed hides", () => {
  assert.equal(shouldShowFinishSetup({ isOwner: true, dismissed: true, missing: ["bill"] }), false);
});
test("shouldShowFinishSetup: unknown (null) hides", () => {
  assert.equal(shouldShowFinishSetup({ isOwner: true, dismissed: null, missing: ["bill"] }), false);
});
test("shouldShowFinishSetup: nothing missing hides", () => {
  assert.equal(shouldShowFinishSetup({ isOwner: true, dismissed: false, missing: [] }), false);
});

test("finishSetupHref per item", () => {
  assert.equal(finishSetupHref("payday"), "/payday?add=1");
  assert.equal(finishSetupHref("bill"), "/bills?add=1");
  assert.equal(finishSetupHref("goal"), "/funds?add=1");
});

test("hasAddSheetParam: true for add=1 only", () => {
  assert.equal(hasAddSheetParam(new URLSearchParams("add=1")), true);
  assert.equal(hasAddSheetParam(new URLSearchParams("add=0")), false);
  assert.equal(hasAddSheetParam(new URLSearchParams("")), false);
});

test("stripAddSheetParam keeps other params", () => {
  assert.equal(stripAddSheetParam(new URLSearchParams("add=1&x=2")), "x=2");
  assert.equal(stripAddSheetParam(new URLSearchParams("add=1")), "");
});

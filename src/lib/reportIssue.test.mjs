// Runtime tests for the Report an issue rules (R12, #399).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TITLE_MAX_LENGTH,
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_TYPE_ERROR,
  SCREENSHOT_SIZE_ERROR,
  DESCRIPTION_INTRO,
  initialValues,
  titleOk,
  descriptionOk,
  canSend,
  buildIssuePayload,
  screenshotError,
} from "./reportIssue.ts";

test("title and description are required; spaces alone do not count", () => {
  assert.equal(titleOk("Bills page"), true);
  assert.equal(titleOk("   "), false);
  assert.equal(descriptionOk(""), false);
  assert.equal(descriptionOk(" it broke "), true);
});

test("canSend needs both fields", () => {
  assert.equal(canSend(initialValues()), false);
  assert.equal(canSend({ title: "A", description: "" }), false);
  assert.equal(canSend({ title: "", description: "B" }), false);
  assert.equal(canSend({ title: "A", description: "B" }), true);
});

test("buildIssuePayload trims both fields", () => {
  assert.deepEqual(buildIssuePayload({ title: "  A ", description: "\nB  " }), {
    title: "A",
    description: "B",
  });
});

test("screenshotError: type and 5MB rules", () => {
  assert.equal(screenshotError({ type: "image/png", size: 1000 }), null);
  assert.equal(screenshotError({ type: "image/heic", size: SCREENSHOT_MAX_BYTES }), null);
  assert.equal(screenshotError({ type: "application/pdf", size: 10 }), SCREENSHOT_TYPE_ERROR);
  assert.equal(
    screenshotError({ type: "image/png", size: SCREENSHOT_MAX_BYTES + 1 }),
    SCREENSHOT_SIZE_ERROR
  );
});

test("constants", () => {
  assert.equal(TITLE_MAX_LENGTH, 150);
  assert.ok(DESCRIPTION_INTRO.includes("bug") && DESCRIPTION_INTRO.includes("idea"));
});
